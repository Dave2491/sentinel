// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ExecutionGuard} from "./ExecutionGuard.sol";

contract StrategyVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable treasuryAsset;
    ExecutionGuard public immutable executionGuard;

    uint256 public totalDeposits;
    mapping(address => uint256) public simulatedStrategyBalances;

    event Deposited(address indexed depositor, uint256 amount);

    event AllocationExecuted(
        address indexed strategy,
        uint256 amount,
        uint256 requestedAllocationBps,
        bytes32 aiRationaleHash,
        string recommendationId
    );

    event AllocationBlocked(
        address indexed strategy,
        uint256 amount,
        uint256 requestedAllocationBps,
        bytes32 aiRationaleHash,
        string recommendationId,
        string reason
    );

    error ZeroAmount();

    constructor(address asset, address guard, address initialOwner) Ownable(initialOwner) {
        treasuryAsset = IERC20(asset);
        executionGuard = ExecutionGuard(guard);
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        totalDeposits += amount;
        treasuryAsset.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    function requestRebalance(
        address strategy,
        uint256 amount,
        uint256 requestedAllocationBps,
        bytes32 aiRationaleHash,
        string calldata recommendationId
    ) external returns (bool executed) {
        if (amount == 0) revert ZeroAmount();

        (bool valid, string memory reason) = executionGuard.validateAllocation(strategy, requestedAllocationBps);

        if (!valid) {
            emit AllocationBlocked(strategy, amount, requestedAllocationBps, aiRationaleHash, recommendationId, reason);
            return false;
        }

        simulatedStrategyBalances[strategy] += amount;

        emit AllocationExecuted(strategy, amount, requestedAllocationBps, aiRationaleHash, recommendationId);
        return true;
    }
}