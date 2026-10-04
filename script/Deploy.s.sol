// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {TrustedIssuersRegistry} from "../src/identity/TrustedIssuersRegistry.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {ClaimIssuer} from "../src/identity/ClaimIssuer.sol";
import {WineLotToken} from "../src/token/WineLotToken.sol";
import {PrimaryMarket} from "../src/market/PrimaryMarket.sol";
import {SecondaryMarket} from "../src/market/SecondaryMarket.sol";
import {RedemptionManager} from "../src/redemption/RedemptionManager.sol";
import {RoleGateway, IVerifierRoleManager} from "../src/identity/RoleGateway.sol";
import {PalissageLens} from "../src/periphery/PalissageLens.sol";
import {TestEURe} from "../src/testing/TestEURe.sol";
import {IClaimIssuer} from "../src/interfaces/IClaimIssuer.sol";

/// @notice Deployment of the ten static Palissage contracts and their wiring.
/// @dev Split from the script itself so the wiring can be exercised by
///      `test/integration/DeploymentWiring.t.sol` without a broadcast.
library PalissageDeployment {
    /// @notice Public test networks supported by this release.
    uint256 internal constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 internal constant ROBINHOOD_TESTNET_CHAIN_ID = 46630;
    /// @notice Anvil / local fork, developer builds only.
    uint256 internal constant LOCAL_CHAIN_ID = 31337;

    error UnsupportedChain(uint256 chainId);
    error ZeroActorAddress(string actor);

    struct Actors {
        address deployer;
        address admin;
        address owner;
        address treasury;
    }

    struct Deployment {
        TrustedIssuersRegistry trustedIssuers;
        IdentityRegistry identityRegistry;
        ClaimIssuer claimIssuer;
        RoleGateway roleGateway;
        WineLotToken token;
        PrimaryMarket primaryMarket;
        SecondaryMarket secondaryMarket;
        RedemptionManager redemptionManager;
        PalissageLens lens;
        TestEURe paymentToken;
    }

    /// @dev An allowlist, not a denylist, checked before the first contract is created.
    function requireSupportedChain() internal view {
        if (
            block.chainid != ARBITRUM_SEPOLIA_CHAIN_ID && block.chainid != ROBINHOOD_TESTNET_CHAIN_ID
                && block.chainid != LOCAL_CHAIN_ID
        ) {
            revert UnsupportedChain(block.chainid);
        }
    }

    function requireActors(Actors memory actors) internal pure {
        if (actors.deployer == address(0)) revert ZeroActorAddress("DEPLOYER");
        if (actors.admin == address(0)) revert ZeroActorAddress("ADMIN");
        if (actors.owner == address(0)) revert ZeroActorAddress("OWNER");
        if (actors.treasury == address(0)) revert ZeroActorAddress("TREASURY");
    }

    /// @notice Deploys every contract and applies the wiring matrix of chain-mvp 09 §2.
    /// @dev The caller must already be broadcasting (or pranking) as `actors.deployer`.
    function deploy(Actors memory actors) internal returns (Deployment memory d) {
        requireSupportedChain();
        requireActors(actors);

        // 1-2. Identity layer.
        d.trustedIssuers = new TrustedIssuersRegistry(actors.deployer);
        d.identityRegistry = new IdentityRegistry(actors.deployer, d.trustedIssuers);

        // 3. RWA token.
        d.token = new WineLotToken(actors.deployer, d.identityRegistry);

        // 4-6. Markets and redemption.
        d.primaryMarket = new PrimaryMarket(actors.deployer, d.token, d.identityRegistry, actors.treasury);
        d.secondaryMarket = new SecondaryMarket(actors.deployer, d.token, d.identityRegistry, actors.treasury);
        d.redemptionManager = new RedemptionManager(actors.deployer, d.token);

        // 7. Test payment token - a faucet, not money. Its constructor repeats the chain guard.
        d.paymentToken = new TestEURe(actors.admin);

        _wireToken(d);
        _wireOperatorRoles(d, actors.admin);

        d.primaryMarket.setPaymentTokenAllowed(address(d.paymentToken), true);
        d.secondaryMarket.setPaymentTokenAllowed(address(d.paymentToken), true);

        // 8-9. Claim issuer and the sandbox gateway, both trusted for every role topic.
        d.claimIssuer = new ClaimIssuer(actors.admin);
        d.roleGateway = new RoleGateway(actors.deployer, d.identityRegistry, IVerifierRoleManager(address(d.token)));
        _wireIssuers(d);

        // Gateway admin, which also grants the token verifier role. `assumeRole` cannot do
        // this - admin is not self-assignable.
        d.roleGateway.assignRole(actors.admin, RoleGateway.Role.Admin);

        // 10. Read projection over the finished wiring.
        d.lens = new PalissageLens(
            d.token, d.primaryMarket, d.secondaryMarket, d.redemptionManager, d.identityRegistry, d.roleGateway
        );

        _handOver(d, actors);
        // testMode stays false: self-service opens only after the seed is verified.
    }

    function _wireToken(Deployment memory d) private {
        WineLotToken token = d.token;
        token.grantRole(token.MINTER_ROLE(), address(d.primaryMarket));
        token.grantRole(token.BURNER_ROLE(), address(d.redemptionManager));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(d.primaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(d.secondaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(d.redemptionManager));
        // ENFORCER_ROLE so the manager can return its escrow even while the lot is suspended.
        token.grantRole(token.ENFORCER_ROLE(), address(d.redemptionManager));
        token.setSystemAddress(address(d.redemptionManager), true);
    }

    /// @dev The three verifier roles are independent of each other, so each is granted here.
    function _wireOperatorRoles(Deployment memory d, address admin) private {
        d.primaryMarket.grantRole(d.primaryMarket.VERIFIER_ROLE(), admin);
        d.primaryMarket.grantRole(d.primaryMarket.PAUSER_ROLE(), admin);
        d.secondaryMarket.grantRole(d.secondaryMarket.PAUSER_ROLE(), admin);
        d.redemptionManager.grantRole(d.redemptionManager.VERIFIER_ROLE(), admin);
    }

    function _wireIssuers(Deployment memory d) private {
        uint256[] memory topics = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            topics[i] = i + 1; // KYC, KYB, WINERY, B2B_BUYER, VERIFIER
        }
        d.trustedIssuers.addTrustedIssuer(IClaimIssuer(address(d.claimIssuer)), topics);
        d.trustedIssuers.addTrustedIssuer(IClaimIssuer(address(d.roleGateway)), topics);
        d.identityRegistry.grantRole(d.identityRegistry.REGISTRY_AGENT_ROLE(), address(d.roleGateway));
        d.token.grantRole(d.token.DEFAULT_ADMIN_ROLE(), address(d.roleGateway));
    }

    /// @dev The deployer gives up a role only once the replacement already holds it.
    function _handOver(Deployment memory d, Actors memory actors) private {
        if (actors.owner != actors.deployer) d.roleGateway.transferOwnership(actors.owner);

        if (actors.admin == actors.deployer) return;
        bytes32 adminRole = d.token.DEFAULT_ADMIN_ROLE();

        d.trustedIssuers.grantRole(adminRole, actors.admin);
        d.identityRegistry.grantRole(adminRole, actors.admin);
        d.token.grantRole(adminRole, actors.admin);
        d.primaryMarket.grantRole(adminRole, actors.admin);
        d.secondaryMarket.grantRole(adminRole, actors.admin);
        d.redemptionManager.grantRole(adminRole, actors.admin);

        d.trustedIssuers.renounceRole(adminRole, actors.deployer);
        d.identityRegistry.renounceRole(adminRole, actors.deployer);
        d.token.renounceRole(adminRole, actors.deployer);
        d.primaryMarket.renounceRole(adminRole, actors.deployer);
        d.secondaryMarket.renounceRole(adminRole, actors.deployer);
        d.redemptionManager.renounceRole(adminRole, actors.deployer);
    }
}

/// @notice Deploys to Arbitrum Sepolia, Robinhood Testnet or a local chain, writing an address draft.
///
/// The draft is not a manifest: nothing in it has been checked against receipts, source
/// verification or wiring yet. `chain-release.mjs collect` pulls in the broadcast receipts,
/// `verify-deployment.mjs` checks the result, and only then is a manifest published. The
/// interface never reads this file.
///
/// Environment (addresses only - the signer comes from a Foundry keystore):
///   DEPLOYER      - broadcasting account; must match `--sender`
///   ADMIN         - protocol admin, operator (O); defaults to DEPLOYER
///   OWNER         - RoleGateway owner, the only account that may open test mode; defaults to ADMIN
///   TREASURY      - protocol fee receiver; defaults to ADMIN
///   DEPLOYMENT_ID - identifier from `chain-release.mjs plan`; defaults to a chain-scoped name
///                   (used only to name the addresses file this script writes)
///
/// Usage:
///   forge script script/Deploy.s.sol:Deploy --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
///     --account palissage-operator --sender "$DEPLOYER" --broadcast --slow
contract Deploy is Script {
    using PalissageDeployment for PalissageDeployment.Actors;

    function run() external {
        // Fail before anything is created if the RPC points at the wrong network.
        PalissageDeployment.requireSupportedChain();

        address deployer = vm.envAddress("DEPLOYER");
        address admin = vm.envOr("ADMIN", deployer);
        PalissageDeployment.Actors memory actors = PalissageDeployment.Actors({
            deployer: deployer, admin: admin, owner: vm.envOr("OWNER", admin), treasury: vm.envOr("TREASURY", admin)
        });
        PalissageDeployment.requireActors(actors);

        vm.startBroadcast(actors.deployer);
        PalissageDeployment.Deployment memory d = PalissageDeployment.deploy(actors);
        vm.stopBroadcast();

        _writeDraft(d, actors);
        _log(d);
    }

    function _writeDraft(PalissageDeployment.Deployment memory d, PalissageDeployment.Actors memory actors) private {
        string memory deploymentId = vm.envOr("DEPLOYMENT_ID", string.concat("palissage-", vm.toString(block.chainid)));

        string memory contracts = "contracts";
        vm.serializeAddress(contracts, "trustedIssuersRegistry", address(d.trustedIssuers));
        vm.serializeAddress(contracts, "identityRegistry", address(d.identityRegistry));
        vm.serializeAddress(contracts, "claimIssuer", address(d.claimIssuer));
        vm.serializeAddress(contracts, "roleGateway", address(d.roleGateway));
        vm.serializeAddress(contracts, "wineLotToken", address(d.token));
        vm.serializeAddress(contracts, "primaryMarket", address(d.primaryMarket));
        vm.serializeAddress(contracts, "secondaryMarket", address(d.secondaryMarket));
        vm.serializeAddress(contracts, "redemptionManager", address(d.redemptionManager));
        vm.serializeAddress(contracts, "palissageLens", address(d.lens));
        string memory contractsJson = vm.serializeAddress(contracts, "testEURe", address(d.paymentToken));

        string memory actorsKey = "actors";
        vm.serializeAddress(actorsKey, "deployer", actors.deployer);
        vm.serializeAddress(actorsKey, "owner", actors.owner);
        vm.serializeAddress(actorsKey, "admin", actors.admin);
        string memory actorsJson = vm.serializeAddress(actorsKey, "treasury", actors.treasury);

        string memory root = "draft";
        vm.serializeUint(root, "schemaVersion", 1);
        vm.serializeString(root, "status", "draft");
        vm.serializeString(root, "deploymentId", deploymentId);
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeString(root, "protocolVersion", d.token.VERSION());
        vm.serializeString(root, "actors", actorsJson);
        string memory json = vm.serializeString(root, "contracts", contractsJson);

        // Distinct from the release CLI's own `<deploymentId>.draft.json` - different steps.
        string memory path = string.concat("deployments/", deploymentId, ".addresses.json");
        vm.writeJson(json, path);
        console.log("Addresses written to:", path);
    }

    function _log(PalissageDeployment.Deployment memory d) private pure {
        console.log("TrustedIssuersRegistry:", address(d.trustedIssuers));
        console.log("IdentityRegistry:      ", address(d.identityRegistry));
        console.log("ClaimIssuer:           ", address(d.claimIssuer));
        console.log("RoleGateway:           ", address(d.roleGateway));
        console.log("WineLotToken:          ", address(d.token));
        console.log("PrimaryMarket:         ", address(d.primaryMarket));
        console.log("SecondaryMarket:       ", address(d.secondaryMarket));
        console.log("RedemptionManager:     ", address(d.redemptionManager));
        console.log("PalissageLens:         ", address(d.lens));
        console.log("TestEURe:              ", address(d.paymentToken));
    }
}
