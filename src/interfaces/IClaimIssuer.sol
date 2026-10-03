// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentity} from "./IIdentity.sol";

interface IClaimIssuer is IIdentity {
    event ClaimRevoked(bytes indexed signature);

    function revokeClaimBySignature(bytes calldata signature) external;

    function isClaimRevoked(bytes calldata signature) external view returns (bool revoked);

    function isClaimValid(IIdentity subject, uint256 topic, bytes calldata signature, bytes calldata data)
        external
        view
        returns (bool valid);
}
