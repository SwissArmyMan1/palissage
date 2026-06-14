// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentity} from "./IIdentity.sol";

/// @title IClaimIssuer - trusted issuer identity able to validate and revoke its claim signatures.
interface IClaimIssuer is IIdentity {
    event ClaimRevoked(bytes indexed signature);

    /// @notice Revokes a previously issued claim signature.
    function revokeClaimBySignature(bytes calldata signature) external;

    /// @notice Whether `signature` has been revoked by this issuer.
    function isClaimRevoked(bytes calldata signature) external view returns (bool revoked);

    /// @notice Validates a claim about `subject`: the signer must hold a CLAIM key
    ///         in this issuer identity and the signature must not be revoked.
    /// @dev signature = ECDSA over toEthSignedMessageHash(keccak256(abi.encode(subject, topic, data))).
    function isClaimValid(IIdentity subject, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        view
        returns (bool valid);
}
