# Техническое задание: смарт-контракты Palissage

> Версия 1.0 — 12.06.2026
> Статус: утверждено к разработке (MVP, фаза 1)
> Среда: Solidity ^0.8.24, Foundry (forge), OpenZeppelin Contracts v5.x

---

## 1. Цель и контекст

Palissage — compliant onchain-инфраструктура для прямой B2B-торговли вином между
винодельнями и магазинами/импортёрами/wine-клубами (см. [palissage.md](palissage.md)).

Смарт-контракты должны обеспечить:

1. **Токенизацию партий вина (wine lots)** по стандарту **ERC-7943 (uRWA)** на базе ERC-1155:
   один `tokenId` = одна партия, баланс = количество бутылок.
2. **Идентификацию участников** (винодельни, B2B-покупатели, верификаторы) через
   **ERC-734 (Key Holder)** + **ERC-735 (Claim Holder)** — onchain-identity с клеймами
   от доверенных issuer'ов (модель OnchainID / ERC-3643).
3. **Полную информацию о каждом вине**: ключевые поля onchain + расширенные данные
   (фото, документы, правила redemption) в IPFS с onchain-якорем (hash).
4. **Первичный рынок** (прямые продажи, En Primeur/фьючерсы, депозиты) с **programmable escrow**
   и milestone-релизом средств винодельне.
5. **Вторичный B2B-рынок** (whitelisted-перепродажа allocation) с комиссией протокола
   и royalty винодельне.
6. **Redemption** — погашение токенов при физической поставке с прозрачной историей партии.
7. **Комиссии протокола** на каждом этапе (primary, escrow/settlement, secondary).

---

## 2. Глоссарий

| Термин | Значение |
|---|---|
| Wine Lot (лот, партия) | Партия вина одной винодельни: винтаж, состав, кол-во бутылок. Onchain = `tokenId` в `WineLotToken`. |
| Allocation | Резервация части лота B2B-покупателем на первичном рынке. |
| Allocation Receipt | Onchain-запись о резервации/оплате (структура `Allocation` в `PrimaryMarket`) + события. **Не отдельный токен** — см. §4. |
| En Primeur | Предпродажа будущего урожая до розлива по сниженной цене (фьючерс). |
| Redemption | Погашение токенов в обмен на физическую поставку бутылок. |
| Identity | Контракт ERC-734/735, принадлежащий участнику (кошелёк ↔ identity через `IdentityRegistry`). |
| Claim | Подписанное доверенным issuer'ом утверждение об identity (KYC, KYB, «винодельня», «B2B-покупатель»…). |
| Trusted Issuer | Организация (контракт `ClaimIssuer`), чьим клеймам протокол доверяет по заданным топикам. |
| Verifier | Верификатор/складской партнёр/trusted operator: подтверждает существование партии, milestone'ы, поставку. |
| Treasury | Адрес казны протокола, получает комиссии. |
| bps | Базисные пункты, 1 bps = 0.01%. Все комиссии задаются в bps (10000 = 100%). |

---

## 3. Стандарты: что используем и почему

### 3.1 ERC-7943 (uRWA) — статус **Final** (10.06.2025)

Используем вариант **`IERC7943MultiToken`** (на базе ERC-1155), interface ID **`0x41c4fbad`**.
Точный финальный интерфейс:

```solidity
interface IERC7943MultiToken /* is IERC165 */ {
    event ForcedTransfer(address indexed from, address indexed to, uint256 indexed tokenId, uint256 amount);
    event Frozen(address indexed account, uint256 indexed tokenId, uint256 amount);

    error ERC7943CannotSend(address account);
    error ERC7943CannotReceive(address account);
    error ERC7943CannotTransfer(address from, address to, uint256 tokenId, uint256 amount);
    error ERC7943InsufficientUnfrozenBalance(address account, uint256 tokenId, uint256 amount, uint256 unfrozen);

    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount) external returns (bool result);
    function setFrozenTokens(address account, uint256 tokenId, uint256 amount) external returns (bool result);
    function canSend(address account) external view returns (bool allowed);
    function canReceive(address account) external view returns (bool allowed);
    function getFrozenTokens(address account, uint256 tokenId) external view returns (uint256 amount);
    function canTransfer(address from, address to, uint256 tokenId, uint256 amount) external view returns (bool allowed);
}
```

Нормативные требования стандарта, которые контракт ОБЯЗАН выполнять:

- Публичные `safeTransferFrom`/`safeBatchTransferFrom` **MUST NOT** проходить, если
  `canTransfer == false`, либо `canSend(from) == false`, либо `canReceive(to) == false`.
- Mint **MUST NOT** проходить, если `canReceive(to) == false`.
- Burn обязан уважать `canSend` и не сжигать сверх незамороженного остатка
  (привилегированный burn МОЖЕТ сжигать замороженное, предварительно обновив frozen-статус
  и эмитировав `Frozen` ДО базовых событий).
- `setFrozenTokens` — абсолютное значение; **MUST** позволять замораживать больше, чем текущий баланс.
- `forcedTransfer` напрямую двигает балансы, эмитит базовый `TransferSingle` + `ForcedTransfer`,
  МОЖЕТ обходить `canTransfer`/`canSend`, но **SHOULD** проверять `canReceive(to)`;
  если переносится замороженное — сначала разморозка + событие `Frozen`.
- `supportsInterface(0x41c4fbad) == true`.

### 3.2 ERC-734 + ERC-735 — identity участников

- **ERC-734 (Key Holder)**: ключи с целями (purpose): `1 = MANAGEMENT`, `2 = ACTION`,
  `3 = CLAIM`, `4 = ENCRYPTION`; функции `addKey/removeKey/getKey/getKeysByPurpose/keyHasPurpose`
  + `execute/approve`.
- **ERC-735 (Claim Holder)**: клеймы `{topic, scheme, issuer, signature, data, uri}`;
  функции `addClaim/removeClaim/getClaim/getClaimIdsByTopic`; `claimId = keccak256(abi.encode(issuer, topic))`.

⚠️ Оба EIP формально «Stagnant»/архивные, но являются де-факто индустриальным стандартом
permissioned-RWA (OnchainID, ERC-3643/T-REX). Реализуем собственную лёгкую версию,
бинарно совместимую по интерфейсам — это и требование заказчика, и совместимость с
существующими KYC-провайдерами экосистемы ERC-3643.

Схема подписи клейма (совместимо с OnchainID):

```
signature = ECDSA_sign( toEthSignedMessageHash( keccak256(abi.encode(identityAddress, topic, data)) ) )
```

Подписант должен иметь в identity issuer'а ключ `keccak256(abi.encode(signer))` с purpose `CLAIM (3)`.

### 3.3 Решение: «receipt + ERC-7943» или «только ERC-7943»?

**Решение: один токен ERC-7943; receipt остаётся как onchain-ЗАПИСЬ, а не как второй токен.**

Аргументация:

1. **Два токена на один актив = рассинхронизация.** Если receipt и ERC-7943-токен — два
   независимых transferable-актива на одну и ту же партию, любая передача требует атомарной
   связки обоих, двойного whitelist, двойных комиссий и двойной burn-логики. Это удваивает
   поверхность атак и не даёт бизнес-выгоды.
2. **ERC-7943 сам по себе является «цифровой квитанцией»**: баланс по `tokenId` — это и есть
   право требования на N бутылок партии, с принудительными механизмами (freeze/forcedTransfer)
   для compliance-сценариев.
3. **Но receipt как сущность нужен** на этапе, когда токенов ещё нет: резервация с депозитом /
   milestone-оплатой. Покупатель внёс 30% — у него ещё не должно быть transferable-токенов
   (иначе он перепродаст не полностью оплаченную партию). Эту роль выполняет запись
   **`Allocation` в `PrimaryMarket`** (статусы `Reserved → Paid`): «бумажная» квитанция
   о брони и предоплате. Токены ERC-7943 минтятся только при 100% оплате.
4. **ERC-6956 (Asset-Bound NFT) — статус Review** (проверено 12.06.2026, не Final).
   Когда выйдет в Final, он закроет другую задачу — **per-bottle phygital-слой**
   (QR-код на бутылке = anchor, oracle-attestation при сканировании). Он **не заменит**
   лотовый ERC-7943 (B2B-опт остаётся количественным), а дополнит его на уровне отдельных
   бутылок для loyalty/passport-механик. План миграции — §13.

Итого: требование «возможно, придётся оставить и то и другое» удовлетворяется так —
**оставляем и receipt (как onchain-структуру + события + хэши документов), и ERC-7943-токен**,
но receipt не является отдельным токеном, что устраняет проблему двойного актива.

### 3.4 Прочие стандарты

- **ERC-1155 + ERC-1155Supply** (OpenZeppelin v5) — база `WineLotToken`.
- **ERC-20 (SafeERC20)** — расчёты стейблкоином (целевой — EURC; список разрешённых
  платёжных токенов конфигурируется админом).
- **AccessControl** (OpenZeppelin) — роли во всех контрактах.
- **ReentrancyGuard, Pausable** — во всех контрактах с движением средств.

---

## 4. Архитектура

```
                     ┌────────────────────────────┐
                     │     ClaimTopicsLib          │  (константы топиков)
                     └────────────────────────────┘
┌──────────────┐   ┌──────────────────────┐   ┌──────────────────────────┐
│  Identity     │   │ TrustedIssuers       │   │  IdentityRegistry        │
│ (ERC-734/735) │◄──│ Registry             │◄──│  кошелёк → identity,     │
│ по 1 на юзера │   │ issuer → topics      │   │  страна; isVerified(),   │
│ ClaimIssuer   │   └──────────────────────┘   │  hasValidClaim()         │
│ (issuer KYC)  │                              └──────────┬───────────────┘
└──────────────┘                                          │ читают все
                                                          ▼
                     ┌────────────────────────────────────────────────┐
                     │  WineLotToken  (ERC-1155 + ERC-7943MultiToken) │
                     │  tokenId = лот; WineLot struct; freeze;        │
                     │  forcedTransfer; transfer-агенты; lifecycle    │
                     └────────┬───────────────┬───────────────┬───────┘
                              │ MINTER        │ TRANSFER_AGENT│ TRANSFER_AGENT+burn
                  ┌───────────▼─────────┐ ┌───▼────────────┐ ┌▼──────────────────┐
                  │  PrimaryMarket      │ │ SecondaryMarket│ │ RedemptionManager │
                  │  offers, allocation │ │ листинги, fee, │ │ запрос → отгрузка │
                  │  receipts, escrow,  │ │ royalty        │ │ → подтверждение → │
                  │  milestones, fees   │ │                │ │ burn + статистика │
                  └─────────────────────┘ └────────────────┘ └───────────────────┘
                              │ комиссии (ERC-20)
                              ▼
                          Treasury
```

Деплой — **не-upgradeable** (без прокси) в MVP: меньше поверхность атак, проще аудит.
Все взаимные адреса (registry, token, treasury) заменяемы админом через сеттеры,
миграция при необходимости — выпуск новой версии + `forcedTransfer`/snapshot (см. §12).

---

## 5. Роли и права доступа

| Роль | Где | Кто | Права |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | все | мультисиг протокола | назначение ролей, сеттеры адресов/комиссий, pause |
| `REGISTRY_AGENT_ROLE` | IdentityRegistry | бэкенд онбординга | регистрация/обновление identity |
| `VERIFIER_ROLE` | WineLotToken, PrimaryMarket, RedemptionManager | верификаторы/складские партнёры | верификация лота, подтверждение milestone, force-complete поставки |
| `ENFORCER_ROLE` | WineLotToken | compliance-мультисиг | `setFrozenTokens`, `forcedTransfer` |
| `MINTER_ROLE` | WineLotToken | контракт PrimaryMarket | mint при полной оплате |
| `TRANSFER_AGENT_ROLE` | WineLotToken | PrimaryMarket, SecondaryMarket, RedemptionManager | перевод токенов между юзерами (P2P напрямую запрещён) |
| `PAUSER_ROLE` | все денежные | мультисиг / incident-бот | pause/unpause |
| Винодельня | — | кошелёк с клеймом `TOPIC_WINERY` | создание лотов/оферов, milestone-план, подтверждение отгрузки |
| B2B-покупатель | — | кошелёк с клеймом `TOPIC_B2B_BUYER` | резервация, оплата, перепродажа, redemption |

**Важно:** «винодельня» и «B2B-покупатель» — не AccessControl-роли, а **клеймы** в identity.
Проверяются через `IdentityRegistry` в рантайме. Это позволяет онбордить участников без
транзакций админа в каждом контракте.

Топики клеймов (`ClaimTopicsLib`):

```solidity
uint256 constant TOPIC_KYC       = 1; // физлицо/представитель проверен
uint256 constant TOPIC_KYB       = 2; // юрлицо проверено
uint256 constant TOPIC_WINERY    = 3; // верифицированная винодельня
uint256 constant TOPIC_B2B_BUYER = 4; // магазин / импортёр / ресторанная группа / wine club
uint256 constant TOPIC_VERIFIER  = 5; // верификатор / складской партнёр (информативный)
```

---

## 6. Identity-слой (детальная спецификация)

### 6.1 `Identity.sol` — ERC-734 + ERC-735

Деплоится по одному на участника (фабрикой с бэкенда или самим участником).

Хранение:

```solidity
struct Key { uint256[] purposes; uint256 keyType; bytes32 key; } // keyType: 1 = ECDSA
struct Claim { uint256 topic; uint256 scheme; address issuer; bytes signature; bytes data; string uri; }
mapping(bytes32 => Key) keys;
mapping(uint256 => bytes32[]) keysByPurpose;
mapping(bytes32 => Claim) claims;             // claimId => Claim
mapping(uint256 => bytes32[]) claimsByTopic;
mapping(uint256 => Execution) executions;     // для execute/approve
```

Функции (сигнатуры строго по EIP):

- ERC-734: `getKey(bytes32) → (uint256[],uint256,bytes32)`, `keyHasPurpose(bytes32,uint256) → bool`,
  `getKeysByPurpose(uint256) → bytes32[]`, `addKey(bytes32,uint256,uint256) → bool`,
  `removeKey(bytes32,uint256) → bool`, `execute(address,uint256,bytes) → uint256`,
  `approve(uint256,bool) → bool`.
- ERC-735: `getClaim(bytes32)`, `getClaimIdsByTopic(uint256)`, `addClaim(...) → bytes32`,
  `removeClaim(bytes32) → bool`.

Правила:

- `addKey/removeKey` — только MANAGEMENT-ключ (или сам контракт через `execute`).
- `addClaim` — MANAGEMENT/CLAIM-ключ identity-владельца (self-управление: владелец сам
  добавляет себе клейм, выданный issuer'ом; валидность подписи проверяется *читателями*,
  а не при записи — как в OnchainID).
- `execute`: инициатор с ACTION-ключом → авто-approve; иначе ждёт `approve` от MANAGEMENT.
- При деплое — конструктор кладёт MANAGEMENT-ключ владельца.
- События строго по EIP: `KeyAdded/KeyRemoved/ExecutionRequested/Executed/Approved`,
  `ClaimAdded/ClaimRemoved/ClaimChanged`.

### 6.2 `ClaimIssuer.sol` — is Identity

Identity доверенного issuer'а + проверка и отзыв подписей:

- `isClaimValid(IIdentity subject, uint256 topic, bytes sig, bytes data) → bool`:
  восстанавливает подписанта из `toEthSignedMessageHash(keccak256(abi.encode(subject, topic, data)))`,
  проверяет `keyHasPurpose(keccak256(abi.encode(signer)), 3)` и отсутствие отзыва.
- `revokeClaimBySignature(bytes sig)` — MANAGEMENT-ключ; `revokedSignatures[sig] = true`,
  событие `ClaimRevoked`.

### 6.3 `TrustedIssuersRegistry.sol`

- `addTrustedIssuer(address issuer, uint256[] topics)` / `removeTrustedIssuer` /
  `updateIssuerTopics` — только админ.
- `isTrustedIssuer(address) → bool`, `hasClaimTopic(address issuer, uint256 topic) → bool`,
  `getTrustedIssuers() → address[]`.

### 6.4 `IdentityRegistry.sol`

Связывает кошельки с identity и отвечает на главный вопрос compliance:

```solidity
function registerIdentity(address wallet, address identity, uint16 country) external; // REGISTRY_AGENT
function updateIdentity(address wallet, address identity) external;
function updateCountry(address wallet, uint16 country) external;                      // ISO 3166-1 numeric
function deleteIdentity(address wallet) external;

function identityOf(address wallet) external view returns (address);
function countryOf(address wallet) external view returns (uint16);
function isVerified(address wallet) external view returns (bool);   // есть валидный клейм по КАЖДОМУ из requiredTopics
function hasValidClaim(address wallet, uint256 topic) external view returns (bool);
```

- `requiredTopics` (базовый набор для допуска к токену, по умолчанию `[TOPIC_KYC]`) —
  конфигурируется админом (`setRequiredTopics`).
- `hasValidClaim`: перебирает клеймы identity по топику; клейм валиден, если
  `issuer ∈ TrustedIssuersRegistry`, issuer доверен по этому топику и
  `ClaimIssuer.isClaimValid(...) == true`.
- `isVerified` для системных контрактов протокола (рынки, redemption) → см.
  exemption-лист в токене (§7), сам registry системные адреса не хранит.

---

## 7. `WineLotToken.sol` — ERC-1155 + ERC-7943 (ядро)

### 7.1 Данные лота («полная информация о вине»)

```solidity
enum LotStatus { Draft, Verified, Suspended, Closed }
enum ProductionStatus { Announced, Growing, Harvested, Vinification, Aging, Bottled, ReadyForDelivery }

struct WineLot {
    address winery;            // кошелёк винодельни-создателя
    LotStatus status;
    ProductionStatus production;
    uint32 totalBottles;       // максимум к выпуску (cap для mint)
    uint32 mintedBottles;      // выпущено токенов
    uint32 redeemedBottles;    // погашено (сожжено при поставке)
    uint16 vintage;            // год урожая
    uint16 royaltyBps;         // royalty винодельни на вторичке (cap = maxRoyaltyBps протокола)
    uint32 bottleSizeMl;       // 750, 1500 …
    bool   exportAllowed;      // экспортная доступность
    string name;               // название вина
    string region;             // регион / аппелласьон
    string grapes;             // состав: сорта и проценты
    string metadataURI;        // ipfs://… JSON: фото, документы, склад, правила redemption
    bytes32 docsHash;          // keccak256 пакета документов (инвойсы, attestation, серты)
    address verifier;          // кто верифицировал лот
}
```

Offchain JSON (по `metadataURI`, схема обязательна для фронта/бэка):
`{ name, description, image, images[], region, appellation, vintage, grapes[{variety, pct}],
alcohol, bottleSizeMl, producer{...}, warehouse{name, location, attestationDoc},
documents[{type, uri, sha256}], redemptionRules{minQty, regions[], leadTimeDays, shippingTerms},
exportAvailability[countries] }`.

### 7.2 Жизненный цикл лота

```
createLot (винодельня, TOPIC_WINERY)            → Draft
verifyLot (VERIFIER_ROLE, фиксирует docsHash)   → Verified      — только теперь возможен mint
setProductionStatus (винодельня; только вперёд) → Announced → … → ReadyForDelivery
suspendLot / unsuspendLot (админ/верификатор)   → Suspended     — блокирует transfer/mint
closeLot (админ, когда redeemed == minted и продажи завершены) → Closed
```

Функции лота: `createLot(WineLotInput) → lotId`, `verifyLot(lotId, docsHash)`,
`setProductionStatus(lotId, status)`, `updateLotMetadata(lotId, uri, docsHash)`
(только винодельня, до `Verified` свободно; после — эмитит `LotMetadataUpdated` для аудита),
`suspendLot/unsuspendLot`, `getLot(lotId) → WineLot`, `uri(tokenId)` → `metadataURI` лота.

### 7.3 ERC-7943 поведение

- `canSend(a)` / `canReceive(a)`: `true`, если `a` — системный адрес протокола
  (`isSystemAddress[a]`, выставляется админом для рынков/redemption), иначе
  `identityRegistry.isVerified(a)`.
- `canTransfer(from,to,id,amount)`: `canSend(from) && canReceive(to)`
  && лот существует && `lot.status == Verified` && `amount <= unfrozen(from,id)`.
- `_update` (хук OZ ERC-1155, единая точка):
  - mint (`from == 0`): только `MINTER_ROLE`; `canReceive(to)`; `minted + amount <= totalBottles`; лот `Verified`.
  - burn (`to == 0`): только `RedemptionManager` (роль `BURNER_ROLE`); уважает unfrozen.
  - transfer: `require canTransfer(...)` (revert кастомными ошибками 7943) **и**
    `msg.sender` (operator) имеет `TRANSFER_AGENT_ROLE` — прямые P2P-переводы запрещены,
    чтобы вторичные передачи не обходили комиссии и royalty. Это строже, чем требует
    7943 (стандарт разрешает дополнительные ограничения).
- `setFrozenTokens(account,id,amount)`: `ENFORCER_ROLE`; абсолютное значение; `Frozen`-event.
- `forcedTransfer(from,to,id,amount)`: `ENFORCER_ROLE`; проверяет `canReceive(to)`;
  если `amount > unfrozen(from)` — уменьшает frozen до нужного уровня и эмитит `Frozen`
  ДО перевода; двигает балансы через базовый `_update` (минуя проверки);
  эмитит `TransferSingle` + `ForcedTransfer`.
- `supportsInterface`: ERC-1155, ERC-165, `type(IERC7943MultiToken).interfaceId == 0x41c4fbad`.

Инварианты (для invariant-тестов):

- `∀ lot: mintedBottles − redeemedBottles == totalSupply(lotId)`
- `∀ lot: mintedBottles <= totalBottles`
- `∀ account, lot: balanceOf >= 0` и переводы невозможны сверх `balance − frozen`
  (кроме `forcedTransfer` с предварительной разморозкой).

---

## 8. `PrimaryMarket.sol` — первичный рынок + escrow

### 8.1 Офферы

```solidity
enum OfferKind { Standard, EnPrimeur }

struct Offer {
    uint256 lotId;
    address winery;
    address paymentToken;     // из allow-листа протокола (EURC и т.п.)
    uint256 pricePerBottle;   // в decimals платёжного токена
    uint32  quantity;         // выставлено бутылок
    uint32  reserved;         // зарезервировано+продано
    uint64  startTime;
    uint64  endTime;          // конец приёма резерваций
    uint16  depositBps;       // мин. депозит для режима DEPOSIT (0 = режим выключен)
    uint64  fullPaymentDeadline; // дедлайн доплаты по депозитным резервациям
    OfferKind kind;
    bool    active;
}
```

- `createOffer(...)` — только винодельня лота (`TOPIC_WINERY` + `lot.winery == msg.sender`),
  лот `Verified`; `quantity` ≤ нераспроданный остаток лота по всем активным офферам;
  для `EnPrimeur` лот может быть в любом производственном статусе до `Bottled` —
  это и есть фьючерс на будущий урожай (цена обычно ниже).
- `cancelOffer(offerId)` — винодельня; не затрагивает уже сделанные резервации.

### 8.2 Резервации = allocation receipts

```solidity
enum AllocationState { Reserved, Paid, Cancelled, Defaulted }

struct Allocation {
    uint256 offerId;
    address buyer;
    uint32  quantity;
    uint256 pricePerBottle;  // фиксируется на момент резервации
    uint256 totalDue;        // quantity * price
    uint256 paidAmount;
    uint64  createdAt;
    AllocationState state;
}
```

- `reserve(offerId, qty, payNow)` — покупатель с `TOPIC_B2B_BUYER`:
  - `payNow == totalDue` → `state = Paid`, **mint** `qty` токенов лота покупателю немедленно;
  - `payNow >= deposit` (и `depositBps > 0`) → `state = Reserved`, токены НЕ минтятся —
    allocation-запись и есть receipt о брони;
  - средства `safeTransferFrom` → escrow контракта; событие `AllocationCreated`
    (это onchain-«квитанция»: индексируется бэкендом для инвойсов).
- `payRemainder(allocationId, amount)` — частичные доплаты; при `paidAmount == totalDue`
  → `Paid` + mint.
- `cancelAllocation(allocationId)` — винодельня ИЛИ админ до mint'а: возврат `paidAmount`
  покупателю из escrow (только из нераспределённых средств), `qty` возвращается в оффер.
- `claimDefault(allocationId)` — винодельня после `fullPaymentDeadline`, если не доплачено:
  `state = Defaulted`; депозит распределяется: protocol fee → treasury, остаток → escrow винодельни;
  `qty` возвращается в оффер.

### 8.3 Escrow и milestone-release

Средства покупателей по офферу копятся в escrow (`offerEscrow[offerId]`).
Винодельня получает их **поэтапно**, по мере подтверждения производства верификатором:

```solidity
struct Milestone { uint16 bps; string description; bool released; }
```

- `setMilestones(offerId, Milestone[])` — винодельня до первой резервации; Σ bps == 10000.
  Если milestone'ы не заданы — единственный релиз 100% после `ProductionStatus.ReadyForDelivery`.
- `confirmMilestone(offerId, index)` — `VERIFIER_ROLE`: помечает released, переводит
  `released_i = escrowAccrued * bps_i / 10000` за вычетом `primaryFeeBps` → винодельне,
  fee → treasury. Поскольку оплаты поступают постепенно, расчёт ведём от
  «всего поступило по офферу» с учётом уже выплаченного (`releasable = paidTotal * releasedBps/10000 − alreadyReleased`);
  каждое новое поступление увеличивает releasable по уже подтверждённым milestone'ам —
  функция `withdrawReleased(offerId)` для винодельни.
- Возвраты покупателям возможны только из ещё не released-части — риск зафиксировать в UI.

### 8.4 Комиссии

- `primaryFeeBps` (дефолт 300 = 3%) — с каждой выплаты винодельне.
- Сеттеры комиссий/казны — только админ; событonline `FeesUpdated`.

---

## 9. `SecondaryMarket.sol` — whitelisted вторичный рынок

```solidity
struct Listing {
    address seller;
    uint256 lotId;
    uint32  quantity;     // остаток
    uint256 pricePerBottle;
    address paymentToken;
    bool    active;
}
```

- `list(lotId, qty, price, paymentToken)` — продавец verified, баланс достаточен,
  предварительно `setApprovalForAll(market, true)`. Токены остаются у продавца
  (lazy-листинг), баланс проверяется при покупке.
- `buy(listingId, qty)` — покупатель `TOPIC_B2B_BUYER`; распределение средств:
  - `secondaryFeeBps` (дефолт 200 = 2%) → treasury;
  - `lot.royaltyBps` → винодельне лота;
  - остаток → продавцу;
  - токены `safeTransferFrom(seller → buyer)` силами рынка (рынок = TRANSFER_AGENT).
- `cancelListing(listingId)`, `updateListing(...)`.
- Заморозка/forcedTransfer токена автоматически делают листинг нерабочим (проверка в `buy`).

---

## 10. `RedemptionManager.sol` — погашение и поставка

```solidity
enum RedemptionState { Requested, Shipped, Completed, Cancelled }

struct Redemption {
    address buyer;
    uint256 lotId;
    uint32  quantity;
    bytes32 deliveryDataHash;   // hash офчейн-данных доставки (адрес, инкотермс, контакты)
    bytes32 shipmentDocsHash;   // hash отгрузочных документов (заполняет винодельня)
    uint64  requestedAt;
    RedemptionState state;
}
```

Флоу:

1. `requestRedemption(lotId, qty, deliveryDataHash)` — держатель токенов; лот в
   `ReadyForDelivery`; токены переводятся на контракт (escrow токенов; manager — системный
   адрес + TRANSFER_AGENT).
2. `markShipped(redemptionId, shipmentDocsHash)` — винодельня лота.
3. `confirmDelivery(redemptionId)` — покупатель ИЛИ `VERIFIER_ROLE` (fallback при споре):
   токены **сжигаются**, `lot.redeemedBottles += qty`, событие `Redeemed` — прозрачная
   история партии (выпущено/передано/погашено/осталось).
4. `cancelRedemption(redemptionId)` — покупатель, только в `Requested`: токены возвращаются.

---

## 11. Фаза 2 (описать сейчас, реализовать потом)

Не входит в MVP, но архитектура должна не мешать добавлению:

1. **Loyalty / QR-слой**: `WinePassport` (non-transferable ERC-721/SBT держателю-потребителю),
   `QrCampaignManager` — кампании виноделен и магазинов («отсканируй 5 вин», «10-я бутылка
   бесплатно» с указанием плательщика акции: винодельня или магазин — по описанию проекта),
   подпись бэкенд-оракула на скан QR. Появится после выбора модели per-bottle идентификации.
2. **ERC-6956**: после Final — `BottleAnchorToken` (per-bottle NFT, anchor = QR/NFC),
   связка `lotId ↔ anchors[]`, oracle-attestation при сканировании. Заменяет
   QR-подписи фазы 2 на стандартизованный механизм. Лотовый ERC-7943 НЕ заменяется.
3. **Milestone-оплата покупателем** (оплата траншами, а не только депозит+остаток).
4. **Phygital wine drops**: лимитированные серии = обычный лот + `OfferKind.Drop`
   с allowlist'ом сообществ.
5. **Фабрика identity + gateway** (gas-less онбординг, мета-транзакции).
6. **Аукционы En Primeur** и RFQ-механика для крупных партий.

---

## 12. Безопасность

- **CEI + ReentrancyGuard** во всех функциях с внешними переводами (`reserve`,
  `payRemainder`, `withdrawReleased`, `buy`, `confirmDelivery`, refund-пути).
- **SafeERC20** всюду; платёжные токены — только из allow-листа админа
  (отсекаем fee-on-transfer/реентрантные токены; при добавлении токена фиксировать decimals).
- **Pausable**: pause останавливает резервации/покупки/листинги, но НЕ блокирует
  `cancelRedemption`-возвраты и view.
- **Никаких unbounded-циклов** по пользовательским данным; клейм-проверки ограничены
  числом trusted issuers (контролируется админом).
- **forcedTransfer/setFrozenTokens** — только `ENFORCER_ROLE` (мультисиг), каждое применение
  логируется стандартными событиями 7943 (готовый audit-trail).
- Не-upgradeable; константы комиссий с верхними капами в коде:
  `primaryFeeBps ≤ 1000`, `secondaryFeeBps ≤ 1000`, `royaltyBps ≤ maxRoyaltyBps ≤ 1000`.
- Перед mainnet — внешний аудит; список известных компромиссов (refund после release,
  доверие к верификатору) — в README аудита.

---

## 13. План миграции на ERC-6956

1. Сейчас: лот = ERC-7943 (опт), бутылка идентифицируется QR-кодом offchain (фаза 2 —
   подписи оракула).
2. ERC-6956 Final → деплой `BottleAnchorToken (ERC-721 + ERC-6956)`; при розливе винодельня
   регистрирует merkle-root анкоров бутылок лота; при redemption опциональный
   «разворот» N лотовых токенов в N bottle-NFT (burn 7943 → mint 6956 по анкорам).
3. Loyalty-механики переключаются с подписей оракула на `transferAnchor/attestation`.
4. ERC-7943-токен остаётся каноническим B2B-активом до момента розлива; после розлива
   возможно сосуществование (опт — 7943, розничный phygital — 6956).

---

## 14. Тестирование (Foundry)

- **Unit**: каждый контракт изолированно (identity: ключи/клеймы/подписи/отзыв;
  токен: mint/burn/transfer-ограничения, freeze, forcedTransfer, supportsInterface == 0x41c4fbad;
  рынки: математика комиссий и royalty, депозиты, дефолты; redemption: все переходы состояний).
- **Integration / fork-style flow-тест**: полный путь «онбординг → лот → верификация →
  En Primeur оффер → депозит → доплата → mint → milestone release → перепродажа → redemption → burn».
- **Fuzz**: суммы оплат/комиссий (без потери wei: остаток округления — продавцу/винодельне),
  freeze-границы, количество в reserve/buy.
- **Invariant**: инварианты §7.3 + «Σ выплат + Σ возвратов + escrow == Σ поступлений» по офферу.
- **Negative**: каждая кастомная ошибка покрыта тестом (`vm.expectRevert`).
- Цель покрытия: ≥ 90% строк по `src/` (`forge coverage`).

## 15. Структура репозитория и конвенции

```
src/
  interfaces/   IERC7943.sol, IERC734.sol, IERC735.sol, IIdentity.sol, IClaimIssuer.sol,
                IIdentityRegistry.sol, ITrustedIssuersRegistry.sol, IWineLotToken.sol
  libraries/    ClaimTopicsLib.sol
  identity/     Identity.sol, ClaimIssuer.sol, TrustedIssuersRegistry.sol, IdentityRegistry.sol
  token/        WineLotToken.sol
  market/       PrimaryMarket.sol, SecondaryMarket.sol
  redemption/   RedemptionManager.sol
script/         Deploy.s.sol
test/           unit/…, integration/FullFlow.t.sol, mocks/MockEURC.sol, utils/Fixtures.sol
```

- Solidity `^0.8.24`, оптимизатор on (runs 200), via-ir при необходимости.
- Кастомные ошибки вместо строк require; NatSpec на все external/public.
- События на каждое изменение состояния, значимое для бэкенда (индексация инвойсов,
  compliance-выгрузок, redemption-статусов — см. «Compliance and Export Workflows»).

## 16. Деплой (порядок)

1. `TrustedIssuersRegistry` → 2. `IdentityRegistry(trustedIssuers)` →
3. `WineLotToken(identityRegistry, uriBase)` → 4. `PrimaryMarket(token, registry, treasury)` →
5. `SecondaryMarket(token, registry, treasury)` → 6. `RedemptionManager(token, registry)` →
7. роли: `MINTER_ROLE`→PrimaryMarket; `TRANSFER_AGENT_ROLE`→оба рынка+Redemption;
   `BURNER_ROLE`→Redemption; системные адреса в токене; allow-лист платёжных токенов;
8. `ClaimIssuer` протокольного KYC-провайдера + `addTrustedIssuer(topics: 1..5)`.

Сети: dev — anvil; testnet — Sepolia/Base Sepolia; целевой mainnet — L2 (Base/Arbitrum)
из-за стоимости газа на identity-операциях. Stablecoin: EURC (евро-номинация цен на вино).

## 17. Открытые вопросы (зафиксировать до mainnet)

1. Юридическая квалификация allocation-токена по юрисдикциям (security/utility/voucher) —
   влияет на TVA-логику (см. описание проекта) и на требования к клеймам.
2. Политика возвратов после частичного milestone-release (страховой пул? удержание буфера?).
3. Кто оплачивает gas онбординга identity (фабрика+спонсорство в фазе 2).
4. Снимок/миграция при выпуске v2 контрактов (forcedTransfer vs snapshot+claim).
5. Выбор oracle-модели для QR-сканов до ERC-6956.

---

*Приложение: идеи по повышению выгодности торговли для участников — добавлены в конец
[palissage.md](palissage.md), как и было запрошено в описании проекта.*
