// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Identity} from "./Identity.sol";
import {IClaimIssuer} from "../interfaces/IClaimIssuer.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @title ClaimIssuer - trusted issuer identity that signs, validates and revokes claims.
/// @notice Claims bind the chain, issuer, subject, topic and data. Sign {claimDigest}.
///         The recovered signer must hold a CLAIM (purpose 3) key in this issuer identity.
contract ClaimIssuer is Identity, IClaimIssuer {
    string public constant VERSION = "1.1.0";

    mapping(bytes32 => bool) private _revokedSignatures;

    constructor(address initialManagementKey) Identity(initialManagementKey) {}

    /// @inheritdoc IClaimIssuer
    function revokeClaimBySignature(bytes calldata signature) external onlyManager {
        _revokedSignatures[keccak256(signature)] = true;
        emit ClaimRevoked(signature);
    }

    /// @inheritdoc IClaimIssuer
    function isClaimRevoked(bytes calldata signature) public view returns (bool revoked) {
        return _revokedSignatures[keccak256(signature)];
    }

    /// @inheritdoc IClaimIssuer
    function isClaimValid(IIdentity subject, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        view
        returns (bool valid)
    {
        if (isClaimRevoked(signature)) return false;

        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(claimDigest(subject, topic, data), signature);
        if (err != ECDSA.RecoverError.NoError) return false;

        return keyHasPurpose(keccak256(abi.encode(signer)), ClaimTopicsLib.PURPOSE_CLAIM);
    }

    /// @notice EIP-191 digest for an issuer claim, scoped to this network and issuer.
    function claimDigest(IIdentity subject, uint256 topic, bytes memory data) public view returns (bytes32) {
        return MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encode(block.chainid, address(this), subject, topic, data))
        );
    }
}
