// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TestEURe} from "../../src/testing/TestEURe.sol";

/// @dev The demonstration payment token: 18 decimals, a rate-limited public faucet and an
///      owner mint used by the seed. Everything here is test-asset behaviour, not money.
contract TestEUReTest is Test {
    TestEURe internal eure;

    address internal owner = makeAddr("owner");
    address internal visitor = makeAddr("visitor");
    address internal other = makeAddr("other");

    function setUp() public {
        vm.chainId(84532); // Base Sepolia
        eure = new TestEURe(owner);
    }

    function test_Metadata() public view {
        assertEq(eure.decimals(), 18);
        assertEq(eure.symbol(), "tEURe");
        assertEq(eure.name(), "Palissage Test EUR");
        assertEq(eure.VERSION(), "1.0.0-mvp");
        assertEq(eure.FAUCET_AMOUNT(), 5_000e18);
        assertEq(eure.FAUCET_COOLDOWN(), 1 days);
    }

    // ------------------------------------------------------------ chain guard

    function test_Constructor_AllowsBaseSepoliaAndLocal() public {
        vm.chainId(84532);
        assertEq(new TestEURe(owner).decimals(), 18);
        vm.chainId(31337);
        assertEq(new TestEURe(owner).decimals(), 18);
    }

    function test_Constructor_RejectsOtherChains() public {
        uint256[4] memory forbidden = [uint256(1), 8453, 42161, 421614];
        for (uint256 i = 0; i < forbidden.length; i++) {
            vm.chainId(forbidden[i]);
            vm.expectRevert(abi.encodeWithSelector(TestEURe.UnsupportedTestChain.selector, forbidden[i]));
            new TestEURe(owner);
        }
    }

    // ----------------------------------------------------------------- faucet

    function test_Claim_MintsFaucetAmount() public {
        vm.prank(visitor);
        eure.claim();
        assertEq(eure.balanceOf(visitor), eure.FAUCET_AMOUNT());
        assertEq(eure.totalSupply(), eure.FAUCET_AMOUNT());
    }

    function test_Claim_EmitsFaucetClaimed() public {
        vm.expectEmit(true, false, false, true, address(eure));
        emit TestEURe.FaucetClaimed(visitor, 5_000e18);
        vm.prank(visitor);
        eure.claim();
    }

    function test_Claim_RevertsInsideCooldown() public {
        vm.warp(1_000_000);
        vm.prank(visitor);
        eure.claim();

        uint256 availableAt = 1_000_000 + eure.FAUCET_COOLDOWN();
        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(TestEURe.FaucetCooldownActive.selector, visitor, availableAt));
        eure.claim();

        // One second before the cooldown ends it is still refused.
        vm.warp(availableAt - 1);
        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(TestEURe.FaucetCooldownActive.selector, visitor, availableAt));
        eure.claim();
    }

    function test_Claim_AllowedAfterCooldown() public {
        vm.warp(1_000_000);
        vm.prank(visitor);
        eure.claim();

        vm.warp(1_000_000 + eure.FAUCET_COOLDOWN());
        vm.prank(visitor);
        eure.claim();
        assertEq(eure.balanceOf(visitor), 2 * eure.FAUCET_AMOUNT());
    }

    /// @dev `hasClaimed` is tracked separately so a first claim at timestamp 0 (possible on a
    ///      local chain) cannot be repeated straight away.
    function test_Claim_AtTimestampZeroStartsCooldown() public {
        vm.warp(0);
        vm.prank(visitor);
        eure.claim();
        assertEq(eure.faucetAvailableAt(visitor), eure.FAUCET_COOLDOWN());

        uint256 availableAt = eure.FAUCET_COOLDOWN();
        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(TestEURe.FaucetCooldownActive.selector, visitor, availableAt));
        eure.claim();
    }

    function test_FaucetAvailableAt_ZeroBeforeFirstClaim() public {
        assertEq(eure.faucetAvailableAt(visitor), 0);
        vm.warp(500);
        vm.prank(visitor);
        eure.claim();
        assertEq(eure.faucetAvailableAt(visitor), 500 + eure.FAUCET_COOLDOWN());
        // The cooldown is per address.
        assertEq(eure.faucetAvailableAt(other), 0);
    }

    // ------------------------------------------------------------- owner mint

    function test_Mint_OnlyOwner() public {
        vm.prank(owner);
        eure.mint(visitor, 10_000e18);
        assertEq(eure.balanceOf(visitor), 10_000e18);

        vm.prank(visitor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, visitor));
        eure.mint(visitor, 1);
    }
}
