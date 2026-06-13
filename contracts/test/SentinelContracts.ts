import { expect } from "chai";
import { ethers } from "hardhat";

const parseUSDC = (value: string) => ethers.parseUnits(value, 6);
const rationaleHash = ethers.id("sentinel-demo-rationale");
const rwaAssetId = "ondo-usdy-mantle-testnet-mirror";
const assetPassportHash = ethers.id("sentinel:ondo-usdy-mantle-passport:v1");
const complianceAttestationHash = ethers.id("sentinel:ai-compliance-attestation:v1");

function rebalanceArgs(strategy: string, amount: bigint, requestedAllocationBps: number, recommendationId: string) {
  return [
    strategy,
    amount,
    requestedAllocationBps,
    rationaleHash,
    rwaAssetId,
    assetPassportHash,
    complianceAttestationHash,
    recommendationId,
  ] as const;
}

async function deployFixture() {
  const [owner, user, other, safeStrategy, unsafeStrategy] = await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(owner.address);

  const TestnetUSDY = await ethers.getContractFactory("TestnetUSDY");
  const testnetUSDY = await TestnetUSDY.deploy(owner.address, assetPassportHash);

  const ExecutionGuard = await ethers.getContractFactory("ExecutionGuard");
  const executionGuard = await ExecutionGuard.deploy(owner.address);

  const StrategyVault = await ethers.getContractFactory("StrategyVault");
  const strategyVault = await StrategyVault.deploy(
    await mockUSDC.getAddress(),
    await executionGuard.getAddress(),
    owner.address,
  );

  return {
    owner,
    user,
    other,
    safeStrategy,
    unsafeStrategy,
    mockUSDC,
    testnetUSDY,
    executionGuard,
    strategyVault,
  };
}

describe("MockUSDC", function () {
  it("deploys correctly", async function () {
    const { owner, mockUSDC } = await deployFixture();

    expect(await mockUSDC.name()).to.equal("Mock USDC");
    expect(await mockUSDC.symbol()).to.equal("mUSDC");
    expect(await mockUSDC.decimals()).to.equal(6);
    expect(await mockUSDC.balanceOf(owner.address)).to.equal(parseUSDC("10000000"));
  });

  it("any wallet can mint test liquidity", async function () {
    const { user, mockUSDC } = await deployFixture();
    const amount = parseUSDC("1000");

    await expect(mockUSDC.connect(user).mint(user.address, amount)).to.changeTokenBalance(mockUSDC, user, amount);
  });

  it("faucet mint rejects amounts above the demo limit", async function () {
    const { user, mockUSDC } = await deployFixture();
    const requested = parseUSDC("100001");
    const limit = parseUSDC("100000");

    await expect(mockUSDC.connect(user).mint(user.address, requested))
      .to.be.revertedWithCustomError(mockUSDC, "FaucetMintTooLarge")
      .withArgs(requested, limit);
  });
});

describe("TestnetUSDY", function () {
  it("deploys as a non-redeemable RWA mirror with a passport hash", async function () {
    const { owner, testnetUSDY } = await deployFixture();

    expect(await testnetUSDY.name()).to.equal("Sentinel Testnet USDY Mirror");
    expect(await testnetUSDY.symbol()).to.equal("tUSDY");
    expect(await testnetUSDY.assetPassportHash()).to.equal(assetPassportHash);
    expect(await testnetUSDY.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000", 18));
    expect(await testnetUSDY.MIRROR_NOTICE()).to.contain("Testnet mirror only");
  });

  it("allows capped testnet mirror minting", async function () {
    const { user, testnetUSDY } = await deployFixture();
    const amount = ethers.parseUnits("100", 18);

    await expect(testnetUSDY.connect(user).mint(user.address, amount)).to.changeTokenBalance(testnetUSDY, user, amount);
  });
});

describe("ExecutionGuard", function () {
  it("owner can approve a strategy", async function () {
    const { safeStrategy, executionGuard } = await deployFixture();

    await expect(executionGuard.setStrategyPolicy(safeStrategy.address, true, 3_000))
      .to.emit(executionGuard, "StrategyPolicyUpdated")
      .withArgs(safeStrategy.address, true, 3_000);

    const policy = await executionGuard.strategyPolicies(safeStrategy.address);
    expect(policy.approved).to.equal(true);
    expect(policy.maxAllocationBps).to.equal(3_000);
  });

  it("non-owner cannot approve a strategy", async function () {
    const { user, safeStrategy, executionGuard } = await deployFixture();

    await expect(executionGuard.connect(user).setStrategyPolicy(safeStrategy.address, true, 3_000))
      .to.be.revertedWithCustomError(executionGuard, "OwnableUnauthorizedAccount")
      .withArgs(user.address);
  });

  it("approved strategy passes validation", async function () {
    const { safeStrategy, executionGuard } = await deployFixture();

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 3_000);
    const [valid, reason] = await executionGuard.validateAllocation(safeStrategy.address, 2_500);

    expect(valid).to.equal(true);
    expect(reason).to.equal("Allocation passes treasury policy");
  });

  it("unapproved strategy fails validation", async function () {
    const { unsafeStrategy, executionGuard } = await deployFixture();

    const [valid, reason] = await executionGuard.validateAllocation(unsafeStrategy.address, 500);

    expect(valid).to.equal(false);
    expect(reason).to.equal("Strategy is not approved");
  });

  it("allocation above max BPS fails validation", async function () {
    const { safeStrategy, executionGuard } = await deployFixture();

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 1_000);
    const [valid, reason] = await executionGuard.validateAllocation(safeStrategy.address, 1_001);

    expect(valid).to.equal(false);
    expect(reason).to.equal("Requested allocation exceeds policy limit");
  });

  it("allocation within max BPS passes validation", async function () {
    const { safeStrategy, executionGuard } = await deployFixture();

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 1_000);
    const [valid, reason] = await executionGuard.validateAllocation(safeStrategy.address, 1_000);

    expect(valid).to.equal(true);
    expect(reason).to.equal("Allocation passes treasury policy");
  });
});

describe("StrategyVault", function () {
  it("user can deposit MockUSDC", async function () {
    const { user, mockUSDC, strategyVault } = await deployFixture();
    const amount = parseUSDC("500");

    await mockUSDC.mint(user.address, amount);
    await mockUSDC.connect(user).approve(await strategyVault.getAddress(), amount);

    await expect(strategyVault.connect(user).deposit(amount))
      .to.emit(strategyVault, "Deposited")
      .withArgs(user.address, amount);
  });

  it("vault records deposited balance", async function () {
    const { user, mockUSDC, strategyVault } = await deployFixture();
    const amount = parseUSDC("500");

    await mockUSDC.mint(user.address, amount);
    await mockUSDC.connect(user).approve(await strategyVault.getAddress(), amount);
    await strategyVault.connect(user).deposit(amount);

    expect(await strategyVault.totalDeposits()).to.equal(amount);
    expect(await mockUSDC.balanceOf(await strategyVault.getAddress())).to.equal(amount);
  });

  it("judge wallet can submit a policy-cleared rebalance", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("100");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 3_000);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 2_500, "rec-safe-001")))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 2_500, rationaleHash, "rec-safe-001");

    expect(await strategyVault.simulatedStrategyBalances(safeStrategy.address)).to.equal(amount);
  });

  it("judge wallet can submit a mandate test that is blocked by policy", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("100");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 1_000);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 2_500, "rec-risk-001")))
      .to.emit(strategyVault, "AllocationBlocked")
      .withArgs(
        safeStrategy.address,
        amount,
        2_500,
        rationaleHash,
        "rec-risk-001",
        "Requested allocation exceeds policy limit",
      );

    expect(await strategyVault.simulatedStrategyBalances(safeStrategy.address)).to.equal(0);
  });

  it("rebalance emits the correct event", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-event-001")))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 1_500, rationaleHash, "rec-event-001");
  });

  it("blocked allocation emits the correct reason", async function () {
    const { user, unsafeStrategy, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(unsafeStrategy.address, amount, 500, "rec-blocked-001")))
      .to.emit(strategyVault, "AllocationBlocked")
      .withArgs(unsafeStrategy.address, amount, 500, rationaleHash, "rec-blocked-001", "Strategy is not approved");
  });

  it("can require authorized operators for production mode", async function () {
    const { owner, user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);
    await strategyVault.setExecutionControls(true, false);

    await expect(
      strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-operator-001")),
    )
      .to.be.revertedWithCustomError(strategyVault, "UnauthorizedOperator")
      .withArgs(user.address);

    await expect(strategyVault.connect(owner).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-operator-002")))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 1_500, rationaleHash, "rec-operator-002");
  });

  it("owner can authorize a treasury operator", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);
    await expect(strategyVault.setOperator(user.address, true))
      .to.emit(strategyVault, "OperatorUpdated")
      .withArgs(user.address, true);
    await strategyVault.setExecutionControls(true, false);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-operator-003")))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 1_500, rationaleHash, "rec-operator-003");
  });

  it("can require vault balance coverage for production mode", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);
    await strategyVault.setExecutionControls(false, true);

    await expect(
      strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-balance-001")),
    )
      .to.be.revertedWithCustomError(strategyVault, "InsufficientVaultBalance")
      .withArgs(amount, 0);
  });

  it("anchors audit evidence before the allocation verdict", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-audit-001")))
      .to.emit(strategyVault, "AuditEvidenceAnchored")
      .withArgs("rec-audit-001", rationaleHash, "rwa-treasury-policy-v0.3");
  });

  it("anchors RWA passport and compliance evidence before the allocation verdict", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);

    await expect(strategyVault.connect(user).requestRebalance(...rebalanceArgs(safeStrategy.address, amount, 1_500, "rec-rwa-001")))
      .to.emit(strategyVault, "RwaEvidenceAnchored")
      .withArgs(
        "rec-rwa-001",
        rwaAssetId,
        assetPassportHash,
        complianceAttestationHash,
        "rwa-treasury-policy-v0.3",
      );
  });
});
