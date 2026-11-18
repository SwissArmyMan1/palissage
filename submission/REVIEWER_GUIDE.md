# Palissage on Avalanche Fuji

Palissage is a B2B wine trading platform and RWA project connecting wineries directly with professional buyers. Tokenized wine allocations provide a shared record of inventory, primary settlement, restricted resale with winery royalties and delivery redemption. En Primeur deposits support optional future-production sales.

## Demo status

The demonstration targets Avalanche Fuji C-Chain, chain ID `43113`. Gas uses test AVAX and payments use Palissage tEURe with 18 decimals. The Fuji deployment and trade workflow have been exercised locally. Public Fuji deployment, explorer verification and publication of the Fuji-enabled site remain pending in this checkout.

## Demo routes

- [Guided simulation](https://palissage.net/demo?chain=43113&asset=eur) runs locally in the browser with a simulation banner.
- [Fuji readiness](https://palissage.net/app/testnet?chain=43113&asset=eur) is the wallet entry point after the Fuji deployment and site are published.
- [Fuji status and addresses](https://palissage.net/network?chain=43113&asset=eur) shows the selected deployment's readiness.

## Wallet workflow after publication

1. Connect a wallet on Avalanche Fuji and obtain test AVAX. Claim tEURe in readiness. Once gateway test mode is enabled, self-assign Winery or Shop.
2. The winery creates a lot. A token verifier checks it before sale. Demo lots represent fictional inventory.
3. The winery publishes a Standard or En Primeur offer with tEURe prices, dates and milestones. A shop approves tEURe and reserves. Full payment mints bottle units.
4. The primary-market verifier confirms a milestone and the winery withdraws released payment. The shop can list bottles for resale. A verified buyer purchases, with platform fees and winery royalties paid from the sale.
5. Once production is ReadyForDelivery, a holder requests delivery. The winery marks shipment and the buyer confirms receipt, burning the escrowed bottle units. A redemption verifier can resolve an open dispute by returning the bottle units.

Operator privileges require explicit grants. Token verification, primary milestone verification and redemption dispute verification are separate roles. The guided simulation provides access to the operator screens for review.

## Review materials

- [Technical guide](../TECHNICAL_README.md) covers the contract architecture, build and Fuji deployment.
- [Deployment records](../deployments/README.md) describe the receipts, addresses and accounting expected for the public Fuji release.
- [Validation record](VALIDATION.md) identifies local checks and remaining public verification.
- [Internal security review](SECURITY_REVIEW.md) covers the trust model and regression tests.

The prototype demonstrates software execution using fictional lots and valueless test assets. A commercial pilot still requires winery and buyer onboarding, legal and logistics arrangements, and validation of repeat orders and total delivered cost.
