// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {ClaimTopicsLib} from "../../src/libraries/ClaimTopicsLib.sol";
import {EchidnaActor, EchidnaIdentityRegistry} from "./EchidnaHelpers.sol";

contract RedemptionManagerEchidna {
    uint32 internal constant INITIAL_BOTTLES = 500;
    uint256 internal constant MAX_REDEMPTIONS = 64;

    EchidnaIdentityRegistry internal registry;
    WineLotToken internal token;
    RedemptionManager internal manager;
    EchidnaActor internal winery;
    EchidnaActor internal buyer;
    uint256 internal lotId;

    constructor() {
        registry = new EchidnaIdentityRegistry();
        token = new WineLotToken(address(this), registry);
        manager = new RedemptionManager(address(this), token);

        winery = new EchidnaActor();
        buyer = new EchidnaActor();

        registry.setVerified(address(winery), true);
        registry.setClaim(address(winery), ClaimTopicsLib.TOPIC_WINERY, true);
        registry.setVerified(address(buyer), true);
        registry.setClaim(address(buyer), ClaimTopicsLib.TOPIC_B2B_BUYER, true);
        registry.setVerified(address(manager), true);

        token.grantRole(token.VERIFIER_ROLE(), address(this));
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.grantRole(token.BURNER_ROLE(), address(manager));
        token.grantRole(token.TRANSFER_AGENT_ROLE(), address(manager));
        token.setSystemAddress(address(manager), true);
        manager.grantRole(manager.VERIFIER_ROLE(), address(this));

        lotId = winery.createLot(
            token,
            IWineLotToken.WineLotInput({
                totalBottles: INITIAL_BOTTLES,
                vintage: 2024,
                royaltyBps: 0,
                bottleSizeMl: 750,
                exportAllowed: true,
                name: "Redemption Echidna",
                region: "Bordeaux",
                grapes: "Merlot",
                metadataURI: "ipfs://redemption"
            })
        );
        token.verifyLot(lotId, keccak256("docs"));
        winery.setProductionStatus(token, lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);
        token.mint(address(buyer), lotId, INITIAL_BOTTLES);
        buyer.setApprovalForAll(token, address(manager), true);
    }

    function requestRedemption(uint32 quantitySeed, bytes32 deliveryDataHash) external {
        if (manager.redemptionCount() >= MAX_REDEMPTIONS) return;

        uint256 balance = token.balanceOf(address(buyer), lotId);
        if (balance == 0) return;

        try buyer.requestRedemption(
            manager, lotId, uint32(_amount(quantitySeed, balance > 50 ? 50 : balance)), deliveryDataHash
        ) {} catch {}
    }

    function markShipped(uint256 redemptionSeed, bytes32 shipmentDocsHash) external {
        uint256 redemptionId = _openRedemptionId(redemptionSeed);
        if (redemptionId == 0) return;

        (,,,,,, RedemptionManager.RedemptionState state) = manager.redemptions(redemptionId);
        if (state != RedemptionManager.RedemptionState.Requested) return;

        try winery.markShipped(manager, redemptionId, shipmentDocsHash) {} catch {}
    }

    function confirmAsBuyer(uint256 redemptionSeed) external {
        uint256 redemptionId = _openRedemptionId(redemptionSeed);
        if (redemptionId == 0) return;

        (,,,,,, RedemptionManager.RedemptionState state) = manager.redemptions(redemptionId);
        if (state != RedemptionManager.RedemptionState.Shipped) return;

        try buyer.confirmDelivery(manager, redemptionId) {} catch {}
    }

    function confirmAsVerifier(uint256 redemptionSeed) external {
        uint256 redemptionId = _openRedemptionId(redemptionSeed);
        if (redemptionId == 0) return;

        try manager.confirmDelivery(redemptionId) {} catch {}
    }

    function cancelRedemption(uint256 redemptionSeed) external {
        uint256 redemptionId = _openRedemptionId(redemptionSeed);
        if (redemptionId == 0) return;

        (,,,,,, RedemptionManager.RedemptionState state) = manager.redemptions(redemptionId);
        if (state != RedemptionManager.RedemptionState.Requested) return;

        try buyer.cancelRedemption(manager, redemptionId) {} catch {}
    }

    function echidna_escrow_matches_open_redemptions() external view returns (bool) {
        return token.balanceOf(address(manager), lotId) == _openRedemptionQuantity();
    }

    function echidna_supply_tracks_completed_redemptions() external view returns (bool) {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        return lot.mintedBottles == INITIAL_BOTTLES && lot.redeemedBottles == _completedRedemptionQuantity()
            && token.totalSupply(lotId) + lot.redeemedBottles == lot.mintedBottles;
    }

    function echidna_buyer_escrow_and_redeemed_equal_initial_mint() external view returns (bool) {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        uint256 buyerBalance = token.balanceOf(address(buyer), lotId);
        uint256 escrow = token.balanceOf(address(manager), lotId);
        return buyerBalance + escrow + lot.redeemedBottles == INITIAL_BOTTLES;
    }

    function _openRedemptionId(uint256 seed) internal view returns (uint256) {
        uint256 count = manager.redemptionCount();
        if (count == 0) return 0;
        return 1 + (seed % count);
    }

    function _openRedemptionQuantity() internal view returns (uint256 sum) {
        uint256 count = manager.redemptionCount();
        for (uint256 i = 1; i <= count; i++) {
            (,, uint32 quantity,,,, RedemptionManager.RedemptionState state) = manager.redemptions(i);
            if (
                state == RedemptionManager.RedemptionState.Requested
                    || state == RedemptionManager.RedemptionState.Shipped
            ) {
                sum += quantity;
            }
        }
    }

    function _completedRedemptionQuantity() internal view returns (uint256 sum) {
        uint256 count = manager.redemptionCount();
        for (uint256 i = 1; i <= count; i++) {
            (,, uint32 quantity,,,, RedemptionManager.RedemptionState state) = manager.redemptions(i);
            if (state == RedemptionManager.RedemptionState.Completed) sum += quantity;
        }
    }

    function _amount(uint256 seed, uint256 max) internal pure returns (uint256) {
        return 1 + (seed % max);
    }
}
