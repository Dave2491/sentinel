import { ethers, run } from "hardhat";

const deployed = {
  mockUSDC: process.env.MOCK_USDC_ADDRESS ?? "0x32683D42103B44e54eF3c624470C92A343837bCF",
  testnetUSDY: process.env.TESTNET_RWA_ADDRESS ?? "0x0000000000000000000000000000000000000000",
  executionGuard: process.env.EXECUTION_GUARD_ADDRESS ?? "0xeE1F44D2a3a9d2FFa0dCbCDE16a6087DDe0f9465",
  strategyVault: process.env.STRATEGY_VAULT_ADDRESS ?? "0x5F49F2108338902Ae9E4eeba36AFfC1A42D9C265",
  agentIdentity: process.env.SENTINEL_AGENT_IDENTITY_ADDRESS ?? "0x0000000000000000000000000000000000000000",
};

async function getOwnerAddress() {
  if (process.env.SENTINEL_OWNER_ADDRESS) {
    return process.env.SENTINEL_OWNER_ADDRESS;
  }

  const [deployer] = await ethers.getSigners();
  return deployer.address;
}

async function verifyContract(address: string, constructorArguments: unknown[]) {
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes("already verified")) {
      console.log(`${address} is already verified`);
      return;
    }

    throw error;
  }
}

async function main() {
  const owner = await getOwnerAddress();

  console.log("Verifying Sentinel contracts on Mantle Sepolia...");
  console.log("Constructor owner:", owner);

  await verifyContract(deployed.mockUSDC, [owner]);
  if (deployed.testnetUSDY !== "0x0000000000000000000000000000000000000000") {
    await verifyContract(deployed.testnetUSDY, [owner, ethers.id("sentinel:ondo-usdy-mantle-passport:v1")]);
  }
  await verifyContract(deployed.executionGuard, [owner]);
  await verifyContract(deployed.strategyVault, [
    deployed.mockUSDC,
    deployed.executionGuard,
    owner,
  ]);
  if (deployed.agentIdentity !== "0x0000000000000000000000000000000000000000") {
    await verifyContract(deployed.agentIdentity, [owner]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
