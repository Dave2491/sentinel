// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ExecutionGuard is Ownable {
    uint256 public constant BPS = 10_000;

    struct StrategyPolicy {
        bool approved;
        uint256 maxAllocationBps;
    }

    mapping(address => StrategyPolicy) public strategyPolicies;

    event StrategyPolicyUpdated(address indexed strategy, bool approved, uint256 maxAllocationBps);

    error StrategyNotApproved(address strategy);
    error AllocationTooHigh(address strategy, uint256 requestedBps, uint256 maxBps);
    error InvalidAllocationLimit();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setStrategyPolicy(address strategy, bool approved, uint256 maxAllocationBps) external onlyOwner {
        if (maxAllocationBps > BPS) revert InvalidAllocationLimit();

        strategyPolicies[strategy] = StrategyPolicy({
            approved: approved,
            maxAllocationBps: maxAllocationBps
        });

        emit StrategyPolicyUpdated(strategy, approved, maxAllocationBps);
    }

    function validateAllocation(
        address strategy,
        uint256 requestedAllocationBps
    ) external view returns (bool valid, string memory reason) {
        StrategyPolicy memory policy = strategyPolicies[strategy];

        if (!policy.approved) {
            return (false, "Strategy is not approved");
        }

        if (requestedAllocationBps > policy.maxAllocationBps) {
            return (false, "Requested allocation exceeds policy limit");
        }

        return (true, "Allocation passes treasury policy");
    }

    function validateAllocationOrRevert(address strategy, uint256 requestedAllocationBps) external view {
        StrategyPolicy memory policy = strategyPolicies[strategy];

        if (!policy.approved) revert StrategyNotApproved(strategy);
        if (requestedAllocationBps > policy.maxAllocationBps) {
            revert AllocationTooHigh(strategy, requestedAllocationBps, policy.maxAllocationBps);
        }
    }
}
