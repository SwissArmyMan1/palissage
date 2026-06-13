// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import {IWineLotToken} from "../interfaces/IWineLotToken.sol";

/// @title RedemptionManager — burns lot tokens against physical delivery.
/// @notice Tokens are escrowed at request time, the winery attaches shipment documents,
///         and the buyer (or a verifier, as dispute fallback) confirms delivery, which
///         burns the tokens and updates the lot's redeemed counter.
contract RedemptionManager is AccessControl, ReentrancyGuard, ERC1155Holder {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum RedemptionState {
        Requested,
        Shipped,
        Completed,
        Cancelled
    }

    struct Redemption {
        address buyer;
        uint256 lotId;
        uint32 quantity;
        bytes32 deliveryDataHash; // hash of offchain delivery data (address, incoterms, contacts)
        bytes32 shipmentDocsHash; // hash of shipping documents, set by the winery
        uint64 requestedAt;
        RedemptionState state;
    }

    error LotNotReadyForDelivery(uint256 lotId);
    error NotLotWinery(uint256 lotId, address caller);
    error NotRedemptionBuyer(uint256 redemptionId, address caller);
    error NotBuyerOrVerifier(uint256 redemptionId, address caller);
    error RedemptionNotInState(uint256 redemptionId, RedemptionState expected);
    error BuyerConfirmRequiresShipped(uint256 redemptionId);
    error ZeroAmount();
    error ZeroAddress();

    event RedemptionRequested(
        uint256 indexed redemptionId, uint256 indexed lotId, address indexed buyer, uint32 quantity, bytes32 deliveryDataHash
    );
    event RedemptionShipped(uint256 indexed redemptionId, bytes32 shipmentDocsHash);
    event Redeemed(uint256 indexed redemptionId, uint256 indexed lotId, address indexed buyer, uint32 quantity);
    event RedemptionCancelled(uint256 indexed redemptionId);

    IWineLotToken public immutable wineLotToken;

    mapping(uint256 => Redemption) public redemptions;
    uint256 public redemptionCount;

    constructor(address admin, IWineLotToken token) {
        if (address(token) == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        wineLotToken = token;
    }

    /// @notice Escrows `quantity` lot tokens and opens a redemption for physical delivery.
    function requestRedemption(uint256 lotId, uint32 quantity, bytes32 deliveryDataHash)
        external
        nonReentrant
        returns (uint256 redemptionId)
    {
        if (quantity == 0) revert ZeroAmount();
        IWineLotToken.WineLot memory lot = wineLotToken.getLot(lotId);
        if (lot.production != IWineLotToken.ProductionStatus.ReadyForDelivery) revert LotNotReadyForDelivery(lotId);

        redemptionId = ++redemptionCount;
        redemptions[redemptionId] = Redemption({
            buyer: msg.sender,
            lotId: lotId,
            quantity: quantity,
            deliveryDataHash: deliveryDataHash,
            shipmentDocsHash: bytes32(0),
            requestedAt: uint64(block.timestamp),
            state: RedemptionState.Requested
        });

        wineLotToken.safeTransferFrom(msg.sender, address(this), lotId, quantity, "");

        emit RedemptionRequested(redemptionId, lotId, msg.sender, quantity, deliveryDataHash);
    }

    /// @notice Winery attaches shipment documents once the bottles leave the warehouse.
    function markShipped(uint256 redemptionId, bytes32 shipmentDocsHash) external {
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Requested);
        }
        IWineLotToken.WineLot memory lot = wineLotToken.getLot(redemption.lotId);
        if (lot.winery != msg.sender) revert NotLotWinery(redemption.lotId, msg.sender);

        redemption.state = RedemptionState.Shipped;
        redemption.shipmentDocsHash = shipmentDocsHash;
        emit RedemptionShipped(redemptionId, shipmentDocsHash);
    }

    /// @notice Burns the escrowed tokens, completing the redemption. Callable by the
    ///         buyer after shipment, or by a verifier at any open stage (dispute fallback).
    function confirmDelivery(uint256 redemptionId) external nonReentrant {
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested && redemption.state != RedemptionState.Shipped) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Shipped);
        }

        bool isVerifier = hasRole(VERIFIER_ROLE, msg.sender);
        if (!isVerifier && msg.sender != redemption.buyer) revert NotBuyerOrVerifier(redemptionId, msg.sender);
        if (!isVerifier && redemption.state != RedemptionState.Shipped) {
            revert BuyerConfirmRequiresShipped(redemptionId);
        }

        redemption.state = RedemptionState.Completed;
        wineLotToken.burnFrom(address(this), redemption.lotId, redemption.quantity);

        emit Redeemed(redemptionId, redemption.lotId, redemption.buyer, redemption.quantity);
    }

    /// @notice Buyer withdraws a redemption that has not been shipped yet; tokens return.
    function cancelRedemption(uint256 redemptionId) external nonReentrant {
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Requested);
        }
        if (redemption.buyer != msg.sender) revert NotRedemptionBuyer(redemptionId, msg.sender);

        redemption.state = RedemptionState.Cancelled;
        wineLotToken.safeTransferFrom(address(this), redemption.buyer, redemption.lotId, redemption.quantity, "");

        emit RedemptionCancelled(redemptionId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
