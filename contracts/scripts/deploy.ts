import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  let nonce = await deployer.getNonce("pending");

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address, { nonce: nonce++ });
  await mockUSDC.waitForDeployment();

  const ExecutionGuard = await ethers.getContractFactory("ExecutionGuard");
  const executionGuard = await ExecutionGuard.deploy(deployer.address, { nonce: nonce++ });
  await executionGuard.waitForDeployment();

  const StrategyVault = await ethers.getContractFactory("StrategyVault");
  const strategyVault = await StrategyVault.deploy(
    await mockUSDC.getAddress(),
    await executionGuard.getAddress(),
    deployer.address,
    { nonce: nonce++ },
  );
  await strategyVault.waitForDeployment();

  const SentinelAgentIdentity = await ethers.getContractFactory("SentinelAgentIdentity");
  const agentIdentity = await SentinelAgentIdentity.deploy(deployer.address, { nonce: nonce++ });
  await agentIdentity.waitForDeployment();

  // Placeholder strategy contracts. Sentinel only needs strategy addresses for
  // policy validation at this phase; no real yield protocol logic is deployed.
  const StrategyPlaceholder = new ethers.ContractFactory([], "0x00", deployer);

  const safeStrategy = await StrategyPlaceholder.deploy({ nonce: nonce++ });
  await safeStrategy.waitForDeployment();

  const unsafeStrategy = await StrategyPlaceholder.deploy({ nonce: nonce++ });
  await unsafeStrategy.waitForDeployment();

  await executionGuard.setStrategyPolicy(await safeStrategy.getAddress(), true, 4_000, { nonce: nonce++ });
  await executionGuard.setStrategyPolicy(await unsafeStrategy.getAddress(), true, 1_000, { nonce: nonce++ });

  console.log("MockUSDC:", await mockUSDC.getAddress());
  console.log("ExecutionGuard:", await executionGuard.getAddress());
  console.log("StrategyVault:", await strategyVault.getAddress());
  console.log("SentinelAgentIdentity:", await agentIdentity.getAddress());
  console.log("safeStrategy:", await safeStrategy.getAddress());
  console.log("unsafeStrategy:", await unsafeStrategy.getAddress());

  console.log("\nFrontend env:");
  console.log(`VITE_MOCK_USDC_ADDRESS=${await mockUSDC.getAddress()}`);
  console.log(`VITE_EXECUTION_GUARD_ADDRESS=${await executionGuard.getAddress()}`);
  console.log(`VITE_STRATEGY_VAULT_ADDRESS=${await strategyVault.getAddress()}`);
  console.log(`VITE_SENTINEL_AGENT_IDENTITY_ADDRESS=${await agentIdentity.getAddress()}`);
  console.log(`VITE_SAFE_STRATEGY_ADDRESS=${await safeStrategy.getAddress()}`);
  console.log(`VITE_UNSAFE_STRATEGY_ADDRESS=${await unsafeStrategy.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});