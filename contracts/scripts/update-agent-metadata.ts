import { ethers } from "hardhat";

async function main() {
  const agentIdentityAddress = process.env.SENTINEL_AGENT_IDENTITY_ADDRESS;
  const tokenUri = process.env.SENTINEL_AGENT_TOKEN_URI;

  if (!agentIdentityAddress) {
    throw new Error("Missing SENTINEL_AGENT_IDENTITY_ADDRESS in contracts/.env");
  }

  if (!tokenUri) {
    throw new Error("Missing SENTINEL_AGENT_TOKEN_URI in contracts/.env");
  }

  const agentIdentity = await ethers.getContractAt(
    "SentinelAgentIdentity",
    agentIdentityAddress,
  );

  const tx = await agentIdentity.updateAgentMetadata(1, tokenUri);
  console.log("metadata update tx:", tx.hash);

  await tx.wait();

  console.log("updated token 1 uri:", tokenUri);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});