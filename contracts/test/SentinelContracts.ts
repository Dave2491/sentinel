import { expect } from "chai";
import { ethers } from "hardhat";

const parseUSDC = (value: string) => ethers.parseUnits(value, 6);

async function deployFixture() {
  const [owner, user, other, safeStrategy, unsafeStrategy] = await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(owner.address);

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

    await expect(strategyVault.connect(user).requestRebalance(safeStrategy.address, amount, 2_500, "rec-safe-001"))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 2_500, "rec-safe-001");

    expect(await strategyVault.simulatedStrategyBalances(safeStrategy.address)).to.equal(amount);
  });

  it("judge wallet can submit a mandate test that is blocked by policy", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("100");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 1_000);

    await expect(strategyVault.connect(user).requestRebalance(safeStrategy.address, amount, 2_500, "rec-risk-001"))
      .to.emit(strategyVault, "AllocationBlocked")
      .withArgs(
        safeStrategy.address,
        amount,
        2_500,
        "rec-risk-001",
        "Requested allocation exceeds policy limit",
      );

    expect(await strategyVault.simulatedStrategyBalances(safeStrategy.address)).to.equal(0);
  });

  it("rebalance emits the correct event", async function () {
    const { user, safeStrategy, executionGuard, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await executionGuard.setStrategyPolicy(safeStrategy.address, true, 2_000);

    await expect(strategyVault.connect(user).requestRebalance(safeStrategy.address, amount, 1_500, "rec-event-001"))
      .to.emit(strategyVault, "AllocationExecuted")
      .withArgs(safeStrategy.address, amount, 1_500, "rec-event-001");
  });

  it("blocked allocation emits the correct reason", async function () {
    const { user, unsafeStrategy, strategyVault } = await deployFixture();
    const amount = parseUSDC("75");

    await expect(strategyVault.connect(user).requestRebalance(unsafeStrategy.address, amount, 500, "rec-blocked-001"))
      .to.emit(strategyVault, "AllocationBlocked")
      .withArgs(unsafeStrategy.address, amount, 500, "rec-blocked-001", "Strategy is not approved");
  });
});
