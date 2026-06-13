// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ExecutionGuard} from "./ExecutionGuard.sol";

contract StrategyVault is Ownable {
    using SafeERC20 for IERC20;

    string public constant POLICY_VERSION = "rwa-treasury-policy-v0.3";

    IERC20 public immutable treasuryAsset;
    ExecutionGuard public immutable executionGuard;

    uint256 public totalDeposits;
    bool public operatorControlsEnabled;
    bool public depositCapEnabled;
    mapping(address => uint256) public simulatedStrategyBalances;
    mapping(address => bool) public authorizedOperators;

    event Deposited(address indexed depositor, uint256 amount);
    event OperatorUpdated(address indexed operator, bool authorized);
    event ExecutionControlsUpdated(bool operatorControlsEnabled, bool depositCapEnabled);
    event AuditEvidenceAnchored(string recommendationId, bytes32 aiRationaleHash, string policyVersion);
    event RwaEvidenceAnchored(
        string recommendationId,
        string rwaAssetId,
        bytes32 assetPassportHash,
        bytes32 complianceAttestationHash,
        string policyVersion
    );

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
    error UnauthorizedOperator(address operator);
    error InsufficientVaultBalance(uint256 requested, uint256 available);

    constructor(address asset, address guard, address initialOwner) Ownable(initialOwner) {
        treasuryAsset = IERC20(asset);
        executionGuard = ExecutionGuard(guard);
        authorizedOperators[initialOwner] = true;
    }

    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        totalDeposits += amount;
        treasuryAsset.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    function setOperator(address operator, bool authorized) external onlyOwner {
        authorizedOperators[operator] = authorized;
        emit OperatorUpdated(operator, authorized);
    }

    function setExecutionControls(bool requireAuthorizedOperator, bool requireVaultBalance) external onlyOwner {
        operatorControlsEnabled = requireAuthorizedOperator;
        depositCapEnabled = requireVaultBalance;
        emit ExecutionControlsUpdated(requireAuthorizedOperator, requireVaultBalance);
    }

    function requestRebalance(
        address strategy,
        uint256 amount,
        uint256 requestedAllocationBps,
        bytes32 aiRationaleHash,
        string calldata rwaAssetId,
        bytes32 assetPassportHash,
        bytes32 complianceAttestationHash,
        string calldata recommendationId
    ) external returns (bool executed) {
        if (amount == 0) revert ZeroAmount();
        if (operatorControlsEnabled && !authorizedOperators[msg.sender]) {
            revert UnauthorizedOperator(msg.sender);
        }
        if (depositCapEnabled) {
            uint256 available = treasuryAsset.balanceOf(address(this));
            if (amount > available) {
                revert InsufficientVaultBalance(amount, available);
            }
        }

        emit RwaEvidenceAnchored(
            recommendationId,
            rwaAssetId,
            assetPassportHash,
            complianceAttestationHash,
            POLICY_VERSION
        );
        emit AuditEvidenceAnchored(recommendationId, aiRationaleHash, POLICY_VERSION);

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
