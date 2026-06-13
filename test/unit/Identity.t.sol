// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {Identity} from "../../src/identity/Identity.sol";
import {IIdentity} from "../../src/interfaces/IIdentity.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";

contract IdentityTest is Fixtures {
    Identity internal identity;

    function setUp() public override {
        super.setUp();
        identity = identities[buyer];
    }

    function test_ConstructorSetsManagementKey() public view {
        bytes32 key = keccak256(abi.encode(buyer));
        assertTrue(identity.keyHasPurpose(key, ClaimTopicsLib.PURPOSE_MANAGEMENT));
        // MANAGEMENT keys implicitly hold every purpose.
        assertTrue(identity.keyHasPurpose(key, ClaimTopicsLib.PURPOSE_CLAIM));
    }

    function test_AddKey_RevertsForNonManager() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Identity.NotAuthorized.selector, outsider));
        identity.addKey(keccak256(abi.encode(outsider)), ClaimTopicsLib.PURPOSE_ACTION, ClaimTopicsLib.KEY_TYPE_ECDSA);
    }

    function test_AddAndRemoveKey() public {
        bytes32 key = keccak256(abi.encode(outsider));
        vm.prank(buyer);
        identity.addKey(key, ClaimTopicsLib.PURPOSE_ACTION, ClaimTopicsLib.KEY_TYPE_ECDSA);
        assertTrue(identity.keyHasPurpose(key, ClaimTopicsLib.PURPOSE_ACTION));
        assertFalse(identity.keyHasPurpose(key, ClaimTopicsLib.PURPOSE_MANAGEMENT));

        vm.prank(buyer);
        identity.removeKey(key, ClaimTopicsLib.PURPOSE_ACTION);
        assertFalse(identity.keyHasPurpose(key, ClaimTopicsLib.PURPOSE_ACTION));
    }

    function test_ClaimsStoredAndQueryable() public view {
        bytes32[] memory ids = identity.getClaimIdsByTopic(ClaimTopicsLib.TOPIC_B2B_BUYER);
        assertEq(ids.length, 1);
        (uint256 topic,, address issuer,,,) = identity.getClaim(ids[0]);
        assertEq(topic, ClaimTopicsLib.TOPIC_B2B_BUYER);
        assertEq(issuer, address(claimIssuer));
    }

    function test_RemoveClaim_ByIssuer() public {
        bytes32 claimId = keccak256(abi.encode(address(claimIssuer), ClaimTopicsLib.TOPIC_B2B_BUYER));
        vm.prank(address(claimIssuer));
        identity.removeClaim(claimId);
        assertEq(identity.getClaimIdsByTopic(ClaimTopicsLib.TOPIC_B2B_BUYER).length, 0);
    }

    function test_IsClaimValid_TrueForIssuedClaim() public view {
        bytes memory data = "";
        bytes memory sig = _signClaim(address(identity), ClaimTopicsLib.TOPIC_KYC, data);
        assertTrue(claimIssuer.isClaimValid(IIdentity(address(identity)), ClaimTopicsLib.TOPIC_KYC, sig, data));
    }

    function test_IsClaimValid_FalseForWrongSigner() public {
        (, uint256 strangerKey) = makeAddrAndKey("stranger");
        bytes memory data = "";
        bytes32 hash = keccak256(abi.encode(address(identity), ClaimTopicsLib.TOPIC_KYC, data));
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(strangerKey, keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)));
        bytes memory sig = abi.encodePacked(r, s, v);
        assertFalse(claimIssuer.isClaimValid(IIdentity(address(identity)), ClaimTopicsLib.TOPIC_KYC, sig, data));
    }

    function test_IsClaimValid_FalseAfterRevocation() public {
        bytes memory data = "";
        bytes memory sig = _signClaim(address(identity), ClaimTopicsLib.TOPIC_KYC, data);

        vm.prank(issuerOwner);
        claimIssuer.revokeClaimBySignature(sig);

        assertFalse(claimIssuer.isClaimValid(IIdentity(address(identity)), ClaimTopicsLib.TOPIC_KYC, sig, data));
    }
}
