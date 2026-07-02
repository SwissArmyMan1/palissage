# Palissage

Palissage is an RWA project for bringing real wine trade on-chain.

The goal is simple: help wineries sell verified wine lots directly to shops,
importers, restaurants, collectors, and crypto-native buyers, while bringing
real-world commerce, new users, and traditional businesses into blockchain
ecosystems.

This file is the project idea and motivation. The technical architecture,
contracts, tests, Echidna harnesses, and Anvil deployment instructions are in
[TECHNICAL_README.md](TECHNICAL_README.md).

## What Palissage Is

In French viticulture, *palissage* is the trellis system of posts and wires that
runs along a vineyard row. It connects the vines, supports their growth, and
gives the vineyard structure. I chose this name because the project has the same
role: it is meant to connect wineries, buyers, crypto communities, and on-chain
markets in one shared structure for real-world trade.

Palissage tokenizes wine lots as compliant real-world assets. A winery can
create a verified lot, sell it on a primary market, pre-sell future production
through En Primeur / wine futures, and let buyers resell or redeem their
positions later.

The token is not meant to be just a collectible. It represents a real claim on
real bottles from a real winery. The protocol is built around ERC-7943-style RWA
compliance: verified holders, restricted transfers, escrow, secondary-market
royalties, and physical redemption.

## Why This Matters

Small and medium wineries often make excellent products but still depend on
local distribution networks, importers, fairs, and slow international payments.
This makes it harder for them to find buyers, finance production, and keep a
fair share of the final price.

Palissage can give them a new channel:

- direct access to B2B buyers and collectors;
- faster and cheaper international settlement;
- En Primeur / wine futures for earlier production financing;
- royalties on secondary sales;
- access to crypto communities and new marketing formats;
- collaborations with DAOs, NFT projects, events, and collector groups.

For shops and professional buyers, the value is also practical. They can buy
closer to the source, get better prices, access future lots earlier, and manage
allocations with clearer digital records.

For final buyers, the result can be cheaper wine, clearer provenance, direct
contact with wineries, achievements and rewards from producers, and access to
special drops or collaborations.

## Why Blockchain

Palissage is designed for an EVM-compatible blockchain ecosystem that offers
low fees, fast settlement, reliable infrastructure, strong support for
real-world assets, and access to stablecoin liquidity.

For a host blockchain ecosystem, Palissage is more than another crypto-native
marketplace. It brings real wineries, real buyers, physical products, and
traditional commerce on-chain for a practical reason.

This is how blockchain infrastructure becomes useful in the real world: by
supporting applications that traditional businesses can understand and use.

## Why Crypto Users May Care

Wine is cultural, physical, collectible, and easy to understand. It can make
RWAs feel less abstract.

Crypto communities could get limited wine drops, co-branded vintages, event
rewards, collector passports, on-chain achievements, and real-world experiences
directly from wineries. This creates a natural bridge between digital
communities and physical products.

## Local Traction

I live in the Languedoc-Roussillon region in the south of France, surrounded by
real wineries and producers.

I have already spoken directly with owners of several wineries here. Everyone I
discussed the idea with expressed interest in the project and said they would be
ready to join if Palissage is launched. Together, these wineries already
represent more than 400 hectares of vineyards.

That is why I believe this project has real potential. The problem is not
theoretical, and the first possible participants are close enough for me to work
with directly.

## Four Questions Behind the Opportunity

### 1. Who Is the Customer That Has Both Urgency and Budget?

The initial customer is not every winery or every wine buyer. It is an
independent small or medium winery with wine to sell or an upcoming vintage to
finance, limited access to buyers outside its existing distribution network,
and an immediate need to improve cash flow and margins. These producers already
spend money on distributors, sales, financing, and customer acquisition.
Palissage converts part of that existing budget into a transaction fee linked
to completed sales, reducing the risk of adopting a new channel.

This customer profile comes from direct access rather than a hypothetical
persona. Owners of several wineries have expressed interest in joining
Palissage once it launches. Their supply is matched by my insights from restaurant
and wine-shop owners outside the EU, who already make recurring inventory
purchases and are interested in more direct access to producers, clearer
provenance, and simpler cross-border settlement.

### 2. What Changed Recently That Makes This Problem Worth Solving Now?

RWA infrastructure has moved beyond experimental token issuance. Restricted
transfers, verified identities and roles, enforcement controls, stablecoin
settlement, and auditable asset lifecycles can now be combined into a compliance
structure suitable for serious business pilots. ERC-7943 gives Palissage a
clear model for permissioned ownership and transfer without treating a physical
asset as an unrestricted collectible token.

Earlier wine-blockchain projects were launched when much of this infrastructure
was immature and generally concentrated on provenance, luxury collectibles,
investment, or direct-to-consumer sales. At the same time, the wine sector now
faces changing consumption, pressure on margins, and uncertainty in traditional
trade channels. Technology readiness and business urgency have finally
converged: wineries are more motivated to test new ways to finance production,
reach buyers, and retain a direct commercial relationship.

### 3. Is the Market Actually Big Enough?

The relevant market is not a speculative token market; it is the recurring
trade in physical wine. According to the
[OIV's 2025 sector report](https://www.oiv.int/sites/default/files/2026-05/OIV_EN_Press_release_State-of_the_World-Wine_Sector_0.pdf),
international wine exports alone were worth EUR 33.8 billion in 2025, and 46%
of wine was traded internationally. Even while overall consumption is under
pressure, this remains a large existing flow of goods and money whose
traditional routes to market have been slow to adapt.

Palissage starts with a narrow, measurable segment: small and medium wineries
and the shops, importers, and restaurants that buy from them repeatedly. Its
bottom-up market is active wineries multiplied by the annual value of lots sold
through the platform and the transaction fee on those sales. Every vintage
creates new primary inventory, professional buyers replenish stock, and
secondary trades can generate additional fees and producer royalties. The
initial winery pipeline provides a concrete base from which pilot GMV, purchase
frequency, and take rate can be measured before broader expansion.

### 4. Why Hasn't This Already Been Solved?

The market has competitors, but most solve only one part of the problem.
InterCellar, WineChain, Crurated, and Club dVIN emphasize premium access,
provenance, storage, or redemption. BAXUS focuses on peer-to-peer collectible
trading, Vinovest and WineFi on wine as an investment, and Liv-ex on the
established professional secondary market. The gap Palissage targets is a
single workflow that combines winery onboarding, current and En Primeur sales,
compliant B2B transfers, stablecoin settlement, producer royalties, and
physical redemption for small and medium producers.

Vinsent is the closest precedent, and it is instructive: it showed that
wineries and buyers will transact on-chain, including for pre-release
vintages. But it went to market direct-to-consumer, which is the hardest
place to start — it has to acquire individual buyers one at a time, build
two-sided liquidity from zero, and earn a thin margin on small purchases.
Its
[2021 SEC offering memorandum](https://www.sec.gov/Archives/edgar/data/1851098/000164460021000094/VinsentOMAmendmentAug2.pdf)
shows the strain of those economics: USD 87,673 in 2020 revenue against a
USD 455,795 net loss, with its peer-to-peer market and winery tools still
under development. Palissage pursues the same underlying demand from the
opposite end. It is supply-led, starting with producers who have both
urgency and budget; B2B-first, clearing fewer but larger and recurring
professional orders instead of thin consumer transactions; and
compliance-first, because the professional counterparties it serves require
verified ownership and restricted transfers before they will trade at all.
That sequencing is designed to reach meaningful transaction volume, and a
credible path to sustainable economics, sooner than a consumer-first model
can.

## Funding Request

Palissage is seeking ecosystem grant funding to take the protocol from a
working demo and testnet contracts to an audited MMP running the first live
wine trades. The demo contracts are already written and deployed on a public
testnet; the grant funds the work needed to reach production and onboard the
initial winery pipeline.

**Use of funds**

- *Architecture and engineering* — finalize the protocol architecture and
  complete the smart-contract system: compliance, escrow, En Primeur,
  secondary trading with royalties, and redemption, then production-harden the
  code.
- *Research and financial model* — deeper market, legal, and competitive
  research, and a detailed fee, royalty, and financial model.
- *Product and UX/UI* — research winery and professional-buyer workflows and
  build the production trading, onboarding, and redemption interfaces.
- *Legal and compliance* — establish the French legal framework for alcohol
  sales, excise duties, KYC/KYB, tokenized ownership, and redemption.
- *Security audit* — independent smart-contract audit and remediation before
  any value settles on mainnet.
- *Pilot operations* — convert the existing winery pipeline into pilots,
  onboard professional buyers, and set up storage, logistics, and payment
  partners.

**Roadmap (8 months)**

- *Month 1* — finalize MVP scope and technical roadmap from winery and buyer
  feedback.
- *Month 2* — ship an updated testnet release: identity and compliance,
  primary and En Primeur sales, secondary trading with royalties, and
  redemption.
- *Month 3* — secure initial winery pilot commitments, engage the first
  professional buyers, and establish the French legal framework.
- *Month 4* — run a closed testnet pilot validating the full lifecycle:
  onboarding, lot creation, payment, secondary transfer, and redemption.
- *Month 5* — prepare the MVP release candidate and finalize logistics,
  storage, payment, and compliance partners.
- *Month 6* — complete an independent audit, resolve critical and
  high-severity findings, launch the MMP, and begin onboarding the first live
  wineries, lots, and buyers.
- *Month 7* — settle the first real wine trades on mainnet: the onboarded
  wineries tokenize live lots, complete primary and En Primeur sales in
  stablecoin, and execute the first compliant secondary transfers with producer
  royalties; begin tracking pilot GMV, transaction count, and take rate.
- *Month 8* — complete the first physical redemptions from token to bottle,
  onboard a second cohort of wineries and professional buyers, and consolidate
  early traction (GMV, trades, redemptions, take rate) into a report that guides
  broader rollout beyond the initial pipeline.

Palissage is looking for a long-term ecosystem partner to help turn a
validated demo into real-world wine trade on-chain, not only a one-time grant.
