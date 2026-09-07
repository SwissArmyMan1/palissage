# 04. Данные, состояния, расчёты и интеграционные контракты

Статус: техническое задание; приёмка реализации выполняется отдельно. Язык документа — русский, исходные UI-строки и ключи — английский, второй язык — французский. Документ фиксирует поведение прочитанных исходников на 7 сентября 2026 года; работоспособность публичного deployment и адресов в этом исследовании не проверялась.

**Поправка интеграции 1.1:** новый blockchain MVP использует Base Sepolia и TestEURe.
[Chain/08](../../docs/chain-mvp/08-ui-compatibility-and-readiness.md) фиксирует совместимость,
[Chain/03](../../docs/chain-mvp/03-contract-changes.md) — новые guards/Lens,
[Chain/09](../../docs/chain-mvp/09-artifacts-and-read-model.md) — manifest, event history и sample
metadata/commitments. Описания исходного кода ниже остаются наблюдениями; при реализации нового
testnet применяются эти явно заданные изменения. Private WorkflowAdapter в testnet P0 недоступен,
sample evidence и onchain writes разделены. Автономные fixtures и их clock/fees не изменяются.

Нормативные слова: **MUST** — обязательное условие приёмки; **SHOULD** — рекомендуемая реализация; **PROPOSED** — новый интерфейс/продуктовая политика, отсутствующие в исследованном контрактном коде. Нельзя выдавать PROPOSED за уже работающий backend.

## 1. Границы продукта и источников

- Главная цепочка ценности: винодельня → проверенный лот → профессиональный покупатель → оплата/аллокация → перепродажа при необходимости → физическое получение. Потребительский паспорт — публичное дополнение только для чтения.
- Один `lotId` соответствует винному лоту; ERC-1155 баланс измеряется целыми бутылками. Формулировка интерфейса: `Bottle allocation`, а не обещание инвестиционного дохода.
- `allocationId` — отдельная запись первичной покупки. Депозит создаёт запись аллокации без выпуска bottle tokens. Полная оплата выпускает tokens. История покупки и текущий баланс — разные сущности.
- `offerId`, `listingId`, `redemptionId`, `lotId` — разные пространства идентификаторов. Запрещено подставлять ID лота вместо ID предложения.
- Ни `Verified`, ни хеш документа, ни self-service testnet role не доказывают реальную юридическую проверку, физическое наличие вина, разрешение экспорта или производственную готовность системы.
- Исследованные источники: `README.md`, `TECHNICAL_README.md`, `src/interfaces/IWineLotToken.sol`, `src/token/WineLotToken.sol`, `src/market/PrimaryMarket.sol`, `src/market/SecondaryMarket.sol`, `src/redemption/RedemptionManager.sol`, `src/identity/RoleGateway.sol`, `UI/web/src/contracts/config.ts`, `UI/web/src/contracts/README.md`, `UI/web/src/lib/session.tsx`, `UI/web/src/lib/lots.ts`, `UI/web/src/lib/tx.ts`, `UI/web/src/pages/shop/ReserveFlow.tsx`, `UI/web/package.json`.
- Это извлечение поведения для UI, не аудит смарт-контрактов. Проверки ниже нужны для достоверного интерфейса; они не заменяют отдельный аудит перед работой с реальной стоимостью.

## 2. Явные режимы среды

| Режим | Как включается | Данные и операции | Обязательная маркировка |
|---|---|---|---|
| `demo` | `/demo`, затем явный выбор сценария/роли | Версионированные локальные fixtures, детерминированный reducer, без кошелька и RPC | `Interactive demo · Fictional data · No real payments` |
| `testnet` | `/testnet` → явное продолжение | Чтение выбранного deployment; подписи только после подключения кошелька | `Base Sepolia · Test assets only` |
| `mainnet` | Недоступен в MVP | Все write capabilities отключены; случайная конфигурация mainnet — ошибка настройки | `Mainnet is not enabled for this prototype` |

MUST: режим задаётся discriminated union в корневом provider; наличие адреса контракта, потеря RPC или отключение кошелька никогда не переводят testnet в demo. Ошибка testnet показывает error/retry и ссылку `Open interactive demo`, переход требует клика.

Публичные `/`, `/marketplace`, `/lots/:lotId`, `/producers/:producerId`, `/passport/:passportId`, `/pilot`, `/legal/:slug` используют явно отмеченный публичный набор демонстрационных материалов. В MVP публичные fiction IDs имеют префикс `demo-`; testnet provenance открывается из `/testnet` и кабинета. Публичная карточка не должна незаметно стать транзакцией после подключения кошелька.

Кабинеты `/app/buyer/...`, `/app/winery/...`, `/app/operations/...` работают под выбранным режимом. Режим сохраняется в URL как `?mode=demo` или `?mode=testnet`, переносится при внутренней навигации и отображается постоянно; query — запрос режима, не источник прав. Прямой `/app/...` без режима показывает выбор среды. Для public URL параметр не создаёт право записи.

Общие app-маршруты `/app/marketplace` и `/app/lots/:lotId` показывают каталог/офферы выбранного adapter и доступны для чтения app-ролям. Они не подставляют публичный sample catalogue в testnet. `/app/buyer/positions/:lotId` показывает текущий баланс lot; `/app/buyer/allocations/:allocationId` — отдельный primary record. Secondary acquisition — `TradeRecord`, не Primary Allocation.

Demo role switch управляет только fixture actor. Testnet role switch вызывает `RoleGateway.assumeRole` только при свежем `testMode() === true`; это sandbox, а не KYB onboarding. При `false`, ошибке или неизвестном значении self-service выбор недоступен. В MVP mainnet не включать даже при `testMode=true`.

Demo MUST сохранять только версию сценария, искусственные ID, события сценария и настройки UI в отдельном namespace `palissage.demo.v1`; повреждённый/старый snapshot предлагает `Reset demo`, не ломает страницу. `Reset demo` сбрасывает все роли и связанные сущности одновременно. Demo не создаёт похожие на настоящие transaction hashes и explorer links: использовать `DEMO-RES-001`.

Время demo берётся из fixture clock; продвижение этапа меняет его явным событием. Даты выводятся из сценария, без зависимости от часов ноутбука. Одинаковый reset + действия дают одинаковые балансы, истории, суммы и статусы. Просрочка открывается отдельным сценарием/шагом, без ожидания реальных дней.

## 3. Предлагаемая модель данных

Ниже — **PROPOSED TypeScript contract для UI/adapters**. Денежные значения в JSON — строки базовых единиц; внутри вычислений — `bigint`. IDs не преобразовывать через `Number`. Времена onchain — Unix seconds; адаптер нормализует поля `startTime/endTime/fullPaymentDeadline/createdAt/requestedAt` в ISO UTC strings без потери секунд, обратно конвертирует только перед контрактным вызовом. Formatter показывает timezone пользователя и полный UTC в деталях.

```ts
type EntityId = string;
type Address = `0x${string}`;
type DemoWalletId = `demo-wallet-${string}`;
type Hex = `0x${string}`;
type UnitString = string; // только /^\d+$/, без экспоненты и дробной точки
type Locale = 'en' | 'fr';
type Mode = 'demo' | 'testnet';
type Role = 'buyer' | 'winery' | 'operations' | 'visitor';
type EvidenceLevel = 'illustrative' | 'self_reported' | 'document_available'
  | 'hash_anchored' | 'reviewed' | 'unavailable' | 'mismatch';
type DataOrigin =
  | { kind: 'fixture'; scenarioId: string; version: number }
  | { kind: 'chain'; chainId: 84532 | 31337; transportKind: 'public_testnet' | 'local_fork';
      deploymentId: string; contract: Address; blockNumber: string;
      blockHash: Hex; readAt: string; txHash?: Hex }
  | { kind: 'editorial'; revision: string; reviewedAt?: string }
  | { kind: 'offchain'; recordId: string; updatedAt: string };
// 31337/local_fork допускаются только developer build; публичный manifest принимает только 84532/public_testnet.
type Sourced<T> = { value: T; origin: DataOrigin; evidence: EvidenceLevel };
type Money = { units: UnitString; token: Address | 'DEMO_EUR'; decimals: number;
  symbol: string; chainId: 84532 | 31337 | null };
type Capability = { allowed: boolean; reasonCode?: string; checkedAt: string;
  dependsOnBlock?: string };
type DocumentRef = { id: EntityId; label: string; kind: string;
  visibility: 'public' | 'participants' | 'operations'; mediaType: string;
  byteSize: number; digest?: Hex; digestAlgorithm?: 'sha256' | 'keccak256';
  evidence: EvidenceLevel; reviewerLabel?: string; reviewedAt?: string;
  uri?: string; origin: DataOrigin };
type LotStatus = 'Draft' | 'Verified' | 'Suspended' | 'Closed';
type ProductionStatus = 'Announced' | 'Growing' | 'Harvested' | 'Vinification'
  | 'Aging' | 'Bottled' | 'ReadyForDelivery';
interface LotRecord {
  id: EntityId; producerId: EntityId; winery: Address | DemoWalletId;
  name: string; region: string; grapes: string; vintage: number;
  totalBottles: number; mintedBottles: number; redeemedBottles: number;
  bottleSizeMl: number; royaltyBps: number; exportAllowed: boolean;
  status: LotStatus; production: ProductionStatus; verifier?: Address;
  metadataUri?: string; docsHash?: Hex; origin: DataOrigin;
}
interface LotPresentation {
  lotId: EntityId; revision: number; title: Record<Locale, string>;
  producerSlug: string; color: 'red' | 'white' | 'rose' | 'sparkling';
  appellation?: Sourced<string>; description: Record<Locale, string>;
  imageAssetIds: string[]; documents: DocumentRef[];
  expectedAvailability?: Sourced<string>; caseSize: number;
  minOrderBottles: number; warehouseLabel?: Sourced<string>;
  originCountry?: string; abv?: Sourced<string>; certifications: Sourced<string>[];
  tradeTerms: { incoterm?: Sourced<string>; shipping: 'quote_required' | 'included';
    taxes: 'not_calculated' | 'included'; allowedDestinations: string[] };
  // Эти поля не существуют в WineLotToken: не объявлять их доказанными onchain.
}
interface PrimaryOffer {
  id: EntityId; lotId: EntityId; winery: Address | DemoWalletId;
  paymentToken: Money['token']; pricePerBottle: Money; quantity: number;
  reserved: number; startTime: string; endTime: string; depositBps: number;
  fullPaymentDeadline: string; kind: 'Standard' | 'EnPrimeur'; active: boolean;
  origin: DataOrigin;
}
interface Allocation {
  id: EntityId; offerId: EntityId; buyerId: EntityId; quantity: number;
  pricePerBottle: Money; totalDue: Money; paidAmount: Money; createdAt: string;
  state: 'Reserved' | 'Paid' | 'Cancelled' | 'Defaulted'; origin: DataOrigin;
}
interface Position {
  accountId: EntityId; lotId: EntityId; walletBottles: number;
  frozenBottles: number; redemptionEscrowBottles: number;
  origin: DataOrigin; // источник баланса, не сумма исторических allocation.quantity
}
interface SecondaryListing {
  id: EntityId; sellerId: EntityId; lotId: EntityId; quantity: number;
  pricePerBottle: Money; paymentToken: Money['token']; active: boolean;
  origin: DataOrigin;
}
interface Redemption {
  id: EntityId; buyerId: EntityId; lotId: EntityId; quantity: number;
  deliveryDataHash: Hex; shipmentDocsHash?: Hex; requestedAt: string;
  state: 'Requested' | 'Shipped' | 'Completed' | 'Cancelled'; origin: DataOrigin;
  caseId?: EntityId; // offchain overlay, а не дополнительное значение Solidity enum
}
interface DisputeCase {
  id: EntityId; redemptionId: EntityId; reason: string;
  state: 'open' | 'under_review' | 'resolved_delivery' | 'resolved_return';
  createdAt: string; evidenceIds: EntityId[]; origin: DataOrigin;
}
interface OfferSettlement {
  offerId: EntityId; settledFunds: Money; withdrawnGross: Money;
  releasedBps: number; primaryFeeBps: number;
  milestones: { index: number; bps: number; released: boolean; description: string }[];
  origin: DataOrigin;
}
```

Обязательные сопутствующие записи: `ProducerProfile` (id, slug, displayName, country, region, storyEn/Fr, assetIds, evidence, origin); `ParticipantSummary` (id, role, displayLabel, registryVerified, claimTopics, per-contract capabilities, origin); `ActivityItem` (id, entityType/id, action, actorLabel, occurredAt, source, receiptId); `TradeRecord` (id, listingId, lotId, buyerId, sellerId, quantity, gross/fee/royalty/sellerNet Money, receiptId, occurredAt, origin); `PassportView` (opaque public id, lotId, producerId, public provenance events, assets, `illustrative` marker). Паспорт не включает кошелёк, адрес покупателя, документы доставки или личную историю заказов. Его ID не вычислять из PII.

`Sourced` применяется отдельно к утверждениям, например `exportAllowed` onchain и доступность доставки во Францию offchain. Запрещено наследовать `reviewed` всему экрану по одному проверенному полю. Шильдик карточки открывает popover с тем, что именно проверено, кем/когда, и ссылкой на доказательство при наличии.

Domain validators: quantities и bottleSizeMl — положительные целые ≤ 2^32−1; vintage — uint16 плюс понятный диапазон UI; денежные amounts — uint256 и совместимые token/decimals/chain; basis points — целые в заданных контрактом пределах. `caseSize/minOrderBottles/allowedDestinations` — PROPOSED торговые ограничения UI, отсутствующие в контракте. Округление quantity до ящика никогда не делать скрытно: предложить ближайшее допустимое количество и запросить повторный review.

Словарь доказательств: `Illustrative` — учебные данные; `Provided by producer` — заявление производителя; `Document available` — документ можно открыть; `Hash recorded` — хеш записан; `Reviewed` — существует именованная проверка с датой и областью проверки; `Unavailable`/`Does not match` — доказательство не получено/не совпало. `hash_anchored` не означает истинность содержимого. В sandbox использовать `Demo verification`, даже если enum равен `Verified`.

`metadataURI` может меняться, `docsHash` не меняется через `updateLotMetadata`. В существующем API нет универсального повторного `verifyLot` для уже Verified лота: не обещать автоматическую повторную аттестацию. Несовпадение новых документов с якорем показывает `Evidence needs review`; тестовые сделки блокируются продуктовой capability до разрешения расхождения.

## 4. Доступы: роль для навигации, capabilities для действий

| Действие UI | Фактическое условие контракта / дополнительная проверка UI |
|---|---|
| Создать лот | `createLot(input)`; winery claim. Admin role сам по себе не является winery claim |
| Проверить/приостановить/возобновить лот | `verifyLot`, `suspendLot`, `unsuspendLot`; `WineLotToken.VERIFIER_ROLE` |
| Обновить metadata / production | `updateLotMetadata`, `setProductionStatus`; адрес равен `lot.winery` |
| Создать/отменить offer, задать milestones | `createOffer`, `cancelOffer`, `setMilestones`; владелец лота/offer; create требует winery claim |
| Купить первично / доплатить | `reserve`: B2B buyer claim; `payRemainder`: адрес allocation buyer. UI также проверяет текущий compliance и возможность финального mint |
| Вернуть депозит | `cancelAllocation`; winery или `PrimaryMarket.DEFAULT_ADMIN_ROLE`, только Reserved и достаточный escrow |
| Зафиксировать default | `claimDefault`; только winery, Reserved, block timestamp строго позже deadline |
| Подтвердить milestone | `confirmMilestone`; отдельный `PrimaryMarket.VERIFIER_ROLE` |
| Вывести доступное | `withdrawReleased`; только offer winery; `withdrawable > 0` |
| Создать secondary listing | `list`; seller verified, balance sufficient; UI дополнительно проверяет transferable balance и approval |
| Купить secondary listing | `buy`; B2B buyer claim, buyer ≠ seller, allowance, live balance/price/approval |
| Попросить доставку | `requestRedemption`; production ReadyForDelivery; token transfer требует compliance, Verified lot, unfrozen balance и approval |
| Отметить отгрузку | `markShipped`; lot winery, redemption Requested |
| Подтвердить получение | `confirmDelivery`; buyer только после Shipped; `RedemptionManager.VERIFIER_ROLE` также из Requested |
| Вернуть escrow при споре | `refundRedemption`; `RedemptionManager.VERIFIER_ROLE`; Requested или Shipped |
| Восстановить escrow в новый кошелёк | `recoverEscrow`; verifier, EIP-712 подпись исходного buyer, deadline, принимающий compliance |
| Заморозка / forced transfer | `setFrozenTokens` / `forcedTransfer`; `WineLotToken.ENFORCER_ROLE`; только специализированный operations экран |
| Pause / unpause | `PrimaryMarket.PAUSER_ROLE` и `SecondaryMarket.PAUSER_ROLE` проверяются отдельно |

`RoleGateway.Role`: `None=0`, `Admin=1`, `Winery=2`, `Shop=3`, `Consumer=4`. UI `buyer` маппится в Shop, `operations` — навигационный ярлык. Gateway Admin выдаёт verifier capability именно в WineLotToken; другие контракты проверяются отдельно. Изменение gateway role удаляет предыдущие claims; не делать role switch скрытым шагом сценария testnet.

Каждая опасная кнопка имеет capability с reasonCode, last checked time и конкретной entity. UI guard не является защитой доступа: testnet всё равно симулирует вызов и полагается на контракт. Отказ чтения права — `unknown`, не `allowed`. Вход в URL чужой организации даёт экран ограничения без утечки private records.

Enforcement, recoverEscrow, смена чужих ролей и pause помещаются в закрытый advanced operations workflow с отдельными capabilities; это не обязательные шаги grant demo и не действия публичного role picker. Для MVP они могут быть read-only с точной причиной недоступности до отдельной интеграционной приёмки.

Для MVP публичный consumer не совершает покупок, не подключает кошелёк и не управляет передачами. У RoleGateway Consumer есть KYC-like claim, но это не основание расширять B2B scope продукта.

## 5. Машины состояний

### 5.1. Лот и производство

Контрактная ось статуса: `Draft → Verified ↔ Suspended`; `closeLot` устанавливает Closed при `mintedBottles === redeemedBottles` и admin authority. Это равенство может быть 0=0: UI MUST дополнительно требовать проверку открытых offers, Reserved allocations и redemptions; общий авто-close не реализовывать. Closed — терминальный статус в пользовательской модели, выход из него API не предоставляет.

Производственная ось: `Announced → Growing → Harvested → Vinification → Aging → Bottled → ReadyForDelivery`. `setProductionStatus` допускает любой переход строго вперёд, включая пропуск этапов; UI показывает пропущенные этапы как `Not recorded`, не генерирует им даты. Назад переключить нельзя. Производство, торговый статус и документы отображаются раздельно.

`mintedBottles` — накопительный выпуск, `redeemedBottles` — сожжённые при redemption. Доступность предложения = `offer.quantity - offer.reserved`, не `totalBottles - mintedBottles`. Для создания новых offers читать `offeredPerLot`; при нескольких offers не считать их независимо. Доля полного redemption = redeemed/minted при minted>0; при нуле — `No allocations issued`.

### 5.2. Первичная покупка и остаток оплаты

```text
review → quote_checked → [approval_required → approval_confirmed] → reserve_pending
reserve_pending → Reserved  (payNow < totalDue)
reserve_pending → Paid      (payNow = totalDue; tokens minted)
Reserved → Reserved         (payRemainder с частичной доплатой)
Reserved → Paid             (остаток погашен полностью; tokens minted)
Reserved → Cancelled        (winery/admin cancelAllocation, полный refund paidAmount)
Reserved → Defaulted        (winery claimDefault после deadline; оплаченная часть forfeited)
```

Offer: `scheduled`, `open`, `sold_out`, `ended`, `cancelled` — производные UI-состояния из active/quantity/reserved/start/end и block timestamp. Приоритет cancelled → ended → scheduled → sold_out → open. `reserve` разрешён на точных границах startTime/endTime; `payRemainder` до deadline включительно, default — только позже. Countdown ориентируется на последний chain block; рядом абсолютная дата и timezone.

При `createOffer` обязательны quantity>0, price>0, `endTime > startTime`, `fullPaymentDeadline >= endTime`, разрешённый payment token, Verified lot и достаточный `totalBottles-offeredPerLot`. EnPrimeur создаётся только при production строго раньше Bottled. Standard не означает ReadyForDelivery автоматически: показывать фактическую доступность доставки из production. Deposit reservation в текущем `reserve` не повторяет проверку lot Verified; целевой UI вводит свежую Verified capability и не предлагает новые депозиты для Suspended/Closed (PROPOSED policy).

Депозит не обещает token ownership: `Allocation reserved · Balance due …`; Paid показывает `Paid in full · N bottles allocated`. Sold/reserved and issued balance — отдельные метрики. Default не происходит сам по таймеру: до receipt `claimDefault` показывать `Payment overdue`, сохраняя underlying Reserved. После deadline кнопка доплаты блокируется; связь с производителем доступна.

Покупатель может отправить запрос на отмену (PROPOSED case), но не может сам вызвать `cancelAllocation`. Нет контрактного refund для Paid. `cancelOffer` прекращает новые reservations, не отменяет автоматически существующие allocations; доплата/возврат/default — отдельные действия.

Минимум депозитного платежа и срок берутся из offer; UI MVP предлагает только `Pay in full` или `Pay minimum deposit`. Произвольные частичные платежи после reservation могут поддерживаться адаптером, но основной UI предлагает `Pay remaining balance`. При depositBps=0 депозитный выбор отсутствует.

Escrow-график: каждый milestone содержит bps, description и released flag; сумма bps=10000. `confirmMilestone` даёт право на выплату, `withdrawReleased` фактически переводит деньги; не показывать `Paid to producer` сразу после confirm. Контракт не требует хронологического порядка milestones и не связывает confirm с production readiness: UI требует приложенное evidence и явное подтверждение verifier (PROPOSED policy).

Если milestones не заданы до первой reservation, контракт создаёт один 100% milestone `Full release on delivery readiness`; это описание не является автоматической onchain проверкой готовности. UI фиксирует расписание до первой reservation и не показывает редактор после появления reserved/settledFunds.

### 5.3. Вторичный рынок

Listing активен, пока `active=true` и quantity>0; частичная покупка уменьшает quantity, полная закрывает listing, продавец может cancel/update price. `list` не перемещает tokens: они остаются у seller, поэтому несколько listings не являются гарантированно обеспеченными независимо друг от друга.

Перед buy читать seller balance, freeze, approval, compliance и актуальную цену. UI показывает `Availability changed` при изменении, предлагает пересчитать, не подменяет количество. Вызов `buy(listingId, quantity, maxPricePerBottle, deadline)` получает maxPrice из подтверждённого snapshot; PROPOSED UX deadline = last chain timestamp + 600 секунд. Истёкшая котировка требует нового review.

### 5.4. Доставка и споры

```text
ReadyForDelivery + eligible balance → requestRedemption → Requested (tokens in escrow)
Requested → Shipped                 (winery + shipmentDocsHash)
Shipped → Completed                 (buyer confirmDelivery; tokens burned)
Requested → Cancelled               (buyer cancelRedemption; tokens returned)
Requested | Shipped → Completed     (verifier resolves as delivery)
Requested | Shipped → Cancelled     (verifier refundRedemption / recoverEscrow)
```

`DisputeCase` — наложение workflow, не пятое Solidity состояние. Открытый спор показывает `Delivery under review`, сохраняет исходное Requested/Shipped и блокирует обычный primary CTA на UI. Выбор resolution требует rationale и evidence в case, затем отдельный подтверждённый contract action; закрывать case только после проверки receipt и нового состояния.

`refundRedemption` возвращает **bottle tokens**, не EURe. `confirmDelivery` необратимо сжигает tokens: подтверждение должно назвать lot, quantity, получателя и результат. Отгрузка сама не сжигает tokens. Покупатель после Shipped не может cancel; CTA `Report a delivery issue` открывает case.

`recoverEscrow` — operations-only recovery UI с отображением исходного и нового wallet, expiry и redemption ID. Подпись исходного buyer: EIP-712 domain `Palissage RedemptionManager`, version `1`, текущая chainId и verifyingContract; type `RecoverEscrow(uint256 redemptionId,address newWallet,uint256 deadline)`. Подпись не отправляет транзакцию и не означает возврат. Новый wallet должен проходить canReceive. Хранение и транспорт подписи — private session/service, не публичный URL.

### 5.5. Ортогональные ограничения

| Сигнал | Как показывать | Что блокировать/сохранять |
|---|---|---|
| Lot Suspended | `Lot temporarily restricted` + причина, если доступна | Новые покупки и обычные transfers блокировать; показать путь resolution |
| Frozen balance | `N bottles restricted`, доступно `max(balance-frozen,0)` | Только доступный unfrozen объём; frozen может превышать текущий balance |
| Primary paused | Баннер на primary actions | createOffer/reserve/payRemainder запрещены; cancellation/default/withdraw не помечать автоматически запрещёнными |
| Secondary paused | Баннер на secondary actions | list/buy запрещены; update price/cancel остаются отдельными capabilities |
| Compliance expired | `Account eligibility needs review` | Новые transfers/mint; не превращать баланс в 0; recovery остаётся отдельным процессом |
| RPC/evidence stale | `Last updated … · Refresh required` | Подписание зависит от fresh read; historical cards остаются видимыми |

У WineLotToken и RedemptionManager в прочитанном коде нет общего `paused()`. Suspend не равен freeze; pause одного market не означает pause всего протокола. Возврат redemption использует forcedTransfer и может пройти при Suspended, но требует принимающий compliance. Burn при delivery не проверяет lot status, зато учитывает frozen escrow balance. Capability рассчитывать для конкретного метода.

## 6. Арифметика и финансовый review

Все формулы ниже — фактическая контрактная арифметика целых чисел. `B=10000`, `q` — целые бутылки, `p` — pricePerBottle в базовых единицах, `floorDiv` — округление вниз, `ceilDiv(a,b)=(a+b-1)/b` при b>0.

| Значение | Формула / правило |
|---|---|
| Primary totalDue | `T = BigInt(q) * p` |
| Минимальный депозит | `D = (T * depositBps) / B` с floor; depositBps=0 отключает депозит |
| Остаток | `T - allocation.paidAmount` |
| Primary fee | `floor(grossWithdrawnNow * primaryFeeBps / B)`; удерживается из выплаты winery |
| Winery proceeds | `grossWithdrawnNow - primaryFee`; покупатель не платит T+3% |
| Право на выплату | `entitled = floor(settledFunds * releasedBps / B)` |
| Доступно к выводу | `gross = max(entitled - withdrawnGross, 0)` |
| Допустимость refund | `floor((settledFunds-paidAmount)*releasedBps/B) >= withdrawnGross` |
| Default: уже выплаченная доля | `A = settledFunds==0 ? 0 : ceil(withdrawnGross * paidAmount / settledFunds)` |
| Default: новая выплата | `P=paidAmount-A`; fee=`floor(P*primaryFeeBps/B)`; winery получает `P-fee` |
| Secondary total | `S=q*p`; это сумма, которую платит buyer |
| Secondary protocol fee | `F=floor(S*secondaryFeeBps/B)` |
| Winery royalty | `R=floor(S*lot.royaltyBps/B)` |
| Seller net | `S-F-R`; royalty и fee входят в S, не добавляются сверху |

Значения по умолчанию в исходниках: primaryFeeBps=300, secondaryFeeBps=200; оба меняются админом, максимум 1000. royaltyBps задаётся при создании lot, максимум 1000. UI читает реальные значения; demo явно фиксирует свои. depositBps <10000. Primary fee применяется при выплате/default, не в момент reserve: на producer review это estimate по текущей ставке, окончательное значение — из receipt/event.

Канонический demo пример: `demo-lot-001` / `demo-offer-001`, totalBottles=2400, EnPrimeur, Verified/Growing, price €8.40, depositBps=3000, primaryFeeBps=300, royaltyBps=250. Для этой основной партии стартовый buyer-ready не имеет allocations или minted supply; исторические данные других партий заданы отдельно в05. Покупка 120 бутылок: total €1008.00, депозит €302.40, остаток €705.60; после доплаты mintedEver=120. Полный primary withdrawal: fee €30.24, winery €977.76. Offer end `2026-10-31T22:59:59Z`, fullPaymentDeadline `2027-02-28T22:59:59Z`, ReadyForDelivery в demo clock — 15 июня 2027 года.

Secondary пример того же сценария: demo-buyer-001 продаёт demo-buyer-002 24 бутылки × €9.20 = €220.80; demo secondaryFeeBps=300 → fee €6.624, royalty 2.5% → €5.52, seller net €208.656. Demo-ставка сознательно отличается от исходного default200bps; testnet использует считанное значение. Все значения показывать до 3 десятичных знаков в expanded exact breakdown, чтобы сумма визуально сходилась. После сделки balances 96/24. После redemption 60 бутылок первого buyer: balances 36/24, redeemed=60, mintedEver=120, circulating=60 по основной партии. Номинал demo — учебные евро; testnet — tEURe units, знак € не означает банковскую операцию.

Не использовать float, `toFixed` перед parseUnits или скрытое округление к центам для отправки суммы. При несовпадении суммы в 2 десятичных знаках с точным amount показывать расширенную точность в `Exact amount`; approve и действие получают исходный bigint. Если floor deposit даёт 0 на искусственно малой цене, UI блокирует такую депозитную покупку с `Deposit amount is below supported precision` (PROPOSED ограничение).

Checkout MUST показывать количество бутылок, цену/бутылку, lot subtotal, payment token/chain, pay now, remaining balance и deadline; gas отдельно и только testnet. Налоги, доставка, акцизы, страховка и конвертация не вычисляются текущими контрактами: выводить `Shipping and applicable taxes require a separate quote`, не показывать €0 или обещание landed price. `exportAllowed=true` не подтверждает возможность доставки в выбранную страну.

## 7. Предлагаемый adapter contract

UI обращается только к адаптеру; страницы не выбирают между `mock` и `wagmi` самостоятельно. Использовать существующий React/TypeScript stack и отдельные Domain/ViewModel слои. API ниже — новое локальное соглашение, не существующие серверные endpoints.

```ts
type QueryResult<T> = { data: T; origin: DataOrigin; receivedAt: string;
  completeness: 'complete' | 'partial'; warnings: string[]; nextCursor?: string };
type Query = { resource: 'lots' | 'offers' | 'allocations' | 'positions' | 'listings'
  | 'redemptions' | 'settlements' | 'participants' | 'activity' | 'documents'
  | 'cases' | 'reviews' | 'producers' | 'drafts' | 'trades' | 'passports';
  id?: EntityId; actorId?: EntityId; lotId?: EntityId; cursor?: string; limit?: number };
type ActionName = 'createLot' | 'verifyLot' | 'setProductionStatus' | 'updateLotMetadata'
  | 'suspendLot' | 'unsuspendLot' | 'closeLot' | 'createOffer' | 'cancelOffer'
  | 'setMilestones' | 'reserve' | 'payRemainder' | 'cancelAllocation' | 'claimDefault'
  | 'confirmMilestone' | 'withdrawReleased' | 'list' | 'buy' | 'updateListingPrice'
  | 'cancelListing' | 'requestRedemption' | 'markShipped' | 'confirmDelivery'
  | 'cancelRedemption' | 'refundRedemption' | 'recoverEscrow' | 'setFrozenTokens'
  | 'forcedTransfer' | 'pausePrimary' | 'unpausePrimary' | 'pauseSecondary'
  | 'unpauseSecondary' | 'assumeRole' | 'assignRole' | 'revokeRole';
type Command = { action: ActionName; entityId?: EntityId; actorId: EntityId;
  args: unknown; expectedRevision: string; clientRequestId: string };
type PreparedAction = { id: string; mode: Mode; command: Command;
  capability: Capability; expiresAt: string; snapshotFingerprint: string;
  approvals: { token: Address; spender: Address; kind: 'erc20' | 'erc1155';
    amount?: UnitString; required: boolean }[]; summary: Record<string, string> };
type Receipt = { id: string; mode: Mode; action: ActionName; entityId?: EntityId;
  state: 'submitted' | 'confirmed' | 'reverted' | 'replaced' | 'unknown';
  txHash?: Hex; replacementHash?: Hex; blockNumber?: string;
  domainEventIds: string[]; occurredAt: string };
interface PalissageAdapter {
  readonly mode: Mode;
  read<T>(query: Query, signal?: AbortSignal): Promise<QueryResult<T>>;
  capabilities(entityId?: EntityId): Promise<Record<string, Capability>>;
  prepare(command: Command): Promise<PreparedAction>;
  approve(preparedId: string, approvalIndex: number): Promise<Receipt>;
  execute(preparedId: string): Promise<Receipt>;
  receipt(receiptId: string): Promise<Receipt>;
  resetDemo?(): Promise<void>;
}
```

При реализации заменить `args: unknown` на discriminated payload union с runtime validators по каждой `action`; component не может передать произвольные calldata/address. Разные resource имеют map типов; generic `read<T>` не должен позволять пропустить runtime validation. `clientRequestId` предотвращает повтор в demo и двойной UI submit; это не обещание onchain idempotency.

Offchain workflow — отдельный **PROPOSED** `WorkflowAdapter` с `read` и `submit(command)`. Command types: `saveLotDraft`, `submitLotReview`, `requestLotChanges`, `submitMilestoneEvidence`, `requestAllocationCancellation`, `reportDeliveryProblem`, `addCaseEvidence`, `recordParticipantReview`, `attachSampleDocument`. Каждый несёт entityId, actorId, expectedRevision, clientRequestId и валидируемый payload соответствующей формы02; document fields содержат разрешённые DocumentRef IDs, не произвольные paths. Возвращает `WorkflowRecord {id, kind, entityId, state, revision, origin, createdAt, updatedAt}` и связанные activity IDs. Review state `draft/submitted/needs_changes/accepted/rejected`; case state — DisputeCase. `accepted` review не заменяет отдельный onchain verify/milestone action. Attachment ready — не certification. Demo реализует эти действия в том же локальном атомарном store; testnet без workflow service возвращает `INTEGRATION_UNAVAILABLE`, не имитирует отправку. Enquiry P0 — отдельный local download, не workflow submission. Приватные payload не сохраняются в demo event log.

DemoAdapter реализует доменные переходы и арифметику выше; simulation receipt не имеет txHash. TestnetAdapter использует generated ABI и конкретный deployment manifest с `chainId=421614`, адресами, ожидаемыми artifact versions, payment token/decimals и deployment start block. Отсутствие manifest/bytecode/обязательного адреса/совпадения token decimals даёт `CONFIGURATION_ERROR`; проверки manifest не объявлять выполненными по исходному README.

Manifest также содержит `deploymentId` и `transportKind: public_testnet | local_fork`; fork с тем же chainId не получает ссылки на публичный explorer. Ключи query cache включают mode, deploymentId, chainId, contract, account и entityId; fixtures и chain records никогда не объединяются по одному числовому ID.

Contract reads: `lotCount/getLot/lotExists`, `offerCount/offers`, `allocationCount/allocations`, `listingCount/listings`, `redemptionCount/redemptions`, `getMilestones`, `settledFunds`, `withdrawnGross`, `releasedBps`, `withdrawable`, `offeredPerLot`, `balanceOf/getFrozenTokens/canSend/canReceive/canTransfer`, allowance/approval, claims и roles. `getLot` для неизвестного ID возвращает zero struct: проверять `lotExists`/ненулевой winery, а не показывать пустой Draft.

Чтения пагинировать (UI page size 12 для marketplace, 20 для операций); contract batch limit 50 записей, maximum concurrency 3. Для небольшого testnet допустим count+batched reads с настраиваемым пределом 200 записей; при превышении показывать `Index required`, не молча обрезать totals. Indexer — будущий adapter, не установленная инфраструктура. Частично неуспешный batch возвращает `partial` и число пропусков; неизвестные balances не равны нулю.

## 8. Транзакции, обновления и восстановление

State machine UI: `idle → validating → awaiting_approval_signature → approval_submitted → approval_confirmed → awaiting_action_signature → action_submitted → confirming → succeeded`. Ветки: `rejected`, `reverted`, `timeout_unknown`, `replaced`, `cancelled_before_submit`. Approval — самостоятельное действие с собственной квитанцией; результат approval никогда не называется reservation/payment/delivery.

1. `prepare`: свежий chain snapshot, account, contract config, exact amount, balance, gas balance, compliance, current lot/offer state, expiry; simulation целевого метода после проверки allowance. Если allowance недостаточен, сначала готовить approval, затем повторно симулировать сам метод после approval receipt.
2. ERC20 approve запрашивает ровно требуемую сумму конкретному spender. Для primary spender=PrimaryMarket; secondary=SecondaryMarket. ERC1155 `setApprovalForAll` нужен SecondaryMarket для продажи и RedemptionManager для redemption; review объясняет, что permission действует на все lot tokens и как его отозвать.
3. После approval receipt со status success заново прочитать allowance/approval и доменные условия. Изменившиеся цена, количество, deadline, права, режим, account или chain инвалидируют prepare; показать новый review, не переиспользовать старую подпись.
4. После action submit немедленно сохранить публичный txHash, chainId, action и ожидаемый entity context в минимальную локальную pending запись. Отправка не означает успех. Повторное нажатие и back/forward не отправляют второй раз.
5. Receipt `status=success` обязателен; извлечь matching event с правильным contract address, buyer, offerId/lotId и количеством, затем перечитать соответствующую запись. Для reserve использовать `AllocationCreated` и новый `allocations(id)`; для Paid дополнительно полную оплату/баланс. ID не угадывать из локального count+1.
6. `succeeded` допускается после receipt и reconciliation. Если receipt успешен, а fresh read не получен, показать `Transaction confirmed · Updating records` и кнопку refresh, не отправлять повторно. Один confirmation — `Confirmed on testnet`; слово `Final` не использовать без отдельной политики финальности.
7. Через 90 секунд без receipt показать `Still pending` с explorer link и продолжить проверку с backoff; отсутствие receipt не означает failure. При replacement отслеживать новый hash; отменяющую replacement показывать как отмену, а не successful business action.
8. При смене account/chain/disconnect сбросить приватные query caches и prepared actions, отменить незавершённые reads, сохранить tracking уже отправленного tx под исходным actor. Новому account не показывать приватные документы/формы предыдущего. Не повторять write автоматически после reconnect.
9. На reload перечитать pending receipts; QR, copy и explorer должны использовать реальные идентификаторы только в testnet. Demo history содержит локальные reference IDs и постоянный маркер simulation.

Политика свежести: публичные editorial данные кешируются по revision; testnet transactional snapshot старше 15 секунд считается stale для write и перечитывается; read-only карточки могут показывать данные до 60 секунд с `Updated …`. Polling 15 секунд только на видимой вкладке; после receipt targeted invalidation; фоновые анимации не инициируют сетевые запросы. Чтения повторяются до 2 раз с backoff 1/3 секунды; writes автоматически не повторяются.

## 9. Ошибки и пограничные состояния

| Код адаптера / контрактная причина | Английский текст | Следующее действие |
|---|---|---|
| `WALLET_REJECTED` | `You cancelled the wallet request. Nothing was submitted.` | Вернуться к review; сохранять несекретные поля |
| `WRONG_NETWORK` | `Switch to Base Sepolia to continue.` | Явная кнопка switch, без auto-switch при открытии страницы |
| `CONFIGURATION_ERROR` | `Testnet setup is incomplete.` | Diagnostics с безопасными полями; demo по отдельной ссылке |
| `INSUFFICIENT_FUNDS` | `Insufficient test token balance.` | Показать required/current и проверенную инструкцию получения test assets |
| `INSUFFICIENT_GAS` | `Test ETH is needed for network fees.` | Faucet help; не обещать выдачу средств сайтом |
| `NotBuyer` / `NotWinery` / `ERC7943CannotReceive` | `Your account is not eligible for this action.` | Onboarding status / sandbox role flow |
| `OfferEnded` / `OfferNotStarted` | `This offer is not open for reservations.` | Показать корректные даты и альтернативные offers |
| `InsufficientOfferQuantity` / seller balance changed | `Availability changed. Review the updated quantity.` | Refresh + ручное подтверждение |
| `PriceExceedsLimit` / `DeadlineExpired` | `The quote changed or expired.` | Пересчитать и снова review |
| `PaymentDeadlinePassed` | `The payment deadline has passed.` | Allocation details и контакт производителя |
| `RefundExceedsUnreleasedEscrow` | `This refund requires an operations review.` | Показать case, без обещания немедленного возврата |
| frozen / Suspended / paused | `This action is temporarily restricted.` | Конкретная причина и доступный recovery path |
| `RPC_UNAVAILABLE` / `STALE_READ` | `We could not refresh testnet data.` | Retry, время последнего чтения, disable write |
| `UNKNOWN_TRANSACTION` | `Transaction status is not confirmed yet.` | Receipt tracking, без кнопки повторной оплаты |
| metadata not found / mismatch | `Lot information is unavailable` / `Evidence does not match the recorded hash` | Основные chain fields остаются, evidence warning |

Каждая коллекция имеет loading skeleton, empty state с релевантным CTA, filtered-empty с `Clear filters`, partial state, retry state. Unknown enum отображается `Unsupported contract state`, блокирует write и создаёт diagnostic event; запрещён fallback к Draft. Form validation различает клиентскую ошибку до подписи и revert после отправки; raw stack/RPC payload скрыт, безопасный error code доступен в details.

## 10. Metadata, загрузки и приватность

Иллюстрации и публичные документы подключать через asset manifest из раздела контента/ассетов, не из произвольного пользовательского URL. Metadata JSON имеет schemaVersion, размер не более 256 KiB, лимиты строк (name 120, description 4000), whitelist полей, проверку MIME/схемы URL. Запрещены HTML rendering, javascript/file/data URL и выполнение SVG из metadata; HTTPS/IPFS gateway только из конфигурации. Не загружать private документы через публичный gateway.

Для нового testnet точная расширенная schema/публикация/hash определены Chain/09 §5; chain ID/lot ID связываются через seed mapping, sample metadata не является доказательством onchain identity.

PROPOSED metadata schema: `schemaVersion`, `lotId`, `producerId`, `localeContent`, `assetIds`, `documents`, `commercialTerms`, `revision`, `updatedAt`. В demo файлы статические и содержат вымышленные сведения. Backend загрузки, KYB-provider, carrier API и хранилище private документов в прочитанных исходниках не установлены: показывать их как planned integration; не имитировать реальную отправку персональных данных.

PROPOSED upload policy: не более 5 документов на submission, каждый ≤10 MiB, суммарно ≤25 MiB; PDF/JPEG/PNG, проверка сигнатуры/MIME, не только расширения; product image JPEG/PNG/WebP ≤8 MiB и ≤24 MP. SVG/HTML/ZIP/executable attachments запрещены. PDF не исполняет active content; браузерный preview изолирован. В demo P0 default — выбор заранее созданного sample документа, не загрузка реального KYC. Если drag/file picker демонстрируется, file bytes и имя остаются в памяти до закрытия формы, после refresh нужен повторный выбор. Testnet upload выключен без private service; клиентская проверка не заменяет server validation.

Evidence requirements для demo review: Growing/Announced — sample producer declaration и lot specification; Harvested/Vinification/Aging — дополнительно sample production record; Bottled/ReadyForDelivery — sample bottling/availability record. Это предложенная operational policy, не требование Solidity. Milestone final release требует sample readiness record и review; shipment требует отдельный shipment record. У каждого файла caption и watermark sample. В testnet P0 без private service доступны только versioned sample bundles по Chain/09; отсутствие обязательного sample документа блокирует sandbox review. Реальная экспертиза/подача документов остаётся недоступной, сертификат не генерируется.

В demo формы доставки используют вымышленные company/contact/address с `.example` email; разрешается локальное редактирование, но перед полем есть `Use fictional details`. Ничего не отправляется в сеть. В testnet реальную PII не принимать, пока не подключён утверждённый private service и retention policy; использовать test delivery data. `deliveryDataHash`/`shipmentDocsHash` — commitments к данным вне chain, не способ безопасно опубликовать адрес открытым текстом.

Для demo commitments определить единый формат: canonical JSON с сортировкой ключей, UTF-8, version и заранее заданным fixture salt внутри искусственного payload, затем keccak256; reset воспроизводит тот же результат. Для testnet формат согласовать с хранилищем/операциями прежде записи; будущий private service использует новый криптографически случайный salt, недоступный в публичном URL/analytics. Не утверждать, что контракт проверяет содержимое hash. Проверка hash должна указывать алгоритм и файл/manifest, к которому он относится.

MUST NOT хранить KYC/KYB документы, паспортные данные, адрес доставки, auth tokens, EIP-712 signatures или персональные заметки в localStorage, query string, публичной analytics или логах. Допустимы locale, reduced-motion preference, demo seed/events без PII, chain ID и public pending txHash. Форма реального upload появляется только при доступной авторизованной интеграции; fixture upload показывает `Demo attachment`, не `Verified`.

Demo event persistence записывает только fixture contact/address IDs; любой вручную введённый текст адреса/контакта держать в памяти до закрытия формы и не сериализовать. Предупреждение `Use fictional details` не заменяет это правило.

## 11. Наблюдаемые отличия от текущей реализации

| Наблюдение в разрешённых исходниках | Требование новой реализации |
|---|---|
| `ReserveFlow.tsx` в live выполняет только EURe approve; вызова reserve нет; modal title после шага — `Allocation reserved` | Разделить approval и reserve, success только по matching receipt/state; это обязательный интеграционный gap |
| ReserveFlow прибавляет 3% к subtotal, использует 30% депозит и фиксированную дату 15.09.2026 | Контрактные формулы, offer.depositBps и fullPaymentDeadline; fee удерживается из winery payout |
| Offline reserve автоматически становится success через 1800ms и рисует fake tx fragment | Demo reducer меняет domain data; reference `DEMO-*`, без explorer; запись появляется в portfolio |
| config по умолчанию Arbitrum One, неизвестный chain ID также выбирает Arbitrum | MVP default demo, explicit Sepolia; неподдерживаемый ID — ошибка, mainnet write disabled |
| `isContractsConfigured` проверяет только WineLotToken и EURe; fallback связан с настройкой адресов | Явный режим и полный validated deployment manifest по нужной capability |
| Session local role при отсутствии gateway; role label смешивается с тестовым режимом | Изолированный demo actor и per-contract testnet capabilities |
| `useOnchainLots` читает count→все lot IDs, пропуски silently фильтрует, неизвестный status заменяет Draft | Пагинация, partial errors, complete record и Unsupported state |
| `useChainTx` возвращает true после wait без явной проверки receipt status; при отсутствии client wait пропускается | Проверка receipt, events, reconciliation; unknown остаётся unknown |
| Contracts README пример вызывает `lots`; Solidity предоставляет `getLot` | ABI и исходник — authority; использовать точные методы, не копировать ошибочный пример |
| Существующие contract structs не содержат profiles, imagery, logistics quote, KYB workflow, dispute cases | Явные offchain view models с source labels; интеграции не объявлять уже созданными |

## 12. Обязательная приёмка интеграции

- **DC-01**: demo работает без wallet extension/RPC, а после загрузки необходимых assets — без внешней сети; для гарантированного offline refresh используется локальный static preview. Reset возвращает исходный snapshot, один action меняет buyer/winery/operations представления согласованно.
- **DC-02**: ошибка testnet RPC/config не превращает данные в fixture, не даёт успешную покупку и не включает mainnet.
- **DC-03**: approve success без reserve сохраняет `Spend approved · Continue to reserve`; allocations/balance не изменены, повторное продолжение не требует лишнего approval.
- **DC-04**: полный primary purchase даёт Paid + event + нужный wallet balance; deposit даёт Reserved без mint; remainder даёт Paid только при totalDue.
- **DC-05**: расчёты совпадают с bigint formulas, включая дробные bps, минимальную единицу, ceil в default и fee из seller/producer proceeds; два locale показывают одинаковый underlying amount.
- **DC-06**: deadline boundary покрывает до/ровно/после, default не активируется без action, cancelOffer не удаляет receipts; buyer не получает несуществующую кнопку onchain refund Paid.
- **DC-07**: insufficient allowance/balance/gas, rejected signature, reverted receipt, pending timeout, replacement, reload и смена account не приводят к ложному success/дубликату write.
- **DC-08**: secondary price/quantity меняются перед подписью → новый review; royalty и fee точны; seller token approval и live unfrozen balance проверены.
- **DC-09**: redemption requested escrow, shipped, completed burn и cancelled return отражаются во всех ролях; после Shipped buyer cancel недоступен; спор сохраняет onchain state.
- **DC-10**: pause каждого market, Suspended lot, frozen wallet и revoked compliance проверяются раздельно; recovery не предлагается без нужного отдельного verifier role.
- **DC-11**: документы с отсутствующим hash, изменённым metadata и fixture evidence не получают badge реальной проверки; public passport не раскрывает private buyer data.
- **DC-12**: partial reads, несуществующий ID, unknown enum, пустая коллекция и stale snapshot имеют отличающиеся UI состояния; ни один read error не превращается в нулевой баланс.
- **DC-13**: testnet acceptance выполняется только с test assets и подтверждённым manifest; отчёт отдельно фиксирует что проверено в demo, локальном окружении и публичной testnet. Green UI tests не заявляются как доказательство live trading.

Каждый реализующий агент сдаёт список изменённых разрешённых файлов, закрытые DC-критерии и оставшиеся BLOCKED dependencies. Проверки в этом разделе — план будущей реализации; в рамках подготовки документации они не запускались.
