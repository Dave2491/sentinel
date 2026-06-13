import { isAddress, type Address } from "viem";

export const mockUSDCAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const strategyVaultAbi = [
  {
    type: "function",
    name: "totalDeposits",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "simulatedStrategyBalances",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
 
 {
  type: "function",
  name: "requestRebalance",
  stateMutability: "nonpayable",
  inputs: [
    { name: "strategy", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "requestedAllocationBps", type: "uint256" },
    { name: "aiRationaleHash", type: "bytes32" },
    { name: "rwaAssetId", type: "string" },
    { name: "assetPassportHash", type: "bytes32" },
    { name: "complianceAttestationHash", type: "bytes32" },
    { name: "recommendationId", type: "string" },
  ],
  outputs: [{ name: "executed", type: "bool" }],
},
  {
  type: "event",
  name: "AllocationExecuted",
  inputs: [
    { name: "strategy", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "requestedAllocationBps", type: "uint256", indexed: false },
    { name: "aiRationaleHash", type: "bytes32", indexed: false },
    { name: "recommendationId", type: "string", indexed: false },
  ],
},
  {
  type: "event",
  name: "AllocationBlocked",
  inputs: [
    { name: "strategy", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "requestedAllocationBps", type: "uint256", indexed: false },
    { name: "aiRationaleHash", type: "bytes32", indexed: false },
    { name: "recommendationId", type: "string", indexed: false },
    { name: "reason", type: "string", indexed: false },
  ],
},
  {
  type: "event",
  name: "RwaEvidenceAnchored",
  inputs: [
    { name: "recommendationId", type: "string", indexed: false },
    { name: "rwaAssetId", type: "string", indexed: false },
    { name: "assetPassportHash", type: "bytes32", indexed: false },
    { name: "complianceAttestationHash", type: "bytes32", indexed: false },
    { name: "policyVersion", type: "string", indexed: false },
  ],
},
] as const;

function envAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? value : undefined;
}

export const sentinelContracts = {
  mockUSDC: envAddress(import.meta.env.VITE_MOCK_USDC_ADDRESS),
  testnetRwa: envAddress(import.meta.env.VITE_TESTNET_RWA_ADDRESS),
  executionGuard: envAddress(import.meta.env.VITE_EXECUTION_GUARD_ADDRESS),
  strategyVault: envAddress(import.meta.env.VITE_STRATEGY_VAULT_ADDRESS),
  safeStrategy: envAddress(import.meta.env.VITE_SAFE_STRATEGY_ADDRESS),
  unsafeStrategy: envAddress(import.meta.env.VITE_UNSAFE_STRATEGY_ADDRESS),
};

export const contractsConfigured = Boolean(
  sentinelContracts.mockUSDC &&
    sentinelContracts.testnetRwa &&
    sentinelContracts.strategyVault &&
    sentinelContracts.safeStrategy &&
    sentinelContracts.unsafeStrategy,
);
