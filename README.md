# Palissage

Direct B2B wine trade on Arbitrum and Robinhood Chain. Palissage connects wineries with shops and importers, with fewer reseller layers and a shared record of inventory, payments and delivery.

**[Website](https://palissage.net/) · [Guided demo](https://palissage.net/demo) · [Live network status](https://palissage.net/network) · [Frontend repository](https://github.com/SwissArmyMan1/palissage_ui)**

The prototype covers verified wine lots, primary purchases, optional En Primeur deposits, milestone-controlled payment escrow, restricted resale with producer royalties, and redemption that burns tokens when delivery is confirmed. One ERC-1155 unit represents one bottle in a lot. Transfers follow ERC-7943-style holder checks and enforcement controls.

## Testnet release

Release `1.1.0` targets **Arbitrum Sepolia (421614)** and **Robinhood Testnet (46630)**. Each chain has its own contracts and inventory; there is no bridge between them. Published manifests record creation receipts, source hashes, runtime hashes, constructor arguments and independent explorer verification status.

| Network | Deployment | Executed workflow |
| --- | --- | --- |
| Arbitrum Sepolia | [Manifest](deployments/palissage-421614.manifest.json) | [Receipts and final balances](deployments/palissage-421614.flow-evidence.json) |
| Robinhood Testnet | [Manifest](deployments/palissage-46630.manifest.json) | [Receipts and final balances](deployments/palissage-46630.flow-evidence.json) |

Settlement supports the official Paxos **test USDG (6 decimals)** and the local **tEURe demonstration token (18 decimals)**. The interface names the token on every monetary amount. Selecting USDG does not convert euro prices: offers retain their original payment asset. [Executed USDG flows](deployments/palissage-46630.usdg-evidence.json) cover primary purchase, resale and redemption with the official test token. USDG can be obtained from the [Paxos faucet](https://faucet.paxos.com/); tEURe has a built-in daily faucet.

## Try the prototype

1. Open the [guided demo](https://palissage.net/demo) for a wallet-free local simulation. Its persistent banner identifies invented data; simulated actions submit no blockchain transactions.
2. Open [testnet readiness](https://palissage.net/app/testnet), select a network and settlement asset, then connect a wallet.
3. Obtain test ETH for gas and test payment tokens. Take the Winery or Shop role through the public test-mode gateway. The operator role requires a grant.
4. Create a lot, have an operator verify it, publish an offer, purchase, resell, and request delivery. [Reviewer instructions](submission/REVIEWER_GUIDE.md) explain the role boundaries and explorer evidence.

The public seed contains explicitly fictional lots. No wine is sold and no real money settles in this release. Self-service test roles are demonstration identities, not KYC/KYB certification. The contracts are non-upgradeable; administration, issuer trust, enforcement and dispute resolution remain privileged. This release has a documented internal review and regression tests, not an independent security audit or production approval.

## Develop

```sh
git clone --recurse-submodules https://github.com/SwissArmyMan1/palissage.git
cd palissage
forge build
forge test
cd UI/web
npm ci
npm run dev
```

The frontend is a separate repository linked at `UI/web`. Public chain configuration is generated from verified deployment manifests; wallet keys never belong in browser environment variables. [Technical guide](TECHNICAL_README.md) covers architecture, tests and reproducible deployment.

## Scope and next steps

The initial commercial target is repeat B2B orders from independent wineries and professional buyers. Direct access could improve winery proceeds and buyer terms; shipping, duties, claims handling and total delivered cost still need validation in a bounded pilot. En Primeur financing is optional, rather than a prerequisite for the basic marketplace.

Production work includes independent security review, partner onboarding, legal and operational arrangements for wine sales and delivery, and measurement of repeat purchases and all-in economics. Test transactions demonstrate software execution; they do not establish commercial traction.

## License

Protocol code is MIT licensed. Dependencies retain their own licenses. See [LICENSE](LICENSE).
