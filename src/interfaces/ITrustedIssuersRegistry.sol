// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IClaimIssuer} from "./IClaimIssuer.sol";

/// @title ITrustedIssuersRegistry - registry of claim issuers trusted by the protocol.
interface ITrustedIssuersRegistry {
    event TrustedIssuerAdded(IClaimIssuer indexed issuer, uint256[] claimTopics);
    event TrustedIssuerRemoved(IClaimIssuer indexed issuer);
    event ClaimTopicsUpdated(IClaimIssuer indexed issuer, uint256[] claimTopics);

    function addTrustedIssuer(IClaimIssuer issuer, uint256[] calldata claimTopics) external;
    function removeTrustedIssuer(IClaimIssuer issuer) external;
    function updateIssuerClaimTopics(IClaimIssuer issuer, uint256[] calldata claimTopics) external;

    function getTrustedIssuers() external view returns (IClaimIssuer[] memory issuers);
    function isTrustedIssuer(address issuer) external view returns (bool trusted);
    function getTrustedIssuerClaimTopics(IClaimIssuer issuer) external view returns (uint256[] memory topics);
    function hasClaimTopic(address issuer, uint256 topic) external view returns (bool has);
}
