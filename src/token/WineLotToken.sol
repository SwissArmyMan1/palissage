// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {IWineLotToken} from "../interfaces/IWineLotToken.sol";
import {IERC7943MultiToken} from "../interfaces/IERC7943.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

contract WineLotToken is ERC1155Supply, AccessControl, IWineLotToken {
    string public constant VERSION = "1.1.0";

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant TRANSFER_AGENT_ROLE = keccak256("TRANSFER_AGENT_ROLE");

    uint16 public constant MAX_ROYALTY_BPS = 1000;

    error LotDoesNotExist(uint256 lotId);
    error LotNotInStatus(uint256 lotId, LotStatus expected);
    error LotNotTransferable(uint256 lotId);
    error NotLotWinery(uint256 lotId, address caller);
    error NotWinery(address caller);
    error NotTransferAgent(address operator);
    error NotBurner(address operator);
    error NotMinter(address operator);
    error ProductionStatusNotForward(uint256 lotId);
    error MintExceedsTotalBottles(uint256 lotId, uint256 requested, uint256 available);
    error RoyaltyTooHigh(uint16 royaltyBps);
    error ZeroAmount();
    error ZeroAddress();
    error LotNotFullyRedeemed(uint256 lotId);
    error TransferToZeroViaForce();

    event IdentityRegistryUpdated(address indexed registry);
    event SystemAddressUpdated(address indexed account, bool isSystem);

    IIdentityRegistry public identityRegistry;

    mapping(address => bool) public isSystemAddress;

    mapping(uint256 => WineLot) private _lots;
    uint256 private _lotCount;

    mapping(address => mapping(uint256 => uint256)) private _frozenTokens;

    constructor(address admin, IIdentityRegistry identityRegistry_) ERC1155("") {
        if (address(identityRegistry_) == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        identityRegistry = identityRegistry_;
    }

    function setIdentityRegistry(IIdentityRegistry registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(registry) == address(0)) revert ZeroAddress();
        identityRegistry = registry;
        emit IdentityRegistryUpdated(address(registry));
    }

    function setSystemAddress(address account, bool isSystem) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        isSystemAddress[account] = isSystem;
        emit SystemAddressUpdated(account, isSystem);
    }

    function createLot(WineLotInput calldata input) external returns (uint256 lotId) {
        if (!identityRegistry.hasValidClaim(msg.sender, ClaimTopicsLib.TOPIC_WINERY)) revert NotWinery(msg.sender);
        if (input.totalBottles == 0) revert ZeroAmount();
        if (input.royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(input.royaltyBps);

        lotId = ++_lotCount;
        WineLot storage lot = _lots[lotId];
        lot.winery = msg.sender;
        lot.status = LotStatus.Draft;
        lot.production = ProductionStatus.Announced;
        lot.totalBottles = input.totalBottles;
        lot.vintage = input.vintage;
        lot.royaltyBps = input.royaltyBps;
        lot.bottleSizeMl = input.bottleSizeMl;
        lot.exportAllowed = input.exportAllowed;
        lot.name = input.name;
        lot.region = input.region;
        lot.grapes = input.grapes;
        lot.metadataURI = input.metadataURI;

        emit LotCreated(lotId, msg.sender, input.totalBottles, input.vintage);
    }

    function verifyLot(uint256 lotId, bytes32 docsHash) external onlyRole(VERIFIER_ROLE) {
        WineLot storage lot = _existingLot(lotId);
        if (lot.status != LotStatus.Draft) revert LotNotInStatus(lotId, LotStatus.Draft);
        lot.status = LotStatus.Verified;
        lot.docsHash = docsHash;
        lot.verifier = msg.sender;
        emit LotVerified(lotId, msg.sender, docsHash);
        emit LotStatusChanged(lotId, LotStatus.Verified);
    }

    function setProductionStatus(uint256 lotId, ProductionStatus production) external {
        WineLot storage lot = _existingLot(lotId);
        if (lot.winery != msg.sender) revert NotLotWinery(lotId, msg.sender);
        if (production <= lot.production) revert ProductionStatusNotForward(lotId);
        lot.production = production;
        emit ProductionStatusChanged(lotId, production);
    }

    function updateLotMetadata(uint256 lotId, string calldata metadataURI) external {
        WineLot storage lot = _existingLot(lotId);
        if (lot.winery != msg.sender) revert NotLotWinery(lotId, msg.sender);
        lot.metadataURI = metadataURI;
        emit LotMetadataUpdated(lotId, metadataURI);
        emit URI(metadataURI, lotId);
    }

    function suspendLot(uint256 lotId) external onlyRole(VERIFIER_ROLE) {
        WineLot storage lot = _existingLot(lotId);
        if (lot.status != LotStatus.Verified) revert LotNotInStatus(lotId, LotStatus.Verified);
        lot.status = LotStatus.Suspended;
        emit LotStatusChanged(lotId, LotStatus.Suspended);
    }

    function unsuspendLot(uint256 lotId) external onlyRole(VERIFIER_ROLE) {
        WineLot storage lot = _existingLot(lotId);
        if (lot.status != LotStatus.Suspended) revert LotNotInStatus(lotId, LotStatus.Suspended);
        lot.status = LotStatus.Verified;
        emit LotStatusChanged(lotId, LotStatus.Verified);
    }

    function closeLot(uint256 lotId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        WineLot storage lot = _existingLot(lotId);
        if (lot.mintedBottles != lot.redeemedBottles) revert LotNotFullyRedeemed(lotId);
        lot.status = LotStatus.Closed;
        emit LotStatusChanged(lotId, LotStatus.Closed);
    }

    function mint(address to, uint256 lotId, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        _mint(to, lotId, amount, "");
    }

    function burnFrom(address from, uint256 lotId, uint256 amount) external onlyRole(BURNER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        _burn(from, lotId, amount);
    }

    function canSend(address account) public view returns (bool allowed) {
        return isSystemAddress[account] || identityRegistry.isVerified(account);
    }

    function canReceive(address account) public view returns (bool allowed) {
        return isSystemAddress[account] || identityRegistry.isVerified(account);
    }

    function getFrozenTokens(address account, uint256 tokenId) public view returns (uint256 amount) {
        return _frozenTokens[account][tokenId];
    }

    function canTransfer(address from, address to, uint256 tokenId, uint256 amount)
        public
        view
        returns (bool allowed)
    {
        if (!canSend(from) || !canReceive(to)) return false;
        WineLot storage lot = _lots[tokenId];
        if (lot.winery == address(0) || lot.status != LotStatus.Verified) return false;
        return amount <= _unfrozenBalance(from, tokenId);
    }

    function setFrozenTokens(address account, uint256 tokenId, uint256 amount)
        external
        onlyRole(ENFORCER_ROLE)
        returns (bool result)
    {
        _frozenTokens[account][tokenId] = amount;
        emit Frozen(account, tokenId, amount);
        return true;
    }

    /// @notice Bypasses holder consent and lot status; receiver eligibility still applies.
    function forcedTransfer(address from, address to, uint256 tokenId, uint256 amount)
        external
        onlyRole(ENFORCER_ROLE)
        returns (bool result)
    {
        // Zero endpoints would bypass mint/burn authorization and supply accounting.
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert TransferToZeroViaForce();
        if (amount == 0) revert ZeroAmount();
        if (_lots[tokenId].winery == address(0)) revert LotDoesNotExist(tokenId);
        if (!canReceive(to)) revert ERC7943CannotReceive(to);

        uint256 balance = balanceOf(from, tokenId);
        uint256 unfrozen = _unfrozenBalance(from, tokenId);
        if (amount > unfrozen && amount <= balance) {
            // ERC-7943 enforcement unfreezes only the amount needed.
            uint256 newFrozen = balance - amount;
            _frozenTokens[from][tokenId] = newFrozen;
            emit Frozen(from, tokenId, newFrozen);
        }

        uint256[] memory ids = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        ids[0] = tokenId;
        values[0] = amount;

        super._update(from, to, ids, values);

        emit ForcedTransfer(from, to, tokenId, amount);
        return true;
    }

    function getLot(uint256 lotId) external view returns (WineLot memory lot) {
        return _lots[lotId];
    }

    function lotExists(uint256 lotId) public view returns (bool exists) {
        return _lots[lotId].winery != address(0);
    }

    function lotCount() external view returns (uint256 count) {
        return _lotCount;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _lots[tokenId].metadataURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC7943MultiToken).interfaceId || super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        address operator = _msgSender();
        uint256 len = ids.length;

        for (uint256 i = 0; i < len; i++) {
            uint256 id = ids[i];
            uint256 amount = values[i];
            WineLot storage lot = _lots[id];
            if (lot.winery == address(0)) revert LotDoesNotExist(id);

            if (from == address(0)) {
                if (!hasRole(MINTER_ROLE, operator)) revert NotMinter(operator);
                if (lot.status != LotStatus.Verified) revert LotNotInStatus(id, LotStatus.Verified);
                if (!canReceive(to)) revert ERC7943CannotReceive(to);
                // The cap counts all mints; redemption never restores capacity.
                uint256 available = lot.totalBottles - lot.mintedBottles;
                if (amount > available) revert MintExceedsTotalBottles(id, amount, available);
                lot.mintedBottles += uint32(amount);
            } else if (to == address(0)) {
                if (!hasRole(BURNER_ROLE, operator)) revert NotBurner(operator);
                uint256 unfrozen = _unfrozenBalance(from, id);
                if (amount > unfrozen) revert ERC7943InsufficientUnfrozenBalance(from, id, amount, unfrozen);
                lot.redeemedBottles += uint32(amount);
            } else {
                if (!hasRole(TRANSFER_AGENT_ROLE, operator)) revert NotTransferAgent(operator);
                if (!canSend(from)) revert ERC7943CannotSend(from);
                if (!canReceive(to)) revert ERC7943CannotReceive(to);
                if (lot.status != LotStatus.Verified) revert LotNotTransferable(id);
                uint256 unfrozen = _unfrozenBalance(from, id);
                if (amount > unfrozen) revert ERC7943InsufficientUnfrozenBalance(from, id, amount, unfrozen);
            }
        }

        super._update(from, to, ids, values);
    }

    function _unfrozenBalance(address account, uint256 tokenId) internal view returns (uint256) {
        uint256 balance = balanceOf(account, tokenId);
        uint256 frozen = _frozenTokens[account][tokenId];
        return balance > frozen ? balance - frozen : 0;
    }

    function _existingLot(uint256 lotId) internal view returns (WineLot storage lot) {
        lot = _lots[lotId];
        if (lot.winery == address(0)) revert LotDoesNotExist(lotId);
    }
}
