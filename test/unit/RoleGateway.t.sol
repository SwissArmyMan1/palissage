// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Fixtures} from "../utils/Fixtures.sol";
import {RoleGateway, IVerifierRoleManager} from "../../src/identity/RoleGateway.sol";
import {IClaimIssuer} from "../../src/interfaces/IClaimIssuer.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";

/// @dev Tests for the on-chain test-mode role gateway: self-service in test mode, admin granting
///      in any mode, single-role replacement, and the admin verifier capability.
contract RoleGatewayTest is Fixtures {
    RoleGateway internal gateway;
    address internal owner = makeAddr("gwOwner");
    address internal user = makeAddr("gwUser");
    address internal user2 = makeAddr("gwUser2");

    function setUp() public override {
        super.setUp();

        uint256[] memory topics = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            topics[i] = i + 1;
        }

        vm.startPrank(admin);
        gateway = new RoleGateway(owner, identityRegistry, IVerifierRoleManager(address(token)));
        identityRegistry.grantRole(identityRegistry.REGISTRY_AGENT_ROLE(), address(gateway));
        trustedIssuers.addTrustedIssuer(IClaimIssuer(address(gateway)), topics);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(gateway));
        vm.stopPrank();

        // Seed the protocol admin as a gateway admin (also grants it VERIFIER_ROLE).
        vm.prank(owner);
        gateway.assignRole(admin, RoleGateway.Role.Admin);
    }

    // ---------------------------------------------------------------------
    // Test mode toggle
    // ---------------------------------------------------------------------

    function test_TestModeDefaultsOn() public view {
        assertTrue(gateway.testMode());
    }

    function test_OnlyOwnerTogglesTestMode() public {
        // Admin (not owner) cannot toggle.
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, admin));
        gateway.setTestMode(false);

        vm.prank(owner);
        gateway.setTestMode(false);
        assertFalse(gateway.testMode());
    }

    // ---------------------------------------------------------------------
    // Self-service (test mode)
    // ---------------------------------------------------------------------

    function test_AssumeRoleWineryVerifiesAndCanCreateLot() public {
        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Winery);

        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Winery));
        assertTrue(identityRegistry.isVerified(user));
        assertTrue(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));

        vm.prank(user);
        uint256 lotId = token.createLot(_lotInput());
        assertEq(token.getLot(lotId).winery, user);
    }

    function test_AssumeRoleShopIsBuyerAndVerified() public {
        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Shop);

        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Shop));
        assertTrue(identityRegistry.isVerified(user));
        assertTrue(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_B2B_BUYER));
        assertFalse(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));
    }

    function test_AssumeRoleConsumerVerifiedButNotBuyerOrWinery() public {
        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Consumer);

        assertTrue(identityRegistry.isVerified(user));
        assertFalse(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_B2B_BUYER));
        assertFalse(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));
    }

    /// @dev A new role replaces the old one; the old role's specialised claim disappears.
    function test_RoleReplacementDropsPreviousClaims() public {
        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Winery);
        assertTrue(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));

        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Shop);

        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Shop));
        assertFalse(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));
        assertTrue(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_B2B_BUYER));
        // KYC carries over so the wallet stays verified across the switch.
        assertTrue(identityRegistry.isVerified(user));
        // The same identity is reused, not redeployed.
        assertTrue(identityRegistry.containsWallet(user));
    }

    function test_AssumeRoleNoneReverts() public {
        vm.prank(user);
        vm.expectRevert(RoleGateway.InvalidRole.selector);
        gateway.assumeRole(RoleGateway.Role.None);
    }

    function test_AssumeRoleRevertsWhenTestModeOff() public {
        vm.prank(owner);
        gateway.setTestMode(false);

        vm.prank(user);
        vm.expectRevert(RoleGateway.TestModeDisabled.selector);
        gateway.assumeRole(RoleGateway.Role.Winery);
    }

    function test_TestModeAdminCanAssumeAndThenGrant() public {
        vm.prank(user);
        gateway.assumeRole(RoleGateway.Role.Admin);
        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Admin));
        assertTrue(token.hasRole(token.VERIFIER_ROLE(), user));

        // Now this sandbox admin can grant a role to someone else.
        vm.prank(user);
        gateway.assignRole(user2, RoleGateway.Role.Winery);
        assertTrue(identityRegistry.hasValidClaim(user2, ClaimTopicsLib.TOPIC_WINERY));
    }

    // ---------------------------------------------------------------------
    // Admin granting (any mode)
    // ---------------------------------------------------------------------

    function test_AssignRoleWorksWhenTestModeOff() public {
        vm.prank(owner);
        gateway.setTestMode(false);

        vm.prank(admin);
        gateway.assignRole(user, RoleGateway.Role.Winery);

        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Winery));
        assertTrue(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));
    }

    function test_NonAdminCannotAssignRole() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(RoleGateway.NotGatewayAdmin.selector, user));
        gateway.assignRole(user2, RoleGateway.Role.Winery);
    }

    function test_OwnerCanAssignRole() public {
        vm.prank(owner);
        gateway.assignRole(user, RoleGateway.Role.Shop);
        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.Shop));
    }

    function test_RevokeRoleClearsClaims() public {
        vm.prank(admin);
        gateway.assignRole(user, RoleGateway.Role.Winery);
        assertTrue(identityRegistry.isVerified(user));

        vm.prank(admin);
        gateway.revokeRole(user);

        assertEq(uint256(gateway.roleOf(user)), uint256(RoleGateway.Role.None));
        assertFalse(identityRegistry.isVerified(user));
        assertFalse(identityRegistry.hasValidClaim(user, ClaimTopicsLib.TOPIC_WINERY));
    }

    // ---------------------------------------------------------------------
    // Admin verifier capability
    // ---------------------------------------------------------------------

    function test_AdminHasVerifierRoleAndCanVerifyLot() public {
        // admin was seeded as gateway admin in setUp.
        assertTrue(token.hasRole(token.VERIFIER_ROLE(), admin));

        vm.prank(admin);
        gateway.assignRole(user, RoleGateway.Role.Winery);

        vm.prank(user);
        uint256 lotId = token.createLot(_lotInput());

        vm.prank(admin);
        token.verifyLot(lotId, keccak256("docs"));
        assertEq(uint256(token.getLot(lotId).status), uint256(IWineLotToken.LotStatus.Verified));
    }

    function test_AdminLosesVerifierRoleWhenSwitchingAway() public {
        vm.prank(admin);
        gateway.assignRole(user, RoleGateway.Role.Admin);
        assertTrue(token.hasRole(token.VERIFIER_ROLE(), user));

        vm.prank(admin);
        gateway.assignRole(user, RoleGateway.Role.Winery);
        assertFalse(token.hasRole(token.VERIFIER_ROLE(), user));
    }

    function test_CannotManageWalletRegisteredElsewhere() public {
        // `winery` was onboarded by the legacy ClaimIssuer flow in Fixtures.
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(RoleGateway.WalletManagedElsewhere.selector, winery));
        gateway.assignRole(winery, RoleGateway.Role.Shop);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _lotInput() internal pure returns (IWineLotToken.WineLotInput memory) {
        return IWineLotToken.WineLotInput({
            totalBottles: 1000,
            vintage: 2024,
            royaltyBps: 250,
            bottleSizeMl: 750,
            exportAllowed: true,
            name: "Gateway Test Lot",
            region: "Bordeaux AOC",
            grapes: "Merlot",
            metadataURI: "ipfs://lot"
        });
    }
}
