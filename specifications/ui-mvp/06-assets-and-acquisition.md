# 06. Изображения: источники, получение и размещение

## 1. Что нужно получить в этапе реализации

Изображения — часть дизайна, не случайное заполнение карточек. Нужны: один сильный vineyard hero, два редакционных кадра о работе и производстве, шесть согласованных изображений бутылок, брендовые SVG и корректный social preview. В этой задаче подготовлены инструкции; финальные assets не создавались и не скачивались в приложение.

Основной набор: лицензированные атмосферные фотографии + оригинальные изображения вымышленных demo-бутылок. Для реальных производителей используются предоставленные ими packshots и фотографии после фиксации разрешения. Нельзя наклеивать вымышленную этикетку на скачанную фотографию реального брендированного вина и выдавать это за реальный товар.

Страницы источников и лицензий ниже проверены через web 07.09.2026. Это shortlist кандидатов, **не утверждение о финальном художественном выборе, скачанном master-файле или подтверждённых его размерах**. Прямая загрузка отдельных CDN URL может быть недоступна через инструмент; перед включением в сайт asset agent обязан скачать и визуально проверить каждый файл.

## 2. Реестр назначения assets

Идентификатор стабилен; путь в public начинается с `/media/`, но физически лежит в `UI/web/public/media/`. Не писать `/UI/web/public` в `src` изображения.

| ID | Назначение | Материал и получение | Master / производные | Crop / fit | Alt EN / FR |
|---|---|---|---|---|---|
| HERO-01 | Главная, vineyard side of hero | Кандидат S1; fallback S4; при отсутствии подходящего crop — original generation H1 | `editorial/vineyard-hero-{640,960,1440,1920}.{avif,webp,jpg}` | Desktop 4:5, mobile4:3; отдельные crop, `cover` | `Vineyard rows in southern France, illustrative photograph` / `Rangs de vigne dans le sud de la France, photo d’illustration`; при S4 заменить southern France на Burgundy |
| ESTATE-01 | Producer demo / pilot story | S2 как образ производства; не выдавать за склад demo-производителя | `editorial/cellar-story-{640,960,1440}.{avif,webp,jpg}` | 3:2 `cover`; key subject не обрезан | `Wooden barrels in Marseillan, illustrative photograph` / `Fûts en bois à Marseillan, photo d’illustration` |
| PROCESS-01 | For wineries, этап урожая | S3, если нет узнаваемого лица/логотипа | `editorial/harvest-detail-{480,800,1200}.{avif,webp,jpg}` | 4:3 `cover` | `Hands harvesting grapes, illustrative photograph` / `Vendange à la main, photo d’illustration` |
| BOTTLE-01 | demo-lot-001 | Генерация B1, future-release sample mockup | `bottles/demo-lot-001-{320,640,960}.{webp,png}` | 3:4 canvas `contain` | `Illustration of Les Terrasses 2026 sample bottle` / `Illustration de la bouteille fictive Les Terrasses 2026` |
| BOTTLE-02 | demo-lot-002 | B1 variant, red bottle | `bottles/demo-lot-002-{320,640,960}.{webp,png}` | Как BOTTLE-01 | `Les Pierres Claires sample bottle` / `Bouteille fictive Les Pierres Claires` |
| BOTTLE-03 | demo-lot-003 | B1 variant, white bottle | `bottles/demo-lot-003-{320,640,960}.{webp,png}` | Как BOTTLE-01 | `Lumière Blanche sample bottle` / `Bouteille fictive Lumière Blanche` |
| BOTTLE-04 | demo-lot-004 | B1 variant, rosé bottle | `bottles/demo-lot-004-{320,640,960}.{webp,png}` | Как BOTTLE-01 | `Rosée du Matin sample bottle` / `Bouteille fictive Rosée du Matin` |
| BOTTLE-05 | demo-lot-005 | B1 variant, white future release | `bottles/demo-lot-005-{320,640,960}.{webp,png}` | Как BOTTLE-01 | `Première Lueur 2026 sample bottle` / `Bouteille fictive Première Lueur 2026` |
| BOTTLE-06 | demo-lot-006 | B1 variant, red bottle | `bottles/demo-lot-006-{320,640,960}.{webp,png}` | Как BOTTLE-01 | `La Ligne des Vignes sample bottle` / `Bouteille fictive La Ligne des Vignes` |
| BRAND-01 | Wordmark + trellis mark | SVG редактор/код; геометрический знак из03; исходный логотип можно переиспользовать после просмотра | `brand/palissage-wordmark.svg`, `brand/palissage-mark.svg` | Vector; wordmark min120px wide; mark24px | `Palissage` для ссылки; пустой alt у декоративного повтора |
| PATTERN-01 | Линия процесса, разделитель | Code-native SVG, не растровая генерация | `brand/trellis-pattern.svg` либо компонент | stroke1–1.5px; `aria-hidden` | `alt=""` |
| SOCIAL-01 | Link preview | Композиция логотип+H1+HERO-01, отдельный export | `social/palissage-og.jpg`, 1200×630 | Ограничить safe text960×450 | По og:image:alt, без персональных данных |

Нужны также favicon.svg и apple-touch-icon.png 180×180, производные от BRAND-01. Текст этикетки читается как иллюстрация, а вся торговая информация повторяется в HTML. У future-release bottle обязательна подпись `Illustrative bottle · Future release`.

Не нужны: stock portraits для фиктивных основателей, логотипы неподтверждённых партнёров, фотографии пьющих людей, абстрактные blockchain cubes, AI-дипломы, плейсхолдеры с emoji.

## 3. Конкретные источники из сети

| ID | Страница и автор | Лицензия / наблюдение | Решение для Palissage |
|---|---|---|---|
| S1 | [Vineyard and Tractor in Occitanie, France](https://www.pexels.com/photo/vineyard-and-tractor-in-occitanie-france-31693811/) — SlimMars 13 | На странице Free to use; указано Villeneuve-lès-Maguelone, Occitanie | Основной кандидат HERO-01; проверить, что техника не перетягивает внимание и вертикальный crop работает |
| S2 | [Rows of Wooden Barrels with Wine](https://www.pexels.com/photo/rows-of-wooden-barrels-with-wine-15352408/) — Emmanuel Codden | Pexels, Marseillan, Occitanie | Кадр процесса; подпись illustrative, не warehouse partner |
| S3 | [Growing Concord Grapes in the Vineyard](https://www.pexels.com/photo/growing-concord-grapes-in-the-vineyard-10922976/) — Gonzalo Acuña | На странице Free to use; заголовок указывает Concord | Общая иллюстрация ручного сбора; **не фото Syrah/Grenache или подтверждение сорта конкретного demo-вина** |
| S4 | [Lush green vineyard rows under a clear blue sky](https://unsplash.com/photos/lush-green-vineyard-rows-under-a-clear-blue-sky-JmtNA3hPrPU) — Alexander Van Steenberge | Страница указывает Unsplash License и Burgundy/Yonne | Резерв hero только с честной подписью Burgundy; не связывать географически с demo-производителем |
| S5 | [Barrels at a Winery](https://www.pexels.com/photo/barrels-at-a-winery-4639044/) — ArtHouse Studio | Pexels Free to use | Резерв ESTATE-01; современное производство вместо романтизированного погреба |

Pexels разрешает бесплатное использование и изменение, но запрещает, в частности, создавать впечатление endorsement изображённых людей/брендов и использовать stock как trademark. Перед загрузкой перепроверить [Pexels License](https://www.pexels.com/license/), сохранить дату и ссылку. Тексты лицензии не заменяют проверку содержимого конкретного кадра.

Для S4 перепроверить [Unsplash License](https://unsplash.com/license) и [Terms](https://unsplash.com/terms). Бесплатная copyright-лицензия сама по себе не выдаёт права на узнаваемые бренды, людей и чужие произведения в кадре. Unsplash+ — отдельный продукт: не считать любой результат поиска бесплатным. Не использовать поиск-картинок или Pinterest как лицензию.

**Правило provenance:** stock/photo разрешение не является разрешением утверждать, что изображённый производитель работает с Palissage. Attribution разместить в `/legal/credits`, а подпись illustrative — непосредственно рядом с demo producer story. Stock не используется как доказательство physical verification.

## 4. Порядок получения без scraping

1. Открыть **конкретную страницу** S1–S5 в браузере. Проверить автора, лицензию, отсутствие premium-only download и качество оригинала.
2. Использовать штатную кнопку `Free download` / `Download free`. Предпочтительно master наибольшего разумного размера; не browser screenshot и не миниатюру поиска.
3. Для Pexels можно сохранить точный HTTPS download URL, предоставленный этой кнопкой, и скачать один файл через curl. Если URL изменился, получить новый из самой страницы; не угадывать адрес и не обходить защиту.
4. Сохранить master в `UI/web/asset-sources/` вне public, лицензии/происхождение — в `UI/web/asset-sources/licenses/`; публикации подлежат только производные файлы.
5. Сохранить описание выбора/автора/лицензии, actual dimensions, sha256 master, output paths и crop settings в manifest. Для материалов производителя — также ссылку на документ разрешения, без публикации приватной переписки.
6. Просмотреть каждый master и все hero/bottle crop варианты. Только после этого статус asset становится `approved_for_demo`.

Точечный пример будущего скачивания S2, из `UI/web` (сейчас не выполнялся):

```bash
mkdir -p asset-sources/editorial asset-sources/licenses public/media/editorial
curl --fail --location --proto '=https' --proto-redir '=https' \
  --max-time 60 --retry 2 \
  'https://images.pexels.com/photos/15352408/pexels-photo-15352408.jpeg?cs=srgb&dl=pexels-ehma-15352408.jpg&fm=jpg' \
  --output asset-sources/editorial/cellar-story-master.jpg
file --mime-type asset-sources/editorial/cellar-story-master.jpg
sha256sum asset-sources/editorial/cellar-story-master.jpg
```

После команды ожидается изображение, не HTML/403. `file` не заменяет декодирование: pipeline должен открыть файл, проверить width/height и отказать на невалидном изображении. Если загрузка не прошла, воспользоваться штатным browser download. Не использовать cookies пользователя, антибот-обходы или batch crawler. Для Unsplash P0 — ручная загрузка с официальной страницы, без неавторизованного scraping; интеграция Unsplash API потребовала бы отдельного соблюдения его условий и здесь не нужна.

Не вставлять URL CDN в runtime UI: загрузить разрешённый asset, оптимизировать и отдавать с origin приложения. Так фото доступно при локальном показе, не отправляет запросы посетителей фотобанку и не исчезает из-за лимита стороннего сервиса. Это предписанный пайплайн для ручного stock download, не инструкция нарушать обязательный hotlinking какого-либо API.

## 5. Изображения вымышленных бутылок: задание image agent

Для инструкции использован локальный [imagegen SKILL.md](/home/swissarmyman/.codex/skills/.system/imagegen/SKILL.md). При фактическом исполнении агент читает доступную в его среде актуальную версию skill. В этой задаче генератор не вызывался.

Основной путь — встроенный image generation tool, без требования API key. Не переходить на платный CLI/API путь без отдельного явного указания пользователя. Для brand mark, icons и trellis — SVG/код, не генератор. Для бутылок нужен качественный raster product mockup; простая emoji/SVG бутылка не считается финальным asset.

### B1 — master bottle prompt

```text
Use case: product-mockup
Asset type: wine marketplace sample bottle, BOTTLE-01
Primary request: One photorealistic fictional 750 ml dark olive glass wine bottle,
upright and front-facing, with a refined warm ivory paper label and a dark wine-red capsule.
Scene/backdrop: genuinely transparent background, subtle natural contact shadow.
Subject: a fictional future release, not a real brand or an existing wine product.
Composition/framing: portrait 3:4 canvas; full bottle including neck and base;
bottle occupies 78 percent of height; consistent camera at label level;
no tilted perspective, no hands, no props, generous clear margins.
Lighting/mood: soft large studio light from upper left, realistic restrained reflections,
crisp glass edges and tactile uncoated label, premium editorial catalogue photography.
Color palette: chalk #F7F4ED, wine #742C42, subtle vine green #355B46.
Text (verbatim): "PALISSAGE"; "DEMO"; "2026".
Constraints: exact short label text, fictional demo bottle, no appellation seal,
no medal, no certification, no copied winery branding, no watermark.
Avoid: neon, glossy gold luxury clichés, extra bottles, fake readable legal text,
cropped cap or base, checkerboard printed as background, inconsistent shadows.
```

Полное название кюве хранить в HTML; генератору не поручать мелкий юридический текст. Слово DEMO оставить читаемым. Если короткий текст испорчен, перегенерировать/исправить с тем же reference; не маскировать дефект размытием.

Сначала создать и принять BOTTLE-01. Затем каждый следующий variant создавать с BOTTLE-01 как style/composition reference, отдельным запросом; менять только тип/цвет вина, оттенок capsule и год из05. BOTTLE-02/06 — red; BOTTLE-03/05 — pale white; BOTTLE-04 — restrained pale rosé. Сохранить одинаковую оптику, размер, направление света и footprint. Недопустима сетка из шести несогласованных ракурсов.

Перед редактированием существующего локального изображения агент должен открыть его через image viewer, затем использовать tool edit с доступным reference path/последним изображением согласно текущему API. Не предполагать, что любой невидимый локальный путь автоматически доступен генератору.

Результат встроенного инструмента сначала может появиться в служебной generated_images папке. Скопировать выбранный output **по реально возвращённому пути** в `UI/web/asset-sources/bottles/demo-lot-001-master.png`; не придумывать имя временного файла, не оставлять app-reference за пределами проекта. Для остальных аналогично. Требование строгого allowlist агента сохраняется: чтение созданного инструментом output должно быть явно разрешено координатором/капсулой, если это за пределами его делегации.

Проверить настоящую альфу, отсутствие белой каймы на chalk фоне, базовую линию всех бутылок и неповреждённый текст. Выходные WebP/PNG должны сохранять альфу. App background реализуется CSS, не печатается на бутылке.

### H1 — запасной hero, только если shortlist не даёт нужной композиции

```text
Use case: photorealistic-natural
Asset type: Palissage editorial hero illustration
Primary request: a believable Mediterranean vineyard landscape with orderly trellis rows,
weathered limestone soil and low distant hills; fictional location, no identifiable estate.
Composition/framing: tall 4:5 editorial composition, rows draw the eye into the frame,
retain a useful central subject for a separate 4:3 mobile crop.
Lighting/mood: quiet late-afternoon daylight, realistic green foliage and warm dry ground,
natural photographic texture, restrained saturation, contemporary editorial quality.
Constraints: no people, no logos, no text, no castles, no dramatic fantasy landscape,
no wine glasses, no technology objects, no claim to depict a real winery.
```

Generated hero caption: `Illustrative vineyard image` / `Image de vignoble à titre d’illustration`. Generated image — не geo evidence. Генерация H1 не должна блокировать рабочий UI: использовать выбранный licensed stock до принятия результата, сохраняя статус в manifest.

## 6. Структура и manifest

Будущие директории, создаваемые только на этапе реализации:

```text
UI/web/
  asset-sources/
    editorial/                 master photos, не попадают в Vite public
    bottles/                   selected generated masters
    licenses/                  license notes / rights evidence
    README.md                  acquisition date, reproduction steps
  public/media/
    editorial/                 optimized crops
    bottles/                   coherent transparent product images
    brand/                     SVG
    social/                    OG JPG
  src/content/
    assets.manifest.json       public-safe metadata and derivative paths
  scripts/
    prepare-media.mjs          future deterministic resize/export
```

Оригиналы с ограниченной лицензией не коммитить в публичный repository; хранить в согласованном private asset store. Manifest в src не содержит private permission URL, signed URLs или private correspondence. Локальные разрешения на материалы не попадут в dist автоматически, поскольку находятся вне public; проверить это на build.

Пример записи — шаблон, а не готовый asset:

```json
{
  "id": "ESTATE-01",
  "status": "candidate",
  "kind": "licensed-photo",
  "sourcePage": "https://www.pexels.com/photo/rows-of-wooden-barrels-with-wine-15352408/",
  "author": "Emmanuel Codden",
  "licenseUrl": "https://www.pexels.com/license/",
  "sourceCheckedAt": "2026-09-07",
  "downloadedAt": null,
  "masterSha256": null,
  "depictsActualProducer": false,
  "alt": {
    "en": "Wooden barrels in Marseillan, illustrative photograph",
    "fr": "Fûts en bois à Marseillan, photo d’illustration"
  },
  "focalPoint": {"x": 0.5, "y": 0.5},
  "variants": []
}
```

После загрузки: заполнить hashes/dimensions/variants/byteSize; focalPoint определить просмотром, не оставлять 0.5 по привычке. Variant: `{src, width, height, format, bytes, crop: 'desktop'|'mobile'|'shared'}`. Для генерации дополнительно tool/method/prompt revision; status меняется `candidate → acquired → processed → approved_for_demo`. Asset со status candidate никогда не считается готовым для релиза.

## 7. Оптимизация и подключение

Для pipeline использовать зафиксированный в lockfile `sharp` как dev dependency или имеющийся эквивалент, не менять raster вручную через несогласованные скрипты. API resize/format сверять по [Sharp resize](https://sharp.pixelplumbing.com/api-resize/) и [output options](https://sharp.pixelplumbing.com/api-output/). Разрешённые source transforms: orientation correction, sRGB, согласованная умеренная экспозиция/цвет, crop/resize/compression. Не менять содержание evidence-фотографий. Для AI-edit использовать image tool; Sharp здесь только детерминированный export.

Перед установкой зависимости A00 фиксирует Node version, package manifest и lockfile; задача asset export получает точный scope. Если sharp отсутствует, одна разрешённая установка `npm install --save-dev --save-exact sharp` из UI/web записывает конкретную версию; не использовать `npx` с непроверенным remote resize package на каждый файл. В текущей задаче установка не выполняется.

Минимальная форма будущего export, не полный production script:

```js
import sharp from 'sharp';
const input = 'asset-sources/editorial/cellar-story-master.jpg';
await sharp(input).rotate().resize({ width: 1440, height: 960, fit: 'cover',
  position: 'centre', withoutEnlargement: true }).webp({ quality: 80 })
  .toFile('public/media/editorial/cellar-story-1440.webp');
```

Pipeline должен проверить фактические output размеры и записать их в manifest; `withoutEnlargement` может дать меньше запрошенного. Не записывать выдуманную ширину в `srcset`. Для hero делать отдельные crop и проверять subject для каждой ширины. Удалять приватный EXIF/GPS в выходе, сохранять license/author отдельно. Не растягивать master меньшего размера.

| Asset class | Цель размера файла | HTML поведение |
|---|---|---|
| Hero desktop1920 AVIF/WebP | ≤300 KB, fallback JPEG≤450 KB | `<picture>`, width/height или aspect-ratio; `fetchPriority="high"`, `loading="eager"` |
| Hero mobile960 | ≤160 KB | art-directed source, не загружать desktop master параллельно |
| Editorial thumbnail800 | ≤100 KB | `loading="lazy"`, `decoding="async"`, реальные width/height |
| Bottle640 WebP | ≤90 KB | `contain`; один размер canvas, одинаковые margins |
| Bottle detail960 | ≤160 KB | деталь при открытии, без загрузки всех960 на каталоге |
| Brand SVG | ≤15 KB каждый | без скриптов/external href/embedded bitmap |
| OG1200×630 JPEG | ≤250 KB | абсолютный URL origin deployment, статическая мета |

Quality numbers — исходная точка; визуальный контроль важнее одинакового quality80. Image pipeline abort при missing master, HTML вместо фото, missing license, неверной альфе или нарушенном budget без объяснения. Исходные masters не импортировать в runtime.

Picture для shared3:2 editorial использует sources AVIF→WebP→JPEG и `sizes="(min-width: 1200px) 50vw, 100vw"` как начальный пример; итоговые sizes вычислить по03 с max container, а не копировать вслепую. Hero 7/5 имеет собственные sizes и desktop/mobile crop. Бутылки не обрезать через cover.

## 8. Визуальная и техническая приёмка assets

- Asset sheet с master thumbnail, desktop/tablet/mobile crop, автором и status для каждого ID приложен к задаче. Его проверяет координатор до массовой вставки.
- На 1440/834/390/360 нет обрезанных бутылок, сжатых изображений, разных белых прямоугольников и непрочитанной этикетки.
- В сети нет runtime запросов на Unsplash/Pexels/fonts CDN. Изображения загружаются с origin приложения.
- 404 вызывает предусмотренный спокойный fallback `Image unavailable`, сохраняя размеры; broken-image icon не виден. Это error state, не нормальный вид финального каталога.
- `/legal/credits` отражает реальные используемые assets; удалённые кандидаты не объявляются авторами финального сайта.
- Проверены bytes/width/height/hash и license source; все paths существуют, case-sensitive имена совпадают.
- Никаких удалений старых `public/img/` по этому ТЗ до проверки usages и отдельной задачи координатора. Их наличие не доказывает права использования.
