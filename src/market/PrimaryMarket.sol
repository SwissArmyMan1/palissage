// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IWineLotToken} from "../interfaces/IWineLotToken.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

contract PrimaryMarket is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string public constant VERSION = "1.1.0";

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint16 public constant BPS_DENOMINATOR = 10000;
    uint16 public constant MAX_FEE_BPS = 1000;

    enum OfferKind {
        Standard,
        EnPrimeur
    }

    enum AllocationState {
        Reserved,
        Paid,
        Cancelled,
        Defaulted
    }

    struct Offer {
        uint256 lotId;
        address winery;
        address paymentToken;
        uint256 pricePerBottle;
        uint32 quantity;
        uint32 reserved;
        uint64 startTime;
        uint64 endTime;
        uint16 depositBps;
        uint64 fullPaymentDeadline;
        OfferKind kind;
        bool active;
    }

    struct Allocation {
        uint256 offerId;
        address buyer;
        uint32 quantity;
        uint256 pricePerBottle;
        uint256 totalDue;
        uint256 paidAmount;
        uint64 createdAt;
        AllocationState state;
    }

    struct Milestone {
        uint16 bps;
        bool released;
        string description;
    }

    error PaymentTokenNotAllowed(address token);
    error NotWinery(address caller);
    error NotLotWinery(uint256 lotId, address caller);
    error NotBuyer(address caller);
    error NotAllocationBuyer(uint256 allocationId, address caller);
    error LotNotVerified(uint256 lotId);
    error OfferNotActive(uint256 offerId);
    error OfferNotStarted(uint256 offerId);
    error OfferEnded(uint256 offerId);
    error OfferQuantityExceedsLot(uint256 lotId, uint256 requested, uint256 available);
    error InsufficientOfferQuantity(uint256 offerId, uint256 requested, uint256 available);
    error DepositsDisabled(uint256 offerId);
    error PaymentBelowDeposit(uint256 offerId, uint256 paid, uint256 minDeposit);
    error PaymentExceedsDue(uint256 allocationId, uint256 paid, uint256 due);
    error AllocationNotInState(uint256 allocationId, AllocationState expected);
    error DeadlineNotReached(uint256 allocationId, uint64 deadline);
    error PaymentDeadlinePassed(uint256 allocationId, uint64 deadline);
    error MilestonesAlreadyStarted(uint256 offerId);
    error MilestoneBpsSumInvalid(uint256 sum);
    error MilestoneAlreadyReleased(uint256 offerId, uint256 index);
    error MilestoneIndexOutOfRange(uint256 offerId, uint256 index);
    error NothingToWithdraw(uint256 offerId);
    error RefundExceedsUnreleasedEscrow(uint256 allocationId);
    error InvalidTimes();
    error InvalidBps();
    error ZeroAmount();
    error ZeroAddress();
    error PaymentAmountMismatch(uint256 expected, uint256 received);

    event PaymentTokenAllowed(address indexed token, bool allowed);
    event TreasuryUpdated(address indexed treasury);
    event PrimaryFeeUpdated(uint16 feeBps);
    event OfferCreated(
        uint256 indexed offerId,
        uint256 indexed lotId,
        address indexed winery,
        OfferKind kind,
        uint256 pricePerBottle,
        uint32 quantity
    );
    event OfferCancelled(uint256 indexed offerId);
    event MilestonesSet(uint256 indexed offerId, uint256 count);
    event MilestoneConfirmed(uint256 indexed offerId, uint256 indexed index, uint16 bps, address indexed verifier);
    event AllocationCreated(
        uint256 indexed allocationId, uint256 indexed offerId, address indexed buyer, uint32 quantity, uint256 totalDue
    );
    event AllocationPayment(uint256 indexed allocationId, uint256 amount, uint256 paidAmount);
    event AllocationFullyPaid(uint256 indexed allocationId, uint256 indexed lotId, address indexed buyer, uint32 quantity);
    event AllocationCancelled(uint256 indexed allocationId, uint256 refunded);
    event AllocationDefaulted(uint256 indexed allocationId, uint256 forfeited);
    event ReleasedWithdrawn(uint256 indexed offerId, address indexed winery, uint256 gross, uint256 fee);

    IWineLotToken public immutable wineLotToken;
    IIdentityRegistry public immutable identityRegistry;

    address public treasury;
    uint16 public primaryFeeBps = 300;

    mapping(address => bool) public allowedPaymentTokens;

    mapping(uint256 => Offer) public offers;
    uint256 public offerCount;

    mapping(uint256 => Allocation) public allocations;
    uint256 public allocationCount;

    mapping(uint256 => Milestone[]) private _milestones;

    mapping(uint256 => uint256) public releasedBps;

    mapping(uint256 => bool) public milestonesLocked;

    // Escrow backing active allocations only.
    mapping(uint256 => uint256) public settledFunds;

    // Gross withdrawals include protocol fees.
    mapping(uint256 => uint256) public withdrawnGross;

    mapping(uint256 => uint256) public offeredPerLot;

    constructor(address admin, IWineLotToken token, IIdentityRegistry registry, address treasury_) {
        if (address(token) == address(0) || address(registry) == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        wineLotToken = token;
        identityRegistry = registry;
        treasury = treasury_;
    }

    function setPaymentTokenAllowed(address token, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        allowedPaymentTokens[token] = allowed;
        emit PaymentTokenAllowed(token, allowed);
    }

    function setTreasury(address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setPrimaryFeeBps(uint16 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert InvalidBps();
        primaryFeeBps = feeBps;
        emit PrimaryFeeUpdated(feeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function createOffer(
        uint256 lotId,
        address paymentToken,
        uint256 pricePerBottle,
        uint32 quantity,
        uint64 startTime,
        uint64 endTime,
        uint16 depositBps,
        uint64 fullPaymentDeadline,
        OfferKind kind
    ) external whenNotPaused returns (uint256 offerId) {
        if (!identityRegistry.hasValidClaim(msg.sender, ClaimTopicsLib.TOPIC_WINERY)) revert NotWinery(msg.sender);
        if (!allowedPaymentTokens[paymentToken]) revert PaymentTokenNotAllowed(paymentToken);
        if (pricePerBottle == 0 || quantity == 0) revert ZeroAmount();
        if (endTime <= startTime || fullPaymentDeadline < endTime) revert InvalidTimes();
        if (depositBps >= BPS_DENOMINATOR) revert InvalidBps();

        IWineLotToken.WineLot memory lot = wineLotToken.getLot(lotId);
        if (lot.winery != msg.sender) revert NotLotWinery(lotId, msg.sender);
        if (lot.status != IWineLotToken.LotStatus.Verified) revert LotNotVerified(lotId);

        if (kind == OfferKind.EnPrimeur && lot.production >= IWineLotToken.ProductionStatus.Bottled) {
            revert InvalidTimes();
        }

        uint256 available = uint256(lot.totalBottles) - offeredPerLot[lotId];
        if (quantity > available) revert OfferQuantityExceedsLot(lotId, quantity, available);
        offeredPerLot[lotId] += quantity;

        offerId = ++offerCount;
        offers[offerId] = Offer({
            lotId: lotId,
            winery: msg.sender,
            paymentToken: paymentToken,
            pricePerBottle: pricePerBottle,
            quantity: quantity,
            reserved: 0,
            startTime: startTime,
            endTime: endTime,
            depositBps: depositBps,
            fullPaymentDeadline: fullPaymentDeadline,
            kind: kind,
            active: true
        });

        emit OfferCreated(offerId, lotId, msg.sender, kind, pricePerBottle, quantity);
    }

    function cancelOffer(uint256 offerId) external {
        Offer storage offer = _activeOffer(offerId);
        if (offer.winery != msg.sender) revert NotLotWinery(offer.lotId, msg.sender);
        offer.active = false;
        offeredPerLot[offer.lotId] -= (offer.quantity - offer.reserved);
        emit OfferCancelled(offerId);
    }

    function setMilestones(uint256 offerId, uint16[] calldata bps, string[] calldata descriptions) external {
        Offer storage offer = _activeOffer(offerId);
        if (offer.winery != msg.sender) revert NotLotWinery(offer.lotId, msg.sender);

        // Keep the schedule locked even if all reservations are later cancelled.
        if (milestonesLocked[offerId]) revert MilestonesAlreadyStarted(offerId);
        if (bps.length == 0 || bps.length != descriptions.length) revert MilestoneBpsSumInvalid(0);

        delete _milestones[offerId];
        uint256 sum;
        for (uint256 i = 0; i < bps.length; i++) {
            sum += bps[i];
            _milestones[offerId].push(Milestone({bps: bps[i], released: false, description: descriptions[i]}));
        }
        if (sum != BPS_DENOMINATOR) revert MilestoneBpsSumInvalid(sum);
        emit MilestonesSet(offerId, bps.length);
    }

    /// @notice Deposits reserve bottles; tokens are minted only after full payment.
    function reserve(uint256 offerId, uint32 quantity, uint256 payNow)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 allocationId)
    {
        Offer storage offer = _activeOffer(offerId);
        if (!identityRegistry.hasValidClaim(msg.sender, ClaimTopicsLib.TOPIC_B2B_BUYER)) revert NotBuyer(msg.sender);
        if (!allowedPaymentTokens[offer.paymentToken]) revert PaymentTokenNotAllowed(offer.paymentToken);
        if (block.timestamp < offer.startTime) revert OfferNotStarted(offerId);
        if (block.timestamp > offer.endTime) revert OfferEnded(offerId);
        if (quantity == 0) revert ZeroAmount();

        uint256 available = offer.quantity - offer.reserved;
        if (quantity > available) revert InsufficientOfferQuantity(offerId, quantity, available);

        _requireVerifiedLot(offer.lotId);

        uint256 totalDue = uint256(quantity) * offer.pricePerBottle;
        bool fullPayment = payNow == totalDue;
        if (!fullPayment) {
            if (offer.depositBps == 0) revert DepositsDisabled(offerId);
            uint256 minDeposit = Math.mulDiv(totalDue, offer.depositBps, BPS_DENOMINATOR, Math.Rounding.Ceil);
            if (payNow < minDeposit || payNow > totalDue) revert PaymentBelowDeposit(offerId, payNow, minDeposit);
        }

        if (_milestones[offerId].length == 0) {
            _milestones[offerId].push(
                Milestone({bps: BPS_DENOMINATOR, released: false, description: "Full release on delivery readiness"})
            );
            emit MilestonesSet(offerId, 1);
        }

        milestonesLocked[offerId] = true;

        offer.reserved += quantity;

        allocationId = ++allocationCount;
        allocations[allocationId] = Allocation({
            offerId: offerId,
            buyer: msg.sender,
            quantity: quantity,
            pricePerBottle: offer.pricePerBottle,
            totalDue: totalDue,
            paidAmount: payNow,
            createdAt: uint64(block.timestamp),
            state: fullPayment ? AllocationState.Paid : AllocationState.Reserved
        });

        settledFunds[offerId] += payNow;
        _collectPayment(offer.paymentToken, payNow);

        emit AllocationCreated(allocationId, offerId, msg.sender, quantity, totalDue);
        emit AllocationPayment(allocationId, payNow, payNow);

        if (fullPayment) {
            wineLotToken.mint(msg.sender, offer.lotId, quantity);
            emit AllocationFullyPaid(allocationId, offer.lotId, msg.sender, quantity);
        }
    }

    function payRemainder(uint256 allocationId, uint256 amount) external whenNotPaused nonReentrant {
        Allocation storage allocation = allocations[allocationId];
        if (allocation.state != AllocationState.Reserved) {
            revert AllocationNotInState(allocationId, AllocationState.Reserved);
        }
        if (allocation.buyer != msg.sender) revert NotAllocationBuyer(allocationId, msg.sender);
        if (amount == 0) revert ZeroAmount();

        uint256 remaining = allocation.totalDue - allocation.paidAmount;
        if (amount > remaining) revert PaymentExceedsDue(allocationId, amount, remaining);

        Offer storage offer = offers[allocation.offerId];
        if (!allowedPaymentTokens[offer.paymentToken]) revert PaymentTokenNotAllowed(offer.paymentToken);

        _requireVerifiedLot(offer.lotId);

        if (block.timestamp > offer.fullPaymentDeadline) {
            revert PaymentDeadlinePassed(allocationId, offer.fullPaymentDeadline);
        }
        allocation.paidAmount += amount;
        settledFunds[allocation.offerId] += amount;
        _collectPayment(offer.paymentToken, amount);

        emit AllocationPayment(allocationId, amount, allocation.paidAmount);

        if (allocation.paidAmount == allocation.totalDue) {
            allocation.state = AllocationState.Paid;
            wineLotToken.mint(msg.sender, offer.lotId, allocation.quantity);
            emit AllocationFullyPaid(allocationId, offer.lotId, msg.sender, allocation.quantity);
        }
    }

    function cancelAllocation(uint256 allocationId) external nonReentrant {
        Allocation storage allocation = allocations[allocationId];
        if (allocation.state != AllocationState.Reserved) {
            revert AllocationNotInState(allocationId, AllocationState.Reserved);
        }
        Offer storage offer = offers[allocation.offerId];
        if (msg.sender != offer.winery && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotLotWinery(offer.lotId, msg.sender);
        }

        uint256 refund = allocation.paidAmount;
        uint256 offerId = allocation.offerId;
        uint256 newSettled = settledFunds[offerId] - refund;

        // A refund must preserve the remaining allocations' milestone entitlement.
        if ((newSettled * releasedBps[offerId]) / BPS_DENOMINATOR < withdrawnGross[offerId]) {
            revert RefundExceedsUnreleasedEscrow(allocationId);
        }

        allocation.state = AllocationState.Cancelled;
        settledFunds[offerId] = newSettled;
        offer.reserved -= allocation.quantity;

        if (!offer.active) offeredPerLot[offer.lotId] -= allocation.quantity;

        IERC20(offer.paymentToken).safeTransfer(allocation.buyer, refund);
        emit AllocationCancelled(allocationId, refund);
    }

    function claimDefault(uint256 allocationId) external nonReentrant {
        Allocation storage allocation = allocations[allocationId];
        if (allocation.state != AllocationState.Reserved) {
            revert AllocationNotInState(allocationId, AllocationState.Reserved);
        }
        uint256 offerId = allocation.offerId;
        Offer storage offer = offers[offerId];
        if (msg.sender != offer.winery) revert NotLotWinery(offer.lotId, msg.sender);
        if (block.timestamp <= offer.fullPaymentDeadline) {
            revert DeadlineNotReached(allocationId, offer.fullPaymentDeadline);
        }

        // A suspended lot blocks payment, so it must also block deposit forfeiture.
        _requireVerifiedLot(offer.lotId);

        uint256 forfeited = allocation.paidAmount;
        uint256 settled = settledFunds[offerId];

        // Deduct this deposit's withdrawn share; round up to avoid charging other allocations.
        uint256 alreadyReleased =
            settled == 0 ? 0 : Math.mulDiv(withdrawnGross[offerId], forfeited, settled, Math.Rounding.Ceil);

        allocation.state = AllocationState.Defaulted;
        settledFunds[offerId] = settled - forfeited;
        withdrawnGross[offerId] -= alreadyReleased;
        offer.reserved -= allocation.quantity;

        if (!offer.active) offeredPerLot[offer.lotId] -= allocation.quantity;

        uint256 payout = forfeited - alreadyReleased;
        uint256 fee = (payout * primaryFeeBps) / BPS_DENOMINATOR;
        IERC20 paymentToken = IERC20(offer.paymentToken);
        if (fee > 0) paymentToken.safeTransfer(treasury, fee);
        paymentToken.safeTransfer(offer.winery, payout - fee);

        emit AllocationDefaulted(allocationId, forfeited);
    }

    function confirmMilestone(uint256 offerId, uint256 index) external onlyRole(VERIFIER_ROLE) {
        Milestone[] storage schedule = _milestones[offerId];

        if (index >= schedule.length) revert MilestoneIndexOutOfRange(offerId, index);
        Milestone storage milestone = schedule[index];
        if (milestone.released) revert MilestoneAlreadyReleased(offerId, index);

        uint256 released = releasedBps[offerId] + milestone.bps;

        if (released > BPS_DENOMINATOR) revert MilestoneBpsSumInvalid(released);

        milestone.released = true;
        releasedBps[offerId] = released;
        milestonesLocked[offerId] = true;
        emit MilestoneConfirmed(offerId, index, milestone.bps, msg.sender);
    }

    function withdrawReleased(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        if (offer.winery != msg.sender) revert NotLotWinery(offer.lotId, msg.sender);

        uint256 entitled = (settledFunds[offerId] * releasedBps[offerId]) / BPS_DENOMINATOR;
        uint256 withdrawn = withdrawnGross[offerId];
        if (entitled <= withdrawn) revert NothingToWithdraw(offerId);

        uint256 gross = entitled - withdrawn;
        withdrawnGross[offerId] = entitled;

        uint256 fee = (gross * primaryFeeBps) / BPS_DENOMINATOR;
        IERC20 paymentToken = IERC20(offer.paymentToken);
        if (fee > 0) paymentToken.safeTransfer(treasury, fee);
        paymentToken.safeTransfer(offer.winery, gross - fee);

        emit ReleasedWithdrawn(offerId, offer.winery, gross, fee);
    }

    function getMilestones(uint256 offerId) external view returns (Milestone[] memory milestones) {
        return _milestones[offerId];
    }

    function withdrawable(uint256 offerId) external view returns (uint256 gross) {
        uint256 entitled = (settledFunds[offerId] * releasedBps[offerId]) / BPS_DENOMINATOR;
        uint256 withdrawn = withdrawnGross[offerId];
        return entitled > withdrawn ? entitled - withdrawn : 0;
    }

    function _requireVerifiedLot(uint256 lotId) internal view {
        IWineLotToken.WineLot memory lot = wineLotToken.getLot(lotId);
        if (lot.status != IWineLotToken.LotStatus.Verified) revert LotNotVerified(lotId);
    }

    // Reject fee-on-transfer intake before crediting escrow.
    function _collectPayment(address asset, uint256 amount) private {
        IERC20 payment = IERC20(asset);
        uint256 beforeBalance = payment.balanceOf(address(this));
        payment.safeTransferFrom(msg.sender, address(this), amount);
        uint256 afterBalance = payment.balanceOf(address(this));
        uint256 received = afterBalance >= beforeBalance ? afterBalance - beforeBalance : 0;
        if (received != amount) revert PaymentAmountMismatch(amount, received);
    }

    function _activeOffer(uint256 offerId) internal view returns (Offer storage offer) {
        offer = offers[offerId];
        if (!offer.active) revert OfferNotActive(offerId);
    }
}
