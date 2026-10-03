// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PalissageDeployment} from "../../script/Deploy.s.sol";
import {RoleGateway} from "../../src/identity/RoleGateway.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {PalissageLens} from "../../src/periphery/PalissageLens.sol";

/// @dev The wiring matrix of chain-mvp 09 §2, asserted locally so a broken link is found before
///      a public deployment rather than by the read-only verifier afterwards.
contract DeploymentWiringTest is Test {
    address internal deployer = makeAddr("deployer");
    address internal admin = makeAddr("operator");
    address internal gatewayOwner = makeAddr("gatewayOwner");
    address internal treasury = makeAddr("treasury");

    PalissageDeployment.Deployment internal d;

    function setUp() public {
        vm.chainId(421614);
        PalissageDeployment.Actors memory actors =
            PalissageDeployment.Actors({deployer: deployer, admin: admin, owner: gatewayOwner, treasury: treasury});
        vm.startPrank(deployer);
        d = PalissageDeployment.deploy(actors);
        vm.stopPrank();
    }

    function test_ChainGuardRejectsEveryOtherNetwork() public {
        PalissageDeployment.Actors memory actors =
            PalissageDeployment.Actors({deployer: deployer, admin: admin, owner: admin, treasury: admin});

        uint256[3] memory forbidden = [uint256(1), 42161, 4663];
        for (uint256 i = 0; i < forbidden.length; i++) {
            vm.chainId(forbidden[i]);
            vm.expectRevert(abi.encodeWithSelector(PalissageDeployment.UnsupportedChain.selector, forbidden[i]));
            this.deployExternal(actors);
        }
    }

    function test_RejectsZeroActor() public {
        PalissageDeployment.Actors memory actors =
            PalissageDeployment.Actors({deployer: deployer, admin: address(0), owner: admin, treasury: admin});
        vm.expectRevert(abi.encodeWithSelector(PalissageDeployment.ZeroActorAddress.selector, "ADMIN"));
        this.deployExternal(actors);
    }

    /// @dev External entry point so `expectRevert` applies to the deployment call itself.
    function deployExternal(PalissageDeployment.Actors memory actors) external {
        PalissageDeployment.deploy(actors);
    }

    // --------------------------------------------------------------- wiring

    function test_ImmutableReferencesPointAtThisDeployment() public view {
        assertEq(address(d.identityRegistry.trustedIssuersRegistry()), address(d.trustedIssuers));
        assertEq(address(d.token.identityRegistry()), address(d.identityRegistry));
        assertEq(address(d.primaryMarket.identityRegistry()), address(d.identityRegistry));
        assertEq(address(d.secondaryMarket.identityRegistry()), address(d.identityRegistry));
        assertEq(address(d.primaryMarket.wineLotToken()), address(d.token));
        assertEq(address(d.secondaryMarket.wineLotToken()), address(d.token));
        assertEq(address(d.redemptionManager.wineLotToken()), address(d.token));
        assertEq(address(d.roleGateway.token()), address(d.token));
        assertEq(address(d.roleGateway.identityRegistry()), address(d.identityRegistry));

        assertEq(address(d.lens.token()), address(d.token));
        assertEq(address(d.lens.primary()), address(d.primaryMarket));
        assertEq(address(d.lens.secondary()), address(d.secondaryMarket));
        assertEq(address(d.lens.redemptionManager()), address(d.redemptionManager));
        assertEq(address(d.lens.registry()), address(d.identityRegistry));
        assertEq(address(d.lens.gateway()), address(d.roleGateway));
    }

    function test_TokenRolesAndSystemAddress() public view {
        assertTrue(d.token.hasRole(d.token.MINTER_ROLE(), address(d.primaryMarket)));
        assertTrue(d.token.hasRole(d.token.TRANSFER_AGENT_ROLE(), address(d.primaryMarket)));
        assertTrue(d.token.hasRole(d.token.TRANSFER_AGENT_ROLE(), address(d.secondaryMarket)));
        assertTrue(d.token.hasRole(d.token.TRANSFER_AGENT_ROLE(), address(d.redemptionManager)));
        assertTrue(d.token.hasRole(d.token.BURNER_ROLE(), address(d.redemptionManager)));
        assertTrue(d.token.hasRole(d.token.ENFORCER_ROLE(), address(d.redemptionManager)));
        assertTrue(d.token.isSystemAddress(address(d.redemptionManager)));

        // The secondary market never mints or burns.
        assertFalse(d.token.hasRole(d.token.MINTER_ROLE(), address(d.secondaryMarket)));
        assertFalse(d.token.hasRole(d.token.BURNER_ROLE(), address(d.secondaryMarket)));
    }

    function test_OperatorHoldsEachRoleSeparately() public view {
        assertTrue(d.token.hasRole(d.token.VERIFIER_ROLE(), admin)); // via the gateway admin role
        assertTrue(d.primaryMarket.hasRole(d.primaryMarket.VERIFIER_ROLE(), admin));
        assertTrue(d.primaryMarket.hasRole(d.primaryMarket.PAUSER_ROLE(), admin));
        assertTrue(d.secondaryMarket.hasRole(d.secondaryMarket.PAUSER_ROLE(), admin));
        assertTrue(d.redemptionManager.hasRole(d.redemptionManager.VERIFIER_ROLE(), admin));
        assertEq(uint8(d.roleGateway.roleOf(admin)), uint8(RoleGateway.Role.Admin));
    }

    function test_GatewayIsRegistryAgentAndTrustedIssuer() public view {
        assertTrue(d.identityRegistry.hasRole(d.identityRegistry.REGISTRY_AGENT_ROLE(), address(d.roleGateway)));
        assertTrue(d.token.hasRole(d.token.DEFAULT_ADMIN_ROLE(), address(d.roleGateway)));
        assertTrue(d.trustedIssuers.isTrustedIssuer(address(d.roleGateway)));
        assertTrue(d.trustedIssuers.isTrustedIssuer(address(d.claimIssuer)));
        for (uint256 topic = 1; topic <= 5; topic++) {
            assertTrue(d.trustedIssuers.hasClaimTopic(address(d.roleGateway), topic));
            assertTrue(d.trustedIssuers.hasClaimTopic(address(d.claimIssuer), topic));
        }
        uint256[] memory required = d.identityRegistry.requiredClaimTopics();
        assertEq(required.length, 1);
        assertEq(required[0], ClaimTopicsLib.TOPIC_KYC);
    }

    function test_OwnershipAndDeployerHandOver() public view {
        assertEq(d.roleGateway.owner(), gatewayOwner);
        assertEq(d.paymentToken.owner(), admin);

        bytes32 adminRole = d.token.DEFAULT_ADMIN_ROLE();
        assertTrue(d.token.hasRole(adminRole, admin));
        assertTrue(d.primaryMarket.hasRole(adminRole, admin));
        assertTrue(d.secondaryMarket.hasRole(adminRole, admin));
        assertTrue(d.redemptionManager.hasRole(adminRole, admin));
        assertTrue(d.identityRegistry.hasRole(adminRole, admin));
        assertTrue(d.trustedIssuers.hasRole(adminRole, admin));

        // The temporary deployer keeps nothing.
        assertFalse(d.token.hasRole(adminRole, deployer));
        assertFalse(d.primaryMarket.hasRole(adminRole, deployer));
        assertFalse(d.secondaryMarket.hasRole(adminRole, deployer));
        assertFalse(d.redemptionManager.hasRole(adminRole, deployer));
        assertFalse(d.identityRegistry.hasRole(adminRole, deployer));
        assertFalse(d.trustedIssuers.hasRole(adminRole, deployer));
    }

    function test_PaymentTokenAllowedOnBothMarketsAndNothingElse() public {
        assertTrue(d.primaryMarket.allowedPaymentTokens(address(d.paymentToken)));
        assertTrue(d.secondaryMarket.allowedPaymentTokens(address(d.paymentToken)));
        assertFalse(d.primaryMarket.allowedPaymentTokens(makeAddr("someOtherToken")));
        assertEq(d.paymentToken.decimals(), 18);
        assertEq(d.paymentToken.symbol(), "tEURe");
    }

    /// @dev No public self-service window exists between the deploy transactions and the seed.
    function test_TestModeStaysClosedUntilTheSeedIsVerified() public {
        assertFalse(d.roleGateway.testMode());

        address visitor = makeAddr("visitor");
        vm.prank(visitor);
        vm.expectRevert(RoleGateway.TestModeDisabled.selector);
        d.roleGateway.assumeRole(RoleGateway.Role.Shop);

        vm.prank(gatewayOwner);
        d.roleGateway.setTestMode(true);

        // Even then, nobody can make themselves an admin (and so a token verifier).
        vm.prank(visitor);
        vm.expectRevert(RoleGateway.AdminRoleNotSelfAssignable.selector);
        d.roleGateway.assumeRole(RoleGateway.Role.Admin);

        vm.prank(visitor);
        d.roleGateway.assumeRole(RoleGateway.Role.Shop);
        assertTrue(d.identityRegistry.isVerified(visitor));
    }

    function test_LensSeesTheDeploymentTheManifestDescribes() public view {
        PalissageLens.ProtocolView memory view_ = d.lens.protocol(address(d.paymentToken));
        assertEq(view_.chainId, 421614);
        assertEq(view_.primaryFeeBps, 300);
        assertEq(view_.secondaryFeeBps, 200);
        assertEq(view_.primaryTreasury, treasury);
        assertEq(view_.secondaryTreasury, treasury);
        assertTrue(view_.paymentAllowedPrimary);
        assertTrue(view_.paymentAllowedSecondary);
        assertTrue(view_.paymentMetadataOk);
        assertEq(view_.paymentDecimals, 18);
        assertEq(view_.paymentSymbol, "tEURe");
        assertFalse(view_.testMode);
        assertFalse(view_.primaryPaused);
        assertFalse(view_.secondaryPaused);
        assertEq(view_.lotCount, 0);
    }

    function test_AllTenContractsReportTheReleaseVersion() public view {
        assertEq(d.trustedIssuers.VERSION(), "1.1.0");
        assertEq(d.identityRegistry.VERSION(), "1.1.0");
        assertEq(d.claimIssuer.VERSION(), "1.1.0");
        assertEq(d.roleGateway.VERSION(), "1.1.0");
        assertEq(d.token.VERSION(), "1.1.0");
        assertEq(d.primaryMarket.VERSION(), "1.1.0");
        assertEq(d.secondaryMarket.VERSION(), "1.1.0");
        assertEq(d.redemptionManager.VERSION(), "1.1.0");
        assertEq(d.lens.VERSION(), "1.1.0");
        assertEq(d.paymentToken.VERSION(), "1.1.0");
    }
}
