# Release validation

Release: `1.1.0`. Checked October 3, 2026.

- Foundry: 183 tests pass in the CI profile with 1024 fuzz runs. Compiler target is Solidity 0.8.28 / Cancun, optimizer 200 / IR. Deployed contract source is preserved byte-for-byte for explorer metadata; configured formatting checks cover scripts and tests.
- Frontend: TypeScript build, tour-target checks and ESLint pass. `npm audit --omit=dev` reports zero advisories with the committed lockfile. Compatible dependency updates and explicit patched transitive overrides remove the reported runtime advisories.
- Both chains: ten creation receipts, compiled runtimes, immutable references, privileged grants, treasuries and both accepted payment-token metadata were checked. All twenty contract sources are confirmed by their explorers.
- Public tEURe fixture flows: deposit/full settlement, mint, cancellation/refund, milestone withdrawal, resale/update/cancellation, redemption cancellation, shipped refund and delivery burn. [Arbitrum](../deployments/palissage-421614.flow-evidence.json) · [Robinhood](../deployments/palissage-46630.flow-evidence.json).
- Official USDG: primary purchase, milestone withdrawal, secondary purchase with royalty/platform fee and redemption burn executed in both chains. [Arbitrum](../deployments/palissage-421614.usdg-evidence.json) · [Robinhood](../deployments/palissage-46630.usdg-evidence.json).
- Browser live writes: an injected EIP-1193 test wallet starts on another chain, switches to the target, approves when required, reserves and reads the resulting allocation after confirmation and reload. [Arbitrum UI receipts](../deployments/palissage-421614.ui-evidence.json) · [Robinhood UI receipts](../deployments/palissage-46630.ui-evidence.json). The test wallet is controlled; no key is included in evidence.
- Browser layout/reads: desktop 1440px and mobile 390px, each network and asset; published deployments and catalogue load without page errors or horizontal overflow. An unsupported network fails closed. Deep-linked simulation shows its banner and generates zero RPC requests. A simulation is not counted as an on-chain trade.

Browser automation used the actual local interface with live RPC reads. These checks establish the local release behavior. Production hosting must be checked against the published commit separately; local results do not establish that a website has been updated.
