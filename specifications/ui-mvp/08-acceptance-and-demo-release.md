# 08. Приёмка UI, тестовая матрица и показ комиссии

Все проверки здесь — требования к будущей реализации. В ходе подготовки этого ТЗ приложение не запускалось, тесты не выполнялись, готовность интерфейса не заявляется. Проверяется не только количество страниц, но и правдивость результатов, цельность сценария и визуальное качество.

## 1. Два независимых gate

| Gate | Условия | Недопустимая подмена |
|---|---|---|
| **DemoReady** | Все P0 demo-сценарии02, данные05, визуальное качество03/06, локальная воспроизводимость, EN/FR, a11y и responsive | Успех toast без общего изменения данных; набор картинок вместо workflow |
| **TestnetReady — перечисленные capabilities** | Validated deployment, receipts, actual state reads,04 DC checks, полный список поддержанных/недоступных actions | Approve вместо reserve; RPC timeout→mock; local fork выдан за public testnet |

Основной grant pitch может опираться на DemoReady. Таблица testnet coverage отдельно раскрывает выполненные действия и зависимости. Ни один из этих gate не означает юридическую готовность, независимый аудит или mainnet launch.

Статусы отчёта: `PASS`, `FAIL`, `NOT_RUN`, `BLOCKED` с причиной; для integrations дополнительно `OBSERVED_TESTNET`, `SIMULATED`, `DISABLED`. Нельзя считать NOT_RUN/BLOCKED выполненным. При обязательном failed check gate не достигнут.

## 2. Test tooling и окружения

Текущий package.json содержит build/lint; будущие тестовые scripts добавляет A00 в явной задаче. Предлагаемые команды после их реализации:

```bash
cd UI/web
npm ci
npm run lint
npm run build
npm run test:unit
npm run test:e2e
npm run test:a11y
npm run test:visual
```

`test:*` сейчас является **планируемым script contract**, не командой, уже существующей в репозитории. Unit runner выбирает координатор по baseline и фиксирует версию. Для browser E2E/visual — Playwright; a11y — axe integration + ручная проверка. Build/lint выполняются по lockfile, Node version записывается в baseline. Не использовать произвольный latest browser/package в воспроизводимом CI.

Автотесты используют semantic roles/labels и auto-retrying assertions, ждут состояние, а не произвольную длительность анимации. Fixed sleeps допустимы только в специально контролируемом motion trace, не в финансовом happy path. [Playwright assertions](https://playwright.dev/docs/test-assertions).

Каждый тест начинает отдельный fixture storage/context. Никаких зависимостей от порядка tests, даты ноутбука и общих аккаунтов. Testnet suite запускается отдельно и последовательно для shared wallet/nonce. Unit/mock tests не отправляют transactions.

## 3. Функциональная матрица

Каждая строка — проверяемый результат, а не требование отдельного тест-файла. Группировать проверки по независимому пользовательскому сценарию.

| Test ID | Экран / flow | Действия | Ожидаемый результат |
|---|---|---|---|
| UX-PUB-01 | PUB-01 | Открыть чистый browser без wallet | Ясен B2B продукт; основной CTA demo; нет wallet prompt; hero/caption готовы |
| UX-PUB-02 | PUB-01 | Header anchors, mobile menu, logo, FAQ | Верные destinations; каждый FAQ конкретен; header не закрывает target/focus |
| UX-PUB-03 | PUB-02 | Query producer/vintage/price, sort, clear, Back | Результаты и URL согласованы; zero state не error; Back возвращает выбор и scroll |
| UX-PUB-04 | PUB-03/04 | Открыть featured lot и producer | Те же цена/остаток/производство, что в общем store; fictional/illustrative labels |
| UX-PUB-05 | PUB-03 | Ввести negative/fraction/zero/too-large quantity | Нет silent coercion; inline error; review недоступен до исправления |
| UX-PUB-06 | PUB-07/08 | Составить enquiry draft, download; legal links | Файл существует и читается; ничего не отправлено; known slugs privacy/prototype/credits |
| UX-PUB-07 | SYS-04 | Unknown route, unknown lot, wrong producer ID | Корректный404, back action; никакой подстановки первого лота |
| UX-MODE-01 | PUB-05 | Start, role switch, pause hints, reload, reset | Один сохранённый ledger, reset всех actors; locale сохранена |
| UX-MODE-02 | PUB-06 | Ошибка config/RPC; отключить wallet | Testnet остаётся testnet; no fake data/success; mainnet недоступен |
| UX-MODE-03 | /app deep link | Открыть без mode; mode=testnet с demo-ID | Выбор среды/404; query не даёт прав; нет попытки записать fixture ID |
| UX-MODE-04 | SYS-07/08 | Из testnet workspace открыть catalogue→lot→reserve | Все IDs/read-model принадлежат текущему deployment; public fixtures не подмешиваются |
| UX-BUY-01 | WF-01 | Standard full payment в demo | Allocation Paid; токены увеличились; event/overview/winery согласованы |
| UX-BUY-02 | WF-02 | Main120 bottles,30%deposit | 1008 total,302.40 paid,705.60 due; Reserved; minted0 |
| UX-BUY-03 | BUY-03 | Advance to15Feb2027, pay remainder | Paid; minted120; обязательство доплаты исчезло; initial offer availability2280 |
| UX-BUY-04 | BUY-03 | Deadline before/exactly/after; cancelled offer; default | Поведение соответствует04; default только после action; history сохранена |
| UX-BUY-05 | BUY-02/09 | Secondary acquire, primary history, partial resale | Current position меняется; primary allocation quantity/history не переписана |
| UX-WIN-01 | WF-04 | producer-start create draft; back/save/resume | Поля/ошибки сохранены; main ID детерминирован; public offer не появился преждевременно |
| UX-WIN-02 | WIN-04 | Review→verify→publish offer | Lot/offer разные IDs/states; каталог обновился из store |
| UX-WIN-03 | WIN-04/05 | Production update без milestone confirmation | Production изменилась; withdrawable не открылся автоматически |
| UX-WIN-04 | WF-05 | Final milestone confirm then withdraw | Gross1008;fee30.24;net977.76; confirmed milestone ≠ paid to winery до receipt |
| UX-OPS-01 | OPS-02/03 | Participant missing claim; review decision | Видны scope/issuer/reason; navigation role не создаёт прав |
| UX-OPS-02 | OPS-04/05 | Missing doc, mismatched hash, request changes | Verify заблокирован где требуется; понятный возврат винодельне |
| UX-OPS-03 | OPS-05 | Gateway admin без Primary verifier grant | Milestone confirmation недоступно, даже если lot verify доступно |
| UX-SEC-01 | WF-03 | List24 at9.20, second buyer purchases | Gross220.800;fee6.624;royalty5.520;net208.656; token balances96/24 |
| UX-SEC-02 | BUY-05/06 | Own listing purchase; cancel; seller moved balance | Own buy disabled; cancel без burn/refund; stale listing показывает unavailable |
| UX-SEC-03 | BUY-06 | Price/amount changed after review | Старые/новые условия; повторный review; не тихая другая сумма |
| UX-DEL-01 | BUY-09/08 | Request before Ready, then after Ready for60 | Before blocked; after Requested escrow60; buyer spendable36 |
| UX-DEL-02 | WIN-07→BUY-08 | Mark shipped; confirm receipt | Shipped→Completed; burned60; balances36+24; escrow0; события видны всем ролям |
| UX-DEL-03 | BUY-08 | Cancel Requested; attempt cancel Shipped | Requested возврат токенов; Shipped buyer cancel отсутствует |
| UX-DEL-04 | OPS-07 | Open problem case, review token return | Case overlay отдельно от chain state; token return не money refund |
| UX-PAS-01 | PAS-01 | Открыть QR/ссылку без wallet | Passport lot, не owner credential; нет private buyer/address/delivery docs |
| UX-ERR-01 | Shared | Missing image/document, partial list, unknown enum | Разные error states; нет zero balance из-за read error; actions fail closed |
| UX-ERR-02 | Shared | Double click/Enter, reload pending, route change | Не дублирует action; persisted pending продолжает tracking |
| UX-ERR-03 | Shared | Corrupt/old demo storage, multi-tab conflict | Controlled reset/reload; данные не теряются молча; нет white screen |
| UX-LOCALE-01 | Все P0 | EN→FR mid-flow, reload, amounts/dates | Полный перевод, корректные единицы/даты; общий underlying amount не изменился |

Paid primary refunds, token escrow returns и default — три разных сценария. Тест не может пройти просто потому, что «какой-то баланс увеличился»: сверять получателя, актив, amount, source event и допустимый переход.

## 4. Минимальные unit/integration проверки

Нужны смысловые тесты для state machines и денежных инвариантов; не писать snapshot каждой CSS-классовой строки.

- Primary total/deposit/remainder, 0bps deposit, floor rounding, max uint bounds, number parsing с запятой и точкой по явной locale policy; invalid exponent/NaN/Infinity не допускается.
- Secondary fee+royalty+net=gross в base units; selected300bps demo vs observed config; fractional cents сохраняются; en/fr format round-trip не используется как data source.
- Bottle conservation по каждой lot: cumulativeMinted = circulating + cumulativeBurned; circulating учитывает wallets + redemption escrow; lazy listings не прибавляют дополнительный supply.
- Reservation quantity не равна minted supply; отмена/дефолт освобождают capacity по04; Paid не отменяется через reserved-only метод.
- Capabilities проверяются для каждого действия и account/deployment; Suspended/Frozen/Paused/Unverified независимо, recovery branch отдельно.
- Demo reducer атомарен: ошибочный command не оставляет half-updated balance, event либо receipt. Client request duplicate не повторяет mutation.
- Persistence включает fixture-only IDs/events и schema version; не сериализует вручную введённые private данные. Ошибка JSON/quota/недоступный storage имеет in-memory fallback с заметным `Progress won’t persist`.
- Read model различает missing/zero/unknown/partial и связывает entity IDs без подстановки. Unknown action/query отклоняется runtime schema.

Для testnet adapter с mock provider: reverted receipt, successful approval only, wrong emitter/event ID, late receipt, replacement, no client, changing account/network, allowance update, token decimals mismatch, expired prepare snapshot. Это проверяет UI логику; public testnet evidence требуется отдельно.

## 5. Testnet evidence matrix

На отдельной странице отчёта или release note:

| Capability | Среда / deployment ID | Account role + actual grants | Tx / block / result | Post-state | Status |
|---|---|---|---|---|---|
| readLots | Заполнить при проверке | read-only | Без выдуманного hash | реальные lot IDs / completeness | NOT_RUN до выполнения |
| approve + reserve | Заполнить при проверке | buyer | отдельные receipts | allocationReserved/Paid | NOT_RUN |
| payRemainder | Заполнить при проверке | allocation buyer | receipt | paidAmount/full tokens | NOT_RUN |
| list + buy | Заполнить при проверке | seller/buyer, approvals | receipts | balance + fee + royalty | NOT_RUN |
| request / ship / confirm | Заполнить при проверке | buyer/winery | receipts | escrow / shipment / burn | NOT_RUN |
| milestone + withdraw | Заполнить при проверке | exact verifier/winery | receipts | entitlement / actual transfer | NOT_RUN |
| private documents / logistics / cases | Сервис или absence | scoped access | service evidence | не onchain receipt | DISABLED без сервиса |

Не публиковать private key, seed phrase, приватные shipment docs или bearer token в отчёте. Публичный tx hash разрешён только для действительно выполненного действия и правильного explorer. Local fork не даёт ссылку на public explorer для local transactions.

## 6. Доступность

Автопроверка axe проходит для главной, каталога, checkout review, wizard step с ошибками, открытого меню/dialog и delivery confirm. Ноль critical/serious violations; остальные оцениваются вручную, а не автоматически игнорируются. Автоматика не покрывает все проблемы, поэтому keyboard/screen-reader проверка обязательна. [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing).

Ручной маршрут: Tab от адресной строки→Skip→menu→catalogue→filter drawer→lot→quantity→review→close→back. Проверить visible focus, label/name/role/value, порядок чтения, возврат фокуса и отсутствие keyboard trap. На testnet проверить передачу фокуса wallet overlay.

Дополнительные acceptance cases:

- 320 CSS px reflow и 200% text zoom; таблицы скроллятся локально, документ не уезжает вбок.
- Основные targets44×44 CSS px; focus не перекрывается sticky header/bottom CTA/keyboard.
- Ошибка формы связана с полем и summary, не только красный border; status read один раз, polling не спамит screen reader.
- Reduced motion включён до загрузки и переключён во время работы: нет translate/scale/loops, все функции доступны.
- NVDA+Firefox или эквивалентный доступный desktop screen reader; VoiceOver+iOS для основного mobile flow. В отчёте указать фактически проверенные сочетания, не писать полный support без устройства.
- PDF имеет текстовое описание в UI, type/size/title; действия не требуют только drag-and-drop, hover или сканирования камерой.

## 7. Визуальная приёмка и browser matrix

| Набор | Viewports / platform | Экраны / состояния |
|---|---|---|
| Baseline desktop | 1440×1000 | Landing fullpage, catalogue, lot, reserve review/result, winery finance, operations evidence |
| Tablet | 834×1112 | Landing, catalogue filter, lot, wizard, deliveries |
| Mobile | 390×844 и360×800 | Hero, menu, catalogue, review с клавиатурой, error summary, position, confirm receipt |
| Wide screen | 1920×1080 | Container не растянут; typography и line length соответствуют03 |
| Zoom/reflow | 320 CSS px / 200% text | Формы, финансовые итоги, navbar, docs |
| EN/FR | Desktop и390 | Hero, меню, checkout, errors, date/currency, long strings |
| Browser engines | Pinned Chromium/Firefox/WebKit | Основной demo journey; реальные Safari/iOS и Chrome Android smoke при наличии |

Для стабильных visual snapshots зафиксировать browser/OS/fonts/DPR, scenario clock, locale и seed, дождаться fonts/images; motion заморозить только в snapshot profile. Отдельный motion run проверяет настоящие переходы. [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots).

Первый baseline принимает человек по03, он не автоматически объявляется «правильным», потому что был сгенерирован первым. Изменение baseline требует просмотра diff и причины. Не повышать allowed pixel-diff, чтобы скрыть broken layout. Fullpage shot дополнять crops review/focus/sticky areas.

**Визуальная рубрика** — каждый пункт 0 (не выполнен), 1 (нужны исправления), 2 (принят):

1. Hero сразу узнаётся как Palissage: wine trade, editorial photo, clear action, особая композиция.
2. Типографика имеет иерархию; длинные французские строки не ломают header и кнопки.
3. Публичные секции чередуются по композиции; отсутствует однообразная стена карточек.
4. Фотографии и бутылки согласованы по свету, crop, масштабу; нет случайных stock-иконок и лишней графики.
5. Рабочие таблицы читаются; единицы, даты, money alignment и следующий action ясны.
6. Mobile выглядит спроектированным: меню, safe areas, filters, forms, review, keyboard.
7. Loading/empty/error/pending выглядят законченными и объясняют продолжение.
8. Motion плавный и уместный, не задерживает данные, управление и focus.

Принятие: ≥14/16 и ни одного0. Это проектный критерий, не внешняя метрика. Критическая ошибка суммы, прав, доступности или truth labels блокирует gate независимо от визуального балла.

## 8. Performance и motion budgets

Из03: public initial JS≤250KB gzip, CSS≤60KB gzip, initial mobile transfer≤1MB, hero mobile≤160KB. Wallet/application chunks не включаются до запроса. Для изображений использовать фактический resource transfer, не размер CSS viewport.

Измерение lab: production build, фиксированная Chromium version, viewport390×844, cache cold, CPU4× slowdown, network9Mbps down/1.5Mbps up/RTT150ms; минимум3 независимых прогона. Сохранить machine/browser/version и median/worst, не только Lighthouse score. Target median LCP≤2.5s, CLS≤0.1; если не достигнуты — asset/bundle/profile исправления, не скрытие hero.

INP≤200ms — будущий field target на75th percentile; пока нет реальных пользователей, не заявлять его достигнутым по одному Lighthouse run. Проверить interaction traces для filters/dialog/route/quantity; нет animation-caused long tasks>50ms. Web Vitals thresholds и field/lab различия: [web.dev](https://web.dev/articles/vitals).

Motion trace: открыть/закрыть drawer5 раз быстро, переключить tabs, перейти назад, отправить demo action и закрыть overlay. Нет orphan backdrop, второй записи, скрытого H1, jumpy list layout или таймера success. Под hidden tab нет декоративных циклов. 60fps — цель на зафиксированном устройстве; если не достигнута, упростить эффекты до transform/opacity.

## 9. Контент, приватность, медиа и безопасность UI

- Всё из05 размещено в соответствующих секциях. Не осталось переводов status enum «как есть», hardcoded deadlines, €-арифметики через float, пустых FAQ и `href="#"` вместо маршрутов.
- Asset manifest06 имеет actual hashes/dimensions/status; credits соответствуют финальному набору. Никаких raw master uploads и private rights correspondence в public/dist.
- Public demo не вызывает RPC/wallet/third-party analytics. Self-hosted fonts/media загружаются с origin. Проверить network tab и built output.
- Session/account switch invalidates scoped cache. Direct route не показывает private data другой организации. UI role picker не является авторизацией.
- User metadata не рендерится как raw HTML; document links проходят policy04; upload validation выполняется и до preview.
- Clipboard errors обработаны; address/hash copy не подменяется другим значением. External links дают корректную сеть и безопасное открытие.
- Real email/contact/address/KYC не остаются в localStorage, URL, logs, analytics или публичном passport. Человек может случайно ввести PII даже в поле с надписью demo — storage test должен это обнаружить.
- Enquiry download не выдаётся за отправку. Термины `verified`, `escrow`, `delivery`, `token return` объясняются точно.
- Legal notice отражает фактическую среду и hosting; отсутствующее юрлицо не выдумывается. До внешней публикации это отдельная content dependency.

## 10. Подготовка показа комиссии

### За день до показа

1. Зафиксировать build/version и выбранный язык; сверить footer demo label, право на фото, доступность всех assets.
2. Запустить production build локально; обеспечить локальный static preview без внешнего RPC. Шрифты/документы и lazy route chunks должны быть доступны с этого сервера.
3. Пройти полный golden path с reset и проверить числа05; отдельный shortened path из02 на5–7мин. Создание партии показывать отдельным producer-start,≤8мин.
4. Подготовить read-only публичную ссылку на demo и QR на sample passport, если сайт уже опубликован в рамках отдельной задачи. Никаких permissions запросов камеры ради просмотра QR URL.
5. Сохранить6–8 screenshots и короткую запись успешного **явно обозначенного demo** как резерв презентации; не выдавать запись за live interaction.

### Перед началом

- Открыть чистый demo profile без приватных wallet/account данных, отключить desktop notifications.
- Reset `buyer-ready`; язык и browser zoom100%; демонстрационная дата7Sep2026, а не сегодняшняя дата компьютера.
- Проверить hero, sample lot, документ, роль buyer и оба actor labels. Sound/video autoplay отсутствует.
- Держать кнопку reset доступной ведущему, но не нажимать её случайно при переходе между ролями.

### Сценарий речи и экранов

| Время | Смысл для комиссии | Экран |
|---|---|---|
| 0:00–0:40 | Кто покупатель и как винодельня достигает его напрямую | Landing→demo |
| 0:40–1:30 | Условия партии, происхождение сведений и будущий урожай | Public lot/evidence |
| 1:30–2:15 | Резерв с депозитом; пока нет токенов бутылок | Reserve→allocation |
| 2:15–3:00 | Роли и контроль вывода средств; деньги ещё удерживаются | Winery→operations→finance |
| 3:00–3:40 | Явно продвинуть учебное время; доплата создаёт владение | Allocation→position |
| 3:40–4:35 | Перепродажа24 бутылок и royalty винодельне | Position→secondary→finance |
| 4:35–5:45 | Явная готовность, milestone, доставка60 и подтверждение | Operations→deliveries |
| 5:45–6:20 | Публичная история партии, следующий этап пилота | Passport→pilot brief |
| 6:20–7:00 | По запросу показать границу testnet и открытые работы | Testnet checks / pilot |

Начальная реплика: `This is an interactive prototype with sample data. I’ll show one lot moving from a winery’s offer to a buyer’s allocation and delivery.` Не произносить «сейчас происходит реальная покупка», если показан simulator.

Если сеть недоступна: продолжить demo на локальном preview; testnet показать как unavailable. Если незавершённая transaction: открыть её status, не нажимать повторный write ради скорости. Если presenter сбился: Pause tour, нужный этап открыть через явный snapshot restore с надписью о восстановлении симуляции.

## 11. Финальный release checklist

Координатор сдаёт:

- Build/commit ID, URL или local preview command, Node/browser versions.
- Закрытые tasks07 и экранный реестр02; все P0 destinations работают.
- Отчёт функциональных tests, DC checks, a11y, visual crops и performance traces; failures/NOT_RUN видны.
- Exact scope: `DemoReady: yes/no`, `Testnet capabilities observed: <list>`, `Disabled dependencies: <list>`.
- 5–7min rehearsal completed с правильными цифрами и без side effects.
- Текущие P1 и неизменённые backend/operational ограничения; никакого слова «production-ready» по одному green build.

**Stop conditions для демонстрационного релиза:** неверная сумма/валюта; ложный transaction success; невозможно закончить основной journey; потеря права/данных при role switch; раскрытие private data; unlicensed final imagery; нечитаемый mobile review; keyboard trap; missing demo labels; оставшиеся Placeholder в P0. Исправления обязательны до присвоения DemoReady.
