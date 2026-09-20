# Implementation notes — UI MVP v1

Дата: 7 сентября 2026. Реализация выполнена по пакету `specifications/ui-mvp/`.
Этот файл фиксирует **что фактически сделано**, что отличается от ТЗ и что осталось. Он не объявляет пройденной приёмку 08.

## 1. Что реализовано

Полностью переписан интерфейс в `UI/web`. Стек сохранён: React 19, Vite 8, TypeScript, React Router 7, Tailwind 3.

| Слой | Файлы | Содержание |
|---|---|---|
| Домен | `src/domain/{types,money,validators,capabilities}.ts` | Нормализованные записи 04 §3; целочисленная арифметика на `bigint`; runtime-валидаторы; capability-правила per action |
| Adapters | `src/adapters/types.ts`, `src/adapters/demo/{fixtures,reducer,persistence,adapter}.ts` | Типизированный `PalissageAdapter`; канонический dataset 05 §6; атомарный reducer; версионированное локальное хранение |
| Контент | `src/content/{en,fr,lots→fixtures,assets}.ts` | EN/FR словари; FR типизирован как `Dictionary`, поэтому отсутствующий ключ — ошибка компиляции |
| App | `src/app/{i18n,environment,actions,selectors,route-manifest,tour-*}` | Локаль, режим, actor, state machine действия, селекторы над одним снимком |
| UI | `src/components/{ui,trade,layout}` | Primitives, торговые компоненты, публичная и рабочая оболочки |
| Экраны | `src/features/**` | Все 40 screen ID из реестра 02 §2 |

Реализованы все P0-сценарии demo: WF-01…WF-07. Каждый экран реестра открывается по прямой ссылке и после refresh.

## 2. Проверенные числовые инварианты

`src/adapters/demo/__tests__/golden-path.test.ts` воспроизводит сценарий 05 §6 без DOM:

- 120 × €8.40 = €1,008.00; депозит €302.40; остаток €705.60; `minted = 0` после депозита.
- Доплата → Paid, minted-ever 120, доступность offer 2,280.
- Resale 24 × €9.20: gross `220.800`, fee `6.624`, royalty `5.520`, seller `208.656`; `fee + royalty + net === gross` побайтово; балансы 96 / 24.
- Milestone: до подтверждения оператором `withdrawable = €0.00`; после — €1,008.00.
- Delivery 60: wallet 36 / escrow 60, circulating 120; после подтверждения получения escrow 0, redeemed 60, балансы 36 + 24.
- Withdrawal: fee €30.24, winery получает €977.76; royalty €5.52 остаётся отдельной строкой.
- Reset даёт байт-идентичный снимок.

Отдельно проверено: повтор `clientRequestId` отклоняется, устаревший snapshot отклоняется, продавец не может купить свой listing, buyer не может отменить отгруженную доставку, возврат по спору возвращает бутылки и не трогает деньги.

`src/__tests__/routes.test.tsx` рендерит все 40 маршрутов и проверяет: есть `<h1>`, нет `undefined`/`NaN`, нет незаполненных `{placeholder}`; неизвестный ID даёт 404, а не первый fixture; FR-рендер не содержит английских строк и использует `8,40 €` и `2 400`.

Команды и результат на момент сдачи: `npx tsc --noEmit` — чисто; `npm run lint` — чисто; `npx vitest run` — 52 passed; `npm run build` — успех, public initial JS 126.6 kB gzip (бюджет 250), CSS 14.8 kB gzip (бюджет 60).

## 3. Отличия от ТЗ и их причины

| Пункт ТЗ | Что сделано | Причина |
|---|---|---|
| 06: лицензированные фотографии с Pexels (S1–S5), растровые деривативы `{640,960,1440}.{avif,webp,jpg}` | `scripts/prepare-media.mjs` генерирует **оригинальную векторную графику** (SVG): HERO-01, ESTATE-01, PROCESS-01, BOTTLE-01…06, SOCIAL-01 | Загрузка требует сети, ревью лицензии и человеческого решения по кадрированию. Сгенерированная графика offline, без прав третьих лиц и везде подписана как иллюстрация. Замена на фотографию — это изменение пути в `src/content/assets.ts` плюс строка кредита |
| 05 §7: демо-документы PDF | Тот же скрипт генерирует 11 валидных одностраничных PDF с watermark `SAMPLE DOCUMENT - NOT A CERTIFICATE`. Размеры и sha256 записываются в `src/content/documents.generated.ts` из реальных байтов | Панель доказательств не должна показывать вручную введённый размер файла |
| 03 §7: framer-motion для overlay | Переходы сделаны на CSS (`--motion-*` токены, `motion-dialog` / `motion-drawer` / `motion-backdrop`) | Требуемые переходы — transform/opacity без spring; CSS покрывает их без JS в критическом пути. `framer-motion` остаётся в зависимостях и не удалён |
| 05: тексты производителей 002/003 | Написаны в том же сдержанном регистре, что и утверждённый текст producer-001, с явной пометкой «fictional» | ТЗ даёт готовый текст только для producer-001 |
| 01/02: тёмная тема | Не реализована (P1) | ТЗ прямо запрещает показывать переключатель до проверенной тёмной палитры |

## 4. Что НЕ реализовано и почему

- **Testnet adapter (A12).** `/testnet` показывает экран проверок; запись заблокирована, mainnet отключён.
  *(Поправка от 8 сентября 2026: утверждение «chain ID `421614` наблюдается» было неверным дважды —
  целевая сеть Base Sepolia `84532`, и идентификатор из исходников не является наблюдением. Строка
  теперь читается «configured target …, not checked» до ответа узла. См. раздел 7, UIR-06.)* В сборке нет проверенного deployment manifest, поэтому адаптер записи не создан. Существующие `src/contracts/**` и `src/lib/wagmi.ts` **сохранены нетронутыми** как основа для A12; они не импортируются, поэтому не попадают в бандл. Заявлять `TestnetReady` для любого сценария нельзя.
- **Wallet-подключение.** Отсутствует по той же причине: подключать кошелёк к неподтверждённой конфигурации бессмысленно и вводит в заблуждение.
- **Enforcement / recoverEscrow / forced transfer / pause.** Показаны read-only с точной причиной `INTEGRATION_UNAVAILABLE`, как разрешает 04 §4 для MVP. Кнопок approve для них нет.
- **Реальная загрузка документов.** В demo выбирается заранее созданный sample-документ. Backend хранения приватных документов не установлен.
- **Pilot enquiry отправка.** P0-путь: локальный скачиваемый draft, текст `Draft downloaded. Nothing has been sent.` Адрес назначения не выдуман.
- **Скриншот-матрица 1440/834/390/360, axe-scan, INP-трейсы (08).** Не сняты: в этой среде нет браузера. Вёрстка написана под контракт 03 §4 (mobile-first, `min-width: 0`, локальный scroll таблиц, sticky-высота измеряется `ResizeObserver`), но **проверка на реальных устройствах не выполнена**.
- **Взаимодействия через DOM** (клик → диалог → подтверждение) покрыты на уровне адаптера, а не через UI-события. Рендер каждого экрана проверен, интерактивные E2E — нет.

## 5. Приватность и достоверность

- Локально хранится только `palissage.demo.v1` (preset + журнал команд) и `palissage.locale` / `palissage.demo.role`. Сброс чистит только свой namespace.
- Свободный текст (причины решений, описания проблем) и адреса, введённые вручную, **не сериализуются**: при записи свободный текст заменяется на `[not stored in this browser]`. Адрес, введённый в сессии, живёт только в памяти.
  *(Поправка от 8 сентября 2026: подстановка ссылки на fixture вместо сессионного адреса нарушала
  идентичность replay — менялись `destinationRef` и commitment уже отправленной заявки. Теперь
  сохраняется собственный opaque ID, commitment считается из публичных полей, а после reload экран
  сообщает об утрате деталей. См. раздел 7, UIR-13.)*
- Demo-квитанции имеют вид `DEMO-RES-001` и не содержат tx hash и explorer-ссылок.
- Аналитики, внешних шрифтов и сторонних запросов нет.

## 6. Что делать дальше

1. A12: собрать и проверить deployment manifest (chainId, адреса, bytecode, token decimals), затем реализовать `adapters/testnet/*` и lazy-загружаемый wallet bridge.
2. A13: снять матрицу скриншотов, прогнать axe + ручную проверку клавиатуры и 200 % zoom, замерить LCP/INP на среднем мобильном устройстве.
3. Заменить сгенерированные иллюстрации на лицензированные фотографии по 06, если владелец подтвердит источники, и заполнить `/legal/credits`.
4. Заполнить publisher / юрлицо / hosting в `/legal/*` перед любой внешней публикацией.

---

# Implementation notes — code-review fixes

Дата: 8 сентября 2026. Основание: `specifications/ui-mvp/code-review-2026-09-07.md`.
Раздел выше описывает версию `2790c39` и оставлен как есть. Ниже — что изменено после review,
и что по-прежнему не сделано. Приёмка по 08 по-прежнему **не** объявляется.

## 7. Исправления по findings

| ID | Что сделано | Где |
|---|---|---|
| UIR-01 | Режим больше не подменяется. Неготовый testnet отдаёт пустой `UnavailableAdapter`, `AppShell` рендерит `EnvironmentUnavailable`, `useAction` отказывает с `ENVIRONMENT_NOT_READY`, а `confirm` — при несовпадении mode или actor | `adapters/unavailable.ts`, `app/environment.tsx`, `app/actions.ts`, `components/layout/AppShell.tsx`, `features/system/EnvironmentGate.tsx` |
| UIR-02 | Save draft пишет до отчёта об успехе: добавлен `run()` (prepare+execute одним вызовом), `review()` возвращает prepared. `expectedSequence` читается из адаптера, а не из отрендеренного снимка | `app/actions.ts`, `features/winery/CreateLot.tsx` |
| UIR-03 | В demo-панели появился выбор организации-покупателя (`setActorId`), шаг тура описывает переключение и возврат | `features/demo/DemoToolbar.tsx`, `app/tour-steps.ts` |
| UIR-04 | Финальный milestone требует `ReadyForDelivery`, одну открытую заявку и документы нужного вида этого лота; проверки повторяются при подтверждении | `adapters/demo/reducer.ts`, `domain/capabilities.ts`, `features/winery/LotDetail.tsx` |
| UIR-05 | Реальный canonical bundle (JCS + Keccak-256) с SHA-256 файлов; матрица требуемых видов документов; принадлежность лоту/производителю; браузерная проверка байтов и состояния pending/available/mismatch/unavailable; `docsHash` не переписывается ревизией metadata | `domain/commitments.ts`, `domain/evidence.ts`, `components/trade/document-check.ts`, `components/trade/EvidencePanel.tsx` |
| UIR-06 (частично) | Строка chain больше не «Observed» до ответа узла: «configured target …, not checked». Ярлык сети — Base Sepolia | `app/environment-context.ts`, `content/{en,fr}.ts` |
| UIR-07 | `execute` больше не подменяет `expectedSequence`: изменившийся fingerprint отклоняется как stale. Суммы фиксируются в `prepared.summary` и замораживаются в диалоге | `adapters/demo/adapter.ts`, `components/trade/ActionReview.tsx` |
| UIR-08 | Черновик открывается по `?draft=`, поля загружаются, сохранение идёт с `expectedRevision`, список черновиков и защита от ухода с несохранёнными изменениями | `features/winery/CreateLot.tsx`, `adapters/demo/reducer.ts` |
| UIR-09 | Добавлены `cancelOffer` (UI), `cancelAllocation`, `claimDefault`, `requestAllocationCancellation`, `updateListingPrice`, `setLotStatus`, `updateLotMetadata`, `addCaseEvidence` — с capability-правилами и экранами | `adapters/types.ts`, `adapters/demo/reducer.ts`, `features/**` |
| UIR-10 | `canPayRemainder` получает лот и покупателя и повторяет guard'ы резервации; `canBuyListing` проверяет соответствие продавца; отклонение участника снимает `registryVerified` | `domain/capabilities.ts`, `adapters/demo/reducer.ts` |
| UIR-11 | Единый расчёт committed inventory (minted-ever + непогашенные reservations + свободный остаток активных offers) и проверка cap в точках выпуска | `domain/inventory.ts`, `app/selectors.ts`, `adapters/demo/reducer.ts` |
| UIR-12 | Фильтры каталога переписывают только свои ключи; `mode` задаётся через `set`; очистка фильтров сохраняет среду | `features/public/Marketplace.tsx`, `app/environment-context.ts` |
| UIR-13 | Уникальный ID сессионного адреса на заявку; commitment доставки считается из публичных воспроизводимых полей и не зависит от адреса; после reload экран пишет «details unavailable after reload», ссылка и hash не меняются | `adapters/demo/{adapter,persistence}.ts`, `features/buyer/forms.tsx`, `features/fulfilment/*` |
| UIR-14 | Общий overlay-примитив: `inert` фон, trap с обработкой начального фокуса на заголовке, уникальные label ID, возврат фокуса, exit-анимация | `components/ui/Dialog.tsx` |
| UIR-15 | Успех строится из созданной allocation и из prepared, а не из формы, перевалидированной по уже уменьшившемуся остатку | `features/buyer/Reserve.tsx` |
| UIR-16 | Журнал сессии несёт `sessionId` и `revision`; перед записью проверяется сохранённая ревизия, `storage` слушается; при конфликте команды блокируются и экран просит reload | `adapters/demo/{persistence,adapter}.ts`, `components/layout/AppShell.tsx` |
| UIR-17 | Денежные поля хранят нормализованные units и перерисовываются при смене языка; ABV и royalty валидируются в текущей локали; названия документов и milestone локализованы | `domain/amount-field.ts`, `features/**`, `content/{en,fr}.ts` |
| UIR-18 | Разделены намерения «restart tour» и «switch preset»; restart сбрасывает preset, запускает тур и переходит к первому шагу; resume сохраняет ledger | `features/demo/Launcher.tsx` |

Раздел 2 review: публичная витрина отделена от изменяемого ledger (`adapters/demo/public-catalogue.ts`);
общие app-маршруты получили `RoleShell`; паспорт выводится из ledger, а не из фиксированной карты
шести лотов; комиссии кредитуются на `demo-treasury-001` и учитываются подельно (`withdrawnFee`),
без восстановления истории умножением; secondary получил поиск/фильтры/сортировку и фильтр состояния;
`productionHistory` пишется и передаётся в timeline; добавлены ревизии метаданных с историей hash.

Раздел 3 review: реализованы exit-анимации overlay, ограниченный route transition на wrapper,
перемещающееся подчёркивание вкладок и корректная реакция на reduced motion (движение снимается,
а не только сокращается длительность).

## 8. Проверки этой итерации

- `npx tsc --noEmit -p tsconfig.app.json` — чисто.
- `npx eslint src --max-warnings 0` — чисто.
- `npx vitest run` — 130 passed, 9 skipped (live-RPC тесты). Добавлены
  `adapters/demo/__tests__/review-fixes.test.ts` (26 регрессий по findings) и
  `domain/__tests__/commitments.test.ts` (golden vectors канонического bundle: точные байты и digest).
- `npm run build` — успех.
- Браузерные сценарии, скриншоты, axe и замеры производительности **не запускались**: в этой среде
  нет браузера. Выводы про клавиатуру и motion сделаны по коду, а не по наблюдению.

## 9. Что осталось после этой итерации

- **A12 целиком.** Адаптер `adapters/testnet/*`, wallet-слой и manifest-валидация присутствуют в
  рабочей копии, но **проверенного deployment в сборке нет**, поэтому `/testnet` остаётся
  неготовым, а рабочие testnet-маршруты отдают unavailable. Фактические deployment/seed/receipt
  evidence из `docs/chain-mvp` этой итерацией не получены и не подтверждаются.
- **Лицензированные фотографии (06).** Реестр по-прежнему указывает на сгенерированные SVG.
  Responsive-варианты, кадрирование, provenance и credits не сделаны.
- **Реальная загрузка приватных документов.** В мастере выбираются заранее подготовленные sample-записи
  этого производителя; local attachment/remove/retry не добавлены, backend хранения не выдуман.
- **Тёмная тема, скриншот-матрица, axe, INP** — как и раньше, не сделаны.
- **E2E через DOM.** Покрытие остаётся на уровне адаптера и рендера маршрутов.
