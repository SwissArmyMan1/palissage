// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Identity} from "./Identity.sol";
import {IClaimIssuer} from "../interfaces/IClaimIssuer.sol";
import {IIdentity} from "../interfaces/IIdentity.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

contract ClaimIssuer is Identity, IClaimIssuer {
    string public constant VERSION = "1.1.0";

    mapping(bytes32 => bool) private _revokedSignatures;

    constructor(address initialManagementKey) Identity(initialManagementKey) {}

    function revokeClaimBySignature(bytes calldata signature) external onlyManager {
        _revokedSignatures[keccak256(signature)] = true;
        emit ClaimRevoked(signature);
    }

    function isClaimRevoked(bytes calldata signature) public view returns (bool revoked) {
        return _revokedSignatures[keccak256(signature)];
    }

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

    /// @notice EIP-191 digest binding chain, issuer, subject, topic and data.
    function claimDigest(IIdentity subject, uint256 topic, bytes memory data) public view returns (bytes32) {
        return MessageHashUtils.toEthSignedMessageHash(
            keccak256(abi.encode(block.chainid, address(this), subject, topic, data))
        );
    }
}
