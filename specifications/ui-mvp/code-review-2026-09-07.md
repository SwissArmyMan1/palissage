# Palissage UI — итоговый code review

Дата: 7 сентября 2026. Проверенная версия: `2790c39`. Решение: **нужны исправления; реализация не готова к приёмке полного MVP по ТЗ**.

Основание: текущий код `UI/web`, пакет `specifications/ui-mvp/01…08`, поправка 1.1 в README UI и `docs/chain-mvp/05`, `08`, `09`. `implementation-notes.md` рассмотрен как отчёт исполнителя, а не как доказательство выполнения требований.

По указанию владельца выполнен **статический review без запуска тестов**. Также не запускались build, lint, typecheck, браузерные сценарии, скриншоты и замеры производительности. Ниже описаны выводы из кода и условия их проявления; это не отчёт о пройденных проверках в браузере. Автор review не менял исходники приложения и контрактов; добавлен только этот отчёт.

К концу review в рабочей копии появились параллельные изменения `src/identity`, `src/market`, `src/redemption`, `src/token` и новый `src/testing`. Они не изменялись автором review и не входят в его оценку. Совместимость UI сравнивается с chain-документацией 1.1, а не с этими незавершёнными изменениями контрактов.

Приоритеты: **P1** — исправить до соответствующего показа/интеграции; **P2** — обязательная доработка для приёмки заявленного объёма. Это приоритеты UI/MVP, а не оценка риска потери реальных средств: обнаруженные финансовые ошибки сейчас находятся в симуляторе.

## 1. Ошибки и пропуски

### UIR-01 · P1 · Testnet-маршруты используют demo-данные и выполняют demo-команды

**Код:** `UI/web/src/app/environment.tsx:32–42,80–103`; `src/app/actions.ts:51–66,80–87`; `src/components/layout/AppShell.tsx:57`; `src/components/trade/ActionReview.tsx:86–89,129–138`.

`EnvironmentProvider` всегда создаёт `DemoAdapter` и предоставляет его ledger/actor. В testnet-ветке `environment.adapter` равен `undefined`, но экраны читают общий `ledger`, а `useAction` безусловно вызывает `demo.prepare/execute`. Shell блокирует только отсутствие mode. Прямой вход `/app/buyer/reserve/demo-offer-001?mode=testnet` с обычным buyer actor поэтому открывает demo-offer и допускает локальную reservation под testnet-меткой. Итоговый диалог затем сообщает о симуляции — режимы противоречат друг другу. Отсутствие ссылки на этот маршрут на `/testnet` не закрывает прямой вход.

**Исправить:** разрешать reads/actions только через выбранную среду; при неподготовленном testnet возвращать configuration/unavailable state до рендера торговых данных. В `useAction` дополнительно проверять mode и adapter, в review — согласованность среды, actor и подготовленной операции. Testnet не должен ни читать, ни менять demo namespace. Отдельные публичные sample-страницы могут оставаться доступными с явной маркировкой.

**ТЗ:** UI/02 §3, SYS-07/08; UI/04 §1, §7; Chain/08 §2–4. Утверждение Claude «writes closed» верно только для входной страницы и не описывает кабинеты.

### UIR-02 · P1 · Save draft показывает сохранение без записи; Create lot не проходит

**Код:** `src/features/winery/CreateLot.tsx:146–164`; `src/app/actions.ts:55–95`; `src/adapters/demo/reducer.ts:659–663`.

Оба обработчика делают `await draftAction.review(...)`, затем вызывают `draftAction.confirm()` из того же render closure. `review` кладёт prepared в React state; уже захваченный `confirm` читает прежний `state.prepared`, обычно `undefined`, и ничего не выполняет. Save draft всё равно выставляет `savedAt`. Create lot затем готовит команду с отсутствующим в ledger draft и получает `NOT_FOUND`. Проблема находится в связи формы с hook, а не в арифметике reducer.

**Исправить:** отдельная операция сохранения workflow-draft с возвращаемым результатом либо явная передача возвращённого prepared ID в execute. Не пытаться «дождаться React» таймером. Показывать сохранение только после успешной записи; перед create использовать актуальную revision/sequence уже сохранённого draft. Ошибка сохранения должна оставаться видимой.

**ТЗ:** UI/02 WIN-03, WF-04; UI/07 задача кабинета winery.

### UIR-03 · P1 · Сценарий перепродажи невозможно пройти через UI

**Код:** `src/app/environment.tsx:55–57,80,98`; `src/app/environment-context.ts:48–52,65–66`; `src/features/demo/DemoToolbar.tsx:63–66`; `src/domain/capabilities.ts:177–181`; `src/app/tour-steps.ts:59–65`.

Все обычные переключения на buyer выбирают `demo-buyer-001`. Метод `setActorId` объявлен и предоставлен контекстом, но нигде в экранах не вызывается. Возможность передать actor в `useAction.review` также не подключает второго покупателя. Первый покупатель может создать listing, но купить его сам не может из-за корректного `SELF_TRADE`. В интерфейсе нет пути к `demo-buyer-002`, необходимому для сделки 24 × €9.20 и балансов 96/24. Наличие второго actor в fixtures и описания шага тура этого не исправляет.

**Исправить:** добавить явный demo-only выбор участника внутри роли buyer, показывать организацию до подтверждения и дать понятный возврат к buyer001 для доставки. Связать этот выбор с шагом тура. Не переносить такое переключение на реальный wallet account в testnet.

**ТЗ:** UI/05 §6, canonical secondary flow; UI/02 WF-03.

### UIR-04 · P1 · Финальный milestone освобождает депозит до готовности партии

**Код:** `src/features/winery/LotDetail.tsx:67,271–282`; `src/features/operations/VerificationDetail.tsx:203–238`; `src/domain/capabilities.ts:342–353`; `src/adapters/demo/reducer.ts:859–928`.

Winery может отправить readiness evidence для любого unreleased milestone независимо от production. Более того, для всех лотов берётся один документ `demo-doc-lot-001-readiness`. Operations считает evidence полным по непустому массиву IDs и может подтвердить 10000 bps. После депозита €302.40 за Growing lot001 таким путём можно разрешить вывод gross €302.40, net €293.328, не доходя до ReadyForDelivery. Документ lot001 пригодится и для чужой партии, поскольку привязка не проверяется.

**Исправить:** для финального milestone проверять production readiness, текущий submitted review, существование/тип/принадлежность/доступность документов и их commitments. В UI явно выбирать допустимое evidence именно этой партии; в reducer повторить проверки. Production update, verifier confirmation и withdrawal должны оставаться тремя отдельными действиями. Readiness-файл не показывать заранее как доступное доказательство готовности.

**ТЗ:** UI/05 §6–7; UI/04 evidence policy; Chain/08 таблица milestones и golden path. Это требование продуктового workflow; сам Solidity не обещает автоматически устанавливать связь readiness → release.

### UIR-05 · P1 · Проверка документов сведена к IDs, а docsHash не является требуемым commitment

**Код:** `src/adapters/demo/fixtures.ts:497`; `src/adapters/demo/reducer.ts:200–218,759–769`; `src/features/winery/CreateLot.tsx:64,109–110`; `src/features/operations/VerificationDetail.tsx:50–57`; `src/components/trade/EvidencePanel.tsx:42–84`.

Seed `docsHash` получается из номера лота с заполнением символом `d`. Для нового лота используется собственный псевдохэш `demoCommitment` от IDs документов, без их SHA-256. Это не Ethereum Keccak-256 от канонического bundle. Настоящие SHA-256 PDF, записанные генератором в manifest, с этим якорем не связаны. EvidencePanel отображает готовый metadata-status, но не проверяет доступность/байты/совпадение файла. Проверка `documents.length > 0` позволяет принять Growing lot с одним specification без обязательной declaration; missing/mismatch не управляют verify.

**Исправить:** реализовать канонический bundle и реальный Keccak по UI/04 и Chain/09, включить реальные file digests, разделить initial verification и последующие документы. Ввести проверку загружаемых sample-байтов и состояния pending/available/mismatch/unavailable. Рассчитывать complete evidence по матрице стадий и принадлежности документов, а не по числу IDs. Не менять immutable docsHash при последующем обновлении metadata.

**ТЗ:** UI/04 §10; UI/05 §7; Chain/09 раздел canonical bundle. Аналогичный stand-in используется для delivery/shipment commitments и также требует замены до chain integration.

### UIR-06 · P1 для testnet · Поправка chain 1.1 не реализована

**Код:** `src/domain/types.ts:29–50`; `src/app/environment-context.ts:26–45`; `src/adapters/types.ts:221–231`; `src/app/actions.ts:14–20`; `src/features/public/Testnet.tsx:45–65`.

Domain разрешает только `chainId: 421614`; экран и конфигурация жёстко задают Arbitrum Sepolia. Актуальный целевой контур — Base Sepolia 84532. `DataOrigin` не содержит требуемые deploymentId/transportKind. Статус chain `observed` выставлен константой, хотя RPC отсутствует. Testnet adapter, wallet integration, approval/receipt lifecycle и отдельный WorkflowAdapter отсутствуют; общий интерфейс фактически рассчитан на готовый локальный ledger.

**Исправить:** выполнить A12 по поправке 1.1: manifest/config validation, Base Sepolia, адреса/ABI новых контрактов, read model, actual token/fees, wallet readiness, simulation, approvals, отправка и reconciliation receipts. Отделить недоступный private workflow от доступных chain actions. До получения deployment писать «configured target / not checked», а не Observed. Локальный transport 31337 допустим только в явно отдельной developer-конфигурации.

**Граница:** отсутствие проверенного deployment — обоснованная причина не включать реальные writes. Это не доказательство завершённости интеграции и не препятствие написать адаптер/валидацию по документированному manifest. Не придумывать адреса. Demo fee 300 bps сохраняется; testnet fee читается, ожидаемый seed default — 200 bps. Реальный deployment этим review не подтверждается.

### UIR-07 · P2 · Prepare не защищает от смены подтверждённого состояния

**Код:** `src/adapters/demo/adapter.ts:109–149`; `src/components/trade/ActionReview.tsx:92–98`; `src/features/winery/Finance.tsx:60–62,165–168`.

Prepare сохраняет sequence/fingerprint, но execute подменяет `expectedSequence` текущим значением. Если между prepare и execute проходит другая команда, защита reducer не срабатывает. Например, после подготовки withdrawal и новой оплаты в тот же offer старый prepared выводит уже другую сумму. TTL защищает только от истечения времени. Summary в React также строится из живых props, а не из immutable prepared-result.

**Исправить:** при несовпадении fingerprint/sequence/actor/mode возвращать stale и требовать нового review. Суммы и последствия review фиксировать в prepared; повторная симуляция не должна незаметно обновлять подтверждённые условия. Не устранять stale заменой expectedSequence.

**ТЗ:** UI/04 §7–8; UI/02 ST-24 и WIN-05 changed entitlement. Это вывод о контракте адаптера; конкурентный сценарий в браузере здесь не запускался.

### UIR-08 · P2 · Черновик нельзя восстановить или исправить после Request changes

**Код:** `src/features/winery/CreateLot.tsx:52–67,123–143`; `src/features/winery/Lots.tsx:32–41`; `src/features/winery/LotDetail.tsx:82–105`; `src/adapters/demo/reducer.ts:653–706,714–729`.

Даже после исправления UIR-02 wizard всегда начинает с пустых useState и нового ID; чтения сохранённого `ledger.drafts` в UI нет. Список показывает только созданные lots. При needs_changes выводится причина и доступна повторная отправка прежних documents, но редактора существующей revision нет. Нет защиты unsaved navigation. Созданный lot/presentation также не обновляется повторным saveLotDraft.

**Исправить:** список и открытие draft по ID, загрузка значений, сохранение новой revision с expectedRevision, редактирование метаданных/документов существующего Draft, повторная submission конкретной revision. Обозначать unsaved и сохранять/подтверждать уход согласно ST-29. Соблюдать разграничение локального draft и chain Draft.

**ТЗ:** UI/02 WF-04, WIN-03/04, ST-24/29; UI/04 WorkflowAdapter.

### UIR-09 · P2 · Пропущены действия жизненного цикла, перечисленные в актуальном ТЗ

**Код:** `src/adapters/types.ts:80–149`; `src/features/winery/LotDetail.tsx:193–250`; `src/features/buyer/Secondary.tsx:177–193`.

| Требование | Фактическое покрытие | Доработка |
|---|---|---|
| Cancel offer | Команда есть в reducer, на экране нет вызова | Подключить действие в WIN-04; сохранить allocations |
| Cancel allocation / refund Reserved | Нет команды и формы | Winery/admin capability, escrow check, refund receipt и синхронные balances |
| Claim default | Нет команды и формы | Только winery после deadline; отдельный receipt, forfeiture/fee/accounting |
| Update listing price | Есть только cancel listing | Цена + review + `ListingUpdated`; переоценка открытой покупки |
| Suspend / unsuspend lot | Нет команд | OPS-05 и отдельный token verifier capability |
| Update metadata / документная revision | Нет рабочего edit workflow | Реализовать вместе с UIR-08, сохраняя historical docsHash |
| Request allocation cancellation / add case evidence | Нет workflow-команд и UI | Локальные demo workflow-records; в testnet явно unavailable без сервиса |

Основание: Chain/05 §5.1–5.3 и UI/04 §4–7. `cancelRedemption` и `refundRedemption` не заменяют refund primary allocation. Нельзя добавлять покупателю право самому вызвать `cancelAllocation` или обещать money refund для Paid.

Enforcement/recovery/pause и административная смена чужих ролей не считаются здесь обязательными интерактивными P0-доработками: ТЗ разрешает для них read-only. Одна финальная milestone-схема также допустима; отсутствие произвольного конструктора milestones само по себе не ошибка.

### UIR-10 · P2 · Demo-capabilities расходятся с ограничениями chain

**Код:** `src/domain/capabilities.ts:124–137,164–184`; `src/adapters/demo/reducer.ts:308–323,397–415`.

`canPayRemainder` не получает lot и participant: проверяет только владельца allocation, Reserved, pause и deadline. Поэтому наличие уже созданной reservation позволяет доплатить и mint при Suspended/Closed lot или утратившем eligibility покупателе. Актуальная chain-спецификация требует Verified guard на доплату. В secondary buy проверяется eligibility покупателя, но отсутствует проверка participant/compliance продавца; одного unfrozen seller balance недостаточно.

**Исправить:** передавать необходимые records и зеркалировать ограничения конкретного метода в capabilities и reducer. Отдельно учитывать ранее оплаченные allocations и balances, не обнуляя их при ограничении. В testnet окончательное решение подтверждать fresh read + simulation. Поддержка чтения частично оплаченных chain allocations обязательна; произвольный UI-ввод суммы частичной доплаты не объявляется обязательным без отдельного требования.

**ТЗ:** UI/04 §5.5; UI/02 BUY-06 both compliance; Chain/08 COMP-11.

### UIR-11 · P2 · После отмены offer повторно доступна уже проданная ёмкость партии

**Код:** `src/app/selectors.ts:240–245`; `src/adapters/demo/reducer.ts:795–802,842–848,241–277,308–323`.

Offerable считается как cap минус полное quantity только активных offers. Отмена снимает весь offer из вычитания, хотя старые Reserved/Paid allocations продолжают существовать. Новый offer может снова занять весь cap; reserve/payRemainder увеличивают mintedBottles без проверки `mintedBottles <= totalBottles`. Сценарий через adapter: продать часть партии → cancelOffer → создать новый offer на полный cap → оплатить его по достаточно малой цене. Симулятор допускает выпуск сверх cap. Сейчас cancelOffer не подключён к UI (UIR-09); ошибку нужно устранить до его подключения.

**Исправить:** единый расчёт committed inventory с учётом minted-ever, непогашенных reservations и свободного остатка активных offers без двойного счёта. Повторно контролировать cap до mint. Burn после доставки не должен восстанавливать лимит выпуска.

**ТЗ:** UI/02 WIN-04 currently offerable inventory; Chain/03 инвариант mintedBottles ≤ totalBottles.

### UIR-12 · P2 · Первый фильтр каталога выбрасывает пользователя из выбранной среды

**Код:** `src/features/public/Marketplace.tsx:47–60,87–88`; `src/app/environment.tsx:44–53`; `src/components/layout/AppShell.tsx:57`.

Общий MarketplaceView используется на `/app/marketplace?mode=demo`. Любой фильтр создаёт новый URLSearchParams только из filters и теряет mode. После setParams shell показывает выбор среды вместо результатов. То же касается testnet. Отдельно EnvironmentGate при неизвестном `?mode=bad` дописывает второй mode, оставляя первое невалидное значение (`src/features/system/EnvironmentGate.tsx:14`), поэтому кнопка Open demo не исправляет ссылку.

**Исправить:** менять только принадлежащие фильтрам query keys в копии текущих параметров; mode задавать через `set`, без дубликатов. Сохранять среду при фильтрации, очистке, сортировке и пагинации.

**ТЗ:** UI/02 §3, SYS-07/08 и ST-04.

### UIR-13 · P2 · Адрес ранее оформленной доставки меняется от следующей заявки и reload

**Код:** `src/features/buyer/forms.tsx:195–209`; `src/adapters/demo/adapter.ts:163–166`; `src/adapters/demo/reducer.ts:466–484`; `src/adapters/demo/persistence.ts:52–55`; `src/features/fulfilment/BuyerDeliveryDetail.tsx:54`.

Вручную введённый destination получает ID `session-address-${lot.id}`. Две заявки на одну партию с разными адресами используют один ID; вторая перезаписывает destination первой, даже если первая уже отправлена. После reload sanitiser подменяет этот ID общим `demo-address-001`, а replay заново рассчитывает deliveryDataHash. В результате меняются destinationRef и commitment ранее подтверждённой заявки. Это не идентичный replay.

**Исправить:** immutable destination snapshot с уникальным ID на заявку. В persistent demo-журнале хранить разрешённый opaque reference/commitment без PII; после утраты session-only данных показывать «details unavailable after reload», сохраняя hash. Альтернатива для полностью воспроизводимого demo — фиксированные sample destinations с явным выбором. Не подставлять другой адрес молча.

**ТЗ:** UI/04 privacy/workflow; UI/05 persistence; Chain/09 commitments.

### UIR-14 · P2 · Modal и drawer не обеспечивают заявленную клавиатурную изоляцию

**Код:** `src/components/ui/Dialog.tsx:35–67,129–150`.

Drawer не обрабатывает Tab/Shift+Tab, не сохраняет opener и не возвращает фокус. У Dialog фон не становится inert. Начальный фокус ставится на heading с tabindex=-1, но trap обрабатывает Shift+Tab только на первом focusable control, поэтому начальный Shift+Tab не замыкается внутрь. `aria-modal=true` и scroll lock не реализуют эти механизмы.

**Исправить:** общий надёжный modal primitive для обоих вариантов: inert фон, trap с поддержкой начального heading/outside focus, уникальные label IDs, восстановление focus после закрытия. Сохранять безопасный начальный фокус и запрет случайного backdrop dismissal у transaction review.

**ТЗ:** UI/03 §8.1. Вывод сделан по обработчикам; axe и браузерная клавиатурная проверка не запускались.

### UIR-15 · P2 · Успешная покупка может сообщать о нуле бутылок

**Код:** `src/features/buyer/Reserve.tsx:35–49,94–101,266–269`.

Success copy использует `quantityCheck`, заново вычисленный с уже уменьшившимся `offerAvailable`. Например, покупка 1200 бутылок offer002 по €11.20 вторым покупателем с €15000 после подключения UIR-03 оставляет available=0; ещё более простой текущий сценарий — купить 600 бутылок offer003 за €5760 первым покупателем. В обоих случаях квитанция содержит успешную операцию, а quantityCheck после неё invalid и текст сообщает quantity=0. Ошибка возникает и когда куплено больше половины остатка.

**Исправить:** result/successBody строить из возвращённой allocation/receipt или immutable prepared summary. Не валидировать уже исполненную покупку относительно inventory после её исполнения.

**ТЗ:** UI/02 BUY-04 Result; UI/04 receipt-derived success.

### UIR-16 · P2 · Межвкладочные записи теряются без предупреждения

**Код:** `src/adapters/demo/adapter.ts:80–105,148–155`; `src/adapters/demo/persistence.ts:80–85`.

Каждый adapter восстанавливает собственный журнал один раз и затем перезаписывает целиком одну localStorage-запись. Нет обработки storage/BroadcastChannel либо проверки persisted revision перед записью. Две вкладки, открытые до первой операции, могут независимо подтвердить разные команды на одном sequence; последняя запись уничтожает журнал другой вкладки при следующем reload. Проверка локального expectedSequence этого не замечает.

**Исправить:** ввести владельца session writer или согласованный revision/conflict protocol. При конфликте блокировать новые команды и предлагать reload/reconcile без тихой перезаписи. Не считать сам localStorage атомарной compare-and-swap транзакцией.

**ТЗ:** UI/05 §6.4: один основной tab и явный межвкладочный conflict.

### UIR-17 · P2 · FR-локализация ломает незавершённые формы

**Код:** `src/features/buyer/forms.tsx:33–46`; `src/features/winery/OfferEditor.tsx:34–65`; `src/features/winery/CreateLot.tsx:91`; `src/app/environment-context.ts:39–44`; `src/components/trade/EvidencePanel.tsx:53,67–68`.

Цена хранится как строка в исходной locale. После EN→FR `9.20` остаётся в state, но parseAmount уже требует запятую: валидная форма становится невалидной. Нормализованные units не сохраняются как самостоятельное состояние. ABV в CreateLot всегда проверяется с `'en'`, поэтому французский `13,5` отклоняется. Технически типизированный FR dictionary также не покрывает hardcoded diagnostic details, названия документов и English milestone description.

**Исправить:** сохранять нормализованное значение денег и преобразовывать представление при смене языка без потери точности; отдельно сохранять действительно невалидный ввод. ABV проверять в текущей locale. Локализовать видимые metadata/document titles, milestone labels и сообщения конфигурации, не только dictionary keys.

**ТЗ:** UI/05 §7: locale switch сохраняет units, полная EN/FR локализация форм и документов.

### UIR-18 · P2 · Повторный запуск guided tour не выполняет обещанные reset/start

**Код:** `src/features/demo/Launcher.tsx:44–47,94–103,191–205`; `src/app/environment.tsx:65–68`.

Если уже есть прогресс, Start tour кладёт buyer-ready в pending. После подтверждения вызывается обычный `go(entry)`, который не вызывает `tour.start()`. При уже выбранном buyer-ready `enterDemo` также не делает reset. Пользователь подтверждает предупреждение о замене данных, но получает старую сессию без запуска нового тура.

**Исправить:** хранить intent подтверждения отдельно: switch preset / restart tour / resume. Restart после явного подтверждения должен сбросить нужный preset, активировать tour и перейти к первому шагу. Resume сохраняет достигнутый ledger.

**ТЗ:** UI/02 PUB-05; UI/05 persistence/reset workflow.

## 2. Остальные подтверждённые незавершённые требования

Эти пункты также входят в backlog; наличие маршрута не означает, что выполнены все поля/переходы соответствующего screen ID.

| Область | Что осталось | Код / основание |
|---|---|---|
| Публичный sample catalogue | Отделить фиксированную публичную витрину от mutable app ledger. Сейчас после producer-start публичный lot001 исчезает, а после операций меняет состояние | `features/public/Marketplace.tsx:69`, `LotDetail.tsx:34`; UI/02 §3 |
| Общие app-маршруты | SYS-07/08 всегда находятся в buyer shell; winery/operations получают чужое меню при Explore lots | `router.tsx:86–99`; UI/02 SYS-07/08 |
| Passport новых партий | `passportIdForLot` генерирует ID для нового lot, но обратная map знает только 001…006: после исправления create паспорт нового лота ведёт к 404 | `app/selectors.ts:269–284`; UI/02 PAS-01 |
| Комиссии в demo ledger | Cash не содержит treasury; secondary debit распределяет seller/royalty без credit комиссии, withdrawal — только net winery. Формулы split сами по себе не обеспечивают полный денежный ledger | `adapters/demo/fixtures.ts:658–666`, `reducer.ts:410–413,924–928`; UI/05 initial treasury и UI/04 fee accounting |
| Secondary discovery | Нет обещанных search/lot/price/readiness filters и sort; My listings не имеет state filter | `features/buyer/Secondary.tsx:22–28,38–48`; UI/02 BUY-05 |
| Stage history | Запись production event не сохраняет from/to stage; `productionEvents` в экранах вызывается без recorded map. Посещённые стадии показываются как not recorded | `adapters/demo/reducer.ts:780–790`, `components/trade/production-events.ts:12–24`, `features/passport/Passport.tsx:89` |
| Документы/изображения wizard | Есть выбор глобальных sample-document IDs; нет полного UI local attachment/image selection, remove/retry/validation и revision history | `features/winery/CreateLot.tsx`, `LotDetail.tsx`; UI/02 WIN-03/04. Реальный private upload backend не требуется выдавать за реализованный |

По денежному ledger нужно фиксировать реальные fee deltas на каждую операцию. Нельзя восстанавливать всю историю комиссий одним умножением cumulative gross на текущую ставку при появлении разных ставок или нескольких выплат с округлением.

## 3. Дизайн, изображения, плавность переходов

В коде присутствуют Fraunces/Inter, согласованные цветовые и размерные tokens, редакционная структура landing, адаптивное представление таблиц, подписи вымышленных данных, reveal секций и CSS entry-анимации overlay. Замена Framer Motion на CSS сама по себе не является ошибкой: оценивается требуемое поведение.

При этом визуальный объём ТЗ выполнен частично:

| Требование | Статическое наблюдение | Что закончить |
|---|---|---|
| Фотографический editorial hero/estate/harvest, предметные bottle visuals | Весь asset registry указывает на программные SVG-иллюстрации | Взять лицензированные фото по UI/06 либо предусмотренную оригинальную фотореалистичную генерацию, подготовить crop/размеры/форматы и credits |
| Motion open **и close** | Dialog и Drawer сразу возвращают null при close; keyframes в CSS только entry | Реализовать exit 180 ms с отключённой интерактивностью закрывающегося overlay |
| Route transition | Смена Outlet/main не имеет предусмотренного incoming transition | Добавить ограниченную анимацию некритичного wrapper по UI/03; focus/data доступны сразу |
| Animated tab underline | Tabs меняют border/color, перемещения underline нет | Реализовать заданное поведение без задержки панели |
| Reduced motion | CSS сокращает duration, но Reveal не подписан на изменение настройки и translation-класс сам по себе не отменяется | Снимать movement/fade при старте и изменении настройки; не ограничиваться duration=1ms |

Код: `content/assets.ts:22–37`, `components/ui/Dialog.tsx:72,139`, `components/ui/Tabs.tsx:38–40`, `components/ui/Reveal.tsx:16–39`, `index.css:217–245`, `components/layout/AppShell.tsx:129–130`.

Простая замена пути SVG на JPEG недостаточна для выполнения всего UI/06: нужны предусмотренные responsive variants, crop, размеры, provenance и корректные captions/alt. Человеческое решение о crop полезно для арт-дирекшена, но в ТЗ нет основания объявлять весь медиапакет завершённым без него. Во время review изображения не скачивались и не заменялись.

Без просмотра браузера нельзя достоверно оценить визуальный баланс, переполнения, контраст готового рендера, плавность на устройствах или соответствие ожиданию «современный сайт 2026 года». Эти свойства не объявляются ни проверенными, ни проваленными по внешнему виду. Невыполненными по коду остаются конкретные требования выше и UIR-14.

## 4. Оценка заявления «всё построено»

| Часть заявления Claude | Вывод review |
|---|---|
| «Все 40 экранов» | Структура маршрутов и компоненты большей части реестра присутствуют; это не полное покрытие workflow. Create и resale имеют блокирующие разрывы, несколько действий отсутствуют |
| bigint money и исправленный spread | Исправление видно в `money.ts:33–37`; основные формулы используют bigint. Это не закрывает inventory, treasury, permissions и отображение результатов |
| Receipt-only success | Основной hook действительно ставит succeeded после receipt. Но Save draft показывает Saved без результата, а Reserve берёт success quantity из изменившейся формы |
| Идентичный replay | Для неизменяемого sample path подход предусмотрен. Для session destination идентичность нарушена, межвкладочная запись не защищена |
| «Testnet writes closed» | Нарушено прямыми app routes: UIR-01. A12 отсутствует и использована устаревшая сеть |
| PDF SHA-256 из реальных байтов | Такой pipeline метаданных предусмотрен; он не заменяет verification bundle commitment и runtime evidence checks |
| Лицензированные фотографии не сделаны | Честно обозначенный, но незакрытый визуальный объём UI/06 |
| 52 tests, lint/typecheck/build green | В этом review не перепроверялось по указанию владельца; не используется как доказательство готовности |
| Полная приёмка по UI/08 не заявлена | Корректное ограничение отчёта Claude; оно сохраняется |

## 5. Порядок исправлений для следующего исполнителя

1. **Закрыть смешение режимов:** UIR-01, затем UIR-06. Можно исправить блокировку неподготовленного testnet независимо от deployment; не ждать появления адресов, чтобы закрыть обход.
2. **Вернуть проходимость презентации:** UIR-02/03/08/18, результат UIR-15, routing UIR-12. До этого нельзя принимать demo golden path по одному adapter-level сценарию.
3. **Восстановить достоверность состояния:** UIR-04/05/07/10/11/13/16 и treasury. Эти изменения делать до подключения отсутствующих финансовых действий.
4. **Закрыть предусмотренные действия и экраны:** UIR-09 и таблицу раздела 2. Проверять вертикально: control → validation/capability → prepare/review → commit/receipt → все затронутые роли → reload. Наличие enum/команды без доступного UI не считать завершением.
5. **Закончить UX и медиапакет:** UIR-14/17 и раздел 3. Подписи происхождения, реальные ограничения и доступность должны сохраняться при визуальной доработке.
6. **Обновить implementation-notes:** перечислить фактически закрытые требования и оставшиеся ограничения, удалить утверждения о наблюдённой сети/полной блокировке/идентичном replay, если они ещё не доказаны.

В этом задании исправления не реализованы. Сценарии для проверки после исправления приведены в самих findings; их выполнение и тестовые прогоны в рамках данного review сознательно пропущены. Для chain-показа после реализации A12 отдельно остаются фактические deployment/seed/receipt evidence из `docs/chain-mvp`; локальный UI-review не заменяет их.
