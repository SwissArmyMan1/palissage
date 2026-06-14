// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

import {IWineLotToken} from "../interfaces/IWineLotToken.sol";

/// @title RedemptionManager - burns lot tokens against physical delivery.
/// @notice Tokens are escrowed at request time, the winery attaches shipment documents,
///         and the buyer (or a verifier, as dispute fallback) confirms delivery, which
///         burns the tokens and updates the lot's redeemed counter.
contract RedemptionManager is AccessControl, ReentrancyGuard, ERC1155Holder, EIP712 {
    using SignatureChecker for address;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @dev EIP-712 typehash for a buyer's authorization to recover their escrow to a new wallet.
    bytes32 private constant RECOVER_TYPEHASH =
        keccak256("RecoverEscrow(uint256 redemptionId,address newWallet,uint256 deadline)");

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
    error RecoveryAuthExpired(uint256 deadline);
    error InvalidRecoveryAuth(uint256 redemptionId, address newWallet);
    error ZeroAmount();
    error ZeroAddress();

    event RedemptionRequested(
        uint256 indexed redemptionId, uint256 indexed lotId, address indexed buyer, uint32 quantity, bytes32 deliveryDataHash
    );
    event RedemptionShipped(uint256 indexed redemptionId, bytes32 shipmentDocsHash);
    event Redeemed(uint256 indexed redemptionId, uint256 indexed lotId, address indexed buyer, uint32 quantity);
    event RedemptionCancelled(uint256 indexed redemptionId);
    event RedemptionRefunded(uint256 indexed redemptionId, address indexed resolver);
    event RedemptionRecovered(uint256 indexed redemptionId, address indexed newWallet, address indexed resolver);

    IWineLotToken public immutable wineLotToken;

    mapping(uint256 => Redemption) public redemptions;
    uint256 public redemptionCount;

    constructor(address admin, IWineLotToken token) EIP712("Palissage RedemptionManager", "1") {
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

    /// @notice Dispute fallback: a verifier resolves a failed delivery by returning the
    ///         escrowed tokens to the buyer. Callable while the redemption is still open
    ///         (Requested or Shipped) - in particular after `markShipped`, where the buyer
    ///         can otherwise neither cancel nor recover the escrowed tokens. This is the
    ///         symmetric counterpart to `confirmDelivery` for when the goods never arrive.
    function refundRedemption(uint256 redemptionId) external nonReentrant onlyRole(VERIFIER_ROLE) {
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested && redemption.state != RedemptionState.Shipped) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Shipped);
        }

        redemption.state = RedemptionState.Cancelled;
        _returnEscrow(redemption.buyer, redemption.lotId, redemption.quantity);

        emit RedemptionRefunded(redemptionId, msg.sender);
    }

    /// @notice Dispute fallback for when the buyer has lost transfer eligibility after escrowing.
    ///         `refundRedemption`/`cancelRedemption` return tokens to the original buyer, but the
    ///         escrow return runs through `forcedTransfer`, which still enforces `canReceive` on the
    ///         destination. If the buyer's identity was revoked while tokens sat in escrow, those
    ///         paths revert and the only remaining resolution would be `confirmDelivery` (an
    ///         irreversible burn forcing physical delivery). This lets a verifier instead return the
    ///         escrow to a new, compliant wallet the buyer designates offchain, so restricted tokens
    ///         are never trapped yet never land on a non-compliant holder (`canReceive(newWallet)`
    ///         is enforced inside `forcedTransfer`). Callable while the redemption is still open.
    ///
    ///         The verifier only executes; it cannot choose the destination. `newWallet` must be
    ///         authorized by the original buyer through an EIP-712 `RecoverEscrow` signature (the
    ///         buyer keeps signing power even after their identity is revoked), which binds the
    ///         redemption, the destination and an expiry. This prevents a compromised verifier from
    ///         diverting escrowed tokens to a wallet of its own choosing. The `Cancelled` state
    ///         transition makes each authorization single-use per redemption.
    function recoverEscrow(uint256 redemptionId, address newWallet, uint256 deadline, bytes calldata buyerSig)
        external
        nonReentrant
        onlyRole(VERIFIER_ROLE)
    {
        if (newWallet == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert RecoveryAuthExpired(deadline);
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested && redemption.state != RedemptionState.Shipped) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Shipped);
        }

        bytes32 digest = recoveryDigest(redemptionId, newWallet, deadline);
        if (!redemption.buyer.isValidSignatureNow(digest, buyerSig)) {
            revert InvalidRecoveryAuth(redemptionId, newWallet);
        }

        redemption.state = RedemptionState.Cancelled;
        _returnEscrow(newWallet, redemption.lotId, redemption.quantity);

        emit RedemptionRecovered(redemptionId, newWallet, msg.sender);
    }

    /// @notice EIP-712 digest the buyer signs to authorize `recoverEscrow` to `newWallet`.
    ///         Exposed so the buyer (or the UI) can produce the authorization offchain and the
    ///         verifier can verify it before submitting.
    function recoveryDigest(uint256 redemptionId, address newWallet, uint256 deadline)
        public
        view
        returns (bytes32 digest)
    {
        return _hashTypedDataV4(keccak256(abi.encode(RECOVER_TYPEHASH, redemptionId, newWallet, deadline)));
    }

    /// @notice Buyer withdraws a redemption that has not been shipped yet; tokens return.
    function cancelRedemption(uint256 redemptionId) external nonReentrant {
        Redemption storage redemption = redemptions[redemptionId];
        if (redemption.state != RedemptionState.Requested) {
            revert RedemptionNotInState(redemptionId, RedemptionState.Requested);
        }
        if (redemption.buyer != msg.sender) revert NotRedemptionBuyer(redemptionId, msg.sender);

        redemption.state = RedemptionState.Cancelled;
        _returnEscrow(redemption.buyer, redemption.lotId, redemption.quantity);

        emit RedemptionCancelled(redemptionId);
    }

    /// @dev Returns escrowed tokens to the buyer via `forcedTransfer` rather than the standard
    ///      transfer path. A refund/cancel must remain possible exactly when delivery disputes
    ///      arise - including after the verifier has suspended the lot - and the standard path
    ///      reverts on a non-Verified lot (`LotNotTransferable`). `forcedTransfer` bypasses the
    ///      lot-status and transfer-agent restrictions (mirroring `confirmDelivery`'s burn path,
    ///      which also ignores lot status) while still enforcing `canReceive(buyer)`, so the
    ///      escrow is never trapped by a suspension yet restricted tokens are never pushed onto
    ///      a non-compliant holder. Requires the manager to hold ENFORCER_ROLE on the token.
    function _returnEscrow(address buyer, uint256 lotId, uint32 quantity) internal {
        wineLotToken.forcedTransfer(address(this), buyer, lotId, quantity);
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
