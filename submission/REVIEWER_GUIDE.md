# Arbitrum Open House Singapore submission

Palissage is an existing project adapted for this buildathon. It provides direct B2B wine trading: winery inventory, professional-buyer allocations, payment escrow, restricted resale with winery royalties and delivery redemption. En Primeur deposits support optional future-production sales.

## Rule alignment

The [official HackQuest event page](https://www.hackquest.io/vi/hackathons/Arbitrum-Open-House-Singapore-Online-Buildathon?tab=custom-dfc39bda-c613-4658-8df9-f35b527dace5) allows existing projects and requires deployment on an Arbitrum chain, with Arbitrum Sepolia and Robinhood listed among the options. It states that at least one third of prizes is reserved for Robinhood projects and at least one third for Arbitrum projects, with additional consideration for USDG integration. Dual-network frontend support is a project choice; the page does not state that every entry must support both.

Palissage publishes two independent deployments and supports both in the interface. USDG uses the [official Paxos testnet addresses](https://docs.paxos.com/guides/stablecoin/usdg/testnet); it is a selectable payment asset in both markets and is shown with its own currency and precision.

The event timeline displays registration ending October 2 and project submission ending October 4, 2026; the displayed time zone was not independently established. Registration and final submission must be checked in the entrant's HackQuest account. This repository is not evidence that the entrant has registered or submitted. The linked Singapore terms PDF was unavailable during preparation; the entrant must read and accept the actual terms in the registration flow.

## Demo routes

- [Wallet-free guided tour](https://palissage.net/demo): explicit local simulation; no chain transactions.
- [Arbitrum readiness](https://palissage.net/app/testnet?chain=421614&asset=eur).
- [Robinhood readiness](https://palissage.net/app/testnet?chain=46630&asset=eur).
- [Robinhood USDG](https://palissage.net/app/testnet?chain=46630&asset=usdg).
- [Deployment status and addresses](https://palissage.net/network).

Use the network picker to switch. Inventory, identity and balances belong to the selected network. A prepared form is discarded on switching.

## Live workflow

1. Connect a wallet with test ETH. Claim tEURe in readiness or obtain test USDG from Paxos. Self-assign Winery or Shop through the gateway.
2. Winery creates a lot. Verification requires a token verifier; the public fixture lots are already verified as explicitly fictional demo data.
3. Winery publishes a Standard or En Primeur offer, with payment asset, dates and milestones. A shop approves that asset and reserves; paying the remainder mints bottle tokens.
4. The primary-market verifier confirms a milestone; the winery withdraws released payment. The shop can approve the secondary market and list bottles; another verified buyer purchases with royalty and platform fee deductions.
5. Once production is ReadyForDelivery, a holder approves redemption escrow and requests delivery. Winery marks shipment; buyer confirms receipt and escrowed bottles burn. Requested redemptions may be cancelled, and a redemption verifier can resolve an open dispute with a refund.

No public account can self-assign the operator role. Token verification, primary milestone verification and redemption dispute verification are distinct grants. Use the local operator tour to review those screens without access to the deployer wallet.

## Independently checkable evidence

Each manifest includes exact addresses, creation transaction hashes, compiled source hashes and observed runtime hashes. The separate workflow file lists transaction hashes, participants, fixture IDs and final accounting. Open each hash in the relevant explorer; reading through PalissageLens does not create a transaction.

- [Arbitrum deployment](../deployments/palissage-421614.manifest.json) and [workflow](../deployments/palissage-421614.flow-evidence.json).
- [Robinhood deployment](../deployments/palissage-46630.manifest.json) and [workflow](../deployments/palissage-46630.flow-evidence.json).
- [Security review](SECURITY_REVIEW.md) and [technical guide](../TECHNICAL_README.md).

The six-lot seed uses tEURe. A separate USDG lot demonstrates primary settlement, resale royalties and delivery burn with the official Paxos token: [Arbitrum USDG receipts](../deployments/palissage-421614.usdg-evidence.json) and [Robinhood USDG receipts](../deployments/palissage-46630.usdg-evidence.json). Each file names its actual asset and participants.
