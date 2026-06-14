// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {MockEURe} from "../mocks/MockEURe.sol";
import {EchidnaActor, EchidnaIdentityRegistry} from "./EchidnaHelpers.sol";

contract PrimaryMarketEchidna {
    uint32 internal constant TOTAL_BOTTLES = 1_000;
    uint32 internal constant OFFER_QUANTITY = 1_000;
    uint16 internal constant DEPOSIT_BPS = 3_000;
    uint256 internal constant PRICE = 7_200_000;
    uint256 internal constant MAX_ALLOCATIONS = 64;

    EchidnaIdentityRegistry internal registry;
    WineLotToken internal token;
    PrimaryMarket internal market;
    MockEURe internal eurc;
    EchidnaActor internal winery;
    EchidnaActor[2] internal buyers;
    address internal treasury = address(0xBEEF);
    uint256 internal lotId;
    uint256 internal offerId;

    constructor() {
        registry = new EchidnaIdentityRegistry();
        token = new WineLotToken(address(this), registry);
        market = new PrimaryMarket(address(this), token, registry, treasury);
        eurc = new MockEURe();

        winery = new EchidnaActor();
        buyers[0] = new EchidnaActor();
        buyers[1] = new EchidnaActor();

        registry.setVerified(address(winery), true);
        registry.setClaim(address(winery), ClaimTopicsLib.TOPIC_WINERY, true);
        for (uint256 i = 0; i < buyers.length; i++) {
            registry.setVerified(address(buyers[i]), true);
            registry.setClaim(address(buyers[i]), ClaimTopicsLib.TOPIC_B2B_BUYER, true);
            eurc.mint(address(buyers[i]), 10_000_000_000_000);
            buyers[i].approveERC20(IERC20(address(eurc)), address(market), type(uint256).max);
        }

        token.grantRole(token.VERIFIER_ROLE(), address(this));
        token.grantRole(token.MINTER_ROLE(), address(market));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(market));
        market.grantRole(market.VERIFIER_ROLE(), address(this));
        market.setPaymentTokenAllowed(address(eurc), true);

        lotId = winery.createLot(
            token,
            IWineLotToken.WineLotInput({
                totalBottles: TOTAL_BOTTLES,
                vintage: 2024,
                royaltyBps: 250,
                bottleSizeMl: 750,
                exportAllowed: true,
                name: "Primary Echidna",
                region: "Bordeaux",
                grapes: "Merlot",
                metadataURI: "ipfs://primary"
            })
        );
        token.verifyLot(lotId, keccak256("docs"));

        offerId = winery.createOffer(
            market,
            lotId,
            address(eurc),
            PRICE,
            OFFER_QUANTITY,
            0,
            type(uint64).max - 1,
            DEPOSIT_BPS,
            type(uint64).max,
            PrimaryMarket.OfferKind.Standard
        );
    }

    function reserve(uint8 buyerSeed, uint32 quantitySeed, bool fullPayment) external {
        if (market.allocationCount() >= MAX_ALLOCATIONS) return;

        (,,,, uint32 quantity, uint32 reserved,,,,,,) = market.offers(offerId);
        uint256 available = uint256(quantity) - reserved;
        if (available == 0) return;

        uint32 quantityToReserve = uint32(_amount(quantitySeed, available > 25 ? 25 : available));
        uint256 totalDue = uint256(quantityToReserve) * PRICE;
        uint256 payNow = fullPayment ? totalDue : (totalDue * DEPOSIT_BPS) / 10_000;
        EchidnaActor buyer = _buyer(buyerSeed);

        try buyer.reserve(market, offerId, quantityToReserve, payNow) {} catch {}
    }

    function payRemainder(uint256 allocationSeed, uint256 amountSeed) external {
        uint256 count = market.allocationCount();
        if (count == 0) return;

        uint256 allocationId = 1 + (allocationSeed % count);
        (
            uint256 allocOfferId,
            address buyer,
            ,
            uint256 pricePerBottle,
            uint256 totalDue,
            uint256 paidAmount,
            ,
            PrimaryMarket.AllocationState state
        ) = market.allocations(allocationId);
        if (allocOfferId != offerId || pricePerBottle != PRICE || state != PrimaryMarket.AllocationState.Reserved) {
            return;
        }

        uint256 remaining = totalDue - paidAmount;
        if (remaining == 0) return;

        EchidnaActor actor = _buyerFor(buyer);
        if (address(actor) == address(0)) return;

        try actor.payRemainder(market, allocationId, _amount(amountSeed, remaining)) {} catch {}
    }

    function cancelAllocation(uint256 allocationSeed) external {
        uint256 count = market.allocationCount();
        if (count == 0) return;

        uint256 allocationId = 1 + (allocationSeed % count);
        (uint256 allocOfferId,,,,,,, PrimaryMarket.AllocationState state) = market.allocations(allocationId);
        if (allocOfferId != offerId || state != PrimaryMarket.AllocationState.Reserved) return;

        try winery.cancelAllocation(market, allocationId) {} catch {}
    }

    function confirmDefaultMilestone() external {
        PrimaryMarket.Milestone[] memory milestones = market.getMilestones(offerId);
        if (milestones.length == 0 || market.releasedBps(offerId) != 0) return;

        try market.confirmMilestone(offerId, 0) {} catch {}
    }

    function withdrawReleased() external {
        try winery.withdrawReleased(market, offerId) {} catch {}
    }

    function echidna_offer_bounds_hold() external view returns (bool) {
        (uint256 offerLotId,,, uint256 pricePerBottle, uint32 quantity, uint32 reserved,,,,,,) = market.offers(offerId);
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        return offerLotId == lotId && pricePerBottle == PRICE && reserved <= quantity
            && market.offeredPerLot(lotId) <= lot.totalBottles;
    }

    function echidna_escrow_balance_matches_accounting() external view returns (bool) {
        uint256 settled = market.settledFunds(offerId);
        uint256 withdrawn = market.withdrawnGross(offerId);
        if (withdrawn > settled) return false;
        return eurc.balanceOf(address(market)) == settled - withdrawn;
    }

    function echidna_withdrawals_never_exceed_released_entitlement() external view returns (bool) {
        uint256 settled = market.settledFunds(offerId);
        uint256 released = market.releasedBps(offerId);
        uint256 entitled = (settled * released) / 10_000;
        return released <= 10_000 && market.withdrawnGross(offerId) <= entitled;
    }

    function echidna_allocation_accounting_matches_offer() external view returns (bool) {
        uint256 livePaid;
        uint256 liveQuantity;
        uint256 paidQuantity;

        uint256 count = market.allocationCount();
        for (uint256 i = 1; i <= count; i++) {
            (
                uint256 allocOfferId,
                ,
                uint32 quantity,
                ,
                uint256 totalDue,
                uint256 paidAmount,
                ,
                PrimaryMarket.AllocationState state
            ) = market.allocations(i);
            if (allocOfferId != offerId) continue;

            if (paidAmount > totalDue) return false;
            if (state == PrimaryMarket.AllocationState.Reserved || state == PrimaryMarket.AllocationState.Paid) {
                livePaid += paidAmount;
                liveQuantity += quantity;
            }
            if (state == PrimaryMarket.AllocationState.Paid) paidQuantity += quantity;
        }

        (,,,,, uint32 reserved,,,,,,) = market.offers(offerId);
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        return livePaid == market.settledFunds(offerId) && liveQuantity == reserved
            && paidQuantity == token.totalSupply(lotId) && paidQuantity == lot.mintedBottles;
    }

    function _buyer(uint8 seed) internal view returns (EchidnaActor) {
        return buyers[uint256(seed) % buyers.length];
    }

    function _buyerFor(address account) internal view returns (EchidnaActor) {
        for (uint256 i = 0; i < buyers.length; i++) {
            if (account == address(buyers[i])) return buyers[i];
        }
        return EchidnaActor(payable(address(0)));
    }

    function _amount(uint256 seed, uint256 max) internal pure returns (uint256) {
        return 1 + (seed % max);
    }
}
