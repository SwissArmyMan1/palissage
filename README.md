# Palissage

Palissage is a B2B wine trading platform and RWA project being prepared for Avalanche Fuji. It connects wineries directly with shops and importers, with fewer reseller layers and a shared record of inventory, payments and delivery.

**[Website](https://palissage.net/) · [Guided demo](https://palissage.net/demo?chain=43113&asset=eur) · [Fuji readiness](https://palissage.net/app/testnet?chain=43113&asset=eur) · [Frontend repository](https://github.com/SwissArmyMan1/palissage_ui)**

The prototype covers verified wine lots, primary purchases, optional En Primeur deposits, milestone-controlled payment escrow, restricted resale with producer royalties, and redemption that burns tokens when delivery is confirmed. One ERC-1155 unit represents one bottle in a lot. Transfers follow ERC-7943-style holder checks and enforcement controls.

## Avalanche Fuji

The demonstration targets **Avalanche Fuji C-Chain (43113)**, using **test AVAX** for gas and **Palissage tEURe (18 decimals)** for settlement. tEURe is a valueless demo token with a daily faucet.

The Fuji deployment and trading workflow have been validated locally. Public Fuji deployment, explorer source verification and publication of the Fuji-enabled site remain pending in this checkout. Wallet writes become available once a verified Fuji deployment is imported into the interface. The [technical guide](TECHNICAL_README.md) covers contract setup and deployment, and the [validation record](submission/VALIDATION.md) describes the available checks.

## Try the prototype

1. Open the [guided demo](https://palissage.net/demo?chain=43113&asset=eur) for a wallet-free local simulation with a persistent banner identifying invented data.
2. After the Fuji deployment and site are published, open [Fuji readiness](https://palissage.net/app/testnet?chain=43113&asset=eur) and connect a wallet on chain ID 43113.
3. Obtain test AVAX for gas and claim tEURe through readiness. Once test mode is enabled, take the Winery or Shop role through the gateway. The operator role requires a grant.
4. Create a lot, have an operator verify it, publish an offer, purchase, resell, and request delivery. [Reviewer instructions](submission/REVIEWER_GUIDE.md) explain the role boundaries and explorer evidence.

Demo lots are fictional and use valueless test assets. Self-service roles represent demonstration identities. The contracts are non-upgradeable, with privileged administration, issuer trust, enforcement and dispute resolution. The [internal security review](submission/SECURITY_REVIEW.md) describes the trust model and regression coverage. Independent security review and production approval remain pending.

## Develop

```sh
git clone --recurse-submodules https://github.com/SwissArmyMan1/palissage.git
cd palissage
forge build
forge test
```

The frontend is a separate repository linked at `UI/web`, with its own [setup instructions](UI/web/README.md). Public chain configuration is generated from verified deployment manifests. Keep signing keys in the operator's local keystore.

## Scope and next steps

The initial commercial target is repeat B2B orders from independent wineries and professional buyers. Direct access could improve winery proceeds and buyer terms. Shipping, duties, claims handling and total delivered cost still need validation in a bounded pilot. En Primeur financing is an optional extension to the basic marketplace.

Production work includes independent security review, partner onboarding, legal and operational arrangements for wine sales and delivery, and measurement of repeat purchases and all-in economics. Test transactions demonstrate software execution; they do not establish commercial traction.

## License

Protocol code is MIT licensed. Dependencies retain their own licenses. See [LICENSE](LICENSE).
