// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixtures} from "../utils/Fixtures.sol";
import {RedemptionManager} from "../../src/redemption/RedemptionManager.sol";
import {PrimaryMarket} from "../../src/market/PrimaryMarket.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";

contract RedemptionManagerTest is Fixtures {
    uint256 internal lotId;
    uint256 internal constant PRICE = 7_200_000;

    function setUp() public override {
        super.setUp();
        lotId = _createVerifiedLot(1_000, 0);

        vm.prank(winery);
        uint256 offerId = primaryMarket.createOffer(
            lotId,
            address(eurc),
            PRICE,
            1_000,
            uint64(block.timestamp),
            uint64(block.timestamp + 30 days),
            0,
            uint64(block.timestamp + 60 days),
            PrimaryMarket.OfferKind.Standard
        );
        _fundAndApprove(buyer, 100 * PRICE, address(primaryMarket));
        vm.prank(buyer);
        primaryMarket.reserve(offerId, 100, 100 * PRICE);

        vm.prank(buyer);
        token.setApprovalForAll(address(redemptionManager), true);
    }

    function _makeReady() internal {
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.ReadyForDelivery);
    }

    function test_Request_RevertsBeforeReadyForDelivery() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.LotNotReadyForDelivery.selector, lotId));
        redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));
    }

    function test_FullRedemptionFlow_BurnsTokens() public {
        _makeReady();

        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 40, keccak256("delivery"));
        assertEq(token.balanceOf(buyer, lotId), 60);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 40);

        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("shipping-docs"));

        vm.prank(buyer);
        redemptionManager.confirmDelivery(redemptionId);

        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
        assertEq(token.totalSupply(lotId), 60);

        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        assertEq(lot.mintedBottles, 100);
        assertEq(lot.redeemedBottles, 40);
        // Invariant: minted − redeemed == totalSupply.
        assertEq(lot.mintedBottles - lot.redeemedBottles, token.totalSupply(lotId));
    }

    function test_BuyerConfirm_RequiresShipped() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.BuyerConfirmRequiresShipped.selector, redemptionId));
        redemptionManager.confirmDelivery(redemptionId);
    }

    function test_VerifierCanForceCompleteFromRequested() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(verifier);
        redemptionManager.confirmDelivery(redemptionId);
        assertEq(token.getLot(lotId).redeemedBottles, 10);
    }

    function test_MarkShipped_OnlyLotWinery() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 10, keccak256("delivery"));

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(RedemptionManager.NotLotWinery.selector, lotId, outsider));
        redemptionManager.markShipped(redemptionId, bytes32(0));
    }

    function test_CancelRedemption_ReturnsTokens() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));

        vm.prank(buyer);
        redemptionManager.cancelRedemption(redemptionId);

        assertEq(token.balanceOf(buyer, lotId), 100);
        assertEq(token.balanceOf(address(redemptionManager), lotId), 0);
    }

    function test_CancelRedemption_RevertsAfterShipment() public {
        _makeReady();
        vm.prank(buyer);
        uint256 redemptionId = redemptionManager.requestRedemption(lotId, 25, keccak256("delivery"));
        vm.prank(winery);
        redemptionManager.markShipped(redemptionId, keccak256("docs"));

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                RedemptionManager.RedemptionNotInState.selector, redemptionId, RedemptionManager.RedemptionState.Requested
            )
        );
        redemptionManager.cancelRedemption(redemptionId);
    }
}
