// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC734} from "./IERC734.sol";
import {IERC735} from "./IERC735.sol";

/// @title IIdentity — combined ERC-734 + ERC-735 identity (OnchainID-compatible).
interface IIdentity is IERC734, IERC735 {}
