# Palissage MVP — workflow, экраны и UX-контракты

Статус: нормативное ТЗ на новую версию интерфейса; разработка этим документом не выполняется.
Аудитория: агенты реализации, дизайнер, разработчик интеграций, автор E2E и ведущий демонстрации.
Язык ТЗ — русский. Язык интерфейса по умолчанию — английский; вторичный — французский.
Названия производителей и вин не переводить. Весь интерфейс, ошибки и accessibility-labels брать из словарей.
Финансовые формулы, идентификаторы и состояния сверять с [04-data-contracts-and-states.md](04-data-contracts-and-states.md); этот файл задаёт поведение экранов.
При расхождении финансов или полномочий приоритет имеет 04; расхождение исправить в документации до реализации.
Все перечисленные ниже экраны входят в тестовый MVP, если явно не указано «вне MVP».

## 1. Продуктовая задача и правила опыта

Palissage помогает профессиональному покупателю найти винный лот, получить проверяемую аллокацию и пройти путь до физических бутылок.
Винодельня публикует предложение, получает финансирование в предусмотренном порядке и обрабатывает поставку.
Операционный специалист проверяет участников и документы; отдельные права определяют доступ к подтверждениям и разрешению исключений.
Паспорт бутылки завершает историю происхождения. Розничный магазин, программа лояльности и инвестиционный терминал не входят в MVP.
Первые секунды сайта объясняют «wine trade, direct from the producer»; слова token, escrow и wallet появляются в контексте конкретного действия.
Первый экран всегда позволяет открыть демо без регистрации, подключения кошелька или предоставления личных документов.
Каждый экран отвечает на три вопроса: что это за объект, в каком он состоянии, какое следующее действие доступно.
Основной CTA на экране один; вторичные действия визуально подчинены ему. Таблицы предназначены для сравнения, фото — для узнавания и происхождения.
В демо видима подпись «Demo · Sample data»; в testnet — «Testnet · Test assets only». Все точные EN/FR строки берутся из05.
Режим хранится отдельно от роли. Смена роли в демо не меняет сеть; открытие кошелька не включает testnet автоматически.
«Verified» всегда раскрывает объект, источник, дату и границы проверки. Это не обещание юридического соответствия или гарантии качества.
Действия, суммы и история всех кабинетов относятся к одним сущностям. Не создавать отдельные несвязанные mock-массивы для каждой страницы.
Не выводить фантазийные проценты роста, доходность, отзывы, логотипы партнёров, завершённые реальные поставки или число действующих клиентов.
Предложенная новая IA заменяет текущие зоны shop/admin/consumer на понятные buyer/operations/passport; совместимость задаётся в плане миграции.

## 2. Навигация и полный реестр экранов

Публичный header: логотип → /; For wineries → /#for-wineries; For buyers → /#for-buyers; How it works → /#how-it-works; Pilot → /pilot; EN/FR; Explore the demo → /demo. Точный copy —05.
Header содержит EN/FR и раскрывающийся вход в демонстрационные кабинеты. Технический /testnet доступен отдельной ссылкой в демо и footer.
Public footer: краткое назначение, /pilot, /demo, /testnet, /legal/privacy, /legal/prototype, /legal/credits.
Кабинет: sidebar с названием организации, навигацией роли и account; верхняя строка с breadcrumbs, режимом, языком, состоянием синхронизации.
Buyer sidebar: Overview, Allocations, Secondary market, Deliveries; отдельная ссылка «Explore lots». Winery: Overview, Lots, Finance, Deliveries.
Operations sidebar: Overview, Participants, Verification, Redemptions. Название operations не означает наличие всех контрактных полномочий.
При ширине < 1200 px sidebar заменяется меню в drawer согласно03; сохраняются название текущей страницы и доступ к основному CTA.
Drawer имеет закрытие, focus trap и возврат фокуса. Он закрывается при выборе маршрута; не перекрывает открытый transaction dialog.
Табы меняют параметр tab в URL без полной перезагрузки. Фильтры, сортировка и поиск сохраняются в query; чувствительные данные в URL запрещены.

| ID | Канонический маршрут | Название / назначение |
| --- | --- | --- |
| PUB-01 | / | Landing |
| PUB-02 | /marketplace | Explore lots |
| PUB-03 | /lots/:lotId | Public lot detail |
| PUB-04 | /producers/:producerId | Producer profile |
| PUB-05 | /demo | Guided demo and scenario selector |
| PUB-06 | /testnet | Testnet entry and environment checks |
| PUB-07 | /pilot | Pilot enquiry |
| PUB-08 | /legal/:slug | Privacy, terms, demo disclosure |
| BUY-01 | /app/buyer/overview | Buyer overview |
| BUY-02 | /app/buyer/allocations | Allocations |
| BUY-03 | /app/buyer/allocations/:allocationId | Allocation detail |
| BUY-04 | /app/buyer/reserve/:offerId | Primary reservation |
| BUY-05 | /app/buyer/secondary | Secondary market and own listings |
| BUY-06 | /app/buyer/secondary/:listingId | Secondary purchase |
| BUY-07 | /app/buyer/deliveries | Buyer deliveries |
| BUY-08 | /app/buyer/deliveries/:redemptionId | Buyer delivery detail |
| BUY-09 | /app/buyer/positions/:lotId | Current bottle balance, primary and secondary acquisitions |
| WIN-01 | /app/winery/overview | Winery overview |
| WIN-02 | /app/winery/lots | Winery lots |
| WIN-03 | /app/winery/lots/new | Create lot wizard |
| WIN-04 | /app/winery/lots/:lotId | Manage lot, offers, production |
| WIN-05 | /app/winery/finance | Escrow, withdrawals, royalties |
| WIN-06 | /app/winery/deliveries | Winery deliveries |
| WIN-07 | /app/winery/deliveries/:redemptionId | Shipment management |
| OPS-01 | /app/operations/overview | Operational queues |
| OPS-02 | /app/operations/participants | Participant qualification |
| OPS-03 | /app/operations/participants/:participantId | Participant review |
| OPS-04 | /app/operations/verification | Lot and milestone review queues |
| OPS-05 | /app/operations/verification/:lotId | Lot evidence and decisions |
| OPS-06 | /app/operations/redemptions | Redemption and exception queues |
| OPS-07 | /app/operations/redemptions/:redemptionId | Redemption case |
| PAS-01 | /passport/:passportId | Read-only wine passport |
| SYS-01 | /app/buyer/account | Buyer account and eligibility |
| SYS-02 | /app/winery/account | Winery account and eligibility |
| SYS-03 | /app/operations/account | Operations account and capabilities |
| SYS-04 | Все неизвестные маршруты / ID | Not found |
| SYS-05 | Защищённый маршрут без допуска | Access / eligibility state |
| SYS-06 | Общий dialog, без отдельного URL | Action review and transaction status |
| SYS-07 | /app/marketplace | Catalogue of the selected demo/testnet environment |
| SYS-08 | /app/lots/:lotId | Lot and offers in the selected environment |

ID сущности не заменять названием. Неизвестный lotId не должен открывать первый лот; неизвестный slug — первый legal-документ.
Глубокая ссылка открывается после refresh и сохраняет режим через явный ?mode=demo/testnet согласно04; testnet route не подставляет demo-объект с тем же ID.
Для системных возвратов использовать валидированный относительный returnTo; запретить внешние URL и переход на ресурс другой организации.
Переход из public в demo checkout сохраняет lotId, offerId, количество и способ оплаты; режим явно подтверждается заголовком следующего экрана.
Названия query, route parameters и screen IDs являются контрактом для E2E. Новые маршруты добавлять одновременно в этот реестр и route manifest.

SYS-07/08 используют тот же catalogue/lot presentation, что PUB-02/03, но источник — явно выбранный app adapter. Доступны для чтения всем app-ролям; buy CTA требует buyer capability. В кабинетах `Explore lots`, `Back to lot` и ссылки на lot ведут в SYS-07/08 с сохранением mode; публичные PUB-02/03 всегда остаются sample catalogue. Поэтому testnet-покупатель может найти реальный test offer, не попадая вместо него в fixture. Winery `View lot` в testnet ведёт SYS-08, а не публикует приватные документы. Прямой вход без mode сначала выбирает среду.

## 3. Общие компоновки и компоненты

Public shell: широкая редакционная сетка; на desktop первый экран сочетает сильное фото, короткий тезис и предметный preview лота.
Dashboard shell: спокойная рабочая поверхность, читаемая таблица и контекстная панель. Не переносить hero-типографику на длинные финансовые таблицы.
Detail shell: breadcrumb → заголовок + идентификатор → состояния → основной контент → evidence/history; на desktop summary справа, на mobile после краткой карточки.
На mobile основной action bar допустим внизу с safe-area; контент получает соответствующий нижний padding, ошибки и клавиатура остаются видимы.
Detail summary содержит цену, количество, сроки и следующий шаг. Важная сумма не находится исключительно в accordion или tooltip.
LotCard: фото, producer, wine name, vintage, region, offer type, production label, price/bottle, availability, один маршрутный CTA.
EligibilityNotice: конкретная причина, что она блокирует, безопасный следующий шаг; наличие wallet не заменяет проверку claims.
EvidencePanel: тип документа, название, issuer/source, дата, статус проверки, размер, доступный preview/download, технический hash в раскрытии.
BusinessTimeline: событие, субъект, абсолютная дата, режим/источник. Будущие шаги визуально отделены от состоявшихся.
FeeSummary: quantity × unit price, payment now, remaining due/date, включённая доля fee, royalty где применимо, расходы вне расчёта.
QuantityInput: текстовый ввод целого числа и кнопки ±; показывает доступный максимум, min/step из offer и конкретную ошибку.
EmptyState: предметное объяснение и подходящий CTA. Skeleton отражает будущую геометрию; не использовать случайные фальшивые числа.
StatusBadge использует текст + дополнительный цвет/иконку. «Pending» всегда уточняет: review, wallet, confirmation, indexing или delivery.
ActionReview / SYS-06: объект, режим, сторона, количество, сумма, действие, последствия, затем Confirm; успех — после подтверждённого изменения.
В тестовом режиме offchain-действие не должно получать tx hash. В testnet реальный hash даёт ссылку только на explorer настроенной сети.
FinancialReceipt: понятная сверка чисел и timeline. Название «Transaction summary»; не «tax invoice», если налоговый документ не реализован.
Все кнопки, ссылки, document previews, export и tabs работают либо объясняют конкретно недоступную возможность; текст «P1 coming soon» внутри основного пути запрещён.

## 4. Общая матрица состояний и восстановления

Каждый экран ниже наследует применимые строки матрицы. Реализация и E2E обязаны проверять как минимум отмеченные для данного экрана состояния.

| Код | Состояние | Что видит пользователь | Поведение и восстановление |
| --- | --- | --- | --- |
| ST-01 | First load | Геометрически стабильный skeleton и название страницы | Одна область aria-busy; действия до готовности данных недоступны |
| ST-02 | Background refresh | Имеющиеся данные + «Updating» | Не сбрасывать выбор; revalidate перед финансовым действием |
| ST-03 | Empty collection | Причина отсутствия объектов | CTA создания/поиска; не выдавать пустые данные за ошибку |
| ST-04 | No filter results | Активные фильтры и «No matching lots» | Clear filters; исходные данные и query сохраняются до сброса |
| ST-05 | Read failed / offline | «We couldn’t load…» и время последнего успеха | Retry; сохранённые данные явно stale, новые writes блокируются |
| ST-06 | Partial data | Доступная часть + локальный error panel | Ошибка истории не стирает лот; недоступные важные проверки блокируют CTA |
| ST-07 | Unknown / removed object | Предметный 404 | Back to collection; не fallback на другую сущность |
| ST-08 | Wallet disconnected | Сохраняемый review и Connect wallet в testnet | Demo остаётся доступным; connect не отправляет транзакцию |
| ST-09 | Wrong network | Текущая и требуемая сеть | Явная кнопка switch; после отказа review сохраняется |
| ST-10 | Insufficient token / gas | Какая сумма/ресурс отсутствует | Обновление баланса; тестовые инструкции из /testnet без покупки реальных активов |
| ST-11 | Participant unverified / expired | Недостающая квалификация и дата истечения | Account/review; не предлагать «Retry» вместо устранения причины |
| ST-12 | Capability missing | «Your account can view this item but cannot…» | Read-only; роль UI не расширяет разрешения |
| ST-13 | Lot suspended / closed | Состояние lot и объяснение конкретного ограничения | Запретить только зависимые действия; redemption recovery проверяется отдельно |
| ST-14 | Balance frozen | Owned, frozen, transferable отдельно | Количество ограничено transferable; не скрывать владение |
| ST-15 | Market paused | Какой рынок недоступен | Read-only для этого рынка; не блокировать автоматически все deliveries |
| ST-16 | Offer expired / sold out | Абсолютный срок или отсутствие остатка | Disable reserve; возврат в каталог, без фиктивного пополнения |
| ST-17 | Quote / availability changed | Старые и новые условия | Повторное осознанное подтверждение; не менять quantity/total молча |
| ST-18 | Awaiting wallet | Название ожидаемой подписи/транзакции | Не показывать успех; не дублировать запрос по повторному клику |
| ST-19 | User rejected | «Request declined. Nothing was submitted.» | Сохранить поля; Retry только по нажатию пользователя |
| ST-20 | Submitted / confirming | Hash в testnet, этап подтверждения | Закрытие dialog не отменяет отправленную транзакцию |
| ST-21 | Confirmed, refresh pending | «Confirmed. Updating your allocation…» | Блокировать повтор операции; повторять read, а не write |
| ST-22 | Failed / reverted | Понятная причина и раскрываемые technical details | Refresh/review; не выдавать автоматический повтор финансового write |
| ST-23 | Status unknown / RPC timeout | «We haven’t confirmed the result yet» | Проверить receipt/state прежде повторной отправки |
| ST-24 | Stale or conflicting edit | Какая версия изменилась | Reload latest; сохранение локального черновика без overwrite чужой версии |
| ST-25 | File unavailable / mismatch | Отдельная ошибка документа | Retry; verification невозможна при обязательном missing/mismatched evidence |
| ST-26 | Session / account changed | Текущий owner больше не совпадает | Закрыть чувствительные данные, invalidate reads и re-review операции |
| ST-27 | Form invalid | Inline error + summary при submit | Фокус на первый invalid; остальные значения сохраняются |
| ST-28 | Action already completed | Итоговый актуальный статус | Перейти к объекту; не предлагать повтор confirmation |
| ST-29 | Draft unsaved | Локальный статус «Unsaved changes» | Leave confirmation; Stay / Discard; сохранённый draft восстанавливается |
| ST-30 | Testnet feature unavailable | Какая интеграция отсутствует | Read-only объяснение + демо аналог; никаких mock success в testnet |

Не показывать как onchain-состояния «disputed», «verification requested», «shipping quote pending» или «needs changes», если это только offchain workflow.
В интерфейсе допускается составная строка: «Shipped · Support case open» с двумя источниками состояния.
Testnet guard читает конкретные контрактные права и актуальный eligibility; фронтенд guard служит UX, окончательные ограничения обеспечиваются контрактом.
Состояния live RPC и demo storage визуально не смешивать. Ошибка testnet не вызывает бесшумный переход на mock.

## 5. Сквозные workflow

### WF-01 — открытие проекта и первая покупка без кошелька

1. PUB-01 объясняет прямую B2B торговлю; CTA Try demo → PUB-05.
2. PUB-05 показывает buyer persona Maison Rivage — demo (demo-buyer-001) и «Start guided demo»; создаётся единый детерминированный snapshot buyer-ready.
3. PUB-02 → PUB-03 demo-lot-001, producer Domaine des Trois Terrasses, Les Terrasses — Récolte 2026.
4. Пользователь выбирает 120 бутылок по €8.40, способ оплаты и видит условия до перехода в BUY-04 demo-offer-001.
5. BUY-04 подтверждает eligibility демонстрационного покупателя и сумму; SYS-06 выполняет только локальное demo-событие.
6. Успех ведёт в BUY-03 новой allocation; обновляются доступность PUB-03, список BUY-02 и winery данные WIN-04/05.
7. Reload сохраняет достигнутое состояние; повторный submit не создаёт вторую allocation; reset возвращает исходную.

### WF-02 — депозит, доплата и владение

1. В BUY-04 deposit доступен только при его поддержке offer; 120 × €8.40 = €1,008.00.
2. «Pay 30% deposit» показывает €302.40 сейчас и €705.60 к дате из fixture; fee 3% включён и удерживается из proceeds винодельни.
3. После оплаты статус «Reserved · deposit paid», owned minted bottles по этой allocation = 0.
4. BUY-01 выводит задачу pay remainder; BUY-03 показывает deadline 28 February 2027, 23:59:59 Europe/Paris, due amount и объясняет момент получения токенов.
5. «Pay remainder» открывает SYS-06 с оставшейся суммой и актуальными проверками; после success состояние fully paid и minted.
6. Просрочка показывает overdue и условия offer; default не возникает только от перехода часов, если требуется отдельное контрактное действие.
7. Buyer не получает универсальную кнопку возврата депозита. Запрос отмены является offchain case; refund/cancel выполняет допустимый участник по 04.
8. Fully paid allocation не имеет кнопки money refund через cancelAllocation; UI не обещает автоматический возврат после suspension.

### WF-03 — вторичная продажа и royalty производителя

1. В BUY-09 holding с transferable balance имеет «List bottles for resale»; BUY-03 ведёт к соответствующей позиции.
2. Форма listing выбирает количество ≤ transferable и unit price; SYS-06 показывает fee, royalty и ожидаемые seller proceeds. У listing нет собственного expiry в текущем контракте; deadline относится к buyer quote.
3. После создания listing виден BUY-05/My listings; токены остаются у seller, раздел availability не называет их escrowed.
4. Другой допущенный demo buyer Cave du Passage — demo (demo-buyer-002) открывает BUY-06; purchase проверяет listing, seller balance, покупателя, цену и deadline повторно.
5. После подтверждения владение перемещается; ledger royalty появляется WIN-05; My listings отражает remainder/closed state по 04.
6. Одно и то же доступное количество нельзя продать и отправить на delivery через stale state: оба действия требуют revalidation.
7. Cancel listing прекращает возможность покупки; это не возврат денег и не burn. Sold/cancelled/unavailable listing остаётся читаемым.
8. Secondary acquisition отображается как TradeRecord в истории позиции BUY-09; не создавать фиктивный primary allocation ID.

### WF-04 — lot creation, verification и предложение

1. WIN-02 → WIN-03 создаёт draft с данными бутылок и документами; сохраняет offchain и contract status раздельно.
2. Submit for review фиксирует revision evidence и создаёт OPS-04 queue item; Draft не превращается в Verified до решения.
3. OPS-05 проверяет документы и точный docsHash; Request changes возвращает предметный список замечаний.
4. После исправления winery отправляет новую revision; operations повторно открывает актуальные документы.
5. Verify lot доступен только с нужным verifier role и complete evidence; SYS-06 объясняет неизменяемость verified docsHash.
6. После подтверждения WIN-04 получает Verified и «Create offer»; winery заполняет commercial terms, preview, publish.
7. Published offer появляется в PUB-02/03, если наступило окно продаж и выполнены visibility rules. Draft offer публично не виден.
8. Production progression — отдельное действие от verification; status не перескакивает назад.

### WF-05 — milestone и вывод средств

1. WIN-04 показывает production evidence и финансовые milestones предложения отдельными блоками.
2. Winery выбирает milestone и «Submit evidence»; OPS-04 получает offchain запрос с документами.
3. OPS-05 показывает сумму/долю unlock и права на PrimaryMarket; наличие verifier на WineLotToken само по себе недостаточно.
4. Confirm milestone через SYS-06 меняет financial gate; production не становится ReadyForDelivery автоматически.
5. WIN-05 показывает только подтверждённое withdrawable amount, затем review вывода на адрес winery по 04.
6. Success уменьшает withdrawable и увеличивает withdrawn; история buyer/lot сохраняет факты независимо от роли обозревателя.
7. Zero available, paused market, pending receipt, wrong beneficiary и изменившийся entitlement блокируют соответствующее действие.

### WF-06 — физическая поставка и исключения

1. BUY-03 предлагает Request delivery, только если production ReadyForDelivery и есть допустимый transferable balance.
2. Buyer вводит quantity и business delivery details; logistics/taxes не включены автоматически в стоимость аллокации.
3. Review явно объясняет: токены будут помещены в escrow до разрешения delivery; testnet не организует реальную отгрузку.
4. После request BUY-08 и WIN-07 показывают один redemptionId и state Requested.
5. В Requested buyer может отменить по правилам 04; UI объясняет возврат токенов, не денежных средств.
6. Winery добавляет shipping evidence и подтверждает Shipped; hash документа берётся из действительного demo-artifact или testnet input.
7. Buyer видит shipped event и «Confirm delivery»; после подтверждения Completed, escrowed токены сжигаются, redeemed увеличивается.
8. «Report an issue» открывает offchain case поверх Requested/Shipped; это не onchain enum Disputed.
9. OPS-07 рассматривает case и разрешённым контрактным действием завершает поставку либо возвращает токены; денежный refund не подразумевается.
10. Потеря compliance требует отдельного recovery flow с проверяемой EIP-712 buyer authorization там, где это предусмотрено 04.
11. Без backend tracking показывается «Shipment recorded» и введённые данные; не рисовать real-time карту или автоматическое carrier tracking.

### WF-07 — допуск участника и права operations

1. SYS-01/02 показывает организацию, wallet и доступные qualification topics; локально введённое название компании не создаёт KYB claim.
2. OPS-02/03 позволяют просмотреть участника, необходимые claims, issuer, срок и доказательства.
3. В демо решение меняет fixture и общий audit trail; оно явно называется simulated review.
4. В testnet self-assigned role помечается test-mode qualification, не «identity verified by Palissage».
5. Перед действием отдельно проверяются RoleGateway permissions, WineLotToken VERIFIER/ENFORCER и права на PrimaryMarket/RedemptionManager.
6. Недостаточные права дают read-only UI с точной причиной; кнопка смены demo persona не существует как способ повышения testnet прав.
7. Freeze/forced transfer не являются обычной кнопкой Approve. Их видимость, основания и review строго определяются 04 и отдельной capability.
8. Изменение claims/account между review и submit вызывает ST-26 и новую проверку; не продолжать подпись от имени предыдущего владельца.

## 6. Публичные экраны

### PUB-01 — Landing

- Цель: за 20 секунд объяснить кому полезен продукт и открыть воспроизводимую демонстрацию.
- Иерархия: header → hero «Good wine. A more direct route.» + подзаголовок → Explore the demo / Browse sample lots; краткий sample lot preview в hero.
- Ниже: контекст → For wineries → For buyers → пять шагов Define the lot / Review the evidence / Reserve an allocation / Follow the progress / Receive the wine.
- Далее: один sample lot → The record behind the relationship → From prototype to pilot → FAQ → footer; полный порядок и copy —05.
- Pilot CTA «Read the pilot brief» → /pilot; реальные утверждения о traction только из утверждённого контента.
- Desktop: split7/5 с фото4:5 и illustrative caption; tablet/mobile — текст, CTA, фото4:3, preview. Ни сток, ни demo offer не называются live.
- Данные: контентный словарь, hero asset manifest, featured lot reference; цена и availability приходят из общего store.
- Действия: featured lot → PUB-03; producer → PUB-04; how it works — anchor с учётом sticky header; все footer links открываются.
- Состояния: отсутствие фото → достойная статичная композиция; ошибка featured lot не блокирует основной тезис/демо; reduced motion убирает пространственное движение.

### PUB-02 — Explore lots

- Цель: найти подходящую профессиональную закупку, сравнив доступность, происхождение, срок поставки и цену.
- Иерархия: H1 + короткое пояснение demo supply → строка поиска → фильтры → count/sort → карточки → pagination/load more с явным числом.
- Поля: search 0–100 chars; offer type All/Available now/En Primeur; production readiness; region; vintage; price min/max; verified-only.
- Значение «Available now» означает открытое standard offer; отдельный readiness filter означает Ready for delivery, эти понятия не смешивать.
- Цена min/max ≥ 0 с точностью валюты; min ≤ max. Пустые поля означают отсутствие ограничения; invalid filter не применяется.
- Sort: Featured / Price low to high / Price high to low / Delivery readiness. Featured — curated order из fixture, без ложной персонализации.
- Desktop: 3 карточки в ряд и компактные filters; mobile: 1 карточка, filter drawer с Apply и Clear, sort доступен вне drawer.
- Карточка ведёт PUB-03; producer link отдельно PUB-04. Вложенная ссылка не должна создавать вложенные интерактивные элементы.
- Состояния: ST-01/03/04/05/07/16. Sold-out лот можно показать с явной меткой; активный filter не скрывается при отсутствии результатов.
- Query сохраняется при возврате из detail; восстановить scroll и фокус на карточке. Не требовать регистрации для просмотра.

### PUB-03 — Public lot detail

- Цель: дать достаточно коммерческой и предметной информации до reservation.
- Иерархия: breadcrumbs → bottle/estate gallery → wine name + producer + region/vintage → lot status + production → commercial summary.
- Далее: grapes, volume, alcohol или «To be confirmed» для будущего вина, expected readiness с label estimated, documents, production timeline, lot accounting.
- Right summary desktop: €8.40 / bottle, offer type, availability, quantity, full/deposit choice, payment breakdown, deadline, Reserve allocation.
- Mobile: фото ограничено по высоте, summary следует сразу после заголовка; bottom CTA повторяет total/действие, без дублированных editable fields.
- Quantity берётся из offer min/step/max; главный demo выбор 120. Нельзя hardcode 60 для всех лотов или округлять введённое без объяснения.
- Fee = 3% от primary gross удерживается из winery proceeds; не добавлять сверху. Основные цены/депозит берутся из селекторов 04.
- CTA → BUY-04 с offerId и валидным selection. После окончания offer CTA заменяется на понятное недоступное состояние и Explore lots.
- Producer → PUB-04; документ → доступный artifact preview; технические hash/network/details в раскрытии с копированием и статусом источника.
- Accounting подписывает total cap, reserved not minted, minted outstanding, escrowed и redeemed согласно 04; не называть total cap «issued».
- Проверки: ST-05/07/11/13/15/16/17/25; юрисдикция/«Export to» — заявленный scope, не обещание разрешённого импорта.

### PUB-04 — Producer profile

- Цель: показать происхождение и компетенцию производителя без имитации реальных партнёрств.
- Содержимое: estate image, Domaine des Trois Terrasses, регион, 2–3 абзаца fictional story, production approach, qualification evidence, доступные lots.
- Возле имени постоянно «Fictional producer for the demo»; фото обозначено illustrative, если это не снимок описанного хозяйства.
- Desktop: photo/story split и ниже карточки lots; mobile: одна колонка, story без обрезки до непонятного teaser.
- Lot → PUB-03; «Trade through Palissage» → /pilot с role=buyer, subject producer interest без заявленной отправки сообщения винодельне.
- Состояния: producer unknown → ST-07; нет активных lots → «No open offers» + Explore lots; unavailable photo не скрывает профиль.
- Не показывать личные телефоны, карты реального объекта, отзывы, сертификаты AOP/organic или точный acreage без достоверного разрешённого источника.

### PUB-05 — Guided demo

- Цель: показать путь за 5–7 минут и дать самостоятельный доступ к ролям.
- Верх: «Explore how a wine allocation moves from producer to delivery»; visible data snapshot «7 September 2026 · Europe/Paris».
- Режимы: Guided tour; Explore as buyer; Explore as winery; Explore operations. Persona labels берутся из общего dataset.
- Start guided demo → PUB-03 demo-lot-001; Choose role → соответствующий overview, сохраняя общий dataset.
- Глобальная demo toolbar: номер шага, краткая цель, Next, Previous, Pause tour, Reset demo; должна сворачиваться и оставаться доступной клавиатурой.
- «Continue demo» показывается при сохранённой сессии. «Start over» вызывает reset confirmation с перечислением локальных demo-изменений.
- Preset buyer-ready начинает с Verified/Growing main lot и 2,400 доступными бутылками; producer-start начинает без main lot и использует wizard → verification → publish.
- В producer-start создание главного учебного лота детерминированно даёт demo-lot-001; этот preset не накладывается на существующий buyer-ready store.
- Сценарии exception не ломают главный сценарий: selectable isolated fixture branches «Expired eligibility», «Paused market», «Delivery issue».
- Date/time jumps только через явный «Simulate next stage» с показом до/после; обычный Next не скрывает совершение финансовой операции.
- Не использовать таймер автоперехода, заблокированный overlay над кнопками или обязательный walkthrough при каждом входе.

### PUB-06 — Testnet entry

- Цель: осознанно перейти от надёжного demo к взаимодействию с настроенной тестовой сетью.
- Иерархия: testnet disclosure → deployment/network status → Connect wallet → account/claims/capabilities → supported actions → Enter workspace.
- Набор checks: chain ID, доступность RPC, наличие адресов/bytecode, account, qualification, balance/allowance для выбранного действия.
- Никакой marker «Ready» при skipped mandatory check; каждый check имеет Observed / Missing / Failed / Unavailable с конкретной причиной.
- Mainnet choice отсутствует. Реальные ключи, seed phrase, private key не вводятся в интерфейс.
- Role test picker допустим только при подтверждённом testMode и наличии интеграции; текст объясняет тестовую роль и отдельные contract capabilities.
- Переключение demo → testnet очищает активный demo review, сохраняет demo session отдельно; реальные fixture ID не отправляются в контракт.
- Explorer links и instructions берутся из проверяемой конфигурации 04; неизвестная сеть → block writes, не предложение «Continue anyway».
- Неподдержанный testnet workflow показывает ST-30 и ссылку на соответствующий demo scenario; read-only разрешён при доступных данных.

### PUB-07 — Pilot enquiry

- Цель: позволить заинтересованному профессионалу подготовить запрос пилота; действие формы соответствует реальной интеграции.
- Поля: organisation name 2–120; contact name 2–100; work email ≤ 254; role Winery/Importer/Wine shop/Restaurant/Other professional.
- Дополнительно: country ISO selection required; website optional https URL ≤ 500; message optional ≤ 2,000. Consent to contact появляется только в P1 при реальной отправке, unchecked; для P0 local draft не изображать сбор согласия на несуществующую рассылку.
- Подсказка: не включать платёжные реквизиты, документы личности или коммерчески чувствительные данные.
- P0 submit «Download enquiry draft» создаёт локальный preview и скачиваемый текст; результат «Draft downloaded. Nothing has been sent.». Адрес назначения не придумывать, mailto не использовать без подтверждённого контакта.
- P1 после подключения endpoint submit «Send pilot enquiry»; только server success даёт подтверждение получения запроса с request ID, без обещания принятия в пилот.
- Ошибки: invalid inline; rate limited показывает retry-after; network/5xx сохраняют поля; повтор submit не дублирует запрос при поддержанном idempotency key.
- Save не нужен; Cancel → предыдущая публичная страница с подтверждением при введённых данных. Не хранить enquiry в localStorage автоматически.
- Privacy link → /legal/privacy, consent не объединён с marketing subscription. Контент формы не отправлять в analytics.

### PUB-08 — Legal and demo information

- Поддержать только известные slug: privacy, prototype, credits; unknown → SYS-04. Готовое наполнение —05 и asset manifest06.
- Содержимое: title, документный status/date, условия демонстрации, fictional data, testnet limitations, фактически реализованное хранение/обработка данных.
- Draft legal текст помечается draft/test-environment notice; не представлять MVP как юридически завершённую торговую площадку.
- Desktop: читаемая колонка и anchor contents; mobile: contents disclosure. Print не обрезает основной текст.
- Контакты и юридическое имя заполняются только утверждёнными сведениями; отсутствующие данные не заменять выдуманной компанией.

## 7. Кабинет покупателя

### BUY-01 — Overview

- Цель: сразу показать due payments, доступные бутылки и следующие действия.
- Иерархия: organisation + eligibility → Action required → максимум3 accounting metrics → allocations summary → recent business events.
- Метрики: remainder due, bottles held, bottles in delivery escrow; total paid раскрывается в истории; избегать «portfolio value» без точной valuation basis.
- Due task → BUY-03, ready holding → BUY-09 с delivery action, shipment confirmation → BUY-08; Explore lots → SYS-07 выбранной среды.
- Desktop: задачи выше metrics/chart; mobile: одна колонка, самая срочная задача первой. Не рисовать декоративный price chart.
- Empty new buyer: краткие 3 шага + Explore lots; unverified buyer может читать, но видит eligibility notice и account link.

### BUY-02 — Allocations

- Tabs: Reservations / Bottle balances / History; внутри Reservations фильтры All / Payment due / Fully paid / Closed; поиск по lot/producer.
- Reservations columns: lot, producer, original quantity, paid/total, balance due, deadline, state, next action. Здесь только Primary Allocation records.
- Bottle balances columns: lot, wallet quantity, frozen, delivery escrow, transferable, next action; row → BUY-09. History содержит primary receipts и secondary TradeRecord, явно обозначенные источником.
- Не объединять purchase cost и current holding: после resale initial purchase остаётся в истории, доступное владение уменьшается.
- Desktop: таблица с sticky header; mobile: item-card с названием, quantity, due amount, status, action, без скрытого deadline.
- Reservation row → BUY-03; position/secondary trade row → BUY-09. «Pay remainder» открывает detail review; tab count и overview считаются из тех же records.
- Empty payment due → «No payments due»; cancelled/defaulted остаются доступными через Closed; errors наследуют ST-01/03/05/06.

### BUY-03 — Allocation detail

- Иерархия: lot/producer + source + allocation/purchase reference → state → action panel → payment schedule → bottle accounting → evidence/history.
- Deposit state: due, paid, deadline, Pay remainder; fully paid: owned/free/frozen/listed/escrowed quantities, List for resale, Request delivery по eligibility.
- Один главный CTA выбирается по срочности: pay remainder, подтвердить shipment, request delivery, resale; остальные в secondary actions.
- BUY-03 всегда относится к primary allocation. Current holding actions используют Position и ведут в BUY-09; историческое количество allocation не ограничивает текущий объединённый баланс lot.
- List form (общая с BUY-09): quantity integer positive ≤ transferable, unit price > 0 в допустимых decimals. Expiry для listing не вводить; срок buyer quote проверяется отдельно по04.
- Listing review показывает buyer gross, protocol fee, winery royalty, estimated seller proceeds; Cancel закрывает форму без создания listing.
- Delivery form: quantity; business recipient 2–120; contact 2–100; email; phone 5–30; country ISO; address line1 3–200; line2 optional; city 2–100; postal code 1–20.
- Delivery country/postal validation зависит от country policy; не применять французский индекс всем странам. Notes optional ≤ 500, без персональных документов.
- Выбранный saved address вставляется копией; изменение формы не перезаписывает account address автоматически.
- Review показывает proposed destination, pending logistics agreement и отсутствие расчёта shipping/taxes; не ставить «Free shipping».
- В demo PII заменена fictional values; при отсутствии приватного backend testnet address input отключён, работает только поддержанный безопасный путь по 04.
- Cancel delivery form закрывает draft; после отправленного Requested доступно отдельное Cancel request с объяснением token return.
- Refund/default/cancellation messages берутся из состояния и действительного action capability; не создавать buyer cancelAllocation.

### BUY-04 — Reserve allocation

- Полноценный route для глубокой ссылки, не непрозрачный длинный modal. Steps: Terms → Review → Result.
- Header: «Reserve an allocation», lot/producer preview, «Interactive demo» или «Testnet». Back to lot сохраняет quantity/payment choice.
- Terms: quantity с min/step/max из offer; full/deposit radio только при поддержке; deadline; test-only terms acknowledgement required unchecked.
- Сводка demo: 120 bottles × €8.40 = €1,008.00; deposit €302.40; balance €705.60; 3% fee included in gross, deducted from winery proceeds.
- Demo offer closes 31 October 2026, 23:59:59 Europe/Paris; payment deadline 28 February 2027, 23:59:59 Europe/Paris; expected ready 15 June 2027.
- Pricing disclosure: shipping, excise/VAT and operational settlement arrangements not quoted here; окончательная юридическая формулировка из контентного пакета.
- Review: organisation, qualification, payment asset/network в testnet, now/due amounts, source timestamp, условия default, minting after full pay.
- Primary CTA demo «Simulate deposit payment» / «Simulate full payment»; testnet «Review testnet transaction» с отдельными approve/payment steps при необходимости.
- Approval amount ограничен необходимым amount; unlimited allowance не является дефолтом. Отдельно обозначить approval и reservation transaction.
- Submit блокируется при quantity invalid, deadline passed, unavailable claims/balance, market paused или review stale.
- Result даёт allocationId и «View allocation» → BUY-03; повторный refresh result не вызывает повторную reservation.
- Back/cancel до submit сохраняет local non-sensitive selection; после submit можно закрыть review и отслеживать статус через action history.

### BUY-05 — Secondary market

- Tabs «Browse listings» / «My listings»; контекст объясняет resale существующих бутылочных прав и royalty производителю.
- Browse columns/cards: lot, seller organisation where public, price/bottle, available quantity, royalty disclosure, View listing → BUY-06.
- My listings: active/filled/cancelled/unavailable фильтры; количество initial/remaining; unit price; Cancel listing. Unavailable — вычисленная eligibility, не Solidity enum.
- Create listing начинается с выбора собственного eligible holding и ведёт BUY-09; не разрешать свободный ввод произвольного tokenId.
- Filters: search, lot, price min/max, production readiness; sort price/date. Пустой рынок предлагает Explore lots, пустые listings — eligible holdings.
- На mobile сохраняются цена и доступное количество; seller wallet скрыт в раскрытии.
- Lazy listing может стать unavailable после движения balance: статус пересчитывается; старый listing не обещает резервирования токенов.

### BUY-06 — Secondary purchase

- Layout аналогичен BUY-04: lot + seller + immutable listing terms → quantity → fee/royalty summary → eligibility → review/result.
- Quantity: positive integer ≤ актуального listing remainder и transferable seller balance с дополнительными constraints 04.
- Buyer pays gross q × unit price; protocol fee и winery royalty удерживаются из этого gross; seller proceeds отдельной строкой.
- До submit revalidate price bounds, deadline, listing active, seller balance, both compliance; price change требует нового review.
- Testnet пишет только поддержанный purchase method; демо создаёт ownership transfer, royalty ledger и buyer purchase record общей atomic mutation.
- Cancel → BUY-05 с сохранёнными filters; success → BUY-09 по lotId с новой TradeRecord в history; обновить seller listing. Primary allocation для secondary сделки не создаётся.
- Состояния ST-11/13/14/15/17–23/28; own listing purchase недоступен по product rule если 04 не задаёт иной сценарий.

### BUY-07 / BUY-08 — Deliveries и detail

- List: Requested / Shipped / Completed / Cancelled и отдельный filter «Support cases»; state badges соответствуют onchain enum 04.
- Columns: redemption reference, lot, bottles, winery, state, requested date, next action; row → BUY-08.
- Detail: lot/quantity → Requested/Shipped/Completed timeline → destination privately → shipment documents → event history → contact/support action.
- Shipped показывает carrier/reference только если они реально заданы; tracking URL разрешён только https и через whitelist/validated link.
- «Confirm delivery» требует отдельный review с quantity и фразой о завершении/burn; checkbox «I confirm receipt» required unchecked.
- «Report an issue»: category Missing shipment/Damaged or incomplete/Documentation/Other; description 10–2,000; attachment optional по правилам файлов 04.
- Submit case в demo создаёт локальный case; в testnet без backend — «Prepare support request» и отсутствие фиктивного case ID.
- Requested «Cancel request» возвращает токены при подтверждении; Shipped не показывает buyer cancellation.
- Completed даёт «View wine passport» → PAS-01. Ошибочная/missing delivery → SYS-04; потеря access не раскрывает чужой адрес.

### BUY-09 — Bottle position

- Route lotId + current actor однозначно задаёт баланс; unknown lot →404, чужие приватные данные не раскрываются.
- Иерархия: wine/producer → wallet quantity / frozen / transferable / redemption escrow → next action → acquisitions and transfers → public evidence.
- Source balance — Position из04. Несколько primary purchases и secondary acquisitions объединяются по lot; их receipt history остаётся раздельной.
- List for resale и Request delivery используют общие формы BUY-03; всё quantity revalidation выполняется по текущему балансу.
- Secondary TradeRecord показывает listingId, seller, quantity, gross/fee/royalty/net и provenance receipt; не имеет paidAmount/remainder из Primary Allocation.
- После полной продажи или redemption позиция остаётся доступна из истории с zero balance, а actions недоступны с причиной.
- Mobile: accounting компактными строками, следующий action до истории; frozen и escrow не скрываются в tooltip. Состояния ST-01/05/06/07/11–15/17–28.

## 8. Кабинет винодельни

### WIN-01 / WIN-02 — Overview и Lots

- Overview: Action required → funds received/held in escrow/available to withdraw → active offers → production/delivery tasks → history.
- Withdrawal task → WIN-05; shipment → WIN-07; evidence request → WIN-04/Docs; Create lot → WIN-03.
- Metrics derived из общего ledger; нет hardcoded growth deltas. Заработанная royalty и primary sales подписаны отдельно.
- Lots: search name/vintage; filters Draft/Verified/Suspended/Closed и production; сортировка created/updated/name.
- Desktop rows: name, vintage, status, production, total/reserved/remaining, offer state, action. Mobile — компактные карточки, status не прячется.
- Row → WIN-04; «Create lot» доступен qualified winery; empty → короткое объяснение и Create lot.
- Нет доступа к чужой винодельне даже через прямой lotId; SYS-05 не показывает приватные evidence или accounting другого owner.

### WIN-03 — Create lot

- Wizard из 4 шагов: Wine identity → Quantity and production → Evidence → Review. Step back сохраняет введённое.
- Identity: name required 3–120; vintage integer1900…currentYear+2; clock берётся из fixture в demo и актуального времени выбранной среды в testnet; region required2–100; country ISO; producer из account read-only.
- Grapes optional: 0–10 строк name2–60, optional percentage0–100; если проценты заданы всем, сумма=100; частичные проценты явно не считаются полной композицией. Отсутствие сведений показывать как Not provided, не выдумывать сорт ради формы.
- Bottle size required из разрешённых размеров/границ04; alcohol optional для demo/draft, при наличии0–25 с шагом0.1 и указанным источником. Production publication policy может потребовать подтверждённые сведения; этот MVP не генерирует их вместо производителя.
- Quantity: total bottles positive integer в пределах contract/data limit; production initial value; estimated ready date ≥ creation date для future lot.
- Royalty: значение bps в разрешённых пределах, в UI проценты; до review показать что оно удерживается из secondary gross.
- Evidence: product image; provenance/producer declaration; warehouse/production evidence по стадии; document title/type; source/date; optional description ≤ 1,000.
- Не требовать warehouse-ready evidence у Growing lot; матрица обязательных документов зависит от offer/production и задаётся 04.
- File limits, MIME, hashing и privacy — строго по 04. UI показывает upload progress, remove before submit, retry, preview и hash при готовности.
- Данные appellation/organic не возникают из region string; claims требуют evidence и отдельного content field или отсутствуют.
- Save draft разрешён для неполной формы с минимальным name; показывает время/место сохранения. Demo draft хранится локально без реальных документов.
- Review выводит весь payload, total cap, royalty и evidence revision; «Create draft» отдельно от «Submit for verification».
- Cancel → WIN-02 с ST-29 при unsaved; успешное create → WIN-04; повторный submit/refresh не создаёт дубль.

### WIN-04 — Manage lot

- Header: lot name/status/production, view public link только для публикуемого объекта; primary CTA зависит от Draft/changes/Verified.
- Tabs Overview / Documents / Offers / Production / History; tab query сохраняется, все вкладки имеют реальный контент.
- Overview: bottle accounting, identity, royalty, readiness estimate, owner; Documents: revision list, review statuses, file previews, verified docsHash.
- Изменение metadata после verification не переписывает docsHash и не получает новую «verified» отметку автоматически.
- Offers: список существующих offers, per-offer terms, sales/escrow summary; Create offer доступен только после верификации и checks.
- Offer form: type Standard/En Primeur; quantity positive ≤ currently offerable inventory; unit price >0; payment asset allowed; start/end date-time.
- Deposit enabled → deposit bps и payment deadline по 04; full only скрывает неиспользуемые поля. end > start; future deadlines не hardcode.
- Milestones: labels/evidence requirements/release fractions по доступной domain schema; constraints on total bps и порядок из 04.
- Review offer показывает terms exactly as published, min/step policy, fees, royalty, сроки и wallet target; Publish открывает SYS-06.
- Production tab: current step + evidence + estimated timeline; Advance предлагает допустимый следующий stage, proof и confirmation.
- Production update и финансовый milestone confirmation — независимые операции; нельзя автоматически unlock деньги при редактировании текста timeline.
- Exceptions: suspended, no inventory, deadline expired, pending verification, docs changes; действия остаются объяснимыми, history никогда не заменяется заглушкой.

### WIN-05 — Finance

- Tabs Overview / Primary escrow / Royalties / Withdrawals; currency и network всегда однозначны, разные payment assets не суммируются без основания.
- Верх: received gross, protocol fees deducted, net credited, locked escrow, withdrawable, withdrawn; взаимосвязь формул из 04.
- По offer: gross paid, fees, eligible milestone share, refunds/default proceeds where applicable, already withdrawn, current entitlement.
- Primary fee для главного полного платежа €30.24; net €977.76 — не обещание немедленной доступности всей суммы.
- Royalty ledger: secondary trade, lot, quantity, gross, royalty rate/amount, event source; ссылки на разрешённый trade summary.
- Withdraw review: source offer/payment token, available amount, amount если метод допускает partial иначе read-only max, recipient winery wallet.
- Recipient не editable без подтверждённой contract capability; никак не подставлять account contact или введённый banking IBAN.
- Withdrawal amount >0 ≤ актуального entitlement; insufficient/changed entitlement заставляет refresh; успех только по mutation/receipt.
- CSV export реальных displayed demo rows доступен с mode/source/date в header; demo CSV не называется financial statement или invoice.

### WIN-06 / WIN-07 — Deliveries и shipment

- List: Requested / Shipped / Completed / Cancelled, search redemption/lot, sort oldest action first; row → WIN-07.
- Detail: request quantity, private destination, buyer eligibility status, Requested timeline, shipment evidence и действия.
- Requested main CTA «Record shipment»; форма: carrier optional 2–100, reference optional 2–100, shipped date ≤ simulated/current now.
- Обязателен shipment document artifact/hash по 04; optional tracking URL только https, без автоматического запроса произвольного адреса сервером.
- Review сообщает, что отметка Shipped фиксирует документ и открывает следующий шаг buyer, а не доказывает физическую доставку автоматически.
- Testnet при отсутствии document pipeline предлагает ровно поддержанный hash-only workflow с пояснением; не имитирует загрузку реального документа.
- Success синхронно обновляет BUY-08 и OPS-07. После Shipped edit shipment невозможен, если нет поддержанного метода/versioned offchain flow.
- Case open выводится рядом с onchain state; winery может добавить local demo response, но не закрывает disputed case чужим verifier правом.

## 9. Operations

### OPS-01 / OPS-02 — Overview и Participants

- Overview показывает actionable queues: participants awaiting review, lots, milestones, redemption cases; цифры кликабельны к filtered lists.
- Banner «Demo operations workspace» или реальные capability badges. Аудитор с read-only доступом видит данные и ограничения.
- Participants list: organisation, role/type, country, qualification summary, earliest expiry, review state, last update; row → OPS-03.
- Filters: type, needs review/eligible/expired/restricted; search organisation или публичный account identifier без вывода личных документов в поиск.
- Empty queue → «No items awaiting review»; malformed/partial registry read → local ST-06, а не «All verified».
- Protocol settings, treasury changes, trusted issuer administration и arbitrary force transfer console вне основного MVP; не выводить декоративные controls.

### OPS-03 — Participant detail

- Иерархия: organisation → exact capability summary → claims/issuer/expiry → evidence → review decision → audit history.
- Claim row: topic, issuer, issued/expiry если известны, validity result, source/network; неизвестный срок обозначить Unknown.
- Offchain review fields: decision Approve/Request changes/Reject; reason required для двух последних 10–1,000; evidence revision required.
- Required checks не должны быть заранее отмечены: organisation evidence, participant role, applicable claim topics, scope/country declaration.
- Demo confirm создаёт simulated event; testnet qualification доступна только через поддержанный RoleGateway/claims path и permission.
- UI business role отображается рядом с конкретными contract grants; admin gateway не означает verifier/enforcer на каждом контракте.
- Revocation/freeze: доступна только специально заданная операция 04; review показывает affected account/balance, reason и consequences.
- Save review draft в demo сохраняет только IDs выбранных sample reasons/evidence; произвольные заметки остаются в памяти до закрытия формы. Private testnet notes требуют backend. Cancel оставляет registry state неизменным.

### OPS-04 / OPS-05 — Lot and milestone verification

- Queue tabs Lots / Milestones, фильтры pending/needs changes/decided; row → OPS-05 с tab/task reference.
- Detail layout desktop: слева evidence viewer/list, справа decision panel; mobile evidence сначала, sticky action без перекрытия документа.
- Lot: declared producer, total bottles, production, royalty, provenance evidence, revision digest и current contract status.
- Checklist содержит конкретные проверяемые пункты; green check появляется после review action или достоверного источника, не по наличию filename.
- «Verify lot» блокирован до необходимых evidence и VERIFIER_ROLE на WineLotToken; SYS-06 показывает точный docsHash и его неизменяемость.
- Нельзя вычислять docsHash из lot name/id и называть его hash документов; алгоритм и manifest canonicalization задаёт 04.
- «Request changes» / «Reject submission»: reason 10–2,000 и привязанные поля/documents; это offchain review state, не новый token enum.
- Milestone: offer, release fraction, monetary entitlement consequence, documents, prior approvals, PrimaryMarket capability.
- Confirm milestone — отдельная review/transaction, без автоматического ReadyForDelivery; missing capability → ST-12.
- Concurrent revision/update → ST-24; pending transaction не позволяет verify ту же revision повторно; success обновляет WIN-04/05.

### OPS-06 / OPS-07 — Redemptions and cases

- Queue: redemptionId, lot, parties, bottles, onchain status, separate case status, age, next action; filters open case/unshipped/shipped/completed.
- Detail: immutable request/shipment events, document hashes, private business destination при авторизованном доступе, buyer issue и winery response.
- Decision options показывают только реально разрешённые действия: confirm delivery, refund escrowed tokens или recovery по 04.
- «Refund tokens» поясняет «Return the escrowed bottle tokens»; сумма money refund здесь отсутствует.
- Form: reason required 10–2,000; evidence references required; chosen outcome; affected quantity read-only; recipient according to allowed method.
- Потеря compliance P0: read-only recovery explanation и проверка недостающих возможностей. Specialist recovery UI P1 реализует buyer authorization, deadline/domain/recipient checks по04; не добавлять nonce в EIP-712 type, которого нет в текущем контракте. Invalid/missing authorization блокирует submit.
- Testnet write требует роли на RedemptionManager; badge verifier из token contract недостаточен.
- Success сохраняет outcome, источник и tx/event reference; case закрывается после подтверждённого результата, не по нажатию кнопки.
- Suspended lot или frozen balance не дают универсального отказа recovery; каждый доступный метод проверяется отдельно по 04.

## 10. Паспорт и системные экраны

### PAS-01 — Wine passport

- Цель: коротко завершить демонстрацию связью между записью о лоте и физическим вином.
- Mobile-first: Palissage mark → bottle/label image → producer/wine/vintage → provenance summary → production history → evidence source.
- Идентификатор относится к passport record; если bottle-level uniqueness не обеспечена, писать «Lot passport», не «This unique bottle is authentic».
- QR ведёт прямо /passport/:passportId, содержит только публичный идентификатор; повторное открытие не создаёт ownership/reward event.
- Показать «Demonstration passport»; личный buyer, delivery address, private documents и wallet history отсутствуют.
- Links: producer → PUB-04, public lot → PUB-03, «Explore Palissage» → /; copy link с доступным feedback.
- Нет Scan-to-earn, achievements, discount vouchers, membership promises или рекомендации покупать/употреблять больше алкоголя.
- Unknown/revoked/unavailable passport — предметный ST-07/05 с объяснением источника; QR сам по себе не объявляется криптографическим доказательством подлинности.

### SYS-01 / SYS-02 / SYS-03 — Account

- Общие sections: organisation, language, account/network, eligibility, notification preferences только при действительной поддержке, environment controls.
- P0 profile показывает read-only synthetic organisation/contact/country, role/claims/capabilities отдельно. Локально сохраняются locale и выбранные sample profile/address IDs.
- Если demo показывает редактируемый preview: display name2–120, contact email≤254, country ISO; адрес по BUY-03. Произвольные значения только in-memory, подпись «Preview for this session only»; они не попадают в persisted snapshot, URL или logs.
- Реальное profile save в testnet без backend disabled с ST-30; synthetic preset switch не создаёт KYB. Сохранение языка даёт «Language saved», не сообщение о сохранённых персональных данных.
- Language меняется без потери draft; EN/FR не меняет settlement currency. Dates используют locale, deadline всегда с timezone.
- Operations account отображает grants по каждому контракту и source checkedAt; Refresh permissions повторяет read.
- Disconnect wallet инвалидирует private reads и pending review; отправленную транзакцию продолжить отслеживать по hash без нового write.
- Reset demo доступен через PUB-05; testnet account не предлагает удалить blockchain history.

### SYS-04 / SYS-05 / SYS-06 — Ошибки доступа и подтверждение

- Not found: название типа объекта, Back to marketplace/workspace, без утечки существования чужих private records.
- Access: объяснение необходимой роли/qualification, текущий mode, account link; отсутствующие поля не заменяются пустым «verified» экраном.
- Action review показывает полный смысл операции в бизнес-словах, отдельно технические детали, consequences, Confirm и Cancel.
- Каждая asynchronous стадия соответствует ST-18…23. Dialog можно закрыть при pending, но на экране остаётся global activity indicator.
- Reload восстанавливает известные pending transaction hashes и сверяет receipt/state; отсутствие local pending не доказывает отсутствие onchain action.
- Toast содержит краткий статус, но итог и ошибка доступны постоянно в объекте/inline panel; screen-reader получает одно корректное live announcement.
- Destructive/irreversible action требует конкретного review; не просить confirmation для простого фильтра, таба или смены языка.

## 11. Сценарий демонстрации комиссии: 5–7 минут

Демонстрация запускается одним «Reset and start guided demo»; начальное время 7 September 2026, Europe/Paris.
Все имена/документы/цифры демонстрационные. Главный lotId demo-lot-001, offerId demo-offer-001; остальные IDs и стадии определяет 04.
Главный сценарий не зависит от wallet extension, RPC, удалённых изображений или фонового email/document сервиса.
Buyer-ready содержит main lot Verified/Growing, 2,400 available, reserved/minted = 0; роль demo-buyer-001 открывается по умолчанию.
Для полного показа создания лота запускать отдельный producer-start preset и отвести до 8 минут; не вклеивать создание поверх buyer-ready.

| Время | Экран / действие | Что демонстрируется | Контрольный результат |
| --- | --- | --- | --- |
| 0:00–0:40 | PUB-01 → PUB-05 | B2B задача и понятный вход | Демо начато без кошелька |
| 0:40–1:30 | PUB-03, документы, timeline | Происхождение и прозрачные условия En Primeur | 120 × €8.40, депозит 30%, реальные demo artifacts |
| 1:30–2:15 | BUY-04 → BUY-03 | Резервирование и отделение депозита от владения | €302.40 paid, €705.60 due, minted=0 |
| 2:15–3:00 | WIN-04 → OPS-05 → WIN-05 | Роли и условие будущего milestone | Final release pending; withdrawable=0, депозит остаётся escrow |
| 3:00–3:40 | Simulate 15 February 2027 → BUY-03 | Доплата и получение прав на бутылки | Fully paid, minted 120, balances согласованы |
| 3:40–4:35 | BUY-03 → BUY-05/06 → WIN-05 | Resale 24 bottles × €9.20 второму buyer | demo-buyer-001: 96; demo-buyer-002: 24; royalty €5.52 |
| 4:35–5:45 | Simulate 15 June 2027 / ReadyForDelivery → OPS-05 final milestone → BUY-09/08 → WIN-07 → BUY-08 | Readiness; release eligibility; request/shipment/receipt60 bottles | Gross withdrawable1008; winery net977.76; held36+24; redeemed60; escrow0 |
| 5:45–6:20 | PAS-01 → PUB-01 pilot block | Путь до физического вина и назначение следующего этапа | Read-only provenance; ясные pilot next steps |
| 6:20–7:00 | По запросу PUB-06 или case branch | Отделение demo от технического testnet и исключений | Нет заявления об успешном реальном платеже/доставке |

Даты будущих стадий и правила явного продвижения заданы в05; ведущий видит переход времени и нажимает его явно.
Secondary gross €220.80 делится на fee €6.624, royalty €5.52 и seller proceeds €208.656; не терять дробную точность при хранении/сверке.
Бутылки, проданные второму buyer, недоступны первому для delivery; количество доставки вычисляется из остатка, не остаётся hardcoded 120.
Если комитет останавливает сценарий на экране, UI не продолжает самостоятельно. Pause tour убирает подсказки и сохраняет бизнес-состояние.
Back меняет экран, но не отменяет бизнес-события; «Replay from stage» создаёт отдельный именованный snapshot с пояснением.
Reset возвращает seed, часы, role, transactions, cases и drafts; язык и reduced-motion preference сохраняются.
Failure branch открывается копией fixture; после выхода главный progress доступен без ручного ремонта данных.

## 12. Приёмка UX и handoff агентам реализации

- Каждый маршрут реестра открывается напрямую и после refresh; неизвестный ID даёт 404 без показа первого fixture.
- Во всех ролях main CTA имеет работающий путь, success destination и проверенные disabled/pending/error states.
- Full payment и deposit не смешивают owned/minted/reserved; arithmetic и fees едины на public, review, receipt и winery finance.
- Secondary purchase меняет один ownership ledger; winery royalty видна без ручного перехода на несвязанную fixture.
- Delivery Requested/Shipped/Completed отражается в buyer/winery/operations; case overlay не выдумывает onchain Disputed.
- Все form labels видимы; errors связаны с полями; клавиатура проходит от header до итогового confirmation без ловушек.
- Escape закрывает отменяемый dialog, фокус возвращается; route navigation ставит фокус на H1 и сохраняет логичное восстановление Back.
- Mobile 360 px сохраняет quantity, сумму, deadline и CTA; zoom 200% не скрывает действия; таблицы не требуют горизонтального scroll страницы.
- Никакая анимация не является единственным способом узнать об изменении статуса; reduced motion сохраняет все переходы workflow.
- Offline demo работает с локальными assets; testnet failure не подменяется демонстрационным успехом.
- Любой публичный документ и download доступны, безопасны и имеют подпись источника; никакие «View» не остаются пустой кнопкой.
- Product copy не обещает гарантированную доходность, юридическое соответствие, реальные поставки, реальных партнёров или автоматический logistics service.
- Реализацию делить по screen IDs и WF IDs; зависимости на shared state, capability checks и fixtures принимать до сборки отдельных экранов.
- Перед закрытием задачи агент сверяет свой экран с реестром действий, матрицей ST и соответствующим WF, затем прикладывает результаты к handoff.

## 13. Границы проведённого чтения

Документ подготовлен по разрешённым README.md, TECHNICAL_README.md, UI/web/src/router.tsx, UI/web/src/lib/mock.ts,
UI/web/src/pages/shop/LotDetail.tsx, UI/web/src/pages/shop/Portfolio.tsx, UI/web/src/pages/winery/Dashboard.tsx,
UI/web/src/pages/winery/LotDetail.tsx, UI/web/src/pages/admin/Verification.tsx, UI/web/src/pages/consumer/Passport.tsx,
а также уточнениям владельца общего domain-спецификатора 04 после его проверки контрактов.
Исходники реализации не изменялись; это предлагаемый интерфейс и требования к следующей реализации, а не отчёт о готовом UI.
