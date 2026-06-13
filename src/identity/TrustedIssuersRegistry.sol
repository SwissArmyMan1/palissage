// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ITrustedIssuersRegistry} from "../interfaces/ITrustedIssuersRegistry.sol";
import {IClaimIssuer} from "../interfaces/IClaimIssuer.sol";

/// @title TrustedIssuersRegistry — claim issuers trusted by the protocol, per topic.
contract TrustedIssuersRegistry is AccessControl, ITrustedIssuersRegistry {
    error IssuerAlreadyExists(address issuer);
    error IssuerDoesNotExist(address issuer);
    error EmptyClaimTopics();
    error ZeroAddress();

    IClaimIssuer[] private _issuers;
    mapping(address => uint256[]) private _issuerTopics;
    mapping(address => bool) private _isTrusted;

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function addTrustedIssuer(IClaimIssuer issuer, uint256[] calldata claimTopics)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (address(issuer) == address(0)) revert ZeroAddress();
        if (_isTrusted[address(issuer)]) revert IssuerAlreadyExists(address(issuer));
        if (claimTopics.length == 0) revert EmptyClaimTopics();

        _issuers.push(issuer);
        _issuerTopics[address(issuer)] = claimTopics;
        _isTrusted[address(issuer)] = true;
        emit TrustedIssuerAdded(issuer, claimTopics);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function removeTrustedIssuer(IClaimIssuer issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_isTrusted[address(issuer)]) revert IssuerDoesNotExist(address(issuer));

        uint256 len = _issuers.length;
        for (uint256 i = 0; i < len; i++) {
            if (_issuers[i] == issuer) {
                _issuers[i] = _issuers[len - 1];
                _issuers.pop();
                break;
            }
        }
        delete _issuerTopics[address(issuer)];
        delete _isTrusted[address(issuer)];
        emit TrustedIssuerRemoved(issuer);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function updateIssuerClaimTopics(IClaimIssuer issuer, uint256[] calldata claimTopics)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_isTrusted[address(issuer)]) revert IssuerDoesNotExist(address(issuer));
        if (claimTopics.length == 0) revert EmptyClaimTopics();
        _issuerTopics[address(issuer)] = claimTopics;
        emit ClaimTopicsUpdated(issuer, claimTopics);
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function getTrustedIssuers() external view returns (IClaimIssuer[] memory issuers) {
        return _issuers;
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function isTrustedIssuer(address issuer) external view returns (bool trusted) {
        return _isTrusted[issuer];
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function getTrustedIssuerClaimTopics(IClaimIssuer issuer) external view returns (uint256[] memory topics) {
        return _issuerTopics[address(issuer)];
    }

    /// @inheritdoc ITrustedIssuersRegistry
    function hasClaimTopic(address issuer, uint256 topic) external view returns (bool has) {
        uint256[] storage topics = _issuerTopics[issuer];
        uint256 len = topics.length;
        for (uint256 i = 0; i < len; i++) {
            if (topics[i] == topic) return true;
        }
        return false;
    }
}
