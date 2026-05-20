import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  decodeEventLog,
  formatUnits,
  keccak256,
  parseUnits,
  stringToHex,
  type Hex,
} from "viem";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  CircleDollarSign,
  Cpu,
  ExternalLink,
  FileClock,
  Gauge,
  Menu,
  Radio,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  decisions as initialDecisions,
  deriveTreasurySignalEngine,
  performanceData,
  policies,
  strategies as initialStrategies,
  type PolicyStatus,
  type RecommendationSignal,
  type SignalState,
  type RiskLevel,
  type Strategy,
  type TreasuryPosture,
  type TreasurySignalEngine,
} from "./data/treasury";
import {
  contractsConfigured,
  mockUSDCAbi,
  sentinelContracts,
  strategyVaultAbi,
} from "./contracts";
import {
  fetchMarketSignals,
  getLoadingMarketSignals,
  seededMarketSignals,
  type MarketSignalMap,
  type StrategyMarketSignal,
} from "./data/marketSignals";
import {
  buildDeterministicTreasurySummary,
  fetchAiTreasuryRationale,
  type TreasuryRationaleContext,
} from "./lib/aiRationale";
import mantleLogoUrl from "./assets/mantle-logo.png";
import sentinelLogoUrl from "./assets/sentinel-logo.png";

type DecisionSeverity = "blocked" | "pending" | "success";
type DecisionAuditStatus = "approved" | "pending" | "blocked";
type DecisionAuditFilter = "all" | DecisionAuditStatus;

type Decision = {
  time: string;
  seededOffsetMinutes?: number;
  title: string;
  detail: string;
  result: string;
  severity: DecisionSeverity;
  auditStatus?: DecisionAuditStatus;
  reasoningSummary?: string;
  confidence?: number;
  treasuryPosture?: TreasuryPosture;
  signalState?: string;
  txHash?: Hex;
  executionStatus?: string;
  chainLabel?: string;
};

type PendingAction = "safe" | "unsafe" | "mint" | null;

type SimulationStatus = {
  kind: "idle" | "checking" | "success" | "blocked";
  message: string;
  detail?: string;
  txHash?: Hex;
};

type ContractTelemetry = {
  configured: boolean;
  isLoading: boolean;
  vaultBalance: string;
  totalDeposits: string;
  safeStrategyBalance: string;
  unsafeStrategyBalance: string;
  walletUSDC: string;
};

const CHAIN_LABEL = "Mantle Sepolia";
const MANTLESCAN_BASE_URL = "https://sepolia.mantlescan.xyz";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const allocationColors = ["#dce7f4", "#46d4a8", "#7da7ff", "#f0b35d"];

const riskStyles: Record<RiskLevel, string> = {
  Low: "border-mantle/25 bg-mantle/10 text-mantle",
  Medium: "border-blue-300/20 bg-blue-300/10 text-blue-200",
  High: "border-amber/25 bg-amber/10 text-amber",
};

const statusStyles: Record<PolicyStatus, string> = {
  Compliant: "text-mantle",
  Watch: "text-blue-200",
  Blocked: "text-danger",
};

function App() {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const [strategyState, setStrategyState] = useState<Strategy[]>(initialStrategies);
  const [decisionLog, setDecisionLog] = useState<Decision[]>(() => hydrateSeededDecisionTimeline(initialDecisions as Decision[]));
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [safeExecuted, setSafeExecuted] = useState(false);
  const [submittedHash, setSubmittedHash] = useState<Hex | undefined>();
  const [handledHash, setHandledHash] = useState<Hex | undefined>();
  const [marketSignals, setMarketSignals] = useState<MarketSignalMap>(seededMarketSignals);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>({
    kind: "idle",
    message: contractsConfigured ? "Policy-aware execution ready." : "Demo treasury book active.",
    detail: contractsConfigured
      ? "Recommendations are evaluated against mandates before StrategyVault submission."
      : "Seeded portfolio and policy signals are live. Add Mantle Sepolia contract addresses to enable execution.",
  });
  const { writeContractAsync } = useWriteContract();
  const {
    data: receipt,
    isLoading: isReceiptPending,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: submittedHash,
  });

  const { data: contractReads, isLoading: contractReadsLoading, refetch: refetchContractReads } = useReadContracts({
    contracts: contractsConfigured
      ? [
          {
            address: sentinelContracts.mockUSDC!,
            abi: mockUSDCAbi,
            functionName: "balanceOf",
            args: [sentinelContracts.strategyVault!],
          },
          {
            address: sentinelContracts.strategyVault!,
            abi: strategyVaultAbi,
            functionName: "totalDeposits",
          },
          {
            address: sentinelContracts.strategyVault!,
            abi: strategyVaultAbi,
            functionName: "simulatedStrategyBalances",
            args: [sentinelContracts.safeStrategy!],
          },
          {
            address: sentinelContracts.strategyVault!,
            abi: strategyVaultAbi,
            functionName: "simulatedStrategyBalances",
            args: [sentinelContracts.unsafeStrategy!],
          },
        ]
      : [],
    query: {
      enabled: contractsConfigured,
      refetchInterval: 10_000,
    },
  });

  const {
    data: walletUSDCBalance,
    isLoading: walletUSDCLoading,
    refetch: refetchWalletUSDC,
  } = useReadContract({
    address: sentinelContracts.mockUSDC,
    abi: mockUSDCAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: contractsConfigured && Boolean(address),
      refetchInterval: 10_000,
    },
  });

  const contractTelemetry = useMemo<ContractTelemetry>(() => {
    const vaultBalance = contractReads?.[0]?.result;
    const totalDeposits = contractReads?.[1]?.result;
    const safeStrategyBalance = contractReads?.[2]?.result;
    const unsafeStrategyBalance = contractReads?.[3]?.result;

    return {
      configured: contractsConfigured,
      isLoading: contractReadsLoading || walletUSDCLoading,
      vaultBalance: typeof vaultBalance === "bigint" ? formatUnits(vaultBalance, 6) : "0",
      totalDeposits: typeof totalDeposits === "bigint" ? formatUnits(totalDeposits, 6) : "0",
      safeStrategyBalance: typeof safeStrategyBalance === "bigint" ? formatUnits(safeStrategyBalance, 6) : "0",
      unsafeStrategyBalance: typeof unsafeStrategyBalance === "bigint" ? formatUnits(unsafeStrategyBalance, 6) : "0",
      walletUSDC: typeof walletUSDCBalance === "bigint" ? formatUnits(walletUSDCBalance, 6) : "0",
    };
  }, [contractReads, contractReadsLoading, walletUSDCBalance]);

  const signalEngine = useMemo<TreasurySignalEngine>(
    () => deriveTreasurySignalEngine(strategyState),
    [strategyState],
  );

  useEffect(() => {
    let active = true;

    setMarketSignals(getLoadingMarketSignals());
    fetchMarketSignals(strategyState)
      .then((signals) => {
        if (active) setMarketSignals(signals);
      })
      .catch(() => {
        if (active) setMarketSignals(seededMarketSignals);
      });

    return () => {
      active = false;
    };
  }, [strategyState]);

  useEffect(() => {
    if (!receipt || receipt.transactionHash === handledHash) return;

    setHandledHash(receipt.transactionHash);
    void refetchContractReads();
    void refetchWalletUSDC();

    if (receipt.status === "reverted") {
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: pendingAction === "mint" ? "Mint reverted" : "Execution reverted",
          detail:
            pendingAction === "mint"
              ? "Attempted to mint demo USDC"
              : pendingAction === "unsafe"
                ? "Attempted unsafe allocation through StrategyVault"
                : "Attempted safe allocation through StrategyVault",
          result: "Transaction reverted before policy record finalization.",
          severity: "blocked",
          auditStatus: "blocked",
          txHash: receipt.transactionHash,
          executionStatus: "Reverted",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: signalEngine.signalState,
          confidence: signalEngine.confidence,
          treasuryPosture: signalEngine.posture,
          signalState: signalEngine.signalState,
        },
        ...current.filter((decision) => decision.txHash !== receipt.transactionHash),
      ]);
      setSimulationStatus({
        kind: "blocked",
        message: "Execution reverted.",
        detail: "The transaction was rejected by the contract or wallet.",
        txHash: receipt.transactionHash,
      });
      setPendingAction(null);
      return;
    }

    if (pendingAction === "mint") {
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: "Demo liquidity minted",
          detail: "Minted 10,000 MockUSDC to connected wallet",
          result: `Confirmed on Mantle Sepolia: ${shortHash(receipt.transactionHash)}`,
          severity: "success",
          auditStatus: "approved",
          txHash: receipt.transactionHash,
          executionStatus: "Confirmed",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: "Demo liquidity minted for policy testing; no allocation decision recorded.",
          confidence: signalEngine.confidence,
          treasuryPosture: signalEngine.posture,
          signalState: signalEngine.signalState,
        },
        ...current,
      ]);
      setSimulationStatus({
        kind: "success",
        message: "Demo liquidity confirmed.",
        detail: "Wallet MockUSDC balance refreshed for execution testing.",
        txHash: receipt.transactionHash,
      });
      setPendingAction(null);
      return;
    }

    const parsedEvent = decodeVaultEvent(receipt.logs);

    if (parsedEvent?.name === "AllocationBlocked") {
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: "Execution blocked",
          detail: "Attempted 16% move from USDC Reserve into High Yield LP",
          result: `Blocked by treasury mandate: ${parsedEvent.reason}`,
          severity: "blocked",
          auditStatus: "blocked",
          txHash: receipt.transactionHash,
          executionStatus: "Blocked",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.why,
          confidence: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.confidence,
          treasuryPosture: "Restricted",
          signalState: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.signalState,
        },
        ...current.filter((decision) => decision.txHash !== receipt.transactionHash),
      ]);
      setSimulationStatus({
        kind: "blocked",
        message: "Mandate block recorded.",
        detail: parsedEvent.reason,
        txHash: receipt.transactionHash,
      });
      setPendingAction(null);
      return;
    }

    if (parsedEvent?.name === "AllocationExecuted") {
      setStrategyState((current) =>
        current.map((strategy) => {
          if (strategy.name === "USDC Reserve") {
            return { ...strategy, allocation: Math.max(strategy.allocation - 4, 0), value: strategy.value - 515000 };
          }

          if (strategy.name === "Mantle T-Bill Vault") {
            return { ...strategy, allocation: strategy.allocation + 4, value: strategy.value + 515000 };
          }

          return strategy;
        }),
      );
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: "Recommendation executed",
          detail: "Moved 4% from USDC Reserve into Mantle T-Bill Vault",
          result: `Recorded on Mantle Sepolia: ${shortHash(receipt.transactionHash)}`,
          severity: "success",
          auditStatus: "approved",
          txHash: receipt.transactionHash,
          executionStatus: "Approved",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.why,
          confidence: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.confidence,
          treasuryPosture: signalEngine.posture,
          signalState: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.signalState,
        },
        ...current.filter((decision) => decision.txHash !== receipt.transactionHash),
      ]);
      setSimulationStatus({
        kind: "success",
        message: "Allocation recorded.",
        detail: `StrategyVault confirmed the policy-cleared rebalance in ${shortHash(receipt.transactionHash)}. Session allocation view updated from the confirmed event.`,
        txHash: receipt.transactionHash,
      });
      setSafeExecuted(true);
      setPendingAction(null);
    }
  }, [handledHash, pendingAction, receipt, refetchContractReads, refetchWalletUSDC, signalEngine]);

  useEffect(() => {
    if (!receiptError) return;

    setSimulationStatus({
        kind: "blocked",
        message: "Execution failed.",
        detail: receiptError.message,
    });
    setPendingAction(null);
  }, [receiptError]);

  const executeSafeRecommendation = async () => {
    if (pendingAction || safeExecuted) return;

    if (!contractsConfigured) {
      setSimulationStatus({
        kind: "blocked",
        message: "Execution not configured.",
        detail: "Demo signals remain active. Add Mantle Sepolia contract addresses to submit this recommendation.",
      });
      return;
    }

    if (!isConnected) {
      setSimulationStatus({
        kind: "blocked",
        message: "Wallet connection required.",
        detail: "Connect a wallet on Mantle Sepolia to submit the policy-cleared rebalance.",
      });
      return;
    }

    setPendingAction("safe");
      setSimulationStatus({
        kind: "checking",
        message: "Preparing policy-cleared rebalance.",
        detail: "Review the policy-cleared StrategyVault test request in your wallet.",
      });

    try {
     const recommendationId = `safe-${Date.now()}`;
const rationaleEvidence = `Sentinel approved this rebalance after deterministic policy checks for recommendation ${recommendationId}.`;
const aiRationaleHash: Hex = keccak256(stringToHex(rationaleEvidence));

const hash = await writeContractAsync({
  address: sentinelContracts.strategyVault!,
  abi: strategyVaultAbi,
  functionName: "requestRebalance",
 args: [
  sentinelContracts.safeStrategy!,
  parseUnits("515000", 6),
  3_200n,
  aiRationaleHash,
  recommendationId,
],
});

      setSubmittedHash(hash);
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: "Execution submitted",
          detail: "4% USDC Reserve to Mantle T-Bill Vault",
          result: `Awaiting Mantle Sepolia confirmation: ${shortHash(hash)}`,
          severity: "pending",
          auditStatus: "pending",
          txHash: hash,
          executionStatus: "Pending",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.why,
          confidence: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.confidence,
          treasuryPosture: signalEngine.posture,
          signalState: signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance")?.signalState,
        },
        ...current,
      ]);
      setSimulationStatus({
        kind: "checking",
        message: "Submitted to Mantle Sepolia.",
        detail: `Awaiting StrategyVault confirmation: ${shortHash(hash)}.`,
        txHash: hash,
      });
    } catch (error) {
      setSimulationStatus({
        kind: "blocked",
        message: "Submission cancelled.",
        detail: getErrorMessage(error),
      });
      setPendingAction(null);
    }
  };

  const testUnsafeAllocation = async () => {
    if (pendingAction) return;

    if (!contractsConfigured) {
      setSimulationStatus({
        kind: "blocked",
        message: "Execution not configured.",
        detail: "Demo signals remain active. Add Mantle Sepolia contract addresses to test policy enforcement.",
      });
      return;
    }

    if (!isConnected) {
      setSimulationStatus({
        kind: "blocked",
        message: "Wallet connection required.",
        detail: "Connect a wallet on Mantle Sepolia to submit the mandate test.",
      });
      return;
    }

    setPendingAction("unsafe");
      setSimulationStatus({
        kind: "checking",
        message: "Preparing mandate test.",
        detail: "ExecutionGuard will evaluate the proposed high-risk allocation before recording a verdict.",
      });

    try {
     const recommendationId = `blocked-${Date.now()}`;
const rationaleEvidence = `Sentinel blocked this rebalance after deterministic policy checks for recommendation ${recommendationId}.`;
const aiRationaleHash: Hex = keccak256(stringToHex(rationaleEvidence));

const hash = await writeContractAsync({
  address: sentinelContracts.strategyVault!,
  abi: strategyVaultAbi,
  functionName: "requestRebalance",
  args: [
  sentinelContracts.unsafeStrategy!,
  parseUnits("206000", 6),
  2_400n,
  aiRationaleHash,
  recommendationId,
],
});

      setSubmittedHash(hash);
      setDecisionLog((current) => [
        {
          time: currentTime(),
          title: "Mandate test submitted",
          detail: "16% USDC Reserve to High Yield LP",
          result: `Awaiting ExecutionGuard verdict: ${shortHash(hash)}`,
          severity: "pending",
          auditStatus: "pending",
          txHash: hash,
          executionStatus: "Pending",
          chainLabel: CHAIN_LABEL,
          reasoningSummary: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.why,
          confidence: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.confidence,
          treasuryPosture: "Restricted",
          signalState: signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock")?.signalState,
        },
        ...current,
      ]);
      setSimulationStatus({
        kind: "checking",
        message: "Mandate test submitted.",
        detail: `Awaiting ExecutionGuard verdict: ${shortHash(hash)}.`,
        txHash: hash,
      });
    } catch (error) {
      setSimulationStatus({
        kind: "blocked",
        message: "Submission cancelled.",
        detail: getErrorMessage(error),
      });
      setPendingAction(null);
    }
  };

  const mintDemoUSDC = async () => {
    if (pendingAction) return;

    if (!contractsConfigured || !sentinelContracts.mockUSDC) {
      setSimulationStatus({
        kind: "blocked",
        message: "Test liquidity not configured.",
        detail: "Seeded portfolio remains active. Add VITE_MOCK_USDC_ADDRESS to mint wallet test liquidity.",
      });
      return;
    }

    if (!isConnected || !address) {
      setSimulationStatus({
        kind: "blocked",
        message: "Wallet connection required.",
        detail: "Connect a wallet before minting test liquidity.",
      });
      return;
    }

    setPendingAction("mint");
    setSimulationStatus({
      kind: "checking",
      message: "Preparing test liquidity mint.",
      detail: "Review the MockUSDC mint request in your wallet.",
    });

    try {
      const hash = await writeContractAsync({
        address: sentinelContracts.mockUSDC,
        abi: mockUSDCAbi,
        functionName: "mint",
        args: [address, parseUnits("10000", 6)],
      });

      setSubmittedHash(hash);
      setSimulationStatus({
        kind: "checking",
        message: "Mint submitted.",
        detail: `Awaiting Mantle Sepolia confirmation: ${shortHash(hash)}.`,
        txHash: hash,
      });
    } catch (error) {
      setSimulationStatus({
        kind: "blocked",
        message: "Mint cancelled.",
        detail: getErrorMessage(error),
      });
      setPendingAction(null);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-frost">
      <Background />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProductShell>
                <DashboardPage
                  strategies={strategyState}
                  pendingAction={pendingAction}
                  safeExecuted={safeExecuted}
                  simulationStatus={simulationStatus}
                  contractTelemetry={contractTelemetry}
                  signalEngine={signalEngine}
                  marketSignals={marketSignals}
                  txPending={isReceiptPending}
                  onMintDemoUSDC={mintDemoUSDC}
                  onApproveRecommendation={executeSafeRecommendation}
                  onTestUnsafeAllocation={testUnsafeAllocation}
                />
              </ProductShell>
            }
          />
          <Route path="/strategies" element={<ProductShell><StrategiesPage strategies={strategyState} signalEngine={signalEngine} marketSignals={marketSignals} /></ProductShell>} />
          <Route path="/policy" element={<ProductShell><PolicyPage /></ProductShell>} />
          <Route path="/logs" element={<ProductShell><LogsPage decisions={decisionLog} signalEngine={signalEngine} /></ProductShell>} />
        </Routes>
      </AnimatePresence>
    </main>
  );
}

function LandingPage() {
  const totalValue = initialStrategies.reduce((sum, strategy) => sum + strategy.value, 0);

  return (
    <>
      <LandingHeader />
      <section className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-9 px-4 pb-20 pt-4 sm:gap-11 sm:px-8 sm:pb-28 sm:pt-6 lg:grid-cols-[0.95fr_1.05fr] lg:pb-32 lg:pt-2">
        <motion.div
          aria-hidden="true"
          animate={{ opacity: [0.18, 0.34, 0.18], scale: [1, 1.04, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-4 top-12 -z-10 h-44 w-44 rounded-full bg-mantle/20 blur-3xl sm:left-8 sm:top-16 sm:h-56 sm:w-56"
        />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl text-center sm:text-left"
        >
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-mantle/20 bg-mantle/10 px-3 py-1 text-xs font-medium text-mantle sm:mb-6">
            <BrainCircuit className="size-3.5" />
            <span className="truncate">Mantle Turing Test Hackathon 2026</span>
          </div>
          <h1 className="text-[clamp(3rem,17vw,4.5rem)] font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-7xl">
            Sentinel
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-200 sm:mx-0 sm:mt-6 sm:text-xl">
            Policy-aware treasury execution on Mantle Sepolia.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:mx-0 sm:mt-5">
            Recommendations are evaluated against treasury mandates before execution, with every decision preserved for governance review.
          </p>
          <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:mx-0 sm:mt-8 sm:grid-cols-3">
            <MiniSignal label="Signal coverage" value="Active" />
            <MiniSignal label="Confidence" value="91%" emphasized />
            <MiniSignal label="Stance" value="Conservative" />
          </div>
          <div className="mt-8 sm:mt-9">
            <Link
              to="/dashboard"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-frost px-5 py-3 text-sm font-semibold text-ink shadow-[0_16px_45px_rgba(220,231,244,0.16)] transition hover:-translate-y-0.5 hover:bg-white sm:w-auto"
            >
              Launch Treasury
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          whileHover={{ y: -4 }}
          className="relative min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-2.5 shadow-premium backdrop-blur-xl before:absolute before:inset-x-10 before:-top-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-mantle/60 before:to-transparent sm:p-3"
        >
          <ProductGlimpse totalValue={totalValue} />
        </motion.div>
      </section>
    </>
  );
}

function DashboardPage({
  strategies,
  pendingAction,
  safeExecuted,
  simulationStatus,
  contractTelemetry,
  signalEngine,
  marketSignals,
  txPending,
  onMintDemoUSDC,
  onApproveRecommendation,
  onTestUnsafeAllocation,
}: {
  strategies: Strategy[];
  pendingAction: PendingAction;
  safeExecuted: boolean;
  simulationStatus: SimulationStatus;
  contractTelemetry: ContractTelemetry;
  signalEngine: TreasurySignalEngine;
  marketSignals: MarketSignalMap;
  txPending: boolean;
  onMintDemoUSDC: () => void;
  onApproveRecommendation: () => void;
  onTestUnsafeAllocation: () => void;
}) {
  const totalValue = strategies.reduce((sum, strategy) => sum + strategy.value, 0);
  const currentAllocationData = strategies.map((strategy) => ({
    name: strategy.name.replace("Mantle ", ""),
    value: strategy.allocation,
  }));

  return (
    <PageFrame
      eyebrow="Treasury console"
      title="Portfolio intelligence with policy-aware execution."
      description="Policy-aware treasury execution on Mantle Sepolia, with seeded portfolio signals ready for review."
      signals={[
        "Signal engine active",
        "Re-evaluated dynamically",
        `${signalEngine.strategySignals.length} strategy models active`,
        `Treasury stance: ${formatTreasuryPosture(signalEngine.posture)}`,
      ]}
    >
      <div className="grid min-w-0 gap-4">
  <section className="rounded-xl border border-mantle/20 bg-mantle/[0.055] p-4 shadow-premium backdrop-blur-xl sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mantle">Demo flow</p>
        <h2 className="mt-2 text-lg font-semibold text-white">How to review Sentinel in under two minutes</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Follow this path to see the policy engine, AI rationale, execution boundary, and audit trail working together.
        </p>
      </div>
      <div className="grid gap-2 text-sm text-slate-200 sm:grid-cols-2 lg:min-w-[520px]">
        <DemoStep number="1" label="Review recommendation" />
        <DemoStep number="2" label="Run policy pre-check" />
        <DemoStep number="3" label="Execute or block action" />
        <DemoStep number="4" label="Inspect audit trail" />
      </div>
    </div>
  </section>

  <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
    <TreasuryOverview
      totalValue={totalValue}
      allocationData={currentAllocationData}
      safeExecuted={safeExecuted}
      contractTelemetry={contractTelemetry}
      signalEngine={signalEngine}
      pendingAction={pendingAction}
      txPending={txPending}
      onMintDemoUSDC={onMintDemoUSDC}
    />
    <AiRecommendation
      strategies={strategies}
      pendingAction={pendingAction}
      safeExecuted={safeExecuted}
      simulationStatus={simulationStatus}
      contractsConfigured={contractTelemetry.configured}
      signalEngine={signalEngine}
      marketSignals={marketSignals}
      txPending={txPending}
      onApproveRecommendation={onApproveRecommendation}
      onTestUnsafeAllocation={onTestUnsafeAllocation}
    />
  </div>
</div>
    </PageFrame>
  );
}

function StrategiesPage({
  strategies,
  signalEngine,
  marketSignals,
}: {
  strategies: Strategy[];
  signalEngine: TreasurySignalEngine;
  marketSignals: MarketSignalMap;
}) {
  return (
    <PageFrame
      eyebrow="Strategy universe"
      title="Approved treasury strategies, ranked by return and mandate fit."
      description="A curated strategy book for reserve liquidity, short-duration RWA exposure, Mantle liquid staking yield, and constrained higher-risk allocation."
      signals={["Live APY/TVL signals monitored", `Confidence: ${signalEngine.confidence}%`, "Mandate screens active"]}
    >
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {strategies.map((strategy) => {
          const signal = signalEngine.strategySignalMap[strategy.name];
          const marketSignal = marketSignals[strategy.name] ?? seededMarketSignals[strategy.name];

          return (
          <motion.article
            key={strategy.name}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="group min-w-0 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.065] to-white/[0.035] p-4 shadow-premium backdrop-blur-xl transition hover:border-mantle/25 hover:shadow-glow sm:p-5"
          >
            <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex size-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] transition group-hover:border-mantle/25">
                  <strategy.icon className={statusStyles[strategy.status]} size={21} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">{strategy.category}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{strategy.name}</h2>
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${riskStyles[strategy.risk]}`}>{strategy.risk}</span>
            </div>
            <p className="mt-5 min-h-12 text-sm leading-6 text-slate-300">{strategy.note}</p>
            {signal ? (
              <div className="mt-4 grid gap-2 min-[520px]:grid-cols-3">
                <SignalIndicator label="Condition" value={formatSignalState(signal.health)} state={signal.health} />
                <SignalIndicator label="Stance" value={formatTreasuryPosture(signal.posture)} state={postureToState(signal.posture)} />
                <SignalIndicator label="Efficiency" value={`${signal.allocationEfficiency}%`} state={scoreToState(signal.allocationEfficiency)} />
              </div>
            ) : null}
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${strategy.allocation}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-mantle to-blue-200"
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <DataPoint label="Signal APY" value={formatApy(marketSignal.apy)} />
              <DataPoint label="Risk" value={strategy.risk} />
              <DataPoint label="Allocation" value={`${strategy.allocation}%`} />
              <DataPoint label="Liquidity" value={strategy.liquidity} />
            </div>
            <MarketSignalStrip signal={marketSignal} />
            {signal ? (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm lg:grid-cols-3">
                <DataPoint label="Yield score" value={`${signal.yieldScore}`} />
                <DataPoint label="Volatility score" value={`${signal.volatilityScore}`} />
                <DataPoint label="Liquidity score" value={`${signal.liquidityScore}`} />
                <DataPoint label="Policy fit" value={`${signal.policyCompatibility}`} />
                <DataPoint label="Treasury fit" value={`${signal.treasuryFit}`} />
                <DataPoint label="Confidence" value={`${signal.confidenceScore}%`} />
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="text-xs text-muted">Policy status</span>
              <span className={`text-sm font-medium ${statusStyles[strategy.status]}`}>{formatPolicyStatus(strategy.status)}</span>
            </div>
          </motion.article>
          );
        })}
      </div>
    </PageFrame>
  );
}

function PolicyPage() {
  return (
    <PageFrame
      eyebrow="Policy engine"
      title="Every recommendation is checked before execution."
      description="Sentinel separates recommendation logic from authority: policy gates enforce treasury mandates before execution."
      signals={["Policy engine online", "Thresholds enforced", "Simulation latency: 184ms"]}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel title="Execution gate" action="Mandatory pre-check">
          <div className="rounded-md border border-danger/25 bg-danger/10 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-danger/15 text-danger">
                <X className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-white">Blocked: high-risk exposure breach</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Proposed move of 16% into High Yield LP would raise high-risk allocation from 8% to 24%, exceeding the enforced 10% mandate.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <PolicyStep index="01" label="Recommendation" state="Input" />
            <PolicyStep index="02" label="Policy Simulation" state="Check" />
            <PolicyStep index="03" label="Risk Threshold Check" state="Validate" />
            <PolicyStep index="04" label="Execution Guard" state="Enforce" />
            <PolicyStep index="05" label="Approved / Blocked" state="Verdict" />
          </div>
        </Panel>
        <PolicyControls />
      </div>
    </PageFrame>
  );
}

function LogsPage({ decisions, signalEngine }: { decisions: Decision[]; signalEngine: TreasurySignalEngine }) {
  const [auditFilter, setAuditFilter] = useState<DecisionAuditFilter>("all");
  const filterItems: Array<{ label: string; value: DecisionAuditFilter }> = [
    { label: "All", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Blocked", value: "blocked" },
  ];
  const filteredDecisions = decisions.filter((decision) => {
    if (auditFilter === "all") return true;
    return getDecisionAuditStatus(decision) === auditFilter;
  });

  return (
    <PageFrame
      eyebrow="Decision log"
      title="Audit-ready treasury decisions."
      description="Approved, pending, and blocked treasury actions remain visible with policy outcomes for governance review."
      signals={["Audit stream live", `${decisions.length} recommendations indexed`, `Signal state: ${signalEngine.signalState}`]}
    >
      <Panel title="Recommendation audit trail" action="Governance session log">
        <div className="mb-4 flex flex-wrap gap-2">
          {filterItems.map((item) => (
            <StatusChip
              key={item.value}
              label={item.label}
              active={auditFilter === item.value}
              onClick={() => setAuditFilter(item.value)}
            />
          ))}
        </div>
        <div className="space-y-3">
          {filteredDecisions.map((decision) => (
            <motion.div
              key={`${decision.time}-${decision.title}`}
              whileHover={{ x: 3 }}
              className="rounded-md border border-white/10 bg-white/[0.035] p-3.5 transition hover:border-white/20 sm:p-4"
            >
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
  <div className="flex items-center gap-3">
    <LogIcon severity={decision.severity} />
    <p className="font-semibold text-white">{decision.title}</p>
  </div>

  <div className="flex items-center gap-2">
    <span
      className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${getDecisionAuditStatusTone(
        decision
      )}`}
    >
      {getDecisionAuditStatusLabel(decision)}
    </span>
    <span className="text-xs text-muted">{decision.time}</span>
  </div>
</div>
              <p className="mt-3 text-sm text-slate-300">{decision.detail}</p>
              <p className={`mt-2 text-sm ${decision.severity === "blocked" ? "text-danger" : decision.severity === "success" ? "text-mantle" : "text-blue-200"}`}>
                {decision.result}
              </p>
              {decision.reasoningSummary ? (
                <p className="mt-3 rounded-md border border-white/10 bg-black/15 p-3 text-sm leading-6 text-slate-300">
                  {decision.reasoningSummary}
                </p>
              ) : null}
              <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-xs leading-5 text-muted md:grid-cols-4">
                <span>Policy: treasury-mandate-v1</span>
                <span>Chain: {decision.chainLabel ?? CHAIN_LABEL}</span>
                <span>Execution: {decision.executionStatus ?? getDecisionAuditStatusLabel(decision)}</span>
                <span>Confidence: {decision.confidence ?? signalEngine.confidence}%</span>
                <span>Treasury stance: {formatTreasuryPosture(decision.treasuryPosture ?? signalEngine.posture)}</span>
                <span className="md:col-span-2">Signal: {decision.signalState ?? signalEngine.signalState}</span>
              </div>
              {decision.txHash ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 text-xs text-muted">
                  <span>Tx: {shortHash(decision.txHash)}</span>
                  <MantlescanTxLink txHash={decision.txHash} />
                </div>
              ) : null}
            </motion.div>
          ))}
          {filteredDecisions.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm text-muted">
              No {auditFilter === "all" ? "" : `${auditFilter} `}audit records match the current filter.
            </div>
          ) : null}
        </div>
      </Panel>
    </PageFrame>
  );
}

function ProductShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <EcosystemAttribution />
    </>
  );
}

function LandingHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
      <Logo />
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-mantle/30 hover:bg-white/[0.06] hover:text-white sm:px-4"
      >
        <span>Dashboard</span>
        <ArrowRight className="size-4" />
      </Link>
    </header>
  );
}

function AppHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/strategies", label: "Strategies" },
    { to: "/policy", label: "Policy" },
    { to: "/logs", label: "Decision Log" },
  ];

  const activeItem = navItems.find((item) => item.to === location.pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/82 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="hidden sm:block lg:hidden">
              <WalletConnectControl />
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-medium text-white shadow-premium transition hover:border-mantle/30 hover:bg-white/[0.08] md:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMenuOpen ? <X className="size-4 text-mantle" /> : <Menu className="size-4 text-mantle" />}
              <span className="hidden min-[420px]:inline">{activeItem?.label ?? "Menu"}</span>
            </button>
          </div>
          <div className="hidden flex-col gap-3 lg:flex lg:flex-row lg:items-center">
            <nav className="flex gap-2 overflow-x-auto text-sm text-muted">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `shrink-0 rounded-md px-3 py-2 transition ${
                      isActive ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.045] hover:text-white"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 xl:flex">
              <MantleGlyph className="opacity-80" />
              <Radio className="size-3.5 text-mantle/80" />
              Monitoring treasury conditions
            </div>
            <WalletConnectControl />
          </div>
        </div>
        <AnimatePresence>
          {isMenuOpen ? (
            <motion.nav
              id="mobile-navigation"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden md:hidden"
            >
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-2 shadow-premium backdrop-blur-xl">
                <div className="mb-2 flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  <MantleGlyph className="opacity-75" />
                  <LiveDot />
                  Monitoring treasury conditions
                </div>
                <div className="mb-2 sm:hidden">
                  <WalletConnectControl fullWidth />
                </div>
                <div className="grid gap-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) =>
                        `rounded-md px-3 py-2.5 text-sm transition ${
                          isActive ? "bg-white/[0.08] text-white" : "text-muted hover:bg-white/[0.045] hover:text-white"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
        <div className="mt-3 hidden md:block lg:hidden">
          <nav className="flex gap-2 overflow-x-auto text-sm text-muted">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-md px-3 py-2 transition ${
                    isActive ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.045] hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#0b1110] shadow-premium">
        <img src={sentinelLogoUrl} alt="" aria-hidden="true" className="size-7 object-contain opacity-95 brightness-125 contrast-125" />
      </div>
      <span className="text-sm font-semibold tracking-wide text-white">Sentinel</span>
    </Link>
  );
}

function EcosystemAttribution() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-8">
      <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-muted min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
        <span>Policy-aware treasury execution on Mantle Sepolia</span>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-slate-300">
          <MantleGlyph />
          Built on Mantle
        </span>
      </div>
    </footer>
  );
}

function MantleGlyph({ className = "" }: { className?: string }) {
  return <img src={mantleLogoUrl} alt="" aria-hidden="true" className={`size-3.5 shrink-0 object-contain ${className}`} />;
}

function WalletConnectControl({ fullWidth = false }: { fullWidth?: boolean }) {
  const baseClass = `${
    fullWidth ? "w-full justify-center" : ""
  } inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-medium text-white shadow-premium transition hover:border-mantle/35 hover:bg-white/[0.08]`;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <button type="button" className={`${baseClass} opacity-60`} disabled>
              <Wallet className="size-4 text-mantle" />
              Connect Wallet
            </button>
          );
        }

        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className={baseClass}>
              <Wallet className="size-4 text-mantle" />
              Connect Wallet
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button type="button" onClick={openChainModal} className={`${baseClass} border-danger/30 bg-danger/10 text-danger`}>
              <X className="size-4" />
              Wrong network
            </button>
          );
        }

        return (
          <button type="button" onClick={openAccountModal} className={baseClass} title={account.address}>
            <span className="flex size-2 rounded-full bg-mantle shadow-[0_0_18px_rgba(70,212,168,0.8)]" />
            <span className="max-w-28 truncate">{account.displayName}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  signals,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  signals?: string[];
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.28 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10 lg:py-14"
    >
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6 sm:mb-8">
        <div className="flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-mantle">{eyebrow}</p>
            <h1 className="mt-3 max-w-4xl text-[clamp(2rem,9vw,3rem)] font-semibold leading-[1.08] text-white sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{description}</p>
          </div>
          {signals ? <SystemStrip signals={signals} /> : null}
        </div>
      </motion.div>
      {children}
    </motion.section>
  );
}

function ProductGlimpse({ totalValue }: { totalValue: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#0a0d14]/90 p-3 sm:p-4">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Treasury intelligence</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatCurrency(totalValue)}</p>
        </div>
        <div className="w-fit rounded-full border border-mantle/20 bg-mantle/10 px-3 py-1 text-xs text-mantle">
          Policies active
        </div>
      </div>
      <div className="grid gap-3 pt-4">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <MantleGlyph className="opacity-70" />
              Monitoring treasury conditions
            </span>
            <LiveDot />
          </div>
          <div className="mt-3 grid h-16 content-center gap-2 rounded bg-[linear-gradient(90deg,rgba(70,212,168,0.08),rgba(125,167,255,0.04),rgba(240,179,93,0.08))] px-3">
            <PreviewSignalBar label="Reserve floor" width="82%" tone="bg-mantle/70" />
            <PreviewSignalBar label="Duration" width="58%" tone="bg-blue-200/65" />
            <PreviewSignalBar label="High-risk cap" width="34%" tone="bg-danger/70" />
          </div>
        </div>
        <PreviewRow label="Treasury recommendation" value="+4% Mantle T-Bill Vault" tone="text-mantle" />
        <PreviewRow label="Policy verdict" value="High Yield LP blocked" tone="text-danger" />
        <PreviewRow label="Audit state" value="Logged for governance" tone="text-blue-200" />
      </div>
    </div>
  );
}

function TreasuryOverview({
  totalValue,
  allocationData,
  safeExecuted,
  contractTelemetry,
  signalEngine,
  pendingAction,
  txPending,
  onMintDemoUSDC,
}: {
  totalValue: number;
  allocationData: { name: string; value: number }[];
  safeExecuted: boolean;
  contractTelemetry: ContractTelemetry;
  signalEngine: TreasurySignalEngine;
  pendingAction: PendingAction;
  txPending: boolean;
  onMintDemoUSDC: () => void;
}) {
  const onchainBalance = Number(contractTelemetry.vaultBalance);
  const hasOnchainBalance = contractTelemetry.configured && onchainBalance > 0;
  const walletLiquidity = contractTelemetry.configured
    ? formatCompactNumber(contractTelemetry.walletUSDC)
    : "Connect wallet to view";

  return (
    <Panel title="Treasury overview" action="Live mock portfolio">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <MonitoringBadge label="Execution mode" value={contractTelemetry.configured ? "Mantle Sepolia" : "Seeded demo"} />
        <MonitoringBadge label="Treasury book" value={contractTelemetry.configured ? `$${formatCompactNumber(contractTelemetry.vaultBalance)}` : formatCurrency(totalValue)} />
        <MonitoringBadge label="StrategyVault" value={contractTelemetry.isLoading ? "Reading..." : contractTelemetry.configured ? "Synced" : "Ready to configure"} />
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SignalIndicator label="Strategy condition" value={formatSignalState(signalEngine.strategyHealth)} state={signalEngine.strategyHealth} />
        <SignalIndicator label="Treasury stance" value={formatTreasuryPosture(signalEngine.posture)} state={postureToState(signalEngine.posture)} />
        <SignalIndicator label="Allocation efficiency" value={`${signalEngine.allocationEfficiency}%`} state={scoreToState(signalEngine.allocationEfficiency)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          icon={CircleDollarSign}
          label="Assets under policy"
          value={hasOnchainBalance ? `$${formatCompactNumber(contractTelemetry.vaultBalance)}` : formatCurrency(totalValue)}
          detail={contractTelemetry.configured ? "Read from MockUSDC balanceOf(vault)" : "Seeded institutional treasury book"}
        />
        <Metric icon={Gauge} label="Policy risk score" value={safeExecuted ? "26 / 100" : "28 / 100"} detail="Conservative mandate profile" />
        <Metric
          icon={Activity}
          label={contractTelemetry.configured ? "Vault deposits" : "Operating runway"}
          value={contractTelemetry.configured ? `$${formatCompactNumber(contractTelemetry.totalDeposits)}` : safeExecuted ? "23.7 mo" : "24.6 mo"}
          detail={contractTelemetry.configured ? "Read from StrategyVault.totalDeposits" : "Stable reserve floor protected"}
        />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Mantle Sepolia execution</p>
              <p className="mt-1 text-xs text-muted">Wallet test liquidity: {walletLiquidity}</p>
            </div>
            <ActionButton
              label={pendingAction === "mint" ? (txPending ? "Mint Submitted" : "Review Wallet") : "Mint Test USDC"}
              tone="primary"
              disabled={Boolean(pendingAction)}
              loading={pendingAction === "mint"}
              onClick={onMintDemoUSDC}
            />
          </div>
        </div>
        <ContractLinks />
      </div>
      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
        <div className="relative h-64 min-w-0 rounded-lg border border-white/10 bg-gradient-to-b from-black/20 to-white/[0.025] p-3 sm:h-72 sm:p-4">
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/[0.03]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mantle/40 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Allocation</p>
              <p className="mt-1 text-2xl font-semibold text-white">100%</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={allocationData} innerRadius={68} outerRadius={104} paddingAngle={5} dataKey="value" stroke="rgba(7,8,13,0.9)" strokeWidth={4} animationDuration={900}>
                {allocationData.map((entry, index) => (
                  <Cell key={entry.name} fill={allocationColors[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#dce7f4" }} labelStyle={{ color: "#8490a6" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-64 min-w-0 rounded-lg border border-white/10 bg-gradient-to-b from-black/20 to-white/[0.025] p-3 sm:h-72 sm:p-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="yield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#46d4a8" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#46d4a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8490a6", fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#dce7f4" }} labelStyle={{ color: "#8490a6" }} />
              <Area type="monotone" dataKey="yield" stroke="#46d4a8" fill="url(#yield)" strokeWidth={2.5} activeDot={{ r: 4, fill: "#dce7f4", stroke: "#46d4a8", strokeWidth: 2 }} animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}

function AiRecommendation({
  strategies,
  pendingAction,
  safeExecuted,
  simulationStatus,
  contractsConfigured,
  signalEngine,
  marketSignals,
  txPending,
  onApproveRecommendation,
  onTestUnsafeAllocation,
}: {
  strategies: Strategy[];
  pendingAction: PendingAction;
  safeExecuted: boolean;
  simulationStatus: SimulationStatus;
  contractsConfigured: boolean;
  signalEngine: TreasurySignalEngine;
  marketSignals: MarketSignalMap;
  txPending: boolean;
  onApproveRecommendation: () => void;
  onTestUnsafeAllocation: () => void;
}) {
  const isChecking = simulationStatus.kind === "checking";
  const safeRecommendation = signalEngine.recommendations.find((recommendation) => recommendation.id === "tBillRebalance");
  const blockedRecommendation = signalEngine.recommendations.find((recommendation) => recommendation.id === "highYieldBlock");
  const safeMarketSignal = safeRecommendation
    ? marketSignals[safeRecommendation.to] ?? seededMarketSignals[safeRecommendation.to]
    : undefined;
  const blockedMarketSignal = blockedRecommendation
    ? marketSignals[blockedRecommendation.to] ?? seededMarketSignals[blockedRecommendation.to]
    : undefined;
  const safeTargetStrategy = safeRecommendation
    ? strategies.find((strategy) => strategy.name === safeRecommendation.to)
    : undefined;
  const blockedTargetStrategy = blockedRecommendation
    ? strategies.find((strategy) => strategy.name === blockedRecommendation.to)
    : undefined;
  const rationaleContexts = useMemo(() => {
    const contexts: Array<{ id: RecommendationSignal["id"]; label: string; context: TreasuryRationaleContext }> = [];

    if (safeRecommendation && safeMarketSignal && safeTargetStrategy) {
      contexts.push({
        id: safeRecommendation.id,
        label: "Allowed allocation",
        context: buildRecommendationRationaleContext(safeRecommendation, safeMarketSignal, safeTargetStrategy, "Reserve conditions remain stable"),
      });
    }

    if (blockedRecommendation && blockedMarketSignal && blockedTargetStrategy) {
      contexts.push({
        id: blockedRecommendation.id,
        label: "Blocked mandate test",
        context: buildRecommendationRationaleContext(blockedRecommendation, blockedMarketSignal, blockedTargetStrategy, "Reserve protection remains prioritized"),
      });
    }

    return contexts;
  }, [blockedMarketSignal, blockedRecommendation, blockedTargetStrategy, safeMarketSignal, safeRecommendation, safeTargetStrategy]);
  const deterministicRationales = useMemo(
    () =>
      Object.fromEntries(
        rationaleContexts.map((item) => [
          item.id,
          {
            label: item.label,
            text: buildDeterministicTreasurySummary(item.context),
            source: "deterministic" as const,
          },
        ]),
      ) as Partial<Record<RecommendationSignal["id"], { label: string; text: string; source: "ai" | "deterministic" }>>,
    [rationaleContexts],
  );
  const [governanceCommentary, setGovernanceCommentary] = useState(deterministicRationales);
  const statusTone =
    simulationStatus.kind === "success"
      ? "border-mantle/25 bg-mantle/10 text-mantle"
      : simulationStatus.kind === "blocked"
        ? "border-danger/25 bg-danger/10 text-danger"
        : simulationStatus.kind === "checking"
          ? "border-blue-300/25 bg-blue-300/10 text-blue-200"
          : "border-white/10 bg-black/20 text-slate-300";

  useEffect(() => {
    if (rationaleContexts.length === 0) return;

    const controller = new AbortController();

    setGovernanceCommentary(deterministicRationales);

    Promise.all(
      rationaleContexts.map(async (item) => {
        const result = await fetchAiTreasuryRationale(item.context, controller.signal);
        return [item.id, { label: item.label, text: result.text, source: result.source }] as const;
      }),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setGovernanceCommentary(Object.fromEntries(results));
    });

    return () => {
      controller.abort();
    };
  }, [deterministicRationales, rationaleContexts]);

  return (
    <Panel title="Recommendation panel" action="Policy simulation">
      <div className="rounded-lg border border-mantle/20 bg-gradient-to-br from-mantle/12 via-white/[0.035] to-blue-300/10 p-4 sm:p-5 xl:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-mantle">
            <BrainCircuit className="size-4" />
            Treasury Signal Engine
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
            <LiveDot />
            Confidence {signalEngine.confidence}%
          </div>
        </div>
        <p className="mt-4 text-xl font-semibold leading-tight text-white sm:text-2xl">
          Reallocate idle stablecoins into productive strategies while preserving mandate limits.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-white/10 py-3 text-xs">
          <InlineSignal label="Condition" value={formatSignalState(signalEngine.strategyHealth)} state={signalEngine.strategyHealth} />
          <InlineSignal label="Stance" value={formatTreasuryPosture(signalEngine.posture)} state={postureToState(signalEngine.posture)} />
          <InlineSignal label="Efficiency" value={`${signalEngine.allocationEfficiency}%`} state={scoreToState(signalEngine.allocationEfficiency)} />
        </div>
        {Object.values(governanceCommentary).length > 0 ? (
          <div className="mt-4 rounded-md border border-white/10 bg-black/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                <BrainCircuit className="size-3.5 text-blue-200" />
                AI Governance Commentary
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[11px] text-slate-400">
                Explanation layer
              </span>
            </div>
            <div className="mt-2 grid gap-2">
              {Object.entries(governanceCommentary).map(([id, commentary]) => (
                <div key={id} className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-300">{commentary.label}</span>
                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted">
                      {commentary.source === "ai" ? "OpenRouter summary" : "Deterministic fallback"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{commentary.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Explanation only. Treasury logic, policy checks, and execution remain deterministic.
            </p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3">
          {safeRecommendation && safeMarketSignal ? <RecommendationRow recommendation={safeRecommendation} marketSignal={safeMarketSignal} /> : null}
          {blockedRecommendation ? <RecommendationRow recommendation={blockedRecommendation} marketSignal={marketSignals[blockedRecommendation.to] ?? seededMarketSignals[blockedRecommendation.to]} /> : null}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionButton
            label={
              safeExecuted
                ? "Allocation Recorded"
                : pendingAction === "safe"
                  ? txPending
                    ? "Awaiting Confirmation"
                    : "Review Wallet"
                  : "Approve Recommendation"
            }
            tone="primary"
            disabled={Boolean(pendingAction) || safeExecuted}
            loading={pendingAction === "safe"}
            onClick={onApproveRecommendation}
          />
          <ActionButton
            label={pendingAction === "unsafe" ? (txPending ? "Awaiting Verdict" : "Review Wallet") : "Test Mandate Block"}
            tone="danger"
            disabled={Boolean(pendingAction)}
            loading={pendingAction === "unsafe"}
            onClick={onTestUnsafeAllocation}
          />
        </div>
        
      </div>
      <div className={`mt-4 rounded-md border p-4 ${statusTone}`}>
        <div className="flex items-start gap-3">
          <div className="mt-1 shrink-0">{isChecking ? <LiveDot /> : simulationStatus.kind === "success" ? <Check className="size-4" /> : simulationStatus.kind === "blocked" ? <X className="size-4" /> : <BrainCircuit className="size-4" />}</div>
          <div>
            <p className="text-sm font-semibold">{simulationStatus.message}</p>
            {simulationStatus.detail ? <p className="mt-1 text-sm leading-6 text-slate-300">{simulationStatus.detail}</p> : null}
            {simulationStatus.txHash ? <MantlescanTxLink txHash={simulationStatus.txHash} className="mt-3" /> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-danger/25 bg-danger/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-danger/15 text-danger">
            <X className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-white">Mandate protection active</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              High-risk exposure is capped at 10%; the seeded block path remains available for judges to test.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function buildRecommendationRationaleContext(
  recommendation: RecommendationSignal,
  marketSignal: StrategyMarketSignal,
  targetStrategy: Strategy,
  reservePosture: string,
): TreasuryRationaleContext {
  return {
    strategy: recommendation.to,
    confidence: recommendation.confidence,
    stance: formatTreasuryPosture(recommendation.postureLabel),
    policyStatus: formatPolicyStatus(targetStrategy.status),
    liquidityCondition: targetStrategy.liquidity,
    reservePosture,
    apyContext: `${formatApy(marketSignal.apy)} APY, ${marketSignalStatusLabel(marketSignal.status).toLowerCase()}, context only`,
    recommendation: `${recommendation.amount} allocation from ${recommendation.from} to ${recommendation.to}`,
    expectedImpact: recommendation.expectedImpact,
  };
}

function PolicyControls() {
  return (
    <Panel title="Policy/risk controls" action="Enforced before execution">
      <div className="grid gap-3">
        {policies.map((policy) => (
          <div key={policy.label} className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 min-[460px]:flex-row min-[460px]:items-center min-[460px]:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{policy.label}</p>
              <p className="mt-1 text-xs text-muted">{policy.limit} / Current {policy.current}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-mantle">
              <Check className="size-4" />
              {policy.state}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, action, children }: { title: string; action: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ borderColor: "rgba(255,255,255,0.16)" }}
      className="relative min-w-0 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.035] p-4 shadow-premium backdrop-blur-xl sm:p-5"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="mb-5 flex flex-col justify-between gap-2 border-b border-white/10 pb-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{action}</span>
      </div>
      {children}
    </motion.section>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20">
      <Icon className="size-5 text-mantle" />
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </motion.div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function MarketSignalStrip({ signal }: { signal: StrategyMarketSignal }) {
  return (
    <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs min-[520px]:grid-cols-3">
      <div>
        <p className="text-muted">Market signal</p>
        <p className={signal.status === "live" ? "mt-1 font-medium text-mantle" : signal.status === "loading" ? "mt-1 font-medium text-blue-200" : "mt-1 font-medium text-slate-300"}>
          {marketSignalStatusLabel(signal.status)}
        </p>
      </div>
      <div>
        <p className="text-muted">TVL-style metric</p>
        <p className="mt-1 font-medium text-white">{formatCurrency(signal.tvlUsd)}</p>
      </div>
      <div>
        <p className="text-muted">Last updated</p>
        <p className="mt-1 font-medium text-white">{signal.lastUpdated}</p>
      </div>
      {signal.note ? (
        <p className="border-t border-white/10 pt-2 leading-5 text-muted min-[520px]:col-span-3">
          <span className="text-slate-300">{signal.note}</span>
          <span className="mx-2 text-white/20">/</span>
          <span>{signal.source}</span>
        </p>
      ) : null}
    </div>
  );
}

function SignalIndicator({ label, value, state }: { label: string; value: string; state: SignalState }) {
  const stateClass =
    state === "Constructive"
      ? "border-mantle/20 bg-mantle/10 text-mantle"
      : state === "Restricted"
        ? "border-danger/20 bg-danger/10 text-danger"
        : "border-blue-300/20 bg-blue-300/10 text-blue-200";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${stateClass}`}>
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function InlineSignal({ label, value, state }: { label: string; value: string; state: SignalState }) {
  const dotClass = state === "Constructive" ? "bg-mantle" : state === "Restricted" ? "bg-danger" : "bg-blue-200";

  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </span>
  );
}

function ExplainabilityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-white/10 py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="text-sm leading-6 text-slate-300">{value}</span>
    </div>
  );
}

function RecommendationRow({
  recommendation,
  marketSignal,
}: {
  recommendation: RecommendationSignal;
  marketSignal: StrategyMarketSignal;
}) {
  const blocked = recommendation.status === "Blocked";

  return (
    <div className="rounded-md border border-white/10 bg-black/15 px-4 py-3.5">
      <div className="border-b border-white/10 pb-3">
        <div className="min-w-0">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold leading-6 text-white">
            <span>{recommendation.amount} {recommendation.from}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted" />
            <span>{recommendation.to}</span>
          </p>
        </div>
        <div className="mt-2 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${blocked ? "bg-danger/15 text-danger" : "bg-mantle/15 text-mantle"}`}>
              {recommendation.status}
            </span>
            <span className="whitespace-nowrap text-slate-300">{recommendation.confidence}% confidence</span>
            <span className="hidden text-white/20 min-[520px]:inline">/</span>
            <span className="whitespace-nowrap text-slate-300">{formatTreasuryPosture(recommendation.postureLabel)}</span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted" title={recommendation.confidenceBasis}>
            {recommendation.confidenceBasis}
          </p>
        </div>
      </div>
      <div className="pt-3">
        <p className="text-sm leading-6 text-slate-200">{recommendation.why}</p>
        <div className="mt-3">
          <ExplainabilityLine label="Conditions" value={recommendation.conditions.join(" / ")} />
          <ExplainabilityLine label="Market signal" value={`${marketSignalStatusLabel(marketSignal.status)}: ${formatApy(marketSignal.apy)} APY / ${formatCurrency(marketSignal.tvlUsd)} TVL-style metric / Updated ${marketSignal.lastUpdated} / Context only`} />
          <ExplainabilityLine label="Policy validation" value={recommendation.policyConstraints.join(" / ")} />
          <ExplainabilityLine label="Expected impact" value={recommendation.expectedImpact} />
          <ExplainabilityLine label="Signal posture" value={`${formatTreasuryPosture(recommendation.postureLabel)} / ${recommendation.signalState}`} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  tone: "primary" | "danger";
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "primary"
      ? "border-mantle/30 bg-mantle/15 text-mantle hover:bg-mantle/20"
      : "border-danger/25 bg-danger/10 text-danger hover:bg-danger/15";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${toneClass}`}
    >
      {loading ? <LiveDot /> : tone === "primary" ? <Check className="size-4" /> : <X className="size-4" />}
      {label}
    </button>
  );
}

function ContractLinks() {
  const links = [
    { label: "MockUSDC", address: sentinelContracts.mockUSDC },
    { label: "StrategyVault", address: sentinelContracts.strategyVault },
    { label: "ExecutionGuard", address: sentinelContracts.executionGuard },
  ].filter((item): item is { label: string; address: Hex } => Boolean(item.address));

  if (links.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">Contracts</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={mantlescanAddressUrl(link.address)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs text-slate-300 transition hover:border-mantle/30 hover:text-white"
          >
            {link.label}
            <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

function MantlescanTxLink({ txHash, className = "" }: { txHash: Hex; className?: string }) {
  return (
    <a
      href={mantlescanTxUrl(txHash)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-mantle/30 hover:text-white ${className}`}
    >
      View on Mantlescan
      <ExternalLink className="size-3" />
    </a>
  );
}

function PolicyStep({ index, label, state }: { index: string; label: string; state: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="relative flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 min-[460px]:flex-row min-[460px]:items-center min-[460px]:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-black/20 text-[11px] text-mantle">{index}</span>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="w-fit rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white">{state}</span>
    </motion.div>
  );
}

function LogIcon({ severity }: { severity: string }) {
  const className = severity === "blocked" ? "text-danger" : severity === "success" ? "text-mantle" : "text-blue-200";
  return severity === "blocked" ? <X className={`size-4 ${className}`} /> : severity === "success" ? <Check className={`size-4 ${className}`} /> : <FileClock className={`size-4 ${className}`} />;
}

function PreviewRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.035] p-3 min-[460px]:flex-row min-[460px]:items-center min-[460px]:justify-between min-[460px]:gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${tone}`}>{value}</span>
    </div>
  );
}

function PreviewSignalBar({ label, width, tone }: { label: string; width: string; tone: string }) {
  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-3 text-[11px] text-muted">
      <span>{label}</span>
      <span className="h-1 overflow-hidden rounded-full bg-white/10">
        <span className={`block h-full rounded-full ${tone}`} style={{ width }} />
      </span>
    </div>
  );
}

function SystemStrip({ signals }: { signals: string[] }) {
  return (
    <div className="grid w-full min-w-0 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl lg:w-auto lg:min-w-72">
      {signals.map((signal, index) => (
        <div key={signal} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-2 text-slate-300">
            {index === 0 ? <LiveDot /> : index === 1 ? <Cpu className="size-3.5 text-blue-200" /> : <span className="size-1.5 rounded-full bg-white/25" />}
            {signal}
          </span>
        </div>
      ))}
    </div>
  );
}
function DemoStep({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mantle/15 text-xs font-semibold text-mantle">
        {number}
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MiniSignal({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${emphasized ? "border-mantle/25 bg-mantle/[0.07]" : "border-white/10 bg-white/[0.04]"}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${emphasized ? "text-mantle" : "text-white"}`}>{value}</p>
    </div>
  );
}

function MonitoringBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs">
      <span className="flex items-center gap-2 text-muted"><LiveDot />{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function StatusChip({
  label,
  active = false,
  onClick,
  className = "",
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] transition ${
        active
          ? "border-mantle/60 bg-mantle/15 text-mantle"
          : "border-white/10 bg-white/[0.03] text-text-muted hover:border-white/25 hover:text-white"
      } ${className}`}
    >
      {label}
    </button>
  );
}

function getDecisionAuditStatus(decision: Decision): DecisionAuditStatus {
  if (decision.auditStatus) return decision.auditStatus;
  if (decision.severity === "success") return "approved";
  if (decision.severity === "pending") return "pending";
  return "blocked";
}

function getDecisionAuditStatusTone(decision: Decision) {
  const status = getDecisionAuditStatus(decision);

  if (status === "approved") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "pending") {
    return "border-amber-400/40 bg-amber-400/10 text-amber-200";
  }

  return "border-red-400/40 bg-red-400/10 text-red-200";
}

function getDecisionAuditStatusLabel(decision: Decision) {
  const status = getDecisionAuditStatus(decision);

  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  return "Blocked";
}

function LiveDot() {
  return (
    <span className="relative flex size-2">
      <motion.span
        animate={{ scale: [1, 1.9, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inline-flex size-full rounded-full bg-mantle"
      />
      <span className="relative inline-flex size-2 rounded-full bg-mantle" />
    </span>
  );
}

const tooltipStyle = {
  background: "rgba(13,17,26,0.96)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  boxShadow: "0 18px 50px rgba(0,0,0,0.38)",
};

function hydrateSeededDecisionTimeline(decisions: Decision[]) {
  const now = new Date();

  return decisions.map((decision) => {
    if (typeof decision.seededOffsetMinutes !== "number") return decision;

    return {
      ...decision,
      time: formatAuditDateTime(new Date(now.getTime() - decision.seededOffsetMinutes * 60_000)),
    };
  });
}

function currentTime() {
  return formatAuditDateTime(new Date());
}

function formatAuditDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function decodeVaultEvent(logs: { address: string; data: Hex; topics: readonly Hex[] }[]) {
  for (const log of logs) {
    if (!sentinelContracts.strategyVault || log.address.toLowerCase() !== sentinelContracts.strategyVault.toLowerCase()) {
      continue;
    }

    try {
      const event = decodeEventLog({
        abi: strategyVaultAbi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
      });

      if (event.eventName === "AllocationExecuted") {
        return { name: "AllocationExecuted" as const };
      }

      if (event.eventName === "AllocationBlocked") {
        const args = event.args as unknown as { reason?: unknown };
        const reason = typeof args.reason === "string" ? args.reason : "Policy validation failed.";

        return { name: "AllocationBlocked" as const, reason };
      }
    } catch {
      // Ignore non-StrategyVault logs in the same transaction receipt.
    }
  }

  return undefined;
}
function shortHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function mantlescanTxUrl(hash: string) {
  return `${MANTLESCAN_BASE_URL}/tx/${hash}`;
}

function mantlescanAddressUrl(address: string) {
  return `${MANTLESCAN_BASE_URL}/address/${address}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "The wallet or contract rejected the transaction.";
}

function formatCompactNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return "0";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(parsed);
}

function formatApy(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}%`;
}

function marketSignalStatusLabel(status: StrategyMarketSignal["status"]) {
  if (status === "live") return "Live signal";
  if (status === "loading") return "Loading signal";
  return "Seeded fallback";
}

function formatSignalState(state: SignalState) {
  const labels: Record<SignalState, string> = {
    Constructive: "Healthy",
    Watch: "Monitored",
    Restricted: "Constrained",
  };

  return labels[state];
}

function formatTreasuryPosture(posture: TreasuryPosture) {
  const labels: Record<TreasuryPosture, string> = {
    Defensive: "Conservative",
    Balanced: "Neutral",
    Opportunistic: "Yield-biased",
    Restricted: "Constrained",
  };

  return labels[posture];
}

function formatPolicyStatus(status: PolicyStatus) {
  const labels: Record<PolicyStatus, string> = {
    Compliant: "Cleared",
    Watch: "Monitored",
    Blocked: "Blocked",
  };

  return labels[status];
}

function scoreToState(score: number): SignalState {
  if (score >= 82) return "Constructive";
  if (score >= 62) return "Watch";
  return "Restricted";
}

function postureToState(posture: TreasuryPosture): SignalState {
  if (posture === "Restricted") return "Restricted";
  if (posture === "Opportunistic") return "Watch";
  return "Constructive";
}

function Background() {
  return (
    <>
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_6%,rgba(70,212,168,0.16),transparent_28%),radial-gradient(circle_at_78%_0%,rgba(125,167,255,0.13),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(240,179,93,0.055),transparent_34%),linear-gradient(180deg,#07080d_0%,#0a0d14_48%,#07080d_100%)]"
      />
      <div className="fixed inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="noise-layer fixed inset-0 -z-10 opacity-[0.035]" />
    </>
  );
}

export default App;
