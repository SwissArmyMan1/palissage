// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {SecondaryMarket} from "../../src/market/SecondaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {MockEURe} from "../mocks/MockEURe.sol";
import {EchidnaActor, EchidnaIdentityRegistry} from "./EchidnaHelpers.sol";

contract SecondaryMarketEchidna {
    uint32 internal constant INITIAL_BOTTLES = 500;
    uint256 internal constant INITIAL_EURe = 10_000_000_000_000;
    uint256 internal constant MAX_LISTINGS = 64;

    EchidnaIdentityRegistry internal registry;
    WineLotToken internal token;
    SecondaryMarket internal market;
    MockEURe internal eurc;
    EchidnaActor internal winery;
    EchidnaActor internal seller;
    EchidnaActor internal buyer;
    address internal treasury = address(0xCAFE);
    uint256 internal lotId;

    constructor() {
        registry = new EchidnaIdentityRegistry();
        token = new WineLotToken(address(this), registry);
        market = new SecondaryMarket(address(this), token, registry, treasury);
        eurc = new MockEURe();

        winery = new EchidnaActor();
        seller = new EchidnaActor();
        buyer = new EchidnaActor();

        registry.setVerified(address(winery), true);
        registry.setClaim(address(winery), ClaimTopicsLib.TOPIC_WINERY, true);
        registry.setVerified(address(seller), true);
        registry.setClaim(address(seller), ClaimTopicsLib.TOPIC_B2B_BUYER, true);
        registry.setVerified(address(buyer), true);
        registry.setClaim(address(buyer), ClaimTopicsLib.TOPIC_B2B_BUYER, true);

        token.grantRole(token.VERIFIER_ROLE(), address(this));
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(market));
        market.setPaymentTokenAllowed(address(eurc), true);

        lotId = winery.createLot(
            token,
            IWineLotToken.WineLotInput({
                totalBottles: INITIAL_BOTTLES,
                vintage: 2024,
                royaltyBps: 250,
                bottleSizeMl: 750,
                exportAllowed: true,
                name: "Secondary Echidna",
                region: "Bordeaux",
                grapes: "Merlot",
                metadataURI: "ipfs://secondary"
            })
        );
        token.verifyLot(lotId, keccak256("docs"));
        token.mint(address(seller), lotId, INITIAL_BOTTLES);

        seller.setApprovalForAll(token, address(market), true);
        eurc.mint(address(buyer), INITIAL_EURe);
        buyer.approveERC20(IERC20(address(eurc)), address(market), type(uint256).max);
    }

    function list(uint32 quantitySeed, uint32 priceSeed) external {
        if (market.listingCount() >= MAX_LISTINGS) return;

        uint256 balance = token.balanceOf(address(seller), lotId);
        if (balance == 0) return;

        uint32 quantity = uint32(_amount(quantitySeed, balance > 50 ? 50 : balance));
        uint256 price = _amount(priceSeed, 20_000_000);

        try seller.list(market, lotId, quantity, price, address(eurc)) {} catch {}
    }

    function buy(uint256 listingSeed, uint32 quantitySeed) external {
        uint256 count = market.listingCount();
        if (count == 0) return;

        uint256 listingId = 1 + (listingSeed % count);
        (address listingSeller,, uint32 listedQuantity, uint256 pricePerBottle,, bool active) =
            market.listings(listingId);
        if (!active || listingSeller != address(seller) || listedQuantity == 0 || pricePerBottle == 0) return;

        uint256 sellerBalance = token.balanceOf(address(seller), lotId);
        uint256 affordable = eurc.balanceOf(address(buyer)) / pricePerBottle;
        uint256 maxQuantity = _min(listedQuantity, _min(sellerBalance, affordable));
        if (maxQuantity == 0) return;

        try buyer.buy(market, listingId, uint32(_amount(quantitySeed, maxQuantity))) {} catch {}
    }

    function updateListingPrice(uint256 listingSeed, uint32 priceSeed) external {
        uint256 count = market.listingCount();
        if (count == 0) return;

        uint256 listingId = 1 + (listingSeed % count);
        (address listingSeller,,,,, bool active) = market.listings(listingId);
        if (!active || listingSeller != address(seller)) return;

        try seller.updateListingPrice(market, listingId, _amount(priceSeed, 20_000_000)) {} catch {}
    }

    function cancelListing(uint256 listingSeed) external {
        uint256 count = market.listingCount();
        if (count == 0) return;

        uint256 listingId = 1 + (listingSeed % count);
        (address listingSeller,,,,, bool active) = market.listings(listingId);
        if (!active || listingSeller != address(seller)) return;

        try seller.cancelListing(market, listingId) {} catch {}
    }

    function echidna_token_supply_is_conserved_between_tracked_holders() external view returns (bool) {
        uint256 tracked = token.balanceOf(address(seller), lotId) + token.balanceOf(address(buyer), lotId);
        return tracked == token.totalSupply(lotId) && tracked == INITIAL_BOTTLES;
    }

    function echidna_eurc_is_conserved() external view returns (bool) {
        uint256 tracked = eurc.balanceOf(address(buyer)) + eurc.balanceOf(address(seller))
            + eurc.balanceOf(address(winery)) + eurc.balanceOf(treasury) + eurc.balanceOf(address(market));
        return tracked == eurc.totalSupply() && tracked == INITIAL_EURe;
    }

    function echidna_active_listings_have_nonzero_terms() external view returns (bool) {
        uint256 count = market.listingCount();
        for (uint256 i = 1; i <= count; i++) {
            (
                address listingSeller,
                uint256 listingLotId,
                uint32 quantity,
                uint256 pricePerBottle,
                address paymentToken,
                bool active
            ) = market.listings(i);
            if (active) {
                if (
                    listingSeller != address(seller) || listingLotId != lotId || quantity == 0 || pricePerBottle == 0
                        || paymentToken != address(eurc)
                ) return false;
            } else if (quantity == 0 && pricePerBottle == 0) {
                return false;
            }
        }
        return true;
    }

    function _amount(uint256 seed, uint256 max) internal pure returns (uint256) {
        return 1 + (seed % max);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
