// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {WineLotToken} from "../token/WineLotToken.sol";
import {PrimaryMarket} from "../market/PrimaryMarket.sol";
import {SecondaryMarket} from "../market/SecondaryMarket.sol";
import {RedemptionManager} from "../redemption/RedemptionManager.sol";
import {IdentityRegistry} from "../identity/IdentityRegistry.sol";
import {RoleGateway} from "../identity/RoleGateway.sol";
import {IWineLotToken} from "../interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @title PalissageLens - read-only projection of the protocol state for the interface.
/// @notice Bundles the reads a screen needs into one call and adds the derived values the
///         interface must never invent for itself (offer phase, remaining balance, transferable
///         amount, permissions per contract).
/// @dev `view` only, no storage beyond the six immutable addresses, no roles, holds no funds.
///      Nothing in the protocol depends on it.
contract PalissageLens {
    string public constant VERSION = "1.0.0-mvp";

    /// @notice Maximum records returned by one paginated call.
    uint256 public constant MAX_LIMIT = 50;
    /// @notice Ids examined per call. Not a cap on the collection - continue with `nextCursor`.
    uint256 public constant MAX_SCAN = 500;
    /// @notice Maximum lot ids accepted by {positions} in one call.
    uint256 public constant MAX_POSITION_IDS = 50;

    /// @dev Same values the protocol contracts expose, hashed here to save ten external calls.
    bytes32 private constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 private constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 private constant DEFAULT_ADMIN_ROLE = bytes32(0);

    /// @dev Entity kinds used by {EntityNotFound}: 0 Lot, 1 Offer, 2 Allocation, 3 Listing,
    ///      4 Redemption.
    uint8 private constant KIND_LOT = 0;
    uint8 private constant KIND_OFFER = 1;
    uint8 private constant KIND_ALLOCATION = 2;
    uint8 private constant KIND_LISTING = 3;
    uint8 private constant KIND_REDEMPTION = 4;

    error ZeroAddress();
    error InvalidPageLimit();
    error TooManyPositionIds(uint256 count);
    error EntityNotFound(uint8 kind, uint256 id);

    // ---------------------------------------------------------------------
    // Views returned to the interface
    // ---------------------------------------------------------------------

    struct LotView {
        uint256 id;
        address winery;
        uint8 status;
        uint8 production;
        uint32 totalBottles;
        uint32 mintedBottles;
        uint32 redeemedBottles;
        uint16 vintage;
        uint16 royaltyBps;
        uint32 bottleSizeMl;
        bool exportAllowed;
        address verifier;
        bytes32 docsHash;
        string name;
        string region;
        string grapes;
        string metadataURI;
        /// @dev Bottles committed to active primary offers.
        uint256 offeredBottles;
        /// @dev ERC-1155 supply in circulation right now (minted minus redeemed).
        uint256 circulating;
    }

    struct OfferView {
        uint256 id;
        uint256 lotId;
        address winery;
        address paymentToken;
        uint256 pricePerBottle;
        uint32 quantity;
        uint32 reserved;
        uint32 available;
        uint64 startTime;
        uint64 endTime;
        uint16 depositBps;
        uint64 fullPaymentDeadline;
        uint8 kind;
        bool active;
        /// @dev 0 Scheduled, 1 Open, 2 SoldOut, 3 Ended, 4 Cancelled.
        uint8 phase;
    }

    struct AllocationView {
        uint256 id;
        uint256 offerId;
        uint256 lotId;
        address buyer;
        address paymentToken;
        uint32 quantity;
        uint256 pricePerBottle;
        uint256 totalDue;
        uint256 paidAmount;
        uint256 remaining;
        uint64 createdAt;
        uint8 state;
        uint64 fullPaymentDeadline;
        bool overdue;
    }

    struct ListingView {
        uint256 id;
        address seller;
        uint256 lotId;
        uint32 quantity;
        uint256 pricePerBottle;
        address paymentToken;
        bool active;
        uint256 sellerBalance;
        uint256 sellerTransferable;
        bool sellerApproved;
        uint16 royaltyBps;
        uint16 feeBps;
        bool lotVerified;
    }

    struct RedemptionView {
        uint256 id;
        address buyer;
        uint256 lotId;
        uint32 quantity;
        bytes32 deliveryDataHash;
        bytes32 shipmentDocsHash;
        uint64 requestedAt;
        uint8 state;
        address winery;
        uint8 lotProduction;
    }

    struct PositionView {
        uint256 lotId;
        uint256 balance;
        uint256 frozen;
        uint256 transferable;
    }

    struct MilestoneView {
        uint16 bps;
        bool released;
        string description;
    }

    struct SettlementView {
        uint256 offerId;
        address winery;
        address paymentToken;
        uint256 settledFunds;
        uint256 withdrawnGross;
        uint256 releasedBps;
        uint256 withdrawable;
        uint16 primaryFeeBps;
        MilestoneView[] milestones;
    }

    struct ParticipantView {
        address wallet;
        address identity;
        uint8 gatewayRole;
        uint16 country;
        bool registered;
        bool isVerified;
        bool kyc;
        bool kyb;
        bool wineryClaim;
        bool b2bClaim;
        bool tokenVerifier;
        bool tokenEnforcer;
        bool tokenAdmin;
        bool primaryVerifier;
        bool primaryPauser;
        bool secondaryPauser;
        bool redemptionVerifier;
        bool primaryAdmin;
        bool gatewayAdmin;
        bool gatewayOwner;
        bool canSend;
        bool canReceive;
    }

    struct ProtocolView {
        uint256 chainId;
        string version;
        address wineLotToken;
        address primaryMarket;
        address secondaryMarket;
        address redemptionManager;
        address identityRegistry;
        address trustedIssuersRegistry;
        address roleGateway;
        uint16 primaryFeeBps;
        uint16 secondaryFeeBps;
        address primaryTreasury;
        address secondaryTreasury;
        bool primaryPaused;
        bool secondaryPaused;
        bool testMode;
        uint256 lotCount;
        uint256 offerCount;
        uint256 allocationCount;
        uint256 listingCount;
        uint256 redemptionCount;
        address paymentToken;
        uint8 paymentDecimals;
        string paymentSymbol;
        bool paymentAllowedPrimary;
        bool paymentAllowedSecondary;
        bool paymentMetadataOk;
    }

    // ---------------------------------------------------------------------
    // Immutable wiring
    // ---------------------------------------------------------------------

    WineLotToken public immutable token;
    PrimaryMarket public immutable primary;
    SecondaryMarket public immutable secondary;
    RedemptionManager public immutable redemptionManager;
    IdentityRegistry public immutable registry;
    RoleGateway public immutable gateway;

    constructor(
        WineLotToken token_,
        PrimaryMarket primary_,
        SecondaryMarket secondary_,
        RedemptionManager redemption_,
        IdentityRegistry registry_,
        RoleGateway gateway_
    ) {
        if (
            address(token_) == address(0) || address(primary_) == address(0) || address(secondary_) == address(0)
                || address(redemption_) == address(0) || address(registry_) == address(0)
                || address(gateway_) == address(0)
        ) revert ZeroAddress();
        token = token_;
        primary = primary_;
        secondary = secondary_;
        redemptionManager = redemption_;
        registry = registry_;
        gateway = gateway_;
    }

    // ---------------------------------------------------------------------
    // Environment and participants
    // ---------------------------------------------------------------------

    /// @notice One call describing the deployment: fees, treasuries, pauses, counters and the
    ///         payment token as both markets actually see it.
    /// @param paymentToken Token the interface pays with; unreadable metadata gives
    ///        `paymentMetadataOk == false`.
    function protocol(address paymentToken) external view returns (ProtocolView memory view_) {
        view_.chainId = block.chainid;
        view_.version = VERSION;
        view_.wineLotToken = address(token);
        view_.primaryMarket = address(primary);
        view_.secondaryMarket = address(secondary);
        view_.redemptionManager = address(redemptionManager);
        view_.identityRegistry = address(registry);
        view_.trustedIssuersRegistry = address(registry.trustedIssuersRegistry());
        view_.roleGateway = address(gateway);

        view_.primaryFeeBps = primary.primaryFeeBps();
        view_.secondaryFeeBps = secondary.secondaryFeeBps();
        view_.primaryTreasury = primary.treasury();
        view_.secondaryTreasury = secondary.treasury();
        view_.primaryPaused = primary.paused();
        view_.secondaryPaused = secondary.paused();
        view_.testMode = gateway.testMode();

        view_.lotCount = token.lotCount();
        view_.offerCount = primary.offerCount();
        view_.allocationCount = primary.allocationCount();
        view_.listingCount = secondary.listingCount();
        view_.redemptionCount = redemptionManager.redemptionCount();

        view_.paymentToken = paymentToken;
        view_.paymentAllowedPrimary = paymentToken != address(0) && primary.allowedPaymentTokens(paymentToken);
        view_.paymentAllowedSecondary = paymentToken != address(0) && secondary.allowedPaymentTokens(paymentToken);
        (view_.paymentDecimals, view_.paymentSymbol, view_.paymentMetadataOk) = _paymentMetadata(paymentToken);
    }

    /// @notice Everything that decides what one wallet may do: registry state, gateway role,
    ///         claims and the role held on each individual contract.
    /// @dev The three verifier roles sit on three contracts and are independent of each other.
    function participant(address wallet) external view returns (ParticipantView memory view_) {
        view_.wallet = wallet;
        view_.identity = address(registry.identityOf(wallet));
        view_.registered = view_.identity != address(0);
        view_.country = registry.countryOf(wallet);
        RoleGateway.Role gatewayRole = gateway.roleOf(wallet);
        view_.gatewayRole = uint8(gatewayRole);
        view_.gatewayAdmin = gatewayRole == RoleGateway.Role.Admin;
        view_.gatewayOwner = gateway.owner() == wallet;

        view_.isVerified = registry.isVerified(wallet);
        view_.kyc = registry.hasValidClaim(wallet, ClaimTopicsLib.TOPIC_KYC);
        view_.kyb = registry.hasValidClaim(wallet, ClaimTopicsLib.TOPIC_KYB);
        view_.wineryClaim = registry.hasValidClaim(wallet, ClaimTopicsLib.TOPIC_WINERY);
        view_.b2bClaim = registry.hasValidClaim(wallet, ClaimTopicsLib.TOPIC_B2B_BUYER);

        view_.tokenVerifier = _hasRole(address(token), VERIFIER_ROLE, wallet);
        view_.tokenEnforcer = _hasRole(address(token), ENFORCER_ROLE, wallet);
        view_.tokenAdmin = _hasRole(address(token), DEFAULT_ADMIN_ROLE, wallet);
        view_.primaryVerifier = _hasRole(address(primary), VERIFIER_ROLE, wallet);
        view_.primaryPauser = _hasRole(address(primary), PAUSER_ROLE, wallet);
        view_.primaryAdmin = _hasRole(address(primary), DEFAULT_ADMIN_ROLE, wallet);
        view_.secondaryPauser = _hasRole(address(secondary), PAUSER_ROLE, wallet);
        view_.redemptionVerifier = _hasRole(address(redemptionManager), VERIFIER_ROLE, wallet);

        view_.canSend = token.canSend(wallet);
        view_.canReceive = token.canReceive(wallet);
    }

    // ---------------------------------------------------------------------
    // Lots
    // ---------------------------------------------------------------------

    /// @notice `exists` is separate so a missing id is not shown as an empty Draft.
    function lot(uint256 id) external view returns (bool exists, LotView memory view_) {
        exists = token.lotExists(id);
        if (!exists) return (false, view_);
        return (true, _lotView(id));
    }

    function lots(uint256 cursor, uint256 limit) external view returns (LotView[] memory items, uint256 nextCursor) {
        return _lotsFiltered(address(0), cursor, limit);
    }

    function lotsOfWinery(address winery, uint256 cursor, uint256 limit)
        external
        view
        returns (LotView[] memory items, uint256 nextCursor)
    {
        return _lotsFiltered(winery, cursor, limit);
    }

    // ---------------------------------------------------------------------
    // Offers
    // ---------------------------------------------------------------------

    function offer(uint256 id) external view returns (OfferView memory view_) {
        _requireOffer(id);
        return _offerView(id);
    }

    function offers(uint256 cursor, uint256 limit)
        external
        view
        returns (OfferView[] memory items, uint256 nextCursor)
    {
        return _offersFiltered(0, address(0), cursor, limit);
    }

    function offersOfLot(uint256 lotId, uint256 cursor, uint256 limit)
        external
        view
        returns (OfferView[] memory items, uint256 nextCursor)
    {
        return _offersFiltered(lotId, address(0), cursor, limit);
    }

    function offersOfWinery(address winery, uint256 cursor, uint256 limit)
        external
        view
        returns (OfferView[] memory items, uint256 nextCursor)
    {
        return _offersFiltered(0, winery, cursor, limit);
    }

    // ---------------------------------------------------------------------
    // Allocations
    // ---------------------------------------------------------------------

    function allocation(uint256 id) external view returns (AllocationView memory view_) {
        _requireAllocation(id);
        return _allocationView(id);
    }

    function allocationsOfBuyer(address buyer, uint256 cursor, uint256 limit)
        external
        view
        returns (AllocationView[] memory items, uint256 nextCursor)
    {
        return _allocationsFiltered(buyer, 0, cursor, limit);
    }

    function allocationsOfOffer(uint256 offerId, uint256 cursor, uint256 limit)
        external
        view
        returns (AllocationView[] memory items, uint256 nextCursor)
    {
        return _allocationsFiltered(address(0), offerId, cursor, limit);
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    function listing(uint256 id) external view returns (ListingView memory view_) {
        _requireListing(id);
        return _listingView(id);
    }

    /// @notice Only listings still open for purchase.
    function activeListings(uint256 cursor, uint256 limit)
        external
        view
        returns (ListingView[] memory items, uint256 nextCursor)
    {
        return _listingsFiltered(address(0), 0, true, cursor, limit);
    }

    /// @notice Every listing of `seller`, cancelled and sold out included. Filter on `active`.
    function listingsOfSeller(address seller, uint256 cursor, uint256 limit)
        external
        view
        returns (ListingView[] memory items, uint256 nextCursor)
    {
        return _listingsFiltered(seller, 0, false, cursor, limit);
    }

    /// @notice Every listing of `lotId`, in the same sense as {listingsOfSeller}.
    function listingsOfLot(uint256 lotId, uint256 cursor, uint256 limit)
        external
        view
        returns (ListingView[] memory items, uint256 nextCursor)
    {
        return _listingsFiltered(address(0), lotId, false, cursor, limit);
    }

    // ---------------------------------------------------------------------
    // Redemptions
    // ---------------------------------------------------------------------

    function redemption(uint256 id) external view returns (RedemptionView memory view_) {
        _requireRedemption(id);
        return _redemptionView(id);
    }

    /// @notice The operations queue: every redemption, in id order.
    function redemptions(uint256 cursor, uint256 limit)
        external
        view
        returns (RedemptionView[] memory items, uint256 nextCursor)
    {
        return _redemptionsFiltered(address(0), address(0), cursor, limit);
    }

    function redemptionsOfBuyer(address buyer, uint256 cursor, uint256 limit)
        external
        view
        returns (RedemptionView[] memory items, uint256 nextCursor)
    {
        return _redemptionsFiltered(buyer, address(0), cursor, limit);
    }

    function redemptionsOfWinery(address winery, uint256 cursor, uint256 limit)
        external
        view
        returns (RedemptionView[] memory items, uint256 nextCursor)
    {
        return _redemptionsFiltered(address(0), winery, cursor, limit);
    }

    // ---------------------------------------------------------------------
    // Positions and settlement
    // ---------------------------------------------------------------------

    /// @notice Wallet balance, frozen amount and unfrozen remainder per lot.
    /// @dev `transferable` is the unfrozen balance only - lot status, both parties' eligibility
    ///      and the operator approval still apply. Simulate the call for the real answer.
    function positions(address account, uint256[] calldata lotIds) external view returns (PositionView[] memory items) {
        uint256 count = lotIds.length;
        if (count > MAX_POSITION_IDS) revert TooManyPositionIds(count);
        items = new PositionView[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 lotId = lotIds[i];
            if (!token.lotExists(lotId)) revert EntityNotFound(KIND_LOT, lotId);
            uint256 balance = token.balanceOf(account, lotId);
            uint256 frozen = token.getFrozenTokens(account, lotId);
            items[i] = PositionView({
                lotId: lotId, balance: balance, frozen: frozen, transferable: balance > frozen ? balance - frozen : 0
            });
        }
    }

    /// @notice Escrow state of one offer: what has settled, what has been released and what the
    ///         winery may withdraw right now.
    function settlement(uint256 offerId) external view returns (SettlementView memory view_) {
        _requireOffer(offerId);
        (, address winery, address paymentToken,,,,,,,,,) = primary.offers(offerId);

        view_.offerId = offerId;
        view_.winery = winery;
        view_.paymentToken = paymentToken;
        view_.settledFunds = primary.settledFunds(offerId);
        view_.withdrawnGross = primary.withdrawnGross(offerId);
        view_.releasedBps = primary.releasedBps(offerId);
        view_.withdrawable = primary.withdrawable(offerId);
        view_.primaryFeeBps = primary.primaryFeeBps();

        PrimaryMarket.Milestone[] memory schedule = primary.getMilestones(offerId);
        MilestoneView[] memory milestones = new MilestoneView[](schedule.length);
        for (uint256 i = 0; i < schedule.length; i++) {
            milestones[i] = MilestoneView({
                bps: schedule[i].bps, released: schedule[i].released, description: schedule[i].description
            });
        }
        view_.milestones = milestones;
    }

    // ---------------------------------------------------------------------
    // Internal: single-entity projections
    // ---------------------------------------------------------------------

    function _lotView(uint256 id) internal view returns (LotView memory view_) {
        IWineLotToken.WineLot memory record = token.getLot(id);
        view_.id = id;
        view_.winery = record.winery;
        view_.status = uint8(record.status);
        view_.production = uint8(record.production);
        view_.totalBottles = record.totalBottles;
        view_.mintedBottles = record.mintedBottles;
        view_.redeemedBottles = record.redeemedBottles;
        view_.vintage = record.vintage;
        view_.royaltyBps = record.royaltyBps;
        view_.bottleSizeMl = record.bottleSizeMl;
        view_.exportAllowed = record.exportAllowed;
        view_.verifier = record.verifier;
        view_.docsHash = record.docsHash;
        view_.name = record.name;
        view_.region = record.region;
        view_.grapes = record.grapes;
        view_.metadataURI = record.metadataURI;
        view_.offeredBottles = primary.offeredPerLot(id);
        view_.circulating = token.totalSupply(id);
    }

    function _offerView(uint256 id) internal view returns (OfferView memory view_) {
        (
            uint256 lotId,
            address winery,
            address paymentToken,
            uint256 pricePerBottle,
            uint32 quantity,
            uint32 reserved,
            uint64 startTime,
            uint64 endTime,
            uint16 depositBps,
            uint64 fullPaymentDeadline,
            PrimaryMarket.OfferKind kind,
            bool active
        ) = primary.offers(id);

        view_.id = id;
        view_.lotId = lotId;
        view_.winery = winery;
        view_.paymentToken = paymentToken;
        view_.pricePerBottle = pricePerBottle;
        view_.quantity = quantity;
        view_.reserved = reserved;
        view_.available = quantity - reserved;
        view_.startTime = startTime;
        view_.endTime = endTime;
        view_.depositBps = depositBps;
        view_.fullPaymentDeadline = fullPaymentDeadline;
        view_.kind = uint8(kind);
        view_.active = active;
        view_.phase = _phase(active, startTime, endTime, quantity, reserved);
    }

    /// @dev Fixed priority: cancelled > ended > scheduled > sold out.
    function _phase(bool active, uint64 startTime, uint64 endTime, uint32 quantity, uint32 reserved)
        internal
        view
        returns (uint8)
    {
        if (!active) return 4; // Cancelled
        if (block.timestamp > endTime) return 3; // Ended
        if (block.timestamp < startTime) return 0; // Scheduled
        if (reserved >= quantity) return 2; // SoldOut
        return 1; // Open
    }

    function _allocationView(uint256 id) internal view returns (AllocationView memory view_) {
        (
            uint256 offerId,
            address buyer,
            uint32 quantity,
            uint256 pricePerBottle,
            uint256 totalDue,
            uint256 paidAmount,
            uint64 createdAt,
            PrimaryMarket.AllocationState state
        ) = primary.allocations(id);

        view_.id = id;
        view_.offerId = offerId;
        view_.buyer = buyer;
        view_.quantity = quantity;
        view_.pricePerBottle = pricePerBottle;
        view_.totalDue = totalDue;
        view_.paidAmount = paidAmount;
        view_.remaining = totalDue - paidAmount;
        view_.createdAt = createdAt;
        view_.state = uint8(state);

        (uint256 lotId,, address paymentToken,,,,,,, uint64 deadline,,) = primary.offers(offerId);
        view_.lotId = lotId;
        view_.paymentToken = paymentToken;
        view_.fullPaymentDeadline = deadline;
        // Clock only: the state becomes Defaulted when the winery calls claimDefault.
        view_.overdue = state == PrimaryMarket.AllocationState.Reserved && block.timestamp > deadline;
    }

    function _listingView(uint256 id) internal view returns (ListingView memory view_) {
        (address seller, uint256 lotId, uint32 quantity, uint256 pricePerBottle, address paymentToken, bool active) =
            secondary.listings(id);

        view_.id = id;
        view_.seller = seller;
        view_.lotId = lotId;
        view_.quantity = quantity;
        view_.pricePerBottle = pricePerBottle;
        view_.paymentToken = paymentToken;
        view_.active = active;

        uint256 balance = token.balanceOf(seller, lotId);
        uint256 frozen = token.getFrozenTokens(seller, lotId);
        view_.sellerBalance = balance;
        view_.sellerTransferable = balance > frozen ? balance - frozen : 0;
        // Listings escrow nothing, so the purchase needs this approval to go through.
        view_.sellerApproved = token.isApprovedForAll(seller, address(secondary));

        IWineLotToken.WineLot memory record = token.getLot(lotId);
        view_.royaltyBps = record.royaltyBps;
        view_.lotVerified = record.status == IWineLotToken.LotStatus.Verified;
        view_.feeBps = secondary.secondaryFeeBps();
    }

    function _redemptionView(uint256 id) internal view returns (RedemptionView memory view_) {
        (
            address buyer,
            uint256 lotId,
            uint32 quantity,
            bytes32 deliveryDataHash,
            bytes32 shipmentDocsHash,
            uint64 requestedAt,
            RedemptionManager.RedemptionState state
        ) = redemptionManager.redemptions(id);

        view_.id = id;
        view_.buyer = buyer;
        view_.lotId = lotId;
        view_.quantity = quantity;
        view_.deliveryDataHash = deliveryDataHash;
        view_.shipmentDocsHash = shipmentDocsHash;
        view_.requestedAt = requestedAt;
        view_.state = uint8(state);

        IWineLotToken.WineLot memory record = token.getLot(lotId);
        view_.winery = record.winery;
        view_.lotProduction = uint8(record.production);
    }

    // ---------------------------------------------------------------------
    // Internal: paginated scans
    // ---------------------------------------------------------------------

    /// @dev Ids start at 1, `cursor == 0` means from the beginning.
    function _pageBounds(uint256 cursor, uint256 limit, uint256 count)
        internal
        pure
        returns (uint256 start, uint256 last, uint256 take)
    {
        if (limit == 0) revert InvalidPageLimit();
        take = limit > MAX_LIMIT ? MAX_LIMIT : limit;
        start = cursor < 1 ? 1 : cursor;
        if (start > count) return (start, 0, take); // nothing left to scan
        last = start + MAX_SCAN - 1;
        if (last > count) last = count;
    }

    /// @dev Next id to examine, or 0 once the collection is exhausted. Always advances, even
    ///      for a page that matched nothing.
    function _nextCursor(uint256 id, uint256 last, uint256 count) internal pure returns (uint256) {
        if (last == 0) return 0;
        uint256 examined = id > last ? last : id;
        return examined >= count ? 0 : examined + 1;
    }

    function _lotsFiltered(address winery, uint256 cursor, uint256 limit)
        internal
        view
        returns (LotView[] memory items, uint256 nextCursor)
    {
        uint256 count = token.lotCount();
        (uint256 start, uint256 last, uint256 take) = _pageBounds(cursor, limit, count);
        LotView[] memory buffer = new LotView[](take);
        uint256 found;
        uint256 id = start;
        for (; id <= last; id++) {
            LotView memory item = _lotView(id);
            // A zero winery means the id was never created.
            if (item.winery == address(0)) continue;
            if (winery != address(0) && item.winery != winery) continue;
            buffer[found++] = item;
            if (found == take) break;
        }
        // Trim the page-sized buffer to what actually matched (never grows it).
        assembly ("memory-safe") {
            mstore(buffer, found)
        }
        return (buffer, _nextCursor(id, last, count));
    }

    function _offersFiltered(uint256 lotId, address winery, uint256 cursor, uint256 limit)
        internal
        view
        returns (OfferView[] memory items, uint256 nextCursor)
    {
        uint256 count = primary.offerCount();
        (uint256 start, uint256 last, uint256 take) = _pageBounds(cursor, limit, count);
        OfferView[] memory buffer = new OfferView[](take);
        uint256 found;
        uint256 id = start;
        for (; id <= last; id++) {
            OfferView memory item = _offerView(id);
            if (item.winery == address(0)) continue;
            if (lotId != 0 && item.lotId != lotId) continue;
            if (winery != address(0) && item.winery != winery) continue;
            buffer[found++] = item;
            if (found == take) break;
        }
        // Trim the page-sized buffer to what actually matched (never grows it).
        assembly ("memory-safe") {
            mstore(buffer, found)
        }
        return (buffer, _nextCursor(id, last, count));
    }

    function _allocationsFiltered(address buyer, uint256 offerId, uint256 cursor, uint256 limit)
        internal
        view
        returns (AllocationView[] memory items, uint256 nextCursor)
    {
        uint256 count = primary.allocationCount();
        (uint256 start, uint256 last, uint256 take) = _pageBounds(cursor, limit, count);
        AllocationView[] memory buffer = new AllocationView[](take);
        uint256 found;
        uint256 id = start;
        for (; id <= last; id++) {
            AllocationView memory item = _allocationView(id);
            if (item.buyer == address(0)) continue;
            if (buyer != address(0) && item.buyer != buyer) continue;
            if (offerId != 0 && item.offerId != offerId) continue;
            buffer[found++] = item;
            if (found == take) break;
        }
        // Trim the page-sized buffer to what actually matched (never grows it).
        assembly ("memory-safe") {
            mstore(buffer, found)
        }
        return (buffer, _nextCursor(id, last, count));
    }

    function _listingsFiltered(address seller, uint256 lotId, bool onlyActive, uint256 cursor, uint256 limit)
        internal
        view
        returns (ListingView[] memory items, uint256 nextCursor)
    {
        uint256 count = secondary.listingCount();
        (uint256 start, uint256 last, uint256 take) = _pageBounds(cursor, limit, count);
        ListingView[] memory buffer = new ListingView[](take);
        uint256 found;
        uint256 id = start;
        for (; id <= last; id++) {
            ListingView memory item = _listingView(id);
            if (item.seller == address(0)) continue;
            if (onlyActive && !item.active) continue;
            if (seller != address(0) && item.seller != seller) continue;
            if (lotId != 0 && item.lotId != lotId) continue;
            buffer[found++] = item;
            if (found == take) break;
        }
        // Trim the page-sized buffer to what actually matched (never grows it).
        assembly ("memory-safe") {
            mstore(buffer, found)
        }
        return (buffer, _nextCursor(id, last, count));
    }

    function _redemptionsFiltered(address buyer, address winery, uint256 cursor, uint256 limit)
        internal
        view
        returns (RedemptionView[] memory items, uint256 nextCursor)
    {
        uint256 count = redemptionManager.redemptionCount();
        (uint256 start, uint256 last, uint256 take) = _pageBounds(cursor, limit, count);
        RedemptionView[] memory buffer = new RedemptionView[](take);
        uint256 found;
        uint256 id = start;
        for (; id <= last; id++) {
            (address redemptionBuyer,,,,,,) = redemptionManager.redemptions(id);
            if (redemptionBuyer == address(0)) continue;
            if (buyer != address(0) && redemptionBuyer != buyer) continue;
            RedemptionView memory item = _redemptionView(id);
            if (winery != address(0) && item.winery != winery) continue;
            buffer[found++] = item;
            if (found == take) break;
        }
        // Trim the page-sized buffer to what actually matched (never grows it).
        assembly ("memory-safe") {
            mstore(buffer, found)
        }
        return (buffer, _nextCursor(id, last, count));
    }

    // ---------------------------------------------------------------------
    // Internal: helpers
    // ---------------------------------------------------------------------

    function _hasRole(address target, bytes32 role, address account) internal view returns (bool) {
        return IAccessControl(target).hasRole(role, account);
    }

    function _paymentMetadata(address paymentToken)
        internal
        view
        returns (uint8 tokenDecimals, string memory symbol, bool ok)
    {
        if (paymentToken == address(0) || paymentToken.code.length == 0) return (0, "", false);
        bool decimalsOk;
        try IERC20Metadata(paymentToken).decimals() returns (uint8 value) {
            tokenDecimals = value;
            decimalsOk = true;
        } catch {
            tokenDecimals = 0;
        }
        bool symbolOk;
        try IERC20Metadata(paymentToken).symbol() returns (string memory value) {
            symbol = value;
            symbolOk = true;
        } catch {
            symbol = "";
        }
        ok = decimalsOk && symbolOk;
        if (!ok) {
            // Report nothing rather than half a token description.
            tokenDecimals = 0;
            symbol = "";
        }
    }

    function _requireOffer(uint256 id) internal view {
        (, address winery,,,,,,,,,,) = primary.offers(id);
        if (id == 0 || id > primary.offerCount() || winery == address(0)) revert EntityNotFound(KIND_OFFER, id);
    }

    function _requireAllocation(uint256 id) internal view {
        (, address buyer,,,,,,) = primary.allocations(id);
        if (id == 0 || id > primary.allocationCount() || buyer == address(0)) {
            revert EntityNotFound(KIND_ALLOCATION, id);
        }
    }

    function _requireListing(uint256 id) internal view {
        (address seller,,,,,) = secondary.listings(id);
        if (id == 0 || id > secondary.listingCount() || seller == address(0)) revert EntityNotFound(KIND_LISTING, id);
    }

    function _requireRedemption(uint256 id) internal view {
        (address buyer,,,,,,) = redemptionManager.redemptions(id);
        if (id == 0 || id > redemptionManager.redemptionCount() || buyer == address(0)) {
            revert EntityNotFound(KIND_REDEMPTION, id);
        }
    }
}
