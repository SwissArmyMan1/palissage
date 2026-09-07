# 07. План реализации и задания агентам

Это план будущей разработки. Никакая команда, задача или установка ниже не выполнена при написании ТЗ. Разработка начинается отдельным поручением владельца. Координатор может использовать этот пакет как единственный продуктовый brief; бизнес-правила нельзя восстанавливать по старым mock-экранам.

## 1. Архитектура реализации

Сохранить React + TypeScript + Vite, Tailwind3 и существующий framer-motion. CSS tokens из03; routing из02; тексты из05. Вводить новые модули последовательно, подключая через существующие `App.tsx`, `router.tsx`, `main.tsx`. Изменения этих entry points принадлежат одному integration owner.

Рекомендуемая структура будущих файлов внутри `UI/web/src`:

```text
domain/
  types.ts                 normalized records, discriminated unions из04
  money.ts                 bigint calculations and formatting
  validators.ts            runtime command/data validation
  capabilities.ts          rules per entity/action/mode
adapters/
  types.ts                 typed PalissageAdapter + WorkflowAdapter
  demo/fixtures.ts          canonical05
  demo/reducer.ts           atomic state transitions
  demo/persistence.ts      versioned local sample events, no PII
  demo/adapter.ts
  testnet/config.ts        validated manifest, mainnet disabled
  testnet/read-model.ts
  testnet/adapter.ts
  testnet/transactions.ts  explicit approval/action/receipt lifecycle
app/
  environment.tsx          explicit demo/testnet, no inferred fallback
  demo-tour.tsx            scenario clock/role/tour UI state
  route-manifest.ts        route IDs and role visibility
  query-keys.ts            mode/deployment/account scoped keys
content/
  en.ts / fr.ts            shared keys and screen copy
  lots.ts / producers.ts   editorial data with provenance
  assets.manifest.json     public-safe media registry
components/
  ui/                     existing primitives evolved by one owner
  layout/                 existing shells evolved by one owner
  trade/                  MoneySummary, QuantityInput, EvidencePanel,
                          LotTimeline, ActionReview, PositionSummary
features/
  public/                 landing, catalogue, lot, producer, pilot, legal
  demo/                   launcher, controls, tour
  buyer/                  overview, allocations, position, reserve, secondary
  winery/                 lots, wizard, offer, finance
  operations/             participants, lot review, milestone review
  fulfilment/             buyer/winery delivery, operations case
  passport/               public lot passport
  account/                role-specific account/eligibility
```

Это соглашение о целевой структуре, не разрешение каждому агенту редактировать все указанные каталоги. Новые component файлы именуются PascalCase; data/helpers kebab-case или принятый в репозитории стиль, один стиль внутри модуля. Существующие generated ABIs сохраняются. Прямые calls к wallet/contract внутри page компонента запрещены: они проходят через adapter.

Контентные страницы и application shell должны lazy-load раздельно. Import RainbowKit/wagmi не должен затягивать wallet bundle на первый публичный экран. Для формы допускается native validation + собственные runtime validators; новую form/state библиотеку добавлять только с конкретной потребностью. В демо достаточно reducer + context/query adapter; не нужен backend только ради показа.

## 2. Правила координации и строгого scope

1. Координатор перед первой правкой читает применимые AGENTS.md, проверяет `git status`, сохраняет перечень исходных изменений и инвентарь текущих файлов. Это действия координатора с проектным scope.
2. Каждая делегация получает **точные существующие пути** на read/write, перечень новых output-файлов и working directory. Каталог сам по себе не разрешает чтение существующих siblings. Относительные пути таблиц ниже координатор разворачивает в абсолютные.
3. В пакет read inputs включаются только нужные документы этого ТЗ и перечисленные исходники. Чтение AGENTS.md, config, package/lockfile или dependency даже для теста требует включения соответствующего существующего файла в allowlist.
4. Файл имеет одного write owner в данный момент. Новый модуль до импорта может разрабатываться параллельно; entry points, shared primitives, locale dictionaries, package/lockfile редактируются последовательно владельцами.
5. Если нужен неразрешённый файл: `SCOPE_EXPANSION_REQUIRED: <exact path> — <reason>`. Агент продолжает независимые разрешённые части, не читает файл до расширения scope.
6. Build/test tools транзитивно читают config, dependencies и imports. Узкий file-scoped агент **не запускает** npm/tsc/test runner, если их чтение выходит за allowlist. Он сдаёт patch; координатор запускает проверки в разрешённом project scope либо создаёт капсулу с полным явным read inventory. `cd` не обеспечивает изоляцию.
7. Не начинать изменения контрактов, governance, public deployment, отправку заявок и внешних сообщений в рамках UI task. Неподдержанная capability получает достоверное unavailable state.
8. Текущие исходные файлы не удаляются массово. После подключения новой страницы legacy route получает redirect или явный replacement. Чистка проводится отдельно после usage check.

Пакет ТЗ лежит в `specifications/ui-mvp/`, поскольку существующий `.gitignore` исключает весь `docs/`. Эта документация не требует изменения `.gitignore` и будет видна как обычные новые файлы.

## 3. Последовательность этапов

```text
A00 scope/contracts baseline
 ├── A01 domain + shared fixture engine
 ├── A02 visual primitives
 └── A03 media + content
       ↓
A04 shells/routes/modes (integration owner)
 ├── A05 public pages
 ├── A06 primary buyer journey
 └── A07 winery creation/offers
       ↓
A08 verification/milestones → A09 secondary → A10 delivery/passport
       ↓
A11 guided demo + account + failure scenarios
       ↓
A12 testnet adapter (can start read-only earlier after A01)
       ↓
A13 full QA / visual review → A14 demo rehearsal and reviewable release
```

A01–A03 независимы при согласованных types/assets keys. Не запускать A05–A10 как шесть независимых приложений: они используют один store, event model и reusable trade components. Для менее мощной модели один task ниже делится на один экран или один state machine за итерацию.

## 4. Карточки задач

Все задачи наследуют четыре неизменяемых правила: only assigned files; exact content05; exact finance04; no fake success. `Outputs` ниже — ожидаемые новые пути, не текущие существующие файлы. Если путь уже существует к моменту делегации, координатор обязан включить его в явный read/write allowlist.

### A00 — Подготовка координатором

- Inputs: весь пакет ТЗ; `UI/web/package.json`, `UI/web/package-lock.json`, `UI/web/src/App.tsx`, `UI/web/src/main.tsx`, `UI/web/src/router.tsx`, `UI/web/src/lib/zone.ts`, применимые config и инструкции после инвентаризации.
- Действия: зафиксировать Node/npm из фактической среды и package engines; сохранить lockfile; записать первоначальные build/lint results, не исправляя посторонние ошибки. Уточнить точные route→screen mapping и typed adapter contract.
- Outputs: `specifications/ui-mvp/implementation-baseline.md` и отдельные task capsules с exact paths. Этот новый файл создаётся только будущим координатором, не является выполненным результатом текущего ТЗ.
- Установки только в рамках согласованного scope: test tooling и asset processor при необходимости; версии фиксируются manifest+lockfile. Не переносить из старого web README машинно-специфичный путь Node.
- Приёмка: ясные owners, исходный статус, отсутствуют дублирующие types, scripts имеют определённые команды. Любое выявленное расхождение source04 оформлено до реализации.

### A01 — Типы, деньги и demo engine

- Inputs: 01,04,05; прочитанный contract API выдаёт координатор; необходимости читать весь repository у агента нет.
- Outputs: точные файлы `domain/types.ts`, `domain/money.ts`, `domain/validators.ts`, `domain/capabilities.ts`, `adapters/types.ts`, `adapters/demo/fixtures.ts`, `adapters/demo/reducer.ts`, `adapters/demo/persistence.ts`, `adapters/demo/adapter.ts`.
- Порядок малых задач: типы/расчёты → seeds → reserve/pay → secondary → redemption → other capabilities → persistence. К каждому переходу есть typed input, permitted pre-state, atomic mutation, event и error.
- Запрет: отдельные page mock-массивы; случайные балансы; `Math.random` IDs; автосмена даты/production; storage произвольного contact/address; testnet type casts для demo wallet IDs.
- Приёмка: числовой сценарий05 воспроизводим без DOM. После reset byte-equivalent canonical data, после reload прежний committed state. DC-01/04/05/06/08/09 в simulator coverage.

### A02 — Tokens и компоненты

- Inputs:03; existing exact files по инвентарю: `src/index.css`, `src/components/ui/Button.tsx`, `Field.tsx`, `Modal.tsx`, `Table.tsx`, `Tabs.tsx`, `Stepper.tsx`, `StatusBadge.tsx`, `LotCard.tsx`, `src/components/layout/Page.tsx`. Здесь все сокращённые имена относятся к явно перечисленному `src/components/ui/`, координатор разворачивает пути.
- Write owner: shared tokens/primitives; единственный агент в этой области.
- Новые outputs: `components/trade/QuantityInput.tsx`, `MoneySummary.tsx`, `EvidencePanel.tsx`, `LotTimeline.tsx`, `ActionReview.tsx`, `PositionSummary.tsx`; полный путь для каждого раскрывается в capsule.
- По одному компоненту: props, disabled/loading/error/focus, long copy, keyboard, mobile; затем motion из03. Form data не живёт только внутри анимированного presentation wrapper.
- Приёмка: state gallery на dev-only route `/_ui`; он не включён в public production build. Контрасты, focus, dialogs, typography проверены по03. Никаких default orange/blue browser-style buttons посреди дизайна.

### A03 — Контент и media

- Inputs:05–06 и03; существующие brand assets — только после отдельного точного allowlist и визуального просмотра.
- Outputs: `src/content/en.ts`, `fr.ts`, `lots.ts`, `producers.ts`, `assets.manifest.json`; выбранные assets/public paths06, `scripts/prepare-media.mjs`; synthetic documents из05.
- Шаги: словарь shared/navigation → public copy → form/error copy; asset shortlist → acquisition → crop → manifest → contact sheet. Generative assets идут по06; не превращать задание в Figma/Adobe account setup, если для результата это не нужно.
- Locale owner добавляет недостающие widget labels из02 с тем же стилем; domain enum labels также EN/FR. Другие агенты запрашивают key, не пишут английский inline.
- Приёмка: нет missing locale keys, broken paths, unlicensed placeholders. Все assets `approved_for_demo`; master/license/private files отсутствуют в dist. Суммы берутся из fixtures, не из content dictionaries.

### A04 — App shell, routing и mode boundary

- Dependencies: A01/A02 и базовые locale keys A03.
- Owner existing: `src/App.tsx`, `src/main.tsx`, `src/router.tsx`, `src/lib/zone.ts`, `src/components/layout/PublicShell.tsx`, `DashboardLayout.tsx`, `ConsumerShell.tsx`, `Logo.tsx`, `src/lib/nav.tsx`; точный перечень согласовать с baseline.
- New outputs: `app/environment.tsx`, `app/route-manifest.ts`, `app/query-keys.ts`; feature routes загружаются лениво.
- Маршрут без выбранной среды не угадывает live. Deep links, Back/Forward, 404, title/focus restoration, role nav, mobile menu, footer, local language preference работают.
- Legacy mapping: `/shop`→`/app/marketplace`, `/shop/portfolio`→`/app/buyer/allocations`; `/winery`→`/app/winery/overview`; `/admin`→`/app/operations/overview`; `/consumer/passport`→sample passport **только в demo**. Для id links нужен явный mapping; неизвестные ID→404. Не переносить fake ID в testnet.
- P0 один origin. Старые subdomain/zone flags не должны конфликтовать с canonical router; unsupported legacy mode показывает migration notice/redirect, не создаёт второй независимый store.
- SYS-07/08 используют общий с публичным каталогом UI, но app adapter и текущий mode; переходы из testnet workspace сохраняют testnet и не открывают sample offers вместо реальных.
- Приёмка: все screen IDs02 разрешаются; нет empty Placeholder на P0, даже если модуль пока не подключён — task считается незавершённой, а не сданной с заглушкой.

### A05 — Public experience

- Inputs:02 PUB-01..08/PAS-01,03,05,06; A01 read APIs; A02 component contracts.
- Outputs по одному экрану: `features/public/Landing.tsx`, `Marketplace.tsx`, `LotDetail.tsx`, `Producer.tsx`, `Pilot.tsx`, `Legal.tsx`.
- Порядок: hero+editorial composition → каталог+URL filters → lot/producer → FAQ/pilot/legal. Внутренний skeleton не является финальным контентом.
- Каталог:6 sample records;12 per page; zero result, ascending sort, prices, active filter removal, Back state. Public lot never prompts wallet.
- Pilot P0 download реально создаёт локальный файл; никакой отправки или вымышленного email. Legal slugs privacy/prototype/credits.
- Приёмка: UX-PUB из08, responsive screenshots, корректный crop+copy, все links. Title и meta description по странице. Static OG preview проверяется без JS.

### A06 — Buyer primary purchase

- Inputs:02 BUY-01..04/09,04,05; typed adapter/components.
- Outputs: `features/buyer/Overview.tsx`, `Allocations.tsx`, `AllocationDetail.tsx`, `PositionDetail.tsx`, `Reserve.tsx`.
- По итерациям: tables/positions → full payment → deposit → remainder → interrupted action states.
- Allocation detail — запись primary sale; Position detail — текущее владение lot, включая secondary. Ни один secondary event не становится fake allocation.
- Приёмка: UX-BUY, exact120×8.40, separate approval result, no minted tokens after deposit, reviewer can resume after refresh. Главное действие применяет adapter state, а не timeout success.

### A07 — Winery creation, offer, finance

- Outputs: `features/winery/Overview.tsx`, `Lots.tsx`, `CreateLot.tsx`, `LotDetail.tsx`, `OfferEditor.tsx`, `Finance.tsx`.
- Inputs:02 WIN-01..05,04–05. A01 commands for draft/evidence/create/offer/production/withdraw; A02 trade components.
- По одному экрану: list→wizard→lot detail→offer→finance. Draft local и onchain Draft — разные статусы. Offer creation доступно после review conditions.
- Required exact field validation02/04; schedule locked after reservation; production ≠ financial release.
- Приёмка: UX-WIN, producer-start creates canonical main lot then offer; all finance derived from ledger; secondary royalty отдельная от primary withdrawal.

### A08 — Operations and evidence

- Outputs: `features/operations/Overview.tsx`, `Participants.tsx`, `ParticipantDetail.tsx`, `Verification.tsx`, `VerificationDetail.tsx`.
- Inputs:02 OPS-01..05,04; разрешённые action types A01.
- Очередь→заявка→документы→решение→общая история. До confirm проверяется конкретный grant и document revision. Один badge verified не заменяет review.
- P0 core: participant qualification, lot review, final milestone review; advanced forced transfer/governance не включать в обычные кнопки approve. EIP-712 recovery и enforcement могут показываться read-only диагностикой до отдельной законченной specialist task; это не TestnetReady для этих capabilities.
- Приёмка: UX-OPS, нет auto approval при preview; deny/request changes имеют причину и возвращаются правильному участнику. Private data не появляется в public passport.

### A09 — Secondary market

- Outputs: `features/buyer/Secondary.tsx`, `ListingForm.tsx`, `SecondaryPurchase.tsx`; интеграция в PositionDetail через координатора.
- Inputs:02 WF-03, BUY-05/06/09,04–05; shared source ledger.
- Listing lazy, собственный expiry отсутствует; buyer quote bound/deadline обязателен. Seller balance may change; stale listing unavailable explained.
- Приёмка:24×9.20→220.800 / fee6.624 / royalty5.520 / seller208.656, balances96/24, buyer cannot buy own listing, cancel not token burn, new trade appears in correct position.

### A10 — Fulfilment and passport

- Outputs: `features/fulfilment/BuyerDeliveries.tsx`, `BuyerDeliveryDetail.tsx`, `WineryDeliveries.tsx`, `WineryDeliveryDetail.tsx`, `Cases.tsx`, `CaseDetail.tsx`; `features/passport/Passport.tsx`.
- Inputs:02 BUY-07/08,WIN-06/07,OPS-06/07,PAS-01;04–06.
- По отдельности: request form→shipment→receipt→cancel→problem/case→read-only passport. PII in memory only in demo; testnet capabilities gated by private service.
- Приёмка:Requested escrow60; after completed burned60; balances36+24. Shipped buyer cannot cancel. Dispute overlay не изменяет Solidity enum; token return не выдаётся за money refund. QR opens lot passport without wallet/camera permission.

### A11 — Guided demo, account, recovery UI

- Outputs: `features/demo/Launcher.tsx`, `Controls.tsx`, `Tour.tsx`, `app/demo-tour.tsx`, `features/account/Account.tsx`.
- Tour state отделён от domain events. Next step не совершает платёж автоматически; кнопки объясняют куда идти. Pause/close hints сохраняет состояние. Explicit advance clock updates planned stages per05.
- Account отображает locale, role/capabilities, mode, connection and demo reset. Неработающие notification/email preferences отсутствуют.
- Failure presets из05: недоступная сеть, insufficient funds, expired qualification, price change, pending unknown, delivery case; выбранная ветка не разрушает основной scenario.
- Приёмка: grant path02 за5–7мин; producer path≤8мин; начатая симуляция везде одна, role switch не сбрасывает историю. Ошибка persisted version предлагает reset без white screen.

### A12 — Отдельный testnet adapter

- Inputs:04; verified baseline deployment manifest; existing exact contract config/client/ABI/hooks files, выданные координатором после инвентаризации. Никогда `.env` с секретами или private key.
- Outputs: `adapters/testnet/config.ts`, `read-model.ts`, `adapter.ts`, `transactions.ts`; wallet bridge — отдельный lazy-loaded компонент у integration owner.
- Порядок: config validation/read-only → wallet/claims → approve/reserve/pay → secondary → redemption/milestone/withdraw capabilities. Сначала одного завершённого action доказательства, затем следующий.
- Network manifest включает token decimals и deployed addresses; несовместимый chain/bytecode/ABI/config блокирует writes. Mainnet disabled.
- Приёмка DC-02..13 с отчётом public testnet vs local fork vs mock provider. Нет real wine orders; нет claim «all flows testnet-ready» при disabled offchain prerequisites.

### A13 — QA и устранение дефектов

- Координатор выполняет08, разделяет source defects и environment failures. UI агент чинит только выданные exact files; повторяет затронутый check через координатора.
- Evidence: screenshots matrix, functional test output, accessibility report, performance trace, browser/OS/build ID, capability status table. Каждый critical path проверен минимум happy+failure+mobile+keyboard.
- Финальный read-only reviewer проверяет feature behavior против02/04/05 и внешний вид против03; отсутствие console error не заменяет UX review.

### A14 — Reviewable demo release

- Production build + local static preview; cold public link check; launch/reset/replay and shortened narrative from08.
- Output release note: что implemented-demo, что observed-testnet, что disabled; точный commit/build и evidence paths; ограничения, оставшиеся P1.
- Подготовить предложение hosted deployment с reviewable build. Само внешнее размещение выполнять лишь в рамках действующего поручения владельца; эта документация его не запускает.

## 5. Шаблон точного поручения лёгкому агенту

```text
TASK_ID: A06-3 — deposit reservation review
OBJECTIVE: Implement BUY-04 deposit path using the agreed adapter.
WORKING_DIRECTORY: <absolute approved task directory>
READ_EXISTING_EXACT:
  <absolute specification02 path>
  <absolute specification04 path>
  <absolute specification05 path>
  <absolute domain/types.ts path>
  <absolute adapters/types.ts path>
  <absolute QuantityInput.tsx path>
  <absolute MoneySummary.tsx path>
  <absolute ActionReview.tsx path>
  <absolute current Reserve.tsx path, only if already exists>
WRITE_EXISTING_EXACT:
  <absolute Reserve.tsx path, only if already exists>
CREATE_EXACT:
  <absolute output path, only if not existing>
DO_NOT:
  Read siblings/Git/config/dependencies not listed. Change schemas or contract math.
  Create a second mock store. Send messages or transactions outside demo.
ACCEPTANCE:
  120 x 8.40 => 1008; due now302.40; later705.60; reserve state Reserved; mint0.
  Reject/insufficient/stale preserve input. Approval alone never says reserved.
VALIDATION:
  Coordinator runs checks with full permitted project scope; report your own
  checks accurately. Do not run a transitive runner outside exact file scope.
HANDOFF:
  Files changed, behavior, criteria satisfied, unresolved dependencies.
  If new existing file needed: SCOPE_EXPANSION_REQUIRED with exact path/reason.
```

Реальное поручение не содержит `<...>`: координатор заменяет каждый placeholder конкретным абсолютным путём. Path prefixes, glob и «all related files» не являются exact allowlist. Outputs предыдущей задачи становятся existing input следующей, только когда явно включены.

## 6. Формат сдачи

Агент возвращает task ID; список созданных/изменённых файлов; кратко поведение; критерии из08/DC, которые закрыты; кто и каким способом проверил; ограничения; запрошенное расширение scope при необходимости. `Not run` не заменять на `Pass`. Не сдавать component как завершённый, если обязательный click handler пуст или всё ещё имитирует результат только toast.

Следующий агент получает актуальную версию контрактов данных, не копию раннего prompt. Координатор интегрирует один vertical slice, проверяет его и только затем расширяет покрытие. Финансовую модель, маршруты и locale keys менять согласованно во всех затронутых документах и fixtures.
