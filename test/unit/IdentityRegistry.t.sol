// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {Fixtures} from "../utils/Fixtures.sol";
import {IClaimIssuer} from "../../src/interfaces/IClaimIssuer.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";

contract IdentityRegistryTest is Fixtures {
    function test_IsVerified_TrueForOnboardedWallets() public view {
        assertTrue(identityRegistry.isVerified(buyer));
        assertTrue(identityRegistry.isVerified(winery));
    }

    function test_IsVerified_FalseForUnknownWallet() public view {
        assertFalse(identityRegistry.isVerified(outsider));
    }

    function test_HasValidClaim_PerTopic() public view {
        assertTrue(identityRegistry.hasValidClaim(buyer, ClaimTopicsLib.TOPIC_B2B_BUYER));
        assertFalse(identityRegistry.hasValidClaim(buyer, ClaimTopicsLib.TOPIC_WINERY));
        assertTrue(identityRegistry.hasValidClaim(winery, ClaimTopicsLib.TOPIC_WINERY));
    }

    function test_IsVerified_FalseAfterIssuerRemoved() public {
        vm.prank(admin);
        trustedIssuers.removeTrustedIssuer(IClaimIssuer(address(claimIssuer)));
        assertFalse(identityRegistry.isVerified(buyer));
    }

    function test_HasValidClaim_FalseAfterSignatureRevoked() public {
        bytes memory sig = _signClaim(address(identities[buyer]), ClaimTopicsLib.TOPIC_B2B_BUYER, "");
        vm.prank(issuerOwner);
        claimIssuer.revokeClaimBySignature(sig);
        assertFalse(identityRegistry.hasValidClaim(buyer, ClaimTopicsLib.TOPIC_B2B_BUYER));
        // KYC claim is untouched, base verification still passes.
        assertTrue(identityRegistry.isVerified(buyer));
    }

    function test_RegisterIdentity_OnlyAgent() public {
        bytes32 role = identityRegistry.REGISTRY_AGENT_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, role)
        );
        identityRegistry.registerIdentity(outsider, identities[buyer], 0);
    }

    function test_CountryStored() public view {
        assertEq(identityRegistry.countryOf(buyer), 756);
        assertEq(identityRegistry.countryOf(winery), 250);
    }

    function test_DeleteIdentity_RemovesVerification() public {
        vm.prank(registryAgent);
        identityRegistry.deleteIdentity(buyer);
        assertFalse(identityRegistry.isVerified(buyer));
        assertFalse(identityRegistry.containsWallet(buyer));
    }
}
