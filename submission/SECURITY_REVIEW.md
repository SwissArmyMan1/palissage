# Release security review — 1.1.0

Scope: the Solidity contracts under `src/`, deployment wiring, and the browser transaction boundary. The review combines manual control-flow and accounting inspection, adversarial regression tests, Foundry unit/fuzz/integration suites and execution against the released public-testnet contracts. It is an internal engineering review, not an independent audit or assurance for real-value use.

## Threat model and invariants

Participants include wineries, professional buyers, consumers, verifiers, issuer operators and administrators. Untrusted inputs include payment-token behavior, ERC-1155 receiver callbacks, signatures, timestamps, prices, quantities and wallet/RPC network selection. Administrators can change trusted issuers, payment allowlists and enforcement roles; verifiers can suspend lots, release milestones and resolve redemptions. Compromise of those trusted accounts remains outside permissionless guarantees.

The reviewed invariants are:

- A signed identity claim cannot be reused on a different chain or issuer.
- Bottle minting requires full payment and never exceeds the lot's lifetime capacity; burning does not replenish mint capacity.
- A partial reservation collects at least the rounded-up required deposit.
- Disallowed payment assets cannot enter new or existing trades; refund/withdrawal exits remain accessible.
- Credited primary escrow equals payment actually received; fee-on-transfer intake reverts atomically.
- Cumulative primary withdrawals stay within the milestone entitlement over funds that remain backing escrow; locked milestones cannot reset releases.
- Secondary transfers require valid participants, sufficient unfrozen balances and approved transfer agents; fees and royalties use the record's asset.
- Redemption changes state before external effects, cannot complete twice, returns or burns the recorded quantity, and binds recovery consent to its EIP-712 domain and deadline.
- UI amounts retain each record's payment token and decimals; writes and receipts stay on one selected chain, and simulated actions never use the live write path.

## Findings fixed in this release

| Finding | Impact and precondition | Correction | Reproduction |
| --- | --- | --- | --- |
| Signed claims lacked a chain/issuer domain | Medium: a trusted signature could authenticate a claim on another deployment using the same signer and compatible identity/data | `ClaimIssuer.claimDigest` includes chain ID, issuer contract, subject, topic and data before EIP-191 signing | `test_ClaimCannotReplayOnOtherChain`, `test_ClaimCannotReplayAtAnotherIssuer` |
| Deposit rounded down to zero | Low: small-price records with nonzero deposit BPS could reserve inventory without paying a deposit | Required deposit uses ceiling multiplication/division | `test_DepositCannotRoundDownToZero` |
| Delisting did not block existing trades | Medium: a revoked payment token could still be accepted by existing primary offers/remainder payments and secondary listings | Execution-time allowlist checks, with refund exits preserved | `test_DelistingStopsNewReservationsButPreservesRefunds`, `test_DelistingStopsRemainderPayments`, `test_DelistingStopsExistingSecondaryListings` |
| Taxed primary payments created unbacked credit | Medium: if an operator allowlisted a taxed ERC-20, nominal escrow exceeded tokens received, causing later refunds or withdrawals to fail | Exact balance-delta validation reverts the entire intake | `test_TaxedPaymentCannotCreateUnbackedEscrow` |

All seven regressions failed on the pre-fix code and pass on the corrected release. Run `forge test --match-contract BuildathonSecurityTest -vv` to reproduce the corrected behavior. Severity reflects the demonstrated testnet architecture and stated token/trust preconditions; it is not an external contest classification.

## Coverage

| Module | Mutating entrypoints reviewed | Evidence |
| --- | --- | --- |
| WineLotToken | Lot lifecycle, metadata, mint/burn, approval/transfer hooks, frozen balances, force transfer and system/registry administration | WineLotToken and security-attack unit suites, 18-decimal full flow |
| IdentityRegistry / TrustedIssuersRegistry | Registration/update/delete, country and agent access, issuer add/remove/topic replacement | Identity and RoleGateway suites, live gateway identity creation |
| ClaimIssuer / Identity | Domain-separated claim validation, revocation, claim/key management | Identity, domain replay regressions and signature tests; signed claims are validated through reads |
| RoleGateway | Role assignment/revocation, self-service restrictions, test-mode switch, claim diffs and token-verifier grants | RoleGateway/deployment suites; live Winery/Shop/Admin setup |
| PrimaryMarket | Allowlist/treasury/fee/pause, offers, milestones, reservation, remainder, cancellation/default, release/withdrawal | PrimaryMarket unit/fuzz, security regressions, FullFlow suites and public receipts |
| SecondaryMarket | Configuration/pause, listing/update/cancel/buy | SecondaryMarket unit/fuzz/adversarial suites and public resale receipts |
| RedemptionManager | Request, shipment, delivery, cancellation/refund, consented recovery, receiver handling | RedemptionManager signature/state/attack suites and public delivery/refund receipts |
| TestEURe | Chain guard, mint, claim/cooldown, ERC-20 approval/transfer | TestEURe tests on both supported chain IDs and live payments |
| PalissageLens | Read pagination, permission/phase/settlement projections, metadata fallback and missing records | PalissageLens unit suite; actual chain/metadata/wiring observations |
| Deployment/UI | Role separation, immutable links, RPC chain, code hashes, payment denomination, receipt refresh and simulation separation | Release manifests, workflow evidence and browser acceptance record |

Primary milestone resets, refund-floor protection, default-fee accounting and redemption receiver/state protections were already present and were rechecked rather than credited as new fixes.

## Execution and remaining boundaries

The published flow evidence for each chain contains successful transactions for deposits, full payment and mint, winery cancellation/refund, milestone release and withdrawal, listing/update/cancel, resale with fees/royalties, redemption cancellation, verifier refund after shipment, and delivery burn. The checked fixture ends with 132 lifetime minted bottles, 60 redeemed, 72 circulating, 48 held by the shop, 24 by the resale buyer, zero redemption escrow and zero released funds remaining to withdraw.

PalissageLens is read-only and is not supposed to receive transaction writes. ClaimIssuer verifies signed credentials; ordinary demo onboarding instead writes to RoleGateway and IdentityRegistry. Administrative APIs such as issuer configuration, freezes, force transfer and signed escrow recovery deliberately remain operator APIs and are documented as such, rather than exposed as cosmetic public buttons.

The demonstration does not prove physical ownership, delivery, legal compliance, real KYC/KYB, commercial demand or mainnet readiness. Off-chain document availability, compromised administrators/verifiers, denied or frozen stablecoin transfers and chain/provider outages remain operational dependencies. Only conventional exact-transfer assets should be allowlisted. Explorer verification and internal checks are distinct from an independent audit.
