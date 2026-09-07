# Palissage MVP — визуальная система, адаптивность, компоненты и motion

Статус: спецификация для последующей реализации; интерфейс по этому документу ещё не разработан.
Дата проверки внешних источников: 2026-09-07. Язык документа — русский; базовый UI — английский, французский — вторичный.
Этот файл задаёт визуальные и поведенческие контракты; бизнес-сценарии, маршруты, тексты и данные задаются остальными документами пакета.
При конфликте визуального эффекта с доступностью, актуальностью данных или подтверждением операции приоритет у последних.

## 1. Направление: Living trellis / «Живая шпалера»

Palissage связывает винодельню, проверку партии, покупателя, расчёт и физическое получение вина.
Образ интерфейса — современное деловое издание о виноделии с точностью рабочего инструмента.
Авторское направление для MVP: светлый известняк, тёмный винный цвет, спокойная зелень, крупная фотография виноградника и линейная шпалера.
Это проектное решение, а не утверждение, что существует единственный «правильный стиль 2026 года».

- Первое впечатление: настоящее вино и понятная торговля. Технические доказательства раскрываются в нужном месте.
- На публичных страницах — выразительная типографика, асимметрия 7/5, полноценные подписи изображений, большие поля.
- В рабочем кабинете — устойчивые формы, таблицы, единицы измерения, история действий, ясный следующий шаг.
- Один экран имеет одну главную визуальную точку и один основной CTA; вторичные действия спокойнее.
- Фотография занимает крупную осмысленную область. Нельзя заполнять каждый блок случайной фотографией или иконкой.
- Чередовать композиции по контенту05: split hero → узкая текстовая полоса → блок винодельни → featured buyer lot → линия процесса → пример партии → record/pilot/FAQ.
- Сетка карточек разрешена для сопоставимых лотов; нельзя превращать всю landing page в одинаковые карточки «иконка / заголовок / текст».
- Исключить криптонеон, бесконечные градиенты, стеклянные панели поверх всего, декоративные графики доходности, вращающиеся монеты и искусственные счётчики.
- Светлая тема обязательна P0. Переключатель темы не показывать до полноценной реализации и проверки тёмной темы P1.
- Не использовать фотографии, изображения бутылок или бейджи как свидетельство реального партнёрства или проверки.

### 1.1 Фирменная линия

Декоративный мотив — три тонкие вертикальные стойки и две горизонтальные линии; одна плавная линия связывает этапы торговли.
Создать оригинальный кодовый SVG, без копирования чужого логотипа. Для базового орнамента: `viewBox="0 0 80 80"`, стойки `x=12/40/68, y=12..68`, перекладины `y=28/52, x=8..72`.
Толщина линий 1.5–2 px; окончания круглые; цвет `--c-accent` или `--c-vine`; декоративный орнамент имеет `aria-hidden="true"`.
Это мотив оформления, не готовая юридически проверенная торговая марка. Надпись Palissage всегда остаётся читаемой.
На landing мотив соединяет этапы; в кабинете его повторяет линия истории лота. Размер орнамента 80–160 px, не фоновая сетка во весь экран.
Статус этапа обозначать подписью и иконкой. Декоративная линия не является единственным носителем прогресса.

## 2. Цвета и семантические токены P0

Значения ниже — новый единый источник визуальных решений. При внедрении сначала сопоставить их существующим CSS-переменным; не создавать второй параллельный набор палитр.
Все цвета непрозрачные, кроме явно указанных overlay/shadow. Применение `opacity` к тексту и статусам запрещено.

| Токен | Значение | Использование |
|---|---|---|
| `--c-page` | `#F7F4ED` | Основной известняковый фон |
| `--c-page-subtle` | `#EEE8DD` | Разделение крупных секций, фон изображений |
| `--c-surface` | `#FFFFFF` | Формы, таблицы, меню, диалоги |
| `--c-surface-raised` | `#FFFFFF` | Поповеры; глубину задаёт тень |
| `--c-fg` | `#291F24` | Основной текст, заголовки |
| `--c-fg-secondary` | `#6B625D` | Подписи, вспомогательный текст |
| `--c-fg-inverse` | `#F7F4ED` | Текст на тёмной винной/чернильной панели |
| `--c-accent` | `#742C42` | Главный CTA, ссылки, focus |
| `--c-accent-hover` | `#622237` | Hover главного CTA |
| `--c-accent-pressed` | `#511B2D` | Pressed главного CTA |
| `--c-accent-subtle` | `#F3E6E8` | Выбранный пункт, мягкий винный акцент |
| `--c-vine` / `--c-success` | `#355B46` | Фирменная зелень / положительный статус |
| `--c-success-subtle` | `#EDF2E9` | Фон положительного статуса |
| `--c-warning` / `--c-warning-subtle` | `#775311` / `#FCF0D5` | Ожидание, ограничения, demo banner |
| `--c-danger` / `--c-danger-subtle` | `#A33134` / `#FBEAE7` | Ошибка, отклонение, destructive |
| `--c-info` / `--c-info-subtle` | `#305C79` / `#E8F0F6` | Testnet, нейтральное пояснение |
| `--c-line` | `#DCD5C9` | Декоративные разделители |
| `--c-line-strong` | `#8A8177` | Граница поля, outline secondary button |
| `--c-overlay` | `rgb(41 31 36 / 48%)` | Подложка модального окна |

### 2.1 Контраст — проверенные пары

Расчёт выполнен для указанных HEX по формуле относительной яркости sRGB WCAG; значения округлены до двух знаков только для отчёта.
Текст обычного размера должен иметь минимум 4.5:1; большие заголовки — минимум 3:1. Не понижать фактический контраст прозрачностью. [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

| Передний план / фон | Контраст | Назначение |
|---|---:|---|
| `#291F24 / #F7F4ED` | 14.53:1 | Основной текст |
| `#6B625D / #F7F4ED` | 5.42:1 | Вторичный текст |
| `#6B625D / #FFFFFF` | 5.95:1 | Подписи внутри формы |
| `#742C42 / #F7F4ED` | 8.76:1 | Ссылка / акцентный текст |
| `#FFFFFF / #742C42` | 9.63:1 | Текст главной кнопки |
| `#355B46 / #EDF2E9` | 6.75:1 | Success badge |
| `#775311 / #FCF0D5` | 6.13:1 | Warning badge / demo banner |
| `#A33134 / #FBEAE7` | 5.92:1 | Ошибка |
| `#305C79 / #E8F0F6` | 6.21:1 | Info / testnet |
| `#8A8177 / #FFFFFF` | 3.83:1 | Граница поля |
| `#DCD5C9 / #F7F4ED` | 1.33:1 | Только декоративный разделитель |

`--c-line` нельзя использовать как единственный видимый контур интерактивного поля. На фотографии текст размещать на непрозрачной однотонной панели.
Для focus использовать внешний outline 2 px `--c-accent`, offset 3 px; на тёмном фоне — `--c-fg-inverse`. Не обрезать outline контейнером.
Disabled-кнопка: фон `--c-page-subtle`, текст `--c-fg-secondary`, неизменная прозрачность, отключённое действие и видимая причина рядом.

## 3. Типографика, ритм, геометрия

Сохранить уже заявленные зависимости self-hosted Fraunces и Inter. Fraunces — заголовки и редкие крупные числа; Inter — UI и денежные суммы.
JetBrains Mono использовать только для адресов, hash и технических ID. Не делать продукт похожим на терминал.
Не загружать Google Fonts с внешнего домена. WOFF2 с `font-display: swap`; preload только реально используемого выше fold начертания.

| Стиль | Desktop ≥1200 | Tablet 768–1199 | Mobile <768 | Параметры |
|---|---|---|---|---|
| Hero display | 72 / 76 px | 56 / 62 px | 40 / 44 px | Fraunces 500, tracking −0.035em, max 17ch |
| H1 страницы | 48 / 56 | 40 / 48 | 32 / 38 | Fraunces 500, −0.025em |
| H2 секции | 40 / 48 | 34 / 42 | 28 / 34 | Fraunces 500, −0.02em |
| H3 | 24 / 32 | 24 / 32 | 22 / 28 | Inter 600, −0.015em |
| Lead | 20 / 30 | 20 / 30 | 18 / 28 | Inter 400, max 54ch |
| Body | 16 / 26 | 16 / 26 | 16 / 26 | Inter 400, max 68ch |
| UI / label | 14 / 20 | 14 / 20 | 14 / 20 | Inter 500; input text 16 / 24 |
| Caption | 12 / 18 | 12 / 18 | 12 / 18 | Inter 500, не для цены/условий |
| Numeric | 32 / 40 | 30 / 38 | 28 / 36 | Inter 600, `tabular-nums` |
| Code | 13 / 20 | 13 / 20 | 13 / 20 | JetBrains Mono 400 |

Размеры реализовать в rem; таблица дана при корневом 16 px. Не фиксировать высоту текстовых блоков.
Для display допустим плавный `clamp()` между опорными размерами; на 360 px длинный заголовок переносится без обрезки.
Не добавлять ручные `<br>` в локализованные строки. Не применять uppercase ко всему меню или длинным подписям.
В счётчиках и суммах `font-variant-numeric: tabular-nums`; символ валюты и единицу не отрывать от значения.

| Группа | Значения |
|---|---|
| Spacing | `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120` px |
| Радиусы | input/button 8; content panel 16; hero image 20; badge 999 px |
| Control heights | compact 40; default 48; hero CTA 52 px; icon hit area минимум 44×44 |
| Shadows | card: none; hover: `0 8px 24px rgb(41 31 36 / 8%)`; overlay: `0 24px 64px rgb(41 31 36 / 18%)` |
| Borders | обычный 1 px; selected/focus не менять box size; выбранность через outline/inset |
| z-index | base 0; sticky section 10; header 20; sticky action 25; dropdown 30; overlay 50; modal 60; toast 70 |
| Content width | public 1280 px; prose 720 px; form body 760 px; review dialog 640 px |

## 4. Адаптивный контракт

Breakpoints CSS: `sm=640`, `md=768`, `lg=1024`, `xl=1200`, `2xl=1440`. Базовая вёрстка мобильная.
Опорные снимки: 1440×1000, 834×1112, 390×844, 360×800; дополнительно 320 CSS px для reflow и 200% text zoom.

| Свойство | 1440 | 834 | 390 | 360 |
|---|---|---|---|---|
| Public container | 1280, поля 80 | 770, поля 32 | 350, поля 20 | 328, поля 16 |
| Колонки / gap | 12 / 24 | 8 / 20 | 4 / 16 | 4 / 16 |
| Header height | 80 | 72 | 64 | 64 |
| Между публичными секциями | 120 | 88 | 64 | 64 |
| Panel padding | 32 | 24 | 20 | 16 |
| Hero | текст 7 / фото 5 | текст → фото | текст → фото | текст → фото |
| Marketplace | фильтр 248 + 3 лота | 2 лота, фильтры в drawer | 1 лот | 1 лот |
| Lot details | body 8 / summary 4 | 1 колонка | 1 колонка | 1 колонка |
| Workspace nav | sidebar 248 | menu drawer | menu drawer | menu drawer |

Public max-width содержит контент без внутренних дополнительных горизонтальных padding; внешние поля считать один раз.
При ширине 1024–1199 каталог показывает фильтр 224 px и две колонки; три колонки включаются с 1200 px.
В кабинете на desktop: внешние поля 32 px, sidebar 248 px, gap 32 px, оставшееся место — контент без второго max-width 1280.
У форм подпись всегда сверху; две колонки разрешены от 768 px только для независимых коротких полей.
На телефоне сумма, статус и следующий шаг видны без горизонтальной прокрутки; hash переносится или сокращается с отдельным Copy.
Блокам grid/flex назначать `min-width: 0`; длинным ID — управляемое перенесение; названия вина допускают 3 строки.
Цена, количество, доступность и ошибки не обрезаются многоточием. Сокращённое имя раскрывается доступной ссылкой/detail view.
Фото имеют заранее известные `width`, `height`, `aspect-ratio`; при ошибке загрузки геометрия сохраняется.
Drawer на телефоне: ширина 100%, высота максимум `100dvh`, scroll только внутри; контент и CTA учитывают safe-area-inset.
Модальная review-форма на desktop имеет max-height `calc(100dvh - 48px)`; на mobile занимает экран, а не узкую колонку с миниатюрным текстом.

### 4.1 Sticky и scroll

Header фиксируется сверху без изменения высоты при скролле; непрозрачный фон, тонкая линия снизу. Никакого обязательного blur.
На landing отсутствует постоянная нижняя кнопка «Connect wallet». Главное действие — запуск демо; подключение возникает в контексте testnet.
На lot detail допускается нижняя mobile-панель только с ценой и `Review purchase`; она исчезает при открытом review или экранной клавиатуре.
Под sticky action зарезервировать реальную высоту панели + safe area + 16 px в конце контента; не использовать фиксированную догадку без измерения.
Задать `scroll-padding-top` под header и `scroll-padding-bottom` под action bar; якорям — `scroll-margin-top`.
Проектное требование сильнее минимума AA: фокусируемый элемент и outline видны полностью. [W3C: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
При недостаточной высоте viewport или zoom sticky summary превращается в обычный блок. Никакого scrolljacking и принудительной смены секций.

## 5. Композиции основных экранов

### 5.1 Landing `/`

```text
1440: [Palissage] [For wineries] [For buyers] [How it works] [Pilot] [EN/FR] [Explore the demo]
      [eyebrow / H1 / lead / CTA, 7 cols]     [HERO-01, 5 cols]
      [статус прототипа и краткое объяснение: одна спокойная строка]
      [короткий контекст: A closer relationship with every vintage]
      [For wineries: текст]                         [PROCESS-01]
      [For buyers: featured lot + ясные условия]
      [01 Define] ── [02 Review] ── [03 Reserve] ── [04 Follow] ── [05 Receive]
      [один sample lot: BOTTLE-01, цена, срок, история]
      [The record behind the relationship] → [Pilot CTA]
      [FAQ с разными содержательными ответами] [нижний CTA / footer]
390:  [Palissage] [Demo] [Menu] → H1 → lead → CTA → HERO-01 → вертикальные секции
```

Hero H1 слева, максимум 3 строки; CTA главный `Explore the demo`, вторичный `Browse sample lots`. Полный текст и последовательность секций —05. Под CTA — короткое пояснение режима.
HERO-01 desktop 4:5, `object-fit: cover`; tablet/mobile 4:3. Фокусную точку брать из asset manifest.
Никакой анимированной загрузки H1, цены и CTA. Фото можно мягко проявить; первый экран пригоден к чтению с первого кадра.
Линия процесса на mobile вертикальна; каждый шаг содержит номер, 2–4 слова заголовка и одну поясняющую фразу.
Блок доказательств — редакционный список с датой и источником каждого утверждения; не ряд зелёных «verified» badges.

### 5.2 Marketplace `/marketplace`

Заголовок и lead высотой по контенту, затем toolbar: поиск, счётчик, сортировка, фильтры. Каталог начинается не ниже 320 px на desktop.
Ключевые фильтры — тип продажи, регион, vintage, доступность; chip выбранного фильтра имеет Remove с доступным именем.
LotCard: изображение 4:3 на однотонной подложке → winery/region → название → vintage/pack size → цена с валютой и базой → availability → статус.
Бутылка занимает 70–80% высоты image frame, `object-fit: contain`; нельзя растягивать прозрачный PNG или обрезать этикетку.
На мобильном фильтры открываются кнопкой `Filters (n)`; применение явное через `Show n lots`, reset отдельный.
Поиск дебаунс 250 ms; при запросе сохранять предыдущие результаты и показывать `Updating results…`; при первом открытии — skeleton.
URL хранит применённые фильтры, sort и page. Back возвращает эти параметры и позицию списка.
Default список — 12 лотов на страницу; понятная pagination; бесконечная прокрутка для MVP не требуется.

### 5.3 Lot detail `/lots/:lotId`

Сверху breadcrumb, название, vintage, регион, режим и статус проверки. Затем крупное фото/галерея слева, purchase summary справа.
Purchase summary содержит amount, единицу, pack conversion, unit price, total, settlement currency и доступность. Primary fee раскрывается как удержание из выплаты продавцу; к buyer total не прибавляется.
Ниже — смысл владения, условия партии, сроки, documents, lifecycle и сведения о производителе с ESTATE-01.
En Primeur выделяется явной датой/окном ожидаемой готовности; не прятать ожидание в tooltip.
Проверка документов и проверка держателя — разные строки с разными статусами; фото бутылки не является доказательством.
`Review purchase` открывает обзор; клик по карточке или изменение количества никогда не запускают кошелёк.
Публичный просмотр доступен без кошелька. Контекстный блок объясняет, когда нужны verified identity и testnet wallet.

### 5.4 Demo `/demo` и кабинеты `/app/...`

Demo использует те же компоненты и размеры; постоянная надпись `Demo · Sample data` находится в shell, а не только в welcome modal.
Контролы демонстрации собраны отдельно: сценарий, роль, reset; они не выглядят как реальные действия оператора протокола.
В кабинете: title + description → небольшой блок действия/состояния → основная таблица → contextual details.
Dashboard максимум 3 смысловых summary-показателя. Каждая метрика имеет единицу, период и источник; примерные данные подписаны.
Для producer wizard: слева/сверху stepper, в центре форма, справа review summary от 1200 px; на mobile summary после полей.
Для operator: queue/table первая; детали выбранной заявки в drawer; подтверждение решения отдельно от просмотра документа.
Для buyer: портфель показывает доступное, выставленное на продажу и зарезервированное на redemption количество раздельно.
Значимые данные и operation history сохраняются в основном экране; toast не является единственным местом результата.

## 6. Компонентный контракт

Названия — целевые ответственность/API, а не разрешение дублировать уже существующие компоненты. Перед кодированием агент сопоставляет существующие аналоги.
Общие состояния интерактивного компонента: default, hover, focus-visible, pressed, disabled; асинхронного — loading, success, error.
Hover оформлять только в `@media (hover: hover) and (pointer: fine)`; essential action не появляется исключительно при hover.

| Компонент / основные props | Структура и состояния | Обязательное поведение |
|---|---|---|
| `Button(variant,size,loading,disabledReason)` | primary / secondary / ghost / danger; label + optional icon | Навигация — ссылка, действие — button; loading сохраняет ширину и label; защита повторного вызова |
| `IconButton(label,pressed?)` | 44×44, icon 20 | Доступное имя всегда; tooltip только дополнение |
| `TextLink(href,external)` | Подчёркивание в тексте, outline при focus | Внешняя ссылка не маскируется под внутреннюю; новое окно обозначено |
| `ModeBanner(mode,networkLabel)` | demo amber / testnet blue, icon + текст | Не объединять со статусом верификации; не прятать в tooltip |
| `StatusBadge(status,label)` | neutral/info/warning/success/danger | Текст + необязательная иконка; цвет не единственный признак |
| `VerificationRow(subject,state,evidence,checkedAt)` | Label, статус, дата, View evidence | Pending / simulated / verified различимы; stale evidence обозначается |
| `TextField(id,label,hint,error,required)` | label → input → hint/error | `aria-describedby`, `aria-invalid`; placeholder не заменяет label |
| `QuantityField(value,min,max,step,unit)` | Числовое поле + явная единица | Прямой ввод и кнопки; не молча округлять/исправлять; out-of-range — ошибка |
| `MoneyValue(amount,currency,basis)` | Выравнивание вправо, tabular nums | `€8.40 / bottle`; EURe settlement указан отдельно; точность по04, без floating-point расчёта |
| `Select/Combobox(label,options,value)` | closed/open/empty/loading/error | Для короткого списка native select; custom только с полным клавиатурным контрактом |
| `Checkbox/RadioGroup(label,description)` | unchecked/checked/disabled/error | Native input + label, минимум hit area 44 px; required consent не предвыбран |
| `FileInput(accept,maxBytes,state)` | Choose file + drag zone + filename/status | Кнопочный путь обязателен; отображать реальные типы/лимит из capability, не выдумывать успешную загрузку |
| `LotCard(lot,asset,mode)` | Image, identity, price, quantity, state | Один основной title-link; вложенные кнопки не внутри общей anchor; без lift на touch |
| `DataTable(columns,rows,sort,page,state)` | caption, th, tbody; loading/empty/error | `aria-sort`; действия строк отдельными кнопками; selected row не равен confirmed transaction |
| `FilterBar(query,filters,sort)` | Контролы + removable chips + count | Поиск с label; Clear all оставляет фокус на контроле, счётчик объявляется polite |
| `Tabs(items,activeId)` | tablist и panel только для локального контента | Arrow/Home/End; automatic activation только без заметной задержки; для маршрутов обычные ссылки |
| `Accordion(items)` | Заголовок-кнопка + содержимое | `aria-expanded`; Enter/Space; суммы и ограничения не скрывать по умолчанию |
| `LifecycleTimeline(events,current)` | Семантический ordered list | Каждый event: label, status, timestamp, источник; pending не показывать done |
| `Stepper(steps,currentId)` | Номер/иконка, название, текущий шаг | `aria-current="step"`; completed допускает возврат без потери данных |
| `ReviewDialog(summary,onConfirm,onClose)` | Title, mode, immutable summary, back, confirm | Первичный focus на заголовке/безопасном действии; подтвердить можно после проверки условий |
| `Drawer(title,open,onClose)` | Header + scroll body + optional footer | Modal для mobile filters/details; focus trap, Esc, close button |
| `TransactionStatus(operation)` | Последовательность этапов + hash + next action | Wallet approval и receipt success различны; сохранённый pending переживает закрытие overlay |
| `Toast(tone,title,description)` | Icon, короткий текст, close | Success 6 s с паузой hover/focus; errors persistent; существенный результат продублирован inline |
| `EmptyState(reason,title,body,action)` | Небольшой motif, 1 объяснение, 1 действие | Отличать «ничего не создано», «нет совпадений», «недоступно» и error |
| `Skeleton(kind,count)` | Размер будущего контента | `aria-hidden`, один loading status для контейнера; статический при reduced motion |
| `ErrorPanel(code,message,retry,details)` | Понятный текст → Retry → раскрытие деталей | Введённые данные сохраняются; raw RPC/logs не выводятся в основной текст |

### 6.1 Таблицы и длинные данные

Строка desktop минимум 64 px; header 44 px; padding ячеек 12×16 px; текст 14/20; числа справа; заголовки слева.
Zebra не обязательна: тонкий разделитель и лёгкий hover достаточны. Selection использует винный фон + checkbox.
Основная ссылка — имя лота/операции; row-click не должен перехватывать выделение текста и вложенные действия.
На mobile при ≤5 полях преобразовать каждую строку в `dl` с подписями, сохранив все основные данные и порядок.
Для действительно широкой operator-таблицы разрешён локальный horizontal scroll с подписанным region и видимым scrollbar; страница целиком не прокручивается по горизонтали.
Sorting изменяет данные и `aria-sort`; пустые значения — `Not available`, а не `0`; загрузка страницы не обнуляет денежные итоги.

### 6.2 Поля и ошибки

Проверка поля после blur; после первой ошибки повторно при изменении. Submit проверяет все поля и фокусирует error summary.
Error summary содержит ссылки на поля. Сообщение называет проблему и способ исправления: `Enter a whole number of bottles, from {min} to {available}.` По умолчанию min=1; кратность ящикам применяется только по явной торговой политике.
Серверная/RPC ошибка остаётся до повторного действия или явного dismiss. Успешная правка поля не снимает несвязанную сетевую ошибку.
Required обозначается текстом/звёздочкой с легендой; optional — явно. Не менять значение при потере focus без сообщения.
В review показывать итоговую арифметику, asset/token, сеть, получателя, unit и действие; суммы из нового quote требуют нового подтверждения.
Возврат к редактированию сохраняет данные. Никаких предвыбранных согласий и подтверждения покупки обычным Enter из quantity input. [W3C: Error Prevention](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html).

## 7. Motion: заданные переходы

Motion поддерживает причинно-следственную связь: открытие контекста, подтверждение клика, изменение состояния.
Базовая реализация — установленный `framer-motion` 12; существующие React 19 / Vite 8 / Tailwind 3 сохраняются без автоматического upgrade и переписывания lockfile.
Текущая документация Motion использует также импорты `motion/react`; это не указание устанавливать второй пакет. Использовать API, доступные установленному `framer-motion`.
CSS подходит для hover/focus/простых transition; Motion — для entry/exit overlay и ограниченного reveal. Не добавлять GSAP/Lenis/3D engine для P0.

| Токен | Значение |
|---|---|
| `motion.instant` | 0 ms, актуальность данных и критический статус |
| `motion.fast` | 120 ms, pressed / icon feedback |
| `motion.base` | 180 ms, hover / tabs / tooltip |
| `motion.panel` | 240 ms, dialog / drawer |
| `motion.reveal` | 420 ms, вторичный декоративный блок |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.enter` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` |

| Элемент / trigger | Переход | Прерывание / ограничения | Reduced motion |
|---|---|---|---|
| Primary button hover | bg 180 ms standard | Новый pointer state заменяет старый | Мгновенная смена цвета |
| Button pressed | scale 1→0.985 за 120 ms | Только кнопка; release сразу возвращает | Без scale |
| Lot image hover | scale 1→1.025, 240 ms standard | Fine pointer; clipping только фото, не focus | Без scale |
| Hero image ready | opacity 0.85→1, 420 ms enter | Контейнер и fallback уже видны; не задерживать LCP ради эффекта | opacity 1 сразу |
| Вторичная landing секция in-view | y 12→0, opacity 0.9→1, 420 ms enter | Один раз, threshold 0.15; первый экран/essential text без reveal | Без движения и fade |
| Trellis marker becomes active | Accent color 180 ms; marker scale 0.95→1 | Только уже полученный статус; не имитировать progress | Цвет сразу |
| Route navigation | Incoming noncritical wrapper y 4→0, 180 ms | Main/heading доступен сразу; no exit wait; не оборачивать wallet overlay | Без анимации |
| Drawer open/close | x 24→0 и opacity 0→1, 240/180 ms | Focus сразу; close делает exiting content inert | Появление/закрытие сразу |
| Dialog open/close | y 8→0 и opacity 0→1, 240/180 ms | Без spring/bounce; backdrop opacity 180 ms | Без анимации |
| Accordion toggle | Layout раскрывается сразу; chevron 0→180°, 180 ms | Повторный click немедленно меняет target | Без вращения |
| Tab change | Underline translate, 180 ms | Панель/aria-selected обновляются сразу; не ждать underline | Подчёркивание сразу |
| Filter results update | Содержимое заменяется сразу, count status | Без массового exit/entry по каждому keystroke | То же поведение |
| Toast enter/exit | y 8→0 / 0→4, opacity, 180/120 ms | Очередь максимум 2; duplicate coalesce | Без движения |
| Loading spinner | Rotation 900 ms linear | Только активный loading; остановка после ответа/hidden tab | Статичная иконка + текст |
| Skeleton | Мягкая opacity 0.65↔1 за 1400 ms | До 4 видимых placeholder, без shimmer на full screen | Статичный placeholder |
| Transaction confirmation | Check icon opacity 0→1, 180 ms | Текст успеха после receipt, сразу; никаких confetti | Иконка сразу |

### 7.1 Надёжность анимации

Корневой `MotionConfig reducedMotion="user"` и `useReducedMotion()` для ручного отключения fade/петель; CSS media query для CSS-анимаций.
Настройка пользователя учитывается при старте и изменении. Одного глобального `animation-duration: 0.001ms` недостаточно для JS timers и Motion. [Motion: Accessibility](https://motion.dev/docs/react-accessibility).
Содержимое по умолчанию видно; если JavaScript/IntersectionObserver ошибся, нет `opacity:0` у смысловых секций.
Reduced motion означает отсутствие сдвигов, масштабирования, smooth scroll и декоративных петель; информация и порядок действий полностью сохраняются.
Анимация не является таймером операции: `onAnimationComplete` не запускает purchase, approve, redeem, navigation guard или запись результата.
Данные и доступность кнопок обновлять синхронно со state machine; exit-фаза не сохраняет доступной старую кнопку подтверждения.
Не применять `AnimatePresence mode="wait"` ко всему приложению. Presence управляет отдельным overlay с устойчивым key. [Motion: AnimatePresence](https://motion.dev/docs/react-animate-presence).
Быстрое open→close→open, route change, повторный click и background tab не создают очереди переходов или orphan overlay.
Для большинства переходов использовать transform/opacity; не анимировать большие shadow/blur, top/left, ширину таблиц или высоту длинных форм. [web.dev: Animation performance](https://web.dev/articles/animations-guide).

## 8. Доступность и клавиатурный workflow

Цель реализации — WCAG 2.2 AA; отдельные более строгие требования ниже являются проектными. Заявлять соответствие можно после проверки, а не по наличию токенов.
Hit area всех основных кнопок минимум 44×44 CSS px; для мелких inline text links применим естественный текстовый поток. Минимум WCAG 2.2 AA для targets — 24×24 с исключениями; 44 px здесь — выбранный запас удобства. [W3C: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
В начале страницы — видимая при focus ссылка `Skip to content`. Один H1; landmarks header/nav/main/footer; вложенность headings по смыслу.
Смена маршрута обновляет document title, переводит focus на H1/main; browser Back восстанавливает позицию и не перескакивает к началу списка.
На 320 CSS px основная страница читается без horizontal scroll; 200% text zoom не обрезает controls. Двумерные таблицы могут прокручиваться внутри. [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### 8.1 Диалог и drawer

Модальный контекст имеет доступное имя, `aria-modal`, фон inert и ограниченный внутри Tab/Shift+Tab.
При открытии focus переходит к заголовку, первому полю либо безопасному действию — по содержимому. Автоматический focus на необратимый Confirm запрещён.
Escape и видимая Close закрывают UI; после закрытия focus возвращается инициатору или логичному следующему элементу.
Для длинного структурированного review не передавать весь текст в `aria-describedby`; заголовок и группы читаются отдельно.
Focus trap действует уже при первом видимом кадре; exiting overlay не содержит активных элементов. [W3C: Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
Закрытие transaction overlay не отменяет отправленную транзакцию. Pending остаётся в operation history и восстанавливается при повторном открытии.
Перед передачей focus кошельку локальный review перестаёт быть конкурирующим modal: снять его trap/inert; после wallet interaction восстановить review/status и focus.
Backdrop-click допустим для фильтров/просмотра; review закрывается явной Close/Escape/Back, чтобы случайный click не терял контекст.
Unsaved form сохраняет draft; если нужен discard, отдельный подтверждающий шаг с `Keep editing` по умолчанию, без трёх вложенных модалок.

### 8.2 Сообщения и медиа

Loading/result count/успех — `role="status"` или polite live region; не дублировать один текст сразу в toast и втором live region.
`role="alert"` применять к ошибке, требующей внимания, один раз при появлении; countdown и polling не озвучивать каждую секунду. [W3C: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
Ни один статус не обозначается только цветом. Spinner сопровождается текстом; иконки рядом с полноценным текстом — декоративные.
Информативные изображения имеют конкретный alt; декоративный hero при идентичной соседней информации может иметь пустой alt.
`Illustrative image` в подписи требуется для стокового vineyard, который не изображает названного участника; alt описывает изображение, а не рекламное обещание.
Не размещать существенный текст в изображениях; PDF-документ имеет имя, тип, размер и текстовое описание, доступное без открытия PDF.
Ключевые инструкции, fees, ожидаемые сроки и eligibility не помещать исключительно в tooltip.

## 9. Производительность и проверка motion

Бюджеты проекта P0: public initial JS ≤250 KB gzip без lazy wallet/app chunks; основной CSS ≤60 KB gzip; initial mobile transfer ≤1 MB.
HERO-01 mobile ориентир ≤160 KB, desktop ≤300 KB; размеры и варианты окончательно задаёт asset manifest. Изображения ниже fold — lazy.
Шрифтов на первом экране не более двух WOFF2; subset выбирается с учётом французских диакритических знаков.
Публичный hero LCP-image — eager/high priority; не preload весь каталог; route-level lazy loading для кабинета и wallet path.
Цели метрик: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1; это web performance targets, не обещание достигнутого результата. Полевые пороги оцениваются на 75-м перцентиле. [web.dev: Web Vitals](https://web.dev/articles/vitals).
До появления реальных пользователей отдельно фиксировать lab device/network, несколько прогонов и interaction traces; Lighthouse не заменяет полевой INP.
Цель движения — 60 fps на выбранном среднем мобильном устройстве; 16.7 ms — полный бюджет кадра, а не выделенный лимит только для JavaScript.
Профиль DevTools: открыть меню, изменить filter, открыть review, проскроллить landing; переходы не создают long task >50 ms.
Одновременно максимум 6 вторичных reveal; остановить декоративные циклы вне viewport/в hidden tab. `will-change` только на время конкретной анимации.
Для P0 запрещены autoplay hero video, WebGL scene, scroll-linked parallax, следящий cursor, smooth-scroll engine и непрерывно движущийся фон.

## 10. Приёмка для исполнителя

- Реализованы публичный shell, рабочий shell и все компоненты выше; каталог состояний содержит normal/loading/empty/error/disabled и длинные данные.
- Скриншоты `/`, `/marketplace`, `/lots/:lotId`, `/demo` и основных `/app/...` сценариев сняты при 1440, 834, 390 и 360 px.
- На одном mobile screenshot видны длинное французское имя, сумма, unit и status без наложения и clipping.
- Проверены keyboard-only: menu → marketplace filter → lot → review → Back → восстановленный quantity; pending операция сохраняется после Close.
- Проверены reduced motion, 200% text zoom, reflow 320 CSS px, screen-reader объявления ошибок и статусов; автоматический a11y scanner дополнен ручной проверкой.
- У focus нет обрезки из-за rounded/overflow, header, sticky footer, drawer или wallet modal.
- Быстрые повторные clicks не открывают два overlay, не создают второй submit и не оставляют невидимый backdrop.
- Demo, testnet, pending verification и подтверждённый transaction receipt визуально различаются; никаких ложных зелёных success-state.
- Все картинки имеют локальные responsive-версии и запись в asset manifest; пути/права/источник соответствуют документу по материалам.
- Network/image/font failure оставляют страницу читаемой; содержимое не зависит от завершения анимации.
- После правок пройдены установленные проектом build/lint и согласованные сценарии; отчёт перечисляет реальные команды и артефакты, без выдуманного «всё протестировано».

В этом документе не утверждается, что описанные экраны, компоненты, accessibility checks или performance budgets уже реализованы и пройдены.
