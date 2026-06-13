// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {Fixtures} from "../utils/Fixtures.sol";
import {WineLotToken} from "../../src/token/WineLotToken.sol";
import {IWineLotToken} from "../../src/interfaces/IWineLotToken.sol";
import {IERC7943MultiToken} from "../../src/interfaces/IERC7943.sol";

contract WineLotTokenTest is Fixtures {
    address internal minter = makeAddr("minter");
    address internal agent = makeAddr("agent");
    uint256 internal lotId;

    function setUp() public override {
        super.setUp();
        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), minter);
        token.grantRole(token.TRANSFER_AGENT_ROLE(), agent);
        vm.stopPrank();
        lotId = _createVerifiedLot(1000, 250);
    }

    // ------------------------------------------------------------------ lots

    function test_CreateLot_RevertsForNonWinery() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.NotWinery.selector, buyer));
        token.createLot(
            IWineLotToken.WineLotInput(100, 2024, 0, 750, true, "n", "r", "g", "ipfs://x")
        );
    }

    function test_CreateLot_StoresWineData() public view {
        IWineLotToken.WineLot memory lot = token.getLot(lotId);
        assertEq(lot.winery, winery);
        assertEq(uint8(lot.status), uint8(IWineLotToken.LotStatus.Verified));
        assertEq(lot.totalBottles, 1000);
        assertEq(lot.vintage, 2024);
        assertEq(lot.royaltyBps, 250);
        assertEq(lot.name, "Chateau Palissage Rouge");
        assertEq(lot.region, "Bordeaux AOC");
        assertEq(token.uri(lotId), "ipfs://lot-metadata");
        assertEq(lot.verifier, verifier);
    }

    function test_VerifyLot_OnlyVerifier() public {
        vm.prank(winery);
        uint256 draft = token.createLot(
            IWineLotToken.WineLotInput(10, 2024, 0, 750, true, "n", "r", "g", "u")
        );
        bytes32 role = token.VERIFIER_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, role)
        );
        token.verifyLot(draft, bytes32(0));
    }

    function test_SetProductionStatus_ForwardOnly() public {
        vm.prank(winery);
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.Bottled);
        vm.prank(winery);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.ProductionStatusNotForward.selector, lotId));
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.Growing);
    }

    function test_SetProductionStatus_OnlyLotWinery() public {
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.NotLotWinery.selector, lotId, buyer));
        token.setProductionStatus(lotId, IWineLotToken.ProductionStatus.Bottled);
    }

    // ----------------------------------------------------------------- mint

    function test_Mint_OnlyMinterRole() public {
        bytes32 role = token.MINTER_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, role)
        );
        token.mint(buyer, lotId, 10);
    }

    function test_Mint_RevertsForUnverifiedReceiver() public {
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(IERC7943MultiToken.ERC7943CannotReceive.selector, outsider));
        token.mint(outsider, lotId, 10);
    }

    function test_Mint_RevertsAboveTotalBottles() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 900);
        vm.prank(minter);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.MintExceedsTotalBottles.selector, lotId, 200, 100));
        token.mint(buyer, lotId, 200);
    }

    function test_Mint_TracksMintedBottles() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 100);
        assertEq(token.getLot(lotId).mintedBottles, 100);
        assertEq(token.totalSupply(lotId), 100);
    }

    // ------------------------------------------------------------- transfers

    function test_DirectTransfer_RevertsWithoutAgent() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);

        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.NotTransferAgent.selector, buyer));
        token.safeTransferFrom(buyer, buyer2, lotId, 5, "");
    }

    function test_TransferViaAgent_Works() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);

        vm.prank(buyer);
        token.setApprovalForAll(agent, true);
        vm.prank(agent);
        token.safeTransferFrom(buyer, buyer2, lotId, 5, "");

        assertEq(token.balanceOf(buyer, lotId), 5);
        assertEq(token.balanceOf(buyer2, lotId), 5);
    }

    function test_TransferViaAgent_RevertsForUnverifiedReceiver() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);
        vm.prank(buyer);
        token.setApprovalForAll(agent, true);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(IERC7943MultiToken.ERC7943CannotReceive.selector, outsider));
        token.safeTransferFrom(buyer, outsider, lotId, 5, "");
    }

    function test_Transfer_RevertsOnSuspendedLot() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);
        vm.prank(buyer);
        token.setApprovalForAll(agent, true);

        vm.prank(verifier);
        token.suspendLot(lotId);

        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(WineLotToken.LotNotTransferable.selector, lotId));
        token.safeTransferFrom(buyer, buyer2, lotId, 5, "");
    }

    // ---------------------------------------------------------------- freeze

    function test_Freeze_BlocksTransfersBeyondUnfrozen() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);
        vm.prank(buyer);
        token.setApprovalForAll(agent, true);

        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 8);
        assertEq(token.getFrozenTokens(buyer, lotId), 8);

        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(IERC7943MultiToken.ERC7943InsufficientUnfrozenBalance.selector, buyer, lotId, 5, 2)
        );
        token.safeTransferFrom(buyer, buyer2, lotId, 5, "");

        vm.prank(agent);
        token.safeTransferFrom(buyer, buyer2, lotId, 2, "");
        assertEq(token.balanceOf(buyer2, lotId), 2);
    }

    function test_SetFrozenTokens_OnlyEnforcer() public {
        bytes32 role = token.ENFORCER_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, role)
        );
        token.setFrozenTokens(buyer, lotId, 1);
    }

    // -------------------------------------------------------- forcedTransfer

    function test_ForcedTransfer_MovesFrozenTokensAndUnfreezes() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);
        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 10);

        vm.prank(enforcer);
        vm.expectEmit(true, true, true, true);
        emit IERC7943MultiToken.Frozen(buyer, lotId, 4);
        vm.expectEmit(true, true, true, true);
        emit IERC7943MultiToken.ForcedTransfer(buyer, buyer2, lotId, 6);
        token.forcedTransfer(buyer, buyer2, lotId, 6);

        assertEq(token.balanceOf(buyer, lotId), 4);
        assertEq(token.balanceOf(buyer2, lotId), 6);
        assertEq(token.getFrozenTokens(buyer, lotId), 4);
    }

    function test_ForcedTransfer_OnlyEnforcer() public {
        bytes32 role = token.ENFORCER_ROLE();
        vm.prank(outsider);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, outsider, role)
        );
        token.forcedTransfer(buyer, buyer2, lotId, 1);
    }

    // ----------------------------------------------------------------- views

    function test_SupportsInterface_ERC7943MultiToken() public view {
        assertTrue(token.supportsInterface(0x41c4fbad));
        assertEq(type(IERC7943MultiToken).interfaceId, bytes4(0x41c4fbad));
    }

    function test_CanTransfer_ReflectsStateAndFreezes() public {
        vm.prank(minter);
        token.mint(buyer, lotId, 10);
        assertTrue(token.canTransfer(buyer, buyer2, lotId, 10));
        assertFalse(token.canTransfer(buyer, outsider, lotId, 1));
        assertFalse(token.canTransfer(buyer, buyer2, lotId, 11));

        vm.prank(enforcer);
        token.setFrozenTokens(buyer, lotId, 10);
        assertFalse(token.canTransfer(buyer, buyer2, lotId, 1));
    }

    function test_CanSendCanReceive() public view {
        assertTrue(token.canSend(buyer));
        assertTrue(token.canReceive(buyer));
        assertFalse(token.canSend(outsider));
        assertTrue(token.canReceive(address(redemptionManager))); // system address
    }
}
