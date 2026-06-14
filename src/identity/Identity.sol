// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentity} from "../interfaces/IIdentity.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @title Identity - ERC-734 (Key Holder) + ERC-735 (Claim Holder) implementation.
/// @notice One contract per participant. Keys are keccak256(abi.encode(address)).
///         Claim signatures are validated by readers (IdentityRegistry / ClaimIssuer),
///         not at write time - OnchainID model.
contract Identity is IIdentity {
    struct Key {
        uint256[] purposes;
        uint256 keyType;
        bytes32 key;
    }

    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    struct Execution {
        address to;
        uint256 value;
        bytes data;
        bool approved;
        bool executed;
    }

    error NotAuthorized(address caller);
    error KeyAlreadyHasPurpose(bytes32 key, uint256 purpose);
    error KeyDoesNotExist(bytes32 key);
    error KeyDoesNotHavePurpose(bytes32 key, uint256 purpose);
    error ClaimDoesNotExist(bytes32 claimId);
    error ExecutionAlreadySettled(uint256 executionId);
    error ZeroAddress();

    mapping(bytes32 => Key) private _keys;
    mapping(uint256 => bytes32[]) private _keysByPurpose;

    mapping(bytes32 => Claim) private _claims;
    mapping(uint256 => bytes32[]) private _claimsByTopic;

    mapping(uint256 => Execution) private _executions;
    uint256 private _executionNonce;

    constructor(address initialManagementKey) {
        if (initialManagementKey == address(0)) revert ZeroAddress();
        bytes32 key = keccak256(abi.encode(initialManagementKey));
        _keys[key].key = key;
        _keys[key].keyType = ClaimTopicsLib.KEY_TYPE_ECDSA;
        _keys[key].purposes.push(ClaimTopicsLib.PURPOSE_MANAGEMENT);
        _keysByPurpose[ClaimTopicsLib.PURPOSE_MANAGEMENT].push(key);
        emit KeyAdded(key, ClaimTopicsLib.PURPOSE_MANAGEMENT, ClaimTopicsLib.KEY_TYPE_ECDSA);
    }

    // ---------------------------------------------------------------------
    // ERC-734
    // ---------------------------------------------------------------------

    function getKey(bytes32 key) external view returns (uint256[] memory purposes, uint256 keyType, bytes32 key_) {
        Key storage k = _keys[key];
        return (k.purposes, k.keyType, k.key);
    }

    function keyHasPurpose(bytes32 key, uint256 purpose) public view returns (bool exists) {
        Key storage k = _keys[key];
        if (k.key == 0) return false;
        uint256 len = k.purposes.length;
        for (uint256 i = 0; i < len; i++) {
            // MANAGEMENT keys implicitly hold every purpose.
            if (k.purposes[i] == ClaimTopicsLib.PURPOSE_MANAGEMENT || k.purposes[i] == purpose) return true;
        }
        return false;
    }

    function getKeysByPurpose(uint256 purpose) external view returns (bytes32[] memory keys) {
        return _keysByPurpose[purpose];
    }

    function addKey(bytes32 key, uint256 purpose, uint256 keyType) public onlyManager returns (bool success) {
        Key storage k = _keys[key];
        if (k.key == key) {
            uint256 len = k.purposes.length;
            for (uint256 i = 0; i < len; i++) {
                if (k.purposes[i] == purpose) revert KeyAlreadyHasPurpose(key, purpose);
            }
        } else {
            k.key = key;
            k.keyType = keyType;
        }
        k.purposes.push(purpose);
        _keysByPurpose[purpose].push(key);
        emit KeyAdded(key, purpose, keyType);
        return true;
    }

    function removeKey(bytes32 key, uint256 purpose) public onlyManager returns (bool success) {
        Key storage k = _keys[key];
        if (k.key != key) revert KeyDoesNotExist(key);

        uint256 len = k.purposes.length;
        bool found;
        for (uint256 i = 0; i < len; i++) {
            if (k.purposes[i] == purpose) {
                k.purposes[i] = k.purposes[len - 1];
                k.purposes.pop();
                found = true;
                break;
            }
        }
        if (!found) revert KeyDoesNotHavePurpose(key, purpose);

        bytes32[] storage byPurpose = _keysByPurpose[purpose];
        uint256 plen = byPurpose.length;
        for (uint256 i = 0; i < plen; i++) {
            if (byPurpose[i] == key) {
                byPurpose[i] = byPurpose[plen - 1];
                byPurpose.pop();
                break;
            }
        }

        uint256 keyType = k.keyType;
        if (k.purposes.length == 0) delete _keys[key];
        emit KeyRemoved(key, purpose, keyType);
        return true;
    }

    function execute(address to, uint256 value, bytes calldata data)
        external
        payable
        returns (uint256 executionId)
    {
        executionId = _executionNonce++;
        Execution storage e = _executions[executionId];
        e.to = to;
        e.value = value;
        e.data = data;
        emit ExecutionRequested(executionId, to, value, data);

        bytes32 senderKey = keccak256(abi.encode(msg.sender));
        if (
            keyHasPurpose(senderKey, ClaimTopicsLib.PURPOSE_MANAGEMENT)
                || (to != address(this) && keyHasPurpose(senderKey, ClaimTopicsLib.PURPOSE_ACTION))
        ) {
            _approveAndExecute(executionId);
        }
    }

    function approve(uint256 id, bool approve_) external returns (bool success) {
        Execution storage e = _executions[id];
        if (e.executed || e.approved) revert ExecutionAlreadySettled(id);

        bytes32 senderKey = keccak256(abi.encode(msg.sender));
        if (e.to == address(this)) {
            if (!keyHasPurpose(senderKey, ClaimTopicsLib.PURPOSE_MANAGEMENT)) revert NotAuthorized(msg.sender);
        } else {
            if (!keyHasPurpose(senderKey, ClaimTopicsLib.PURPOSE_ACTION)) revert NotAuthorized(msg.sender);
        }

        emit Approved(id, approve_);
        if (approve_) _approveAndExecute(id);
        return true;
    }

    function _approveAndExecute(uint256 id) internal {
        Execution storage e = _executions[id];
        e.approved = true;
        (bool ok,) = e.to.call{value: e.value}(e.data);
        if (ok) {
            e.executed = true;
            emit Executed(id, e.to, e.value, e.data);
        } else {
            emit ExecutionFailed(id, e.to, e.value, e.data);
        }
    }

    // ---------------------------------------------------------------------
    // ERC-735
    // ---------------------------------------------------------------------

    function getClaim(bytes32 claimId)
        external
        view
        returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri)
    {
        Claim storage c = _claims[claimId];
        return (c.topic, c.scheme, c.issuer, c.signature, c.data, c.uri);
    }

    function getClaimIdsByTopic(uint256 topic) external view returns (bytes32[] memory claimIds) {
        return _claimsByTopic[topic];
    }

    function addClaim(
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes calldata signature,
        bytes calldata data,
        string calldata uri
    ) external onlyClaimManager returns (bytes32 claimRequestId) {
        bytes32 claimId = keccak256(abi.encode(issuer, topic));
        bool isNew = _claims[claimId].issuer == address(0);

        Claim storage c = _claims[claimId];
        c.topic = topic;
        c.scheme = scheme;
        c.issuer = issuer;
        c.signature = signature;
        c.data = data;
        c.uri = uri;

        if (isNew) {
            _claimsByTopic[topic].push(claimId);
            emit ClaimAdded(claimId, topic, scheme, issuer, signature, data, uri);
        } else {
            emit ClaimChanged(claimId, topic, scheme, issuer, signature, data, uri);
        }
        return claimId;
    }

    function removeClaim(bytes32 claimId) external returns (bool success) {
        Claim storage c = _claims[claimId];
        if (c.issuer == address(0)) revert ClaimDoesNotExist(claimId);

        // Issuer may always retract its own claim; otherwise a CLAIM/MANAGEMENT key is required.
        if (msg.sender != c.issuer) {
            bytes32 senderKey = keccak256(abi.encode(msg.sender));
            if (!keyHasPurpose(senderKey, ClaimTopicsLib.PURPOSE_CLAIM)) revert NotAuthorized(msg.sender);
        }

        uint256 topic = c.topic;
        bytes32[] storage byTopic = _claimsByTopic[topic];
        uint256 len = byTopic.length;
        for (uint256 i = 0; i < len; i++) {
            if (byTopic[i] == claimId) {
                byTopic[i] = byTopic[len - 1];
                byTopic.pop();
                break;
            }
        }

        emit ClaimRemoved(claimId, topic, c.scheme, c.issuer, c.signature, c.data, c.uri);
        delete _claims[claimId];
        return true;
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyManager() {
        if (
            msg.sender != address(this)
                && !keyHasPurpose(keccak256(abi.encode(msg.sender)), ClaimTopicsLib.PURPOSE_MANAGEMENT)
        ) revert NotAuthorized(msg.sender);
        _;
    }

    modifier onlyClaimManager() {
        if (
            msg.sender != address(this)
                && !keyHasPurpose(keccak256(abi.encode(msg.sender)), ClaimTopicsLib.PURPOSE_CLAIM)
        ) revert NotAuthorized(msg.sender);
        _;
    }

    receive() external payable {}
}
