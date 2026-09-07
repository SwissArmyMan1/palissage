# 05. Информационное наполнение и демонстрационные данные

## 1. Правила контента

Документ задаёт исходный контент для реализации, а не предлагает агенту самостоятельно написать маркетинг. EN — основной UI; FR — второй. Не переводить имена кюве и производителя. Все строки хранить в словарях; числа, даты, статусы и URLs передавать параметрами. Русские комментарии в этой спецификации не должны попасть на публичные страницы.

Тон: спокойный, предметный, уверенный в наблюдаемом. Для всех торговых экранов приоритет — товар, количество, условия, следующее действие. `Allocation` при первом появлении поясняется `your reserved or owned bottle quantity`; `En Primeur` — `reserve a future release`; `escrow` — `funds held under the offer's release rules`.

Маркетинговые свойства формулируются как возможности платформы. Не обещать более низкую цену, мгновенную оплату, независимую экспертизу, юридическую безопасность или гарантированную доставку без соответствующих доказательств. Не переносить из текущего landing вымышленные сравнения маржи.

Каждая demo-страница показывает `Demo · Sample data`. Каждая карточка публичного синтетического каталога — `Sample lot`. Страница вымышленного производителя — `Fictional producer for demonstration`. Атмосферная фотография чужого виноградника — `Illustrative photography`, а не фотография этого производителя.

## 2. Главная страница: порядок секций и готовый текст

### Header

Логотип → `/`; `For wineries` → `/#for-wineries`; `For buyers` → `/#for-buyers`; `How it works` → `/#how-it-works`; `Pilot` → `/pilot`; EN/FR selector; primary `Explore the demo` → `/demo`. Мобильное меню повторяет те же destinations. Testnet — вторичная текстовая ссылка в footer и demo launcher.

FR navigation: `Pour les domaines`, `Pour les acheteurs`, `Comment ça marche`, `Projet pilote`, `Explorer la démo`.

### HERO: editorial 7/5 split, HERO-01, линия шпалеры

| Поле / key | EN | FR |
|---|---|---|
| `home.eyebrow` | DIRECT WINE TRADE | COMMERCE DIRECT DU VIN |
| `home.title` | Good wine. A more direct route. | Le bon vin. Un lien plus direct. |
| `home.lead` | Connect independent wineries with professional buyers. Reserve wine lots, follow their progress, and manage the journey from allocation to delivery. | Relier les domaines indépendants aux acheteurs professionnels. Réservez des lots de vin, suivez leur évolution et gérez chaque étape, de la réservation à la livraison. |
| `home.primary` | Explore the demo | Explorer la démo |
| `home.secondary` | Browse sample lots | Voir les lots de démonstration |
| `home.demoNote` | Interactive prototype. No wallet or real payment required. | Prototype interactif. Aucun portefeuille ni paiement réel requis. |
| `home.imageCaption` | From the vineyard to the buyer. | Du vignoble à l’acheteur. |

Secondary → `/marketplace`. Hero не содержит внешних цифр, партнёрских логотипов или фиктивного transaction stream. Справа фото с небольшой связанной записью: `Les Terrasses · 2026`, `En Primeur`, `Sample lot`, link `/lots/demo-lot-001`.

### 02 — Контекст: короткий текст без сетки одинаковых cards

EN heading: `A closer relationship with every vintage.`

EN body: `Wine trade depends on relationships, timing, and trust. Palissage brings offers, verification records, payments, and delivery steps into one shared workflow.`

FR heading: `Un lien plus étroit, à chaque millésime.`

FR body: `Le commerce du vin repose sur les relations, les délais et la confiance. Palissage réunit les offres, les justificatifs, les paiements et les étapes de livraison dans un parcours commun.`

### 03 — Для виноделен: текст слева, PROCESS-01 справа

| EN | FR |
|---|---|
| `Bring your next vintage to new buyers.` | `Présentez votre prochain millésime à de nouveaux acheteurs.` |
| `Offer current wine or open En Primeur reservations for a future release. Follow allocations, production milestones, and eligible payouts in one place.` | `Proposez vos vins disponibles ou ouvrez les réservations en primeur de votre future production. Suivez les réservations, les étapes de production et les versements disponibles au même endroit.` |
| `Offer current and future lots` | `Proposer des lots disponibles et futurs` |
| `Keep a clear record of each allocation` | `Suivre clairement chaque réservation` |
| `Receive producer royalties on eligible secondary sales` | `Recevoir une redevance sur les reventes éligibles` |
| `See the winery workflow` | `Découvrir le parcours domaine` |

CTA → `/demo?role=winery&scenario=producer-start`. Не обещать royalties со всех продаж вне Palissage.

### 04 — Для профессиональных покупателей: крупный featured lot

EN heading: `Know the lot. Understand the terms.`

EN body: `Compare origins, quantities, release dates, and the evidence attached to each offer. Pay in full or use an available deposit option, then manage eligible resale and delivery from your workspace.`

FR heading: `Connaître le lot. Comprendre les conditions.`

FR body: `Comparez les origines, les quantités, les dates de disponibilité et les justificatifs de chaque offre. Réglez la totalité ou utilisez l’acompte proposé, puis gérez la revente éligible et la livraison depuis votre espace.`

CTA EN `Explore the buyer workspace`, FR `Découvrir l’espace acheteur` → `/demo?role=buyer&scenario=buyer-ready`.

### 05 — How it works: связная линия из 5 этапов

| № | EN title + body | FR title + body |
|---|---|---|
| 1 | `Define the lot` — `A winery provides the wine, quantity, production stage, and supporting records.` | `Définir le lot` — `Le domaine renseigne le vin, la quantité, l’étape de production et les justificatifs.` |
| 2 | `Review the evidence` — `An authorised participant reviews the lot before it can be offered.` | `Examiner les justificatifs` — `Un intervenant habilité examine le lot avant sa mise en vente.` |
| 3 | `Reserve an allocation` — `An eligible buyer reviews the terms and pays in full or places a deposit.` | `Réserver une quantité` — `L’acheteur éligible consulte les conditions et règle le prix ou un acompte.` |
| 4 | `Follow the progress` — `Production, balances, and eligible fund releases stay visible.` | `Suivre l’avancement` — `La production, les soldes et les versements éligibles restent visibles.` |
| 5 | `Receive the wine` — `Once the lot is ready, the holder requests delivery and confirms receipt.` | `Recevoir le vin` — `Lorsque le lot est prêt, le détenteur demande la livraison et confirme la réception.` |

Вторичная ветка от этапа 4: `Eligible resale` / `Revente éligible`. На мобильном вертикальная линия. Не все шаги зелёные `done`: это объяснение процесса, не подтверждение состоявшейся сделки.

### 06 — Пример партии

Heading EN `A lot you can follow from start to finish.` / FR `Un lot à suivre du début à la fin.`

Main sample `Les Terrasses — Récolte 2026`; `Domaine des Trois Terrasses`; `Occitanie, France · Demo origin`; `En Primeur`; `€8.40 / bottle`; `Expected readiness · 15 Jun 2027`; `View sample lot` / `Voir le lot de démonstration` → `/lots/demo-lot-001`. Цена локализуется, не хранится строкой в компоненте.

### 07 — Почему цифровой учёт

Heading EN `The record behind the relationship.` / FR `Une trace au service de la relation.`

EN body: `Digital records make allocations and their permitted transfers traceable. Contract rules coordinate payments and tokenised bottle balances. Physical verification and delivery still depend on the people and partners responsible for them.`

FR body: `Les enregistrements numériques rendent les réservations et leurs transferts autorisés traçables. Les règles des contrats coordonnent les paiements et les soldes de bouteilles tokenisées. La vérification physique et la livraison restent assurées par les personnes et partenaires responsables.`

3 кратких подписи: `Participant checks` / `Vérification des participants`; `Payment records` / `Historique des paiements`; `Delivery trail` / `Suivi de livraison`. Technical details link → `/pilot#technology`.

### 08 — Pilot CTA

EN `From prototype to pilot.` — `Palissage is preparing the next stage with wineries, professional buyers, and ecosystem partners. Explore the planned milestones and the work required before real trading.`

FR `Du prototype au projet pilote.` — `Palissage prépare la prochaine étape avec les domaines, les acheteurs professionnels et les partenaires de l’écosystème. Découvrez les jalons prévus et le travail nécessaire avant les échanges réels.`

CTA `Read the pilot brief` / `Consulter le projet pilote` → `/pilot`.

### 09 — FAQ: отдельный конкретный ответ на каждый вопрос

| Key | EN question / answer | FR question / answer |
|---|---|---|
| `faq.wallet` | `Do I need a wallet to try it?` / `No. The guided demo uses sample data and simulated actions. The separate testnet experience requires a compatible wallet and test tokens.` | `Faut-il un portefeuille pour essayer ?` / `Non. La visite guidée utilise des données fictives et des actions simulées. L’expérience testnet séparée nécessite un portefeuille compatible et des jetons de test.` |
| `faq.lot` | `What does an allocation represent?` / `A reserved quantity belongs to an offer. In the protocol, tokenised bottle balances are created only after full payment. Physical delivery is a separate step.` | `Que représente une réservation ?` / `Une quantité réservée est liée à une offre. Dans le protocole, les soldes de bouteilles tokenisées ne sont créés qu’après paiement intégral. La livraison physique constitue une étape distincte.` |
| `faq.verify` | `What does “verified” mean?` / `It identifies a completed review recorded for a participant or lot. Open the evidence panel to see the scope, reviewer, source, and date. A recorded hash alone does not prove the contents or physical condition of wine.` | `Que signifie « vérifié » ?` / `Il s’agit d’un examen enregistré pour un participant ou un lot. Consultez les justificatifs pour connaître son périmètre, son auteur, sa source et sa date. Une empreinte numérique seule ne prouve ni le contenu ni l’état physique du vin.` |
| `faq.deposit` | `How does En Primeur work?` / `An offer can reserve a future release. Where a deposit is available, the remaining balance and payment deadline are shown before confirmation. Production dates are estimates unless the terms state otherwise.` | `Comment fonctionne l’achat en primeur ?` / `Une offre peut porter sur une production future. Si un acompte est proposé, le solde et l’échéance sont affichés avant confirmation. Les dates de production sont prévisionnelles, sauf indication contraire dans les conditions.` |
| `faq.escrow` | `Where does the payment go?` / `Primary-sale payments are held by the market contract. Winery withdrawals depend on authorised milestone confirmations and the contract’s accounting. Review the offer’s release rules before reserving.` | `Où va le paiement ?` / `Les paiements du marché primaire sont conservés par le contrat de marché. Les retraits du domaine dépendent des jalons confirmés par les personnes habilitées et de la comptabilité du contrat. Consultez les règles de versement avant de réserver.` |
| `faq.resale` | `Can I resell my bottles?` / `Fully paid, available balances may be listed when the holder, lot, and market meet the transfer rules. A listing does not guarantee a buyer. The review shows the platform fee and producer royalty.` | `Puis-je revendre mes bouteilles ?` / `Les soldes disponibles et intégralement payés peuvent être proposés lorsque le détenteur, le lot et le marché respectent les règles de transfert. Une annonce ne garantit pas un acheteur. Le récapitulatif indique les frais de plateforme et la redevance du domaine.` |
| `faq.delivery` | `When can I request delivery?` / `When the lot is marked ready and your balance is eligible. Shipping, taxes, import conditions, and the delivery arrangement must be agreed separately. This demo does not ship wine.` | `Quand demander la livraison ?` / `Lorsque le lot est indiqué comme prêt et que votre solde est éligible. Le transport, les taxes, les conditions d’importation et les modalités de livraison doivent être convenus séparément. Cette démo n’expédie pas de vin.` |
| `faq.refund` | `Can I cancel or get a refund?` / `Available actions depend on the allocation or delivery state and the contract rules. A refund request is not an automatic approval. Returning tokens from a delivery escrow is different from refunding a payment.` | `Puis-je annuler ou être remboursé ?` / `Les actions disponibles dépendent de l’état de la réservation ou de la livraison et des règles du contrat. Une demande de remboursement n’est pas une acceptation automatique. Le retour des jetons d’un séquestre de livraison est distinct du remboursement d’un paiement.` |
| `faq.real` | `Are these real offers?` / `The public demo contains fictional producers, sample prices, and simulated transactions. Testnet records are labelled separately. Real trading is not enabled in this version.` | `S’agit-il d’offres réelles ?` / `La démo publique contient des producteurs fictifs, des prix d’exemple et des transactions simulées. Les enregistrements testnet sont indiqués séparément. Les échanges réels ne sont pas activés dans cette version.` |

## 3. Остальные публичные страницы

### Каталог `/marketplace`

EN `Explore wine lots` / FR `Explorer les lots de vin`.
Lead EN `Compare sample offers from independent producers. Prices and availability in this catalogue are for demonstration.`
FR `Comparez des offres de démonstration de producteurs indépendants. Les prix et disponibilités de ce catalogue sont fictifs.`

Tabs `All lots / Available now / En Primeur` → `Tous les lots / Disponibles / En primeur`.
Filters `Producer, Region, Vintage, Wine type, Price per bottle, Production stage` → `Producteur, Région, Millésime, Type de vin, Prix par bouteille, Étape de production`.
Sorting `Featured / Price: low to high / Earliest readiness` → `Sélection / Prix croissant / Disponibilité la plus proche`.
`Clear filters` / `Effacer les filtres`; `Showing {count} lots` / `{count} lots affichés`.
Search placeholder `Search wine, producer, or region` / `Rechercher un vin, un producteur ou une région`.

### Производитель `/producers/demo-producer-001`

Eyebrow `FICTIONAL PRODUCER · DEMONSTRATION` / `PRODUCTEUR FICTIF · DÉMONSTRATION`.
Name `Domaine des Trois Terrasses`; location `Occitanie, France — sample location`.
EN: `A fictional independent winery used to demonstrate how a producer offers current and future wine lots through Palissage. The wines, quantities, documents, and commercial terms on this page are sample data.`
FR: `Un domaine indépendant fictif illustrant la manière dont un producteur propose des lots disponibles et futurs sur Palissage. Les vins, quantités, documents et conditions commerciales de cette page sont des données de démonstration.`
Sections `Available offers`, `Production and records`, `About this sample producer`; FR `Offres disponibles`, `Production et justificatifs`, `À propos de ce producteur fictif`.
Никаких придуманных биографий основателей, наград, сертификатов bio, названий AOP, телефона или адреса реального домена.

### Партия: краткие описания для 6 fixture

| lotId | EN description | FR description |
|---|---|---|
| demo-lot-001 | `A future red release illustrating deposit-based reservations, staged production, and a later request for delivery.` | `Une future cuvée rouge illustrant la réservation avec acompte, les étapes de production et la demande de livraison ultérieure.` |
| demo-lot-002 | `A ready-for-delivery red lot for exploring a full-payment purchase and physical fulfilment.` | `Un lot de vin rouge prêt à livrer pour découvrir l’achat avec paiement intégral et la livraison physique.` |
| demo-lot-003 | `A white wine sample with a smaller available quantity for catalogue and allocation workflows.` | `Un vin blanc de démonstration avec une quantité disponible plus limitée pour explorer le catalogue et les réservations.` |
| demo-lot-004 | `A rosé sample in the bottling stage. Delivery requests become available only after readiness is confirmed.` | `Un rosé de démonstration en cours de mise en bouteille. La livraison devient disponible après confirmation de sa disponibilité.` |
| demo-lot-005 | `A future white release used to compare production dates and payment terms.` | `Une future cuvée blanche permettant de comparer les dates de production et les modalités de paiement.` |
| demo-lot-006 | `A fully allocated sample lot. Primary reservations are closed; eligible holders may explore secondary offers.` | `Un lot de démonstration entièrement attribué. Les réservations primaires sont closes ; les détenteurs éligibles peuvent explorer les offres secondaires.` |

### Pilot brief `/pilot`

H1 EN `Building the next route for wine trade.` / FR `Construire une nouvelle voie pour le commerce du vin.`

Секции в порядке:

1. `Who the pilot serves` / `À qui s’adresse le pilote` — независимые винодельни и повторные профессиональные закупки; не розничный инвестиционный продукт.
2. `What the prototype demonstrates` / `Ce que montre le prototype` — создание партии, проверка, резерв, доплата, разрешённая перепродажа, запрос доставки. Подпись `Simulated workflows and separately labelled testnet records`.
3. `Current stage` / `État actuel` — `Prototype and testnet development. Mainnet trading is not enabled.` / `Développement du prototype et du testnet. Les échanges sur le réseau principal ne sont pas activés.`
4. `Technology` / `Technologie` — `Bottle balances, participant checks, controlled transfers, and payment records. The current repository targets an EVM test environment; deployment evidence is shown separately.` Не использовать слово audited.
5. `Next milestones` / `Prochains jalons` — `Complete the test workflow → Validate with pilot participants → Finalise operating and legal arrangements → Independent security review → Controlled live pilot`. На timeline метки `Planned`, а не ложные даты выполнения.
6. `What support enables` / `Ce que permet le soutien` — engineering, UX validation, legal/operational preparation, independent audit, pilot onboarding. Сумму гранта не придумывать.
7. `Prepare a pilot enquiry` / `Préparer une demande pour le pilote` — локальный draft по форме 02. P0 CTA `Download enquiry draft` / `Télécharger le brouillon`; success `Draft downloaded. Nothing has been sent.` / `Brouillon téléchargé. Aucun message n’a été envoyé.`

Ссылка на исходный код появляется только если координатор подтвердил public repo URL. Ни один неизвестный URL не заменяется `#`. До появления подтверждённого контакта footer ведёт на brief, а не на вымышленный email.

### Паспорт `/passport/demo-passport-001`

EN `The story of this lot` / FR `L’histoire de ce lot`.
Source note EN `Sample lot passport. Scanning this code does not verify a unique bottle or grant ownership.`
FR `Passeport de lot de démonstration. Scanner ce code ne vérifie pas une bouteille unique et ne confère aucun droit de propriété.`
Sections `Wine`, `Producer`, `Production timeline`, `Public records`; FR `Vin`, `Producteur`, `Étapes de production`, `Justificatifs publics`.
Текст `Contains sulphites` / `Contient des sulfites` допускается только как явно sample field; не выдавать его за лабораторную проверку. Реальные ingredients, allergens и nutrition — из подтверждённых данных отдельного продукта, не генерировать.

### Footer и legal slugs

Footer links: `Pilot brief` `/pilot`; `Testnet` `/testnet`; `Prototype notice` `/legal/prototype`; `Privacy` `/legal/privacy`; `Image credits` `/legal/credits`; FR `Projet pilote`, `Testnet`, `Notice du prototype`, `Confidentialité`, `Crédits photos`.

`/legal/prototype`: EN `Palissage is a prototype for professional wine trade. Demo actions are simulated and do not place orders, transfer real funds, or arrange delivery. Testnet actions use test assets. Real commercial terms will be introduced before live trading.` FR `Palissage est un prototype pour le commerce professionnel du vin. Les actions de démonstration sont simulées et ne passent aucune commande, ne transfèrent aucun fonds réel et n’organisent aucune livraison. Les actions testnet utilisent des actifs de test. Les conditions commerciales réelles seront établies avant le lancement des échanges.`

Footer product notice EN `Professional trade prototype · No real wine orders · 18+`; FR `Prototype de commerce professionnel · Aucune commande réelle de vin · 18+`.
FR health notice as visible product copy: `L’abus d’alcool est dangereux pour la santé. À consommer avec modération.` Это UI-текст, не юридическое заключение о достаточности исполнения законодательства. Production alcohol-sale requirements проверяются перед реальными продажами: [Service Public — e-commerce](https://entreprendre.service-public.gouv.fr/vosdroits/F23455).

`/legal/privacy` должен точно соответствовать реализации: local demo state + выбранный язык; testnet wallet address/RPC только после выбора testnet; перечислить фактические сторонние сервисы и hosting logs после проверки. P0 без analytics/marketing scripts, реальных KYC загрузок и backend lead collection. EN starting copy: `The demo stores sample progress and your language choice in this browser. Resetting the demo removes its sample progress. Do not enter identity documents or sensitive personal information. The testnet experience may communicate your public wallet address and requests to configured network providers.` FR: `La démo conserve votre progression fictive et votre langue dans ce navigateur. La réinitialisation efface cette progression. Ne saisissez aucun document d’identité ni donnée personnelle sensible. L’expérience testnet peut transmettre votre adresse publique et vos requêtes aux fournisseurs réseau configurés.`

До внешней публикации добавить проверенные publisher/contact/hosting данные и проверить сетевые запросы. Не утверждать `We collect no data` только потому, что frontend не содержит analytics. Сведения о cookies и исключениях проверять по [CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi).

## 4. Общий словарь экранов и операций

| Key | EN | FR |
|---|---|---|
| nav.overview | Overview | Vue d’ensemble |
| nav.allocations | My allocations | Mes réservations et bouteilles |
| nav.secondary | Secondary market | Marché secondaire |
| nav.deliveries | Deliveries | Livraisons |
| nav.lots | Wine lots | Lots de vin |
| nav.finance | Payments & payouts | Paiements et versements |
| nav.participants | Participants | Participants |
| nav.verification | Lot reviews | Examen des lots |
| nav.account | Account | Compte |
| mode.demo | Demo · Sample data | Démo · Données fictives |
| mode.testnet | Testnet · Test assets only | Testnet · Actifs de test uniquement |
| demo.start | Start the guided demo | Lancer la visite guidée |
| demo.resume | Resume demo | Reprendre la démo |
| demo.reset | Reset sample data | Réinitialiser les données fictives |
| demo.resetBody | This removes demo progress in this browser. Testnet transactions are unaffected. | Cette action efface la progression de démonstration dans ce navigateur. Les transactions testnet restent inchangées. |
| demo.role | View as {role} | Voir en tant que {role} |
| role.winery | Winery | Domaine |
| role.buyer | Buyer | Acheteur |
| role.operations | Operations | Opérations |
| image.illustrative | Illustrative photography | Photographie d’illustration |
| demo.advance | Advance simulated date | Avancer la date simulée |
| price.unit | Per bottle · 750 ml | Par bouteille · 750 ml |
| price.exclusions | Wine allocation price. Shipping, taxes, duties, and network fees are not included in this example. | Prix de la quantité de vin. Transport, taxes, droits et frais réseau non inclus dans cet exemple. |
| order.total | Allocation total | Montant total |
| order.deposit | Deposit due now | Acompte à régler |
| order.balance | Remaining balance | Solde restant |
| order.deadline | Balance due by {date} | Solde à régler avant le {date} |
| order.reserveDemo | Simulate reservation | Simuler la réservation |
| order.reserveTest | Reserve {quantity} bottles | Réserver {quantity} bouteilles |
| order.payDemo | Simulate balance payment | Simuler le paiement du solde |
| order.payTest | Pay remaining balance | Régler le solde |
| approval.title | Allow the payment | Autoriser le paiement |
| approval.body | This permission allows the market contract to spend the displayed amount. It does not reserve bottles. | Cette autorisation permet au contrat de marché de dépenser le montant affiché. Elle ne réserve aucune bouteille. |
| approval.done | Permission confirmed. Continue to reserve. | Autorisation confirmée. Poursuivez la réservation. |
| tx.wallet | Confirm in your wallet | Confirmer dans votre portefeuille |
| tx.pending | Transaction submitted. Waiting for confirmation. | Transaction envoyée. En attente de confirmation. |
| tx.checking | Checking the updated record… | Vérification de l’enregistrement mis à jour… |
| tx.rejected | Request declined. No new transaction was submitted. | Demande refusée. Aucune nouvelle transaction n’a été envoyée. |
| tx.unknown | Confirmation is taking longer. Check the transaction before trying again. | La confirmation prend plus de temps. Vérifiez la transaction avant de réessayer. |
| tx.reverted | The transaction failed. Your allocation has not changed. Network fees may still apply. | La transaction a échoué. Votre réservation n’a pas changé. Des frais réseau peuvent toutefois s’appliquer. |
| reserve.done | {quantity} bottles reserved. Deposit recorded. | {quantity} bouteilles réservées. Acompte enregistré. |
| reserve.depositNote | Tokens are created after full payment. | Les jetons sont créés après paiement intégral. |
| paid.done | Fully paid · {quantity} bottles | Paiement intégral · {quantity} bouteilles |
| secondary.list | Create resale offer | Créer une offre de revente |
| secondary.royalty | Producer royalty | Redevance du domaine |
| secondary.proceeds | Seller receives | Montant reçu par le vendeur |
| delivery.request | Request delivery | Demander la livraison |
| delivery.escrow | Requested bottles are held while delivery is open. | Les bouteilles demandées sont bloquées pendant la livraison. |
| delivery.confirm | Confirm receipt | Confirmer la réception |
| delivery.confirmBody | Confirm only after receiving the wine. Completing this step closes the request and retires its tokenised bottle balance. | Confirmez uniquement après réception du vin. Cette étape clôture la demande et retire le solde de bouteilles tokenisées correspondant. |
| delivery.problem | Report a delivery problem | Signaler un problème de livraison |
| delivery.tokenReturn | Tokenised bottle balance restored | Solde de bouteilles tokenisées rétabli |
| common.evidence | View evidence | Voir les justificatifs |
| common.technical | Technical record | Enregistrement technique |
| common.retry | Try again | Réessayer |
| common.back | Back | Retour |
| common.cancel | Cancel | Annuler |
| common.close | Close | Fermer |
| common.saveDraft | Save draft | Enregistrer le brouillon |
| common.saved | Draft saved in this browser | Brouillon enregistré dans ce navigateur |
| common.notProvided | Not provided | Non renseigné |
| common.notProvidedSample | Not provided in this sample | Non renseigné dans cet exemple |
| common.copyDone | Copied | Copié |
| common.download | Download record | Télécharger le récapitulatif |

Для demo-успеха оборачивать доменную строку контекстом `Simulation complete` / `Simulation terminée`. Финансовые подтверждения остаются на странице/в activity, не только в исчезающем toast.

### Статусы и подписи форм

Статус сначала связывается с типом сущности, затем переводится. Например, `Reserved` allocation не является `Requested` delivery; generic `Pending` не заменяет ни одно из них.

| Context / key | EN | FR |
|---|---|---|
| lot.Draft | Draft | Brouillon |
| lot.Verified | Lot review recorded | Examen du lot enregistré |
| lot.Suspended | Lot restricted | Lot restreint |
| lot.Closed | Lot closed | Lot clôturé |
| production.Announced | Announced | Annoncé |
| production.Growing | Growing | En culture |
| production.Harvested | Harvested | Vendangé |
| production.Vinification | Vinification | Vinification |
| production.Aging | Ageing | Élevage |
| production.Bottled | Bottled | Mis en bouteille |
| production.ReadyForDelivery | Ready for delivery | Prêt à livrer |
| allocation.Reserved | Reserved · Payment due | Réservé · Solde à régler |
| allocation.Paid | Fully paid | Intégralement payé |
| allocation.Cancelled | Reservation cancelled | Réservation annulée |
| allocation.Defaulted | Payment default recorded | Défaut de paiement enregistré |
| redemption.Requested | Delivery requested | Livraison demandée |
| redemption.Shipped | Shipment recorded | Expédition enregistrée |
| redemption.Completed | Receipt confirmed | Réception confirmée |
| redemption.Cancelled | Delivery request cancelled | Demande de livraison annulée |
| review.submitted | Awaiting review | En attente d’examen |
| review.needs_changes | Changes requested | Modifications demandées |
| review.accepted | Review accepted | Examen accepté |
| review.rejected | Review rejected | Examen refusé |
| case.open | Delivery problem reported | Problème de livraison signalé |
| case.under_review | Case under review | Dossier en cours d’examen |
| source.demoReview | Demo verification | Vérification de démonstration |
| field.wineName | Wine name | Nom du vin |
| field.vintage | Vintage | Millésime |
| field.region | Region | Région |
| field.country | Country | Pays |
| field.grapes | Grape varieties | Cépages |
| field.bottleSize | Bottle size | Contenance |
| field.alcohol | Alcohol by volume | Titre alcoométrique |
| field.quantity | Number of bottles | Nombre de bouteilles |
| field.price | Price per bottle | Prix par bouteille |
| field.deposit | Deposit percentage | Pourcentage d’acompte |
| field.saleStart | Reservations open | Ouverture des réservations |
| field.saleEnd | Reservations close | Clôture des réservations |
| field.paymentDeadline | Balance payment deadline | Échéance du solde |
| field.expectedReady | Expected readiness date | Date de disponibilité prévue |
| field.documents | Supporting documents | Justificatifs |
| field.organisation | Organisation | Organisation |
| field.contact | Contact name | Nom du contact |
| field.email | Work email | Adresse e-mail professionnelle |
| field.phone | Phone number | Téléphone |
| field.address | Delivery address | Adresse de livraison |
| field.city | City | Ville |
| field.postcode | Postal code | Code postal |
| field.notes | Notes | Remarques |
| field.reason | Reason for this decision | Motif de la décision |
| action.createLot | Create lot draft | Créer le brouillon du lot |
| action.submitReview | Submit for review | Soumettre à l’examen |
| action.requestChanges | Request changes | Demander des modifications |
| action.recordReview | Record lot review | Enregistrer l’examen du lot |
| action.publishOffer | Publish offer | Publier l’offre |
| action.updateProduction | Update production stage | Mettre à jour la production |
| action.confirmMilestone | Confirm milestone | Confirmer le jalon |
| action.withdraw | Withdraw available funds | Retirer les fonds disponibles |
| action.markShipped | Record shipment | Enregistrer l’expédition |
| action.returnTokens | Return tokenised bottles | Restituer les bouteilles tokenisées |

В demo финансовые/операторские command CTA дополнить контекстом `Simulate: {action}` / `Simuler : {action}`, а не терять указание симуляции при использовании общих buttons. Словарь table headers может переиспользовать field keys; для специальных полей сохраняется обязательная EN/FR пара. `Lot review recorded` не означает гарантию вина; scope evidence открыт из badge.

## 5. Empty/error/blocked copy

| State | EN title — body — action | FR title — body — action |
|---|---|---|
| No search results | `No matching lots` — `Try another producer, vintage, or price range.` — `Clear filters` | `Aucun lot correspondant` — `Essayez un autre producteur, millésime ou prix.` — `Effacer les filtres` |
| No allocations | `Your next allocation starts here` — `Explore sample offers and review their terms.` — `Browse lots` | `Votre prochaine réservation commence ici` — `Explorez les offres et leurs conditions.` — `Voir les lots` |
| No deliveries | `No delivery requests yet` — `Ready and fully paid bottles can be requested from your allocations.` — `View allocations` | `Aucune demande de livraison` — `Demandez la livraison de vos bouteilles prêtes et intégralement payées.` — `Voir mes réservations` |
| Wrong network | `Switch to {network}` — `This testnet action is unavailable on the current network.` — `Switch network` | `Passer sur {network}` — `Cette action testnet est indisponible sur le réseau actuel.` — `Changer de réseau` |
| Unverified buyer | `Participant review required` — `Your account needs the required buyer checks before reserving.` — `View account` | `Vérification requise` — `Votre compte doit disposer des vérifications acheteur nécessaires.` — `Voir le compte` |
| RPC unavailable | `Network records are unavailable` — `Your existing data has not been replaced. Reconnect to refresh it.` — `Try again` | `Enregistrements réseau indisponibles` — `Les données existantes n’ont pas été remplacées. Reconnectez-vous pour les actualiser.` — `Réessayer` |
| Lot unavailable | `This lot is unavailable` — `The lot could not be found in the selected environment.` — `Back to catalogue` | `Ce lot est indisponible` — `Ce lot est introuvable dans l’environnement choisi.` — `Retour au catalogue` |
| Read-only capability | `Action unavailable in this environment` — `The required integration or permission is not available.` — `View details` | `Action indisponible dans cet environnement` — `L’intégration ou l’autorisation nécessaire est indisponible.` — `Voir les détails` |
| Frozen/suspended | `This balance cannot be used right now` — `Review the restriction and the available support path.` — `View restriction` | `Ce solde est temporairement indisponible` — `Consultez la restriction et les possibilités d’assistance.` — `Voir la restriction` |
| Sold out | `Fully allocated` — `This primary offer has no available quantity.` — `Explore secondary offers` | `Entièrement attribué` — `Cette offre primaire n’a plus de quantité disponible.` — `Voir les offres secondaires` |

Unspecified error: `We couldn’t complete this action. Your last confirmed record is shown.` / `Cette action n’a pas pu aboutir. Le dernier enregistrement confirmé est affiché.` Затем конкретный retry/review path и безопасный support ID; raw stack не показывать.

## 6. Канонический fixture dataset

Все данные ниже вымышлены. Scenario version `palissage-demo-v1`; начальные дата/время `2026-09-07T08:00:00Z`; timezone Europe/Paris. Симулятор использует эту дату, не реальное время компьютера. Бизнес-даты в storage — ISO UTC; отображение EN `15 Jun 2027`, FR `15 juin 2027`, с временем и timezone для payment deadlines.

### Организации

| ID | Name | Role | Synthetic attributes |
|---|---|---|---|
| demo-producer-001 | Domaine des Trois Terrasses | winery | Occitanie; verified sample; owner `demo-wallet-winery-001` |
| demo-producer-002 | Atelier des Vignes Claires | winery | Occitanie; verified sample |
| demo-producer-003 | Domaine du Vent Calme | winery | Occitanie; verified sample |
| demo-buyer-001 | Maison Rivage — demo | buyer | Restaurant; France; eligible; default buyer |
| demo-buyer-002 | Cave du Passage — demo | buyer | Wine shop; France; eligible; resale buyer |
| demo-operator-001 | Palissage review desk — demo | operations | Explicit sample permissions per action; not a real certification body |

`demo-wallet-*` — человекочитаемый synthetic ID, не Ethereum address. Demo schemas отделяют его от `Address` live adapter. Генерировать фальшивые explorer links запрещено.

### Каталог: initial preset `buyer-ready`

| ID / producer | Cuvée | Type / vintage | Unit EUR | Total | Primary available | Paid minted-ever | Production | Offer |
|---|---|---|---:|---:|---:|---:|---|---|
| demo-lot-001 / 001 | Les Terrasses — Récolte 2026 | Red / 2026 | 8.40 | 2400 | 2400 | 0 | Growing | En Primeur; 30% deposit |
| demo-lot-002 / 001 | Les Pierres Claires | Red / 2024 | 11.20 | 1200 | 1200 | 0 | ReadyForDelivery | Standard; full pay |
| demo-lot-003 / 002 | Lumière Blanche | White / 2025 | 9.60 | 600 | 600 | 0 | ReadyForDelivery | Standard; full pay |
| demo-lot-004 / 002 | Rosée du Matin | Rosé / 2025 | 7.80 | 1800 | 1800 | 0 | Bottled | Standard; full pay |
| demo-lot-005 / 003 | Première Lueur — Récolte 2026 | White / 2026 | 10.00 | 1200 | 1200 | 0 | Growing | En Primeur; 30% deposit |
| demo-lot-006 / 003 | La Ligne des Vignes | Red / 2024 | 12.40 | 600 | 0 | 600 | ReadyForDelivery | Standard; sold out |

All lot states `Verified`; all bottle sizes 750 ml; demo region `Occitanie`; no claimed AOP, grape percentage, organic certificate or measured ABV. Missing values visibly `Not provided in this sample`. For lot006 all 600 paid bottles initially belong to demo-buyer-002, payment 7440 EURe; no redeem/secondary activity. This state must exist in the shared ledger, not be a disconnected `soldOut=true` UI flag. Initial balances for test payments: buyer001 10000, buyer002 15000 EURe after any seeded historical purchase. Keep seeds per lot scoped in totals.

`primary available` counts remaining offer quantity; in this dataset one primary offer per lot and full cap makes it match `total - paid - unpaid reservations`. Do not generalise this to arbitrary production offers; use actual offer accounting from 04.

Each lot has `demo-offer-00N`, producer matching above, BOTTLE-00N, simulated public evidence `demo-doc-lot-00N`. Primary fee 300 bps, secondary fee 300 bps, producer royalty 250 bps. Demo secondary300bps intentionally differs from the source contract default200bps; testnet reads actual values.

Дополнительные фиксированные terms: все offers start `2026-09-01T08:00:00Z`; у lot001 конец и deadline ниже. У standard002/003/004/006 end `2027-12-31T22:59:59Z`, fullPaymentDeadline равен end, depositBps0. У future005 end `2026-11-30T22:59:59Z`, deadline `2027-03-31T21:59:59Z`, expectedReady `2027-07-01T08:00:00Z`. У002/003/006 initial ready date `2026-09-01T08:00:00Z`; у004 expectedReady `2026-10-15T08:00:00Z`. Для всех initial milestones один final10000bps, released=false. Это синтетические сроки, не обещания реальных производителей.

Историческая seed allocation для lot006: `demo-allocation-seed-006`, buyer002, quantity600, unit12.40, total/paid7440, Paid. Offer006 reserved600, settledFunds7440, withdrawnGross0, releasedBps0; primary escrow7440 по этой партии. Buyer002 initial demo credit22440 минус7440 =15000; buyer001 initial credit10000. Winery003 и treasury initial cash0. Этот отдельный escrow не исчезает при withdrawal main offer001. Остальные initial offers active=true, reserved0, settledFunds0;006 также может оставаться active=true, но available0 даёт derived sold-out. Seed и пользовательские events помечены раздельно.

### Main offer terms

- `offerId = demo-offer-001`; `lotId = demo-lot-001`; `offerAmount = 2400`.
- `pricePerBottle = 8400000000000000000` base units; token decimals 18.
- `depositBps = 3000`; `saleEnd = 2026-10-31T22:59:59Z` (31 Oct, 23:59:59 Paris).
- `paymentDeadline = 2027-02-28T22:59:59Z` (28 Feb, 23:59:59 Paris).
- `expectedReadyAt = 2027-06-15T08:00:00Z`; this is offchain estimate, not a contract delivery guarantee.
- `deliveryDestination = FR`, sample warehouse and contact are synthetic; actual address fields not prefilled with real people.
- Lot production progression for the narrative: Growing → Harvested → Vinification → Aging → Bottled → ReadyForDelivery. Advancing demo date is explicit and labelled.
- Offer fixture includes milestone configuration from 04 and a visible schedule; for the numeric runbook release is 0 until operator confirms the final milestone, then fully releasable. Do not infer that `ReadyForDelivery` itself authorises payout.

### Golden path arithmetic — invariant for screenshots and tests

| Step | Action | Ledger result |
|---|---|---|
| 0 | Reset buyer-ready | main available2400; buyer main reserve0; token balance0 |
| 1 | buyer001 reserves120 with30% deposit | total1008.00; paid302.40; due705.60; available2280; Reserved120; minted0; primary cash302.40 |
| 2 | Advance simulated date to2027-02-15; payBalance | paid1008; due0; Paid120; unpaid reservations0; minted-ever120; buyer001 token120; primary cash1008 before withdrawals |
| 3 | buyer001 lists24 at9.20; buyer002 purchases | gross220.80; fee6.624; royalty5.52; seller208.656; buyer00196; buyer00224; list remaining0 |
| 4 | Advance date to2027-06-15; ready + authorised final milestone | primary fee30.24; cumulative winery entitlement977.76; actual withdrawn0 until withdrawal confirmed; resale royalty5.52 separately credited |
| 5 | buyer001 requests delivery60 | buyer001 spendable36; redemption escrow60; buyer00224; circulating tokens120; minted-ever120 |
| 6 | Winery marks shipment; buyer confirms receipt | escrow0; buyer00136; buyer00224; burned/redeemed60; circulating60; minted-ever120 |
| 7 | Winery withdraws eligible primary funds | primary winery payout977.76, fee30.24; do not add royalty5.52 to this withdrawal; main primary escrow0 after settlement |

Строки primary cash описывают только main offer при отсутствии иных withdrawals, refunds и settlements. Главные KPI страницы для всей винодельни суммируют её lot001 и lot002; цифры всех 6 партий нельзя произвольно прибавлять к её финансам.

**Точность:** secondary split содержит доли евроцента. Для breakdown показывать согласованно `220.800 / 6.624 / 5.520 / 208.656 EURe` (FR запятая), с подписью `Token settlement precision`. Summary может показывать `€220.80`; tooltip раскрывает base-unit precision. Не менять расчёт контракта ради двух знаков. Сумма fee+royalty+net точно равна gross.

### Presets и сброс

| Preset | Назначение | Отличие от buyer-ready |
|---|---|---|
| buyer-ready | Основной старт комиссии | Состояние таблицы выше |
| producer-start | Создание→проверка→offer | main lot/offer отсутствуют; wizard первого создания получает demo-lot-001; повторные новые IDs монотонны |
| delivery-ready | Короткий показ доставки | main fully paid120 buyer001; ReadyForDelivery; без secondary; нет открытой доставки |
| issues | Приёмка ошибок | Отдельные copies для suspended lot, expired claims, insufficient funds, failed tx, changed quote, dispute case |

Preset не включается скрыто при открытии внутреннего маршрута. Launcher показывает заменяемое состояние и предлагает Reset при существующей сессии. Refresh сохраняет текущую симуляцию; `Reset sample data` очищает только namespace `palissage.demo.v1`, не все localStorage и не wallet settings. Один tab — основной оператор; межвкладочный version conflict должен показывать reload/reconcile, не терять запись молча.

## 7. Документы, история и локализация

Для demo подготовить публичные синтетические документы в `UI/web/public/demo-documents/`: `producer-001-declaration.pdf`, `lot-001-record.pdf`, `lot-001-review.pdf`, `lot-001-production.pdf`, `lot-001-readiness.pdf`, `redemption-001-shipment.pdf`. Для остальных demo-lots создать соответствующие записи согласно evidence policy04; документ final readiness показывается только на соответствующем этапе. На каждой странице watermark `SAMPLE DOCUMENT — NOT A CERTIFICATE`. Файл проверяется в браузере и доступен через accessible link с типом/размером. Контент: sample IDs, количество, даты, назначение документа; никаких настоящих подписей и печатей. Их хэш вычисляется из байтов созданного документа, а не из имени партии. Формат aggregate docsHash определяется04. Начальный immutable docsHash ссылается только на первоначальный verification bundle; последующие production/readiness документы имеют собственные commitments и не объявляются задним числом частью старого якоря.

Activity event copy: `{actor} reserved {quantity} bottles`, `{actor} paid the balance`, `{actor} listed {quantity} bottles`, `{actor} requested delivery`, `{actor} marked the shipment`, `{actor} confirmed receipt`; FR `{actor} a réservé {quantity} bouteilles`, `a réglé le solde`, `a proposé {quantity} bouteilles à la revente`, `a demandé la livraison`, `a enregistré l’expédition`, `a confirmé la réception`. All demo timestamps derive from the scenario clock and strictly ordered event counter.

Use Intl formatters: EN locale `en-GB`, FR `fr-FR`; EUR prices and EURe settlement are distinct labels. For amounts use BigInt-safe formatting specified in04, never `Number(bigint)` for financial values. Translations need plural forms, accent support, translated aria-labels, error text, document titles, toast, chart/table labels and page titles. Test +35% text expansion. A missing key is a test failure, not an English string silently pasted into French UI.

Ввод quantity: только целая десятичная запись, без separator тысяч, знака минус и exponent. Unit price: EN decimal point, FR decimal comma, максимум decimals токена; пробелы по краям trim, внутренние thousand separators не принимаются. UI явно показывает пример `8.40`/`8,40`; смешанный формат отклоняется, не угадывается. Для monetary input `inputmode="decimal"` и string parsing в units; Intl используется только на output. Смена locale в незавершённой форме сохраняет normalized units, повторно форматирует отображение и не меняет цену.

## 8. Контентная приёмка

- Нет lorem ipsum, `Coming soon` в P0, фиктивных звёзд/отзывов и пустых FAQ.
- Каждый CTA ведёт на маршрут/состояние из02; все route IDs существуют в fixture.
- EN/FR покрывают все P0 flows; суммы и сроки совпадают с04 и разделом6.
- Реальные названия из старого mock не становятся demo-партнёрами. Метки fictitious/illustrative видны по месту.
- Форма pilot не показывает отправку без реально подключённого сервиса. Download работает и сообщает, что ничего не отправлено.
- Любые показатели traction публикуются только после отдельного source review владельцем; дата и смысл метрики указаны рядом.
