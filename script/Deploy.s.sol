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
import {RoleGateway} from "../src/identity/RoleGateway.sol";
import {IClaimIssuer} from "../src/interfaces/IClaimIssuer.sol";
import {IVerifierRoleManager} from "../src/identity/RoleGateway.sol";

/// @notice Deploys the full Palissage protocol and wires the roles.
///
/// Environment variables:
///   ADMIN          - protocol admin (multisig); defaults to the deployer
///   TREASURY       - protocol fee receiver; defaults to ADMIN
///   PAYMENT_TOKEN  - optional ERC-20 stablecoin (EURe) to allow on both markets
///
/// Usage:
///   forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address admin = vm.envOr("ADMIN", deployer);
        address treasury = vm.envOr("TREASURY", admin);
        address paymentToken = vm.envOr("PAYMENT_TOKEN", address(0));
        // RoleGateway owner - the only account that may toggle test mode (kept separate from admin).
        address owner = vm.envOr("OWNER", deployer);

        vm.startBroadcast(deployerKey);

        // 1-2. Identity layer.
        TrustedIssuersRegistry trustedIssuers = new TrustedIssuersRegistry(deployer);
        IdentityRegistry identityRegistry = new IdentityRegistry(deployer, trustedIssuers);

        // 3. RWA token.
        WineLotToken token = new WineLotToken(deployer, identityRegistry);

        // 4-6. Markets and redemption.
        PrimaryMarket primaryMarket = new PrimaryMarket(deployer, token, identityRegistry, treasury);
        SecondaryMarket secondaryMarket = new SecondaryMarket(deployer, token, identityRegistry, treasury);
        RedemptionManager redemptionManager = new RedemptionManager(deployer, token);

        // 7. Wiring.
        token.grantRole(token.MINTER_ROLE(), address(primaryMarket));
        token.grantRole(token.BURNER_ROLE(), address(redemptionManager));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(primaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(secondaryMarket));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(redemptionManager));
        // ENFORCER_ROLE lets the manager return escrowed tokens via forcedTransfer even when the
        // lot is suspended during a delivery dispute (refund/cancel); it only ever moves its own
        // escrow (from == address(this)) to the recorded buyer.
        token.grantRole(token.ENFORCER_ROLE(), address(redemptionManager));
        token.setSystemAddress(address(redemptionManager), true);

        // The admin acts as the protocol verifier (the RoleGateway only mirrors this onto the
        // token's VERIFIER_ROLE via assignRole below). Grant the matching market/redemption
        // verifier roles too, otherwise milestone escrow release (confirmMilestone) and the
        // redemption dispute fallback (refund/recover/force-complete) are unreachable until a
        // manual grantRole after deploy.
        primaryMarket.grantRole(primaryMarket.VERIFIER_ROLE(), admin);
        redemptionManager.grantRole(redemptionManager.VERIFIER_ROLE(), admin);

        if (paymentToken != address(0)) {
            primaryMarket.setPaymentTokenAllowed(paymentToken, true);
            secondaryMarket.setPaymentTokenAllowed(paymentToken, true);
        }

        // 8. Protocol claim issuer (KYC provider identity), owned by the admin.
        ClaimIssuer claimIssuer = new ClaimIssuer(admin);
        uint256[] memory topics = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            topics[i] = i + 1; // KYC, KYB, WINERY, B2B_BUYER, VERIFIER
        }
        trustedIssuers.addTrustedIssuer(IClaimIssuer(address(claimIssuer)), topics);

        // 9. Role gateway - on-chain test mode + self-service / admin role assignment.
        //    Deployed with the deployer as owner so it can seed the admin below; ownership is
        //    handed to OWNER afterwards (OWNER is the only account that may toggle test mode).
        RoleGateway roleGateway = new RoleGateway(deployer, identityRegistry, IVerifierRoleManager(address(token)));
        identityRegistry.grantRole(identityRegistry.REGISTRY_AGENT_ROLE(), address(roleGateway));
        trustedIssuers.addTrustedIssuer(IClaimIssuer(address(roleGateway)), topics);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(roleGateway));
        // Make the admin a gateway admin (also grants it the on-chain VERIFIER_ROLE via the gateway).
        roleGateway.assignRole(admin, RoleGateway.Role.Admin);
        if (owner != deployer) roleGateway.transferOwnership(owner);

        // Hand over admin rights when a dedicated admin is used.
        if (admin != deployer) {
            bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();
            trustedIssuers.grantRole(adminRole, admin);
            identityRegistry.grantRole(adminRole, admin);
            token.grantRole(adminRole, admin);
            primaryMarket.grantRole(adminRole, admin);
            secondaryMarket.grantRole(adminRole, admin);
            redemptionManager.grantRole(adminRole, admin);

            trustedIssuers.renounceRole(adminRole, deployer);
            identityRegistry.renounceRole(adminRole, deployer);
            token.renounceRole(adminRole, deployer);
            primaryMarket.renounceRole(adminRole, deployer);
            secondaryMarket.renounceRole(adminRole, deployer);
            redemptionManager.renounceRole(adminRole, deployer);
        }

        vm.stopBroadcast();

        console.log("TrustedIssuersRegistry:", address(trustedIssuers));
        console.log("IdentityRegistry:      ", address(identityRegistry));
        console.log("WineLotToken:          ", address(token));
        console.log("PrimaryMarket:         ", address(primaryMarket));
        console.log("SecondaryMarket:       ", address(secondaryMarket));
        console.log("RedemptionManager:     ", address(redemptionManager));
        console.log("ClaimIssuer:           ", address(claimIssuer));
        console.log("RoleGateway:           ", address(roleGateway));
    }
}
