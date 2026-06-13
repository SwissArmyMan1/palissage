// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IWineLotToken} from "../interfaces/IWineLotToken.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {ClaimTopicsLib} from "../libraries/ClaimTopicsLib.sol";

/// @title SecondaryMarket — whitelisted B2B resale of wine lot allocations.
/// @notice Sellers list lazily (tokens stay in their wallet, market is an approved
///         operator); each purchase pays the protocol fee and the winery royalty.
contract SecondaryMarket is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint16 public constant BPS_DENOMINATOR = 10000;
    uint16 public constant MAX_FEE_BPS = 1000; // 10%

    struct Listing {
        address seller;
        uint256 lotId;
        uint32 quantity; // remaining
        uint256 pricePerBottle;
        address paymentToken;
        bool active;
    }

    error PaymentTokenNotAllowed(address token);
    error SellerNotVerified(address seller);
    error NotBuyer(address caller);
    error NotSeller(uint256 listingId, address caller);
    error LotNotVerified(uint256 lotId);
    error ListingNotActive(uint256 listingId);
    error InsufficientListedQuantity(uint256 listingId, uint256 requested, uint256 available);
    error InsufficientSellerBalance(uint256 listingId);
    error SelfPurchase(uint256 listingId);
    error ZeroAmount();
    error ZeroAddress();

    event PaymentTokenAllowed(address indexed token, bool allowed);
    event TreasuryUpdated(address indexed treasury);
    event SecondaryFeeUpdated(uint16 feeBps);
    event Listed(
        uint256 indexed listingId,
        uint256 indexed lotId,
        address indexed seller,
        uint32 quantity,
        uint256 pricePerBottle,
        address paymentToken
    );
    event ListingUpdated(uint256 indexed listingId, uint256 pricePerBottle);
    event ListingCancelled(uint256 indexed listingId);
    event Purchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint32 quantity,
        uint256 total,
        uint256 protocolFee,
        uint256 royalty
    );

    IWineLotToken public immutable wineLotToken;
    IIdentityRegistry public immutable identityRegistry;

    address public treasury;
    uint16 public secondaryFeeBps = 200; // 2%

    mapping(address => bool) public allowedPaymentTokens;

    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    constructor(address admin, IWineLotToken token, IIdentityRegistry registry, address treasury_) {
        if (address(token) == address(0) || address(registry) == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        wineLotToken = token;
        identityRegistry = registry;
        treasury = treasury_;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

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

    function setSecondaryFeeBps(uint16 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert ZeroAmount();
        secondaryFeeBps = feeBps;
        emit SecondaryFeeUpdated(feeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    function list(uint256 lotId, uint32 quantity, uint256 pricePerBottle, address paymentToken)
        external
        whenNotPaused
        returns (uint256 listingId)
    {
        if (!identityRegistry.isVerified(msg.sender)) revert SellerNotVerified(msg.sender);
        if (!allowedPaymentTokens[paymentToken]) revert PaymentTokenNotAllowed(paymentToken);
        if (quantity == 0 || pricePerBottle == 0) revert ZeroAmount();

        IWineLotToken.WineLot memory lot = wineLotToken.getLot(lotId);
        if (lot.status != IWineLotToken.LotStatus.Verified) revert LotNotVerified(lotId);
        if (wineLotToken.balanceOf(msg.sender, lotId) < quantity) revert InsufficientSellerBalance(0);

        listingId = ++listingCount;
        listings[listingId] = Listing({
            seller: msg.sender,
            lotId: lotId,
            quantity: quantity,
            pricePerBottle: pricePerBottle,
            paymentToken: paymentToken,
            active: true
        });

        emit Listed(listingId, lotId, msg.sender, quantity, pricePerBottle, paymentToken);
    }

    function updateListingPrice(uint256 listingId, uint256 pricePerBottle) external {
        Listing storage listing = _activeListing(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);
        if (pricePerBottle == 0) revert ZeroAmount();
        listing.pricePerBottle = pricePerBottle;
        emit ListingUpdated(listingId, pricePerBottle);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = _activeListing(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);
        listing.active = false;
        emit ListingCancelled(listingId);
    }

    /// @notice Buys `quantity` bottles from a listing. Funds split: protocol fee →
    ///         treasury, winery royalty → lot creator, remainder → seller. Tokens move
    ///         seller → buyer with this market acting as the transfer agent.
    function buy(uint256 listingId, uint32 quantity) external whenNotPaused nonReentrant {
        Listing storage listing = _activeListing(listingId);
        if (!identityRegistry.hasValidClaim(msg.sender, ClaimTopicsLib.TOPIC_B2B_BUYER)) revert NotBuyer(msg.sender);
        if (msg.sender == listing.seller) revert SelfPurchase(listingId);
        if (quantity == 0) revert ZeroAmount();
        if (quantity > listing.quantity) {
            revert InsufficientListedQuantity(listingId, quantity, listing.quantity);
        }
        if (wineLotToken.balanceOf(listing.seller, listing.lotId) < quantity) {
            revert InsufficientSellerBalance(listingId);
        }

        IWineLotToken.WineLot memory lot = wineLotToken.getLot(listing.lotId);

        uint256 total = uint256(quantity) * listing.pricePerBottle;
        uint256 protocolFee = (total * secondaryFeeBps) / BPS_DENOMINATOR;
        uint256 royalty = (total * lot.royaltyBps) / BPS_DENOMINATOR;
        uint256 sellerProceeds = total - protocolFee - royalty;

        listing.quantity -= quantity;
        if (listing.quantity == 0) listing.active = false;

        IERC20 paymentToken = IERC20(listing.paymentToken);
        if (protocolFee > 0) paymentToken.safeTransferFrom(msg.sender, treasury, protocolFee);
        if (royalty > 0) paymentToken.safeTransferFrom(msg.sender, lot.winery, royalty);
        paymentToken.safeTransferFrom(msg.sender, listing.seller, sellerProceeds);

        wineLotToken.safeTransferFrom(listing.seller, msg.sender, listing.lotId, quantity, "");

        emit Purchased(listingId, msg.sender, quantity, total, protocolFee, royalty);
    }

    function _activeListing(uint256 listingId) internal view returns (Listing storage listing) {
        listing = listings[listingId];
        if (!listing.active) revert ListingNotActive(listingId);
    }
}
