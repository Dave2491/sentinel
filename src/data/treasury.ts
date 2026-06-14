import type { LucideIcon } from "lucide-react";
import { Banknote, Landmark, Layers3, Waves } from "lucide-react";

export type RiskLevel = "Low" | "Medium" | "High";
export type PolicyStatus = "Compliant" | "Watch" | "Blocked";
export type SignalState = "Constructive" | "Watch" | "Restricted";
export type TreasuryPosture = "Defensive" | "Balanced" | "Opportunistic" | "Restricted";

export type Strategy = {
  name: string;
  category: string;
  allocation: number;
  value: number;
  apy: number;
  risk: RiskLevel;
  liquidity: string;
  status: PolicyStatus;
  note: string;
  icon: LucideIcon;
};

export type StrategySignal = {
  strategyName: string;
  marketYield: number;
  marketStatus: "live" | "loading" | "fallback";
  marketSource: string;
  marketTvlUsd: number;
  yieldScore: number;
  volatilityScore: number;
  liquidityScore: number;
  policyCompatibility: number;
  treasuryFit: number;
  confidenceScore: number;
  health: SignalState;
  posture: TreasuryPosture;
  allocationEfficiency: number;
  reasoningSummary: string;
  conditions: string[];
  policyConstraints: string[];
  expectedImpact: string;
  signalState: string;
};

export type TreasurySignalEngine = {
  strategySignals: StrategySignal[];
  strategySignalMap: Record<string, StrategySignal>;
  posture: TreasuryPosture;
  confidence: number;
  strategyHealth: SignalState;
  allocationEfficiency: number;
  signalState: string;
  recommendations: RecommendationSignal[];
};

export type RecommendationSignal = {
  id: "tBillRebalance" | "highYieldBlock";
  from: string;
  to: string;
  amount: string;
  status: "Allowed" | "Blocked";
  postureLabel: TreasuryPosture;
  confidence: number;
  confidenceBasis: string;
  why: string;
  conditions: string[];
  policyConstraints: string[];
  expectedImpact: string;
  signalState: string;
};

export type RwaComplianceCheck = {
  ruleId: string;
  label: string;
  status: "Cleared" | "Monitored" | "Blocked";
  requirement: string;
  input: string;
  evidence: string;
  detail: string;
};

export type RwaAssetEvidence = {
  label: string;
  value: string;
  detail: string;
};

export type RwaAssetPassport = {
  assetId: string;
  passportVersion: string;
  displayName: string;
  testnetSymbol: string;
  testnetNetwork: string;
  referenceAsset: string;
  referenceNetwork: string;
  referenceTokenAddress: string;
  referenceOracleAddress: string;
  referenceBlocklistAddress: string;
  issuer: string;
  assetType: string;
  collateralSummary: string;
  yieldMechanism: string;
  restrictions: string[];
  docs: string[];
  mirrorNotice: string;
};

export type AiComplianceAttestation = {
  schema: string;
  assetId: string;
  verdict: "pass" | "monitor" | "block";
  riskLevel: RiskLevel;
  confidence: number;
  flags: string[];
  summary: string;
  requiredHumanReview: string[];
};

type MockMarketDatum = {
  baseYield: number;
  volatility30d: number;
  liquidityDepth: number;
  redemptionHours: number;
  durationDays: number;
  drawdownP95: number;
  protocolMaturity: number;
  targetAllocation: number;
};

type EffectiveMarketDatum = MockMarketDatum & {
  sourceLabel: string;
  signalStatus: "live" | "loading" | "fallback";
  tvlUsd: number;
};

export type StrategySignalInput = {
  apy: number;
  tvlUsd: number;
  status: "live" | "loading" | "fallback";
  source: string;
  lastUpdated: string;
  note?: string;
};

export type StrategySignalInputMap = Record<string, StrategySignalInput>;

function signalStateLabel(state: SignalState) {
  const labels: Record<SignalState, string> = {
    Constructive: "Healthy",
    Watch: "Monitored",
    Restricted: "Constrained",
  };

  return labels[state];
}

function postureLabel(posture: TreasuryPosture) {
  const labels: Record<TreasuryPosture, string> = {
    Defensive: "Conservative",
    Balanced: "Neutral",
    Opportunistic: "Yield-biased",
    Restricted: "Constrained",
  };

  return labels[posture];
}

export const strategies: Strategy[] = [
  {
    name: "USDC Reserve",
    category: "Stable reserve",
    allocation: 45,
    value: 5794000,
    apy: 0.8,
    risk: "Low",
    liquidity: "Instant",
    status: "Compliant",
    note: "Core operating runway and redemption buffer.",
    icon: Banknote,
  },
  {
    name: "Sentinel tUSDY Mirror",
    category: "Ondo USDY-style RWA mirror",
    allocation: 29,
    value: 3734000,
    apy: 4.7,
    risk: "Low",
    liquidity: "T+2",
    status: "Compliant",
    note: "Non-redeemable Mantle Sepolia mirror of an Ondo USDY-style treasury asset, with issuer, oracle, blocklist, duration, and eligibility controls surfaced before execution.",
    icon: Landmark,
  },
  {
    name: "mETH Yield Vault",
    category: "Mantle liquid staking",
    allocation: 18,
    value: 2317000,
    apy: 3.9,
    risk: "Medium",
    liquidity: "24h",
    status: "Watch",
    note: "Mantle-native liquid staking allocation for yield-bearing ETH exposure, monitored for liquidity depth and ETH beta.",
    icon: Waves,
  },
  {
    name: "High Yield LP",
    category: "Volatile DeFi",
    allocation: 8,
    value: 1030000,
    apy: 14.2,
    risk: "High",
    liquidity: "Variable",
    status: "Blocked",
    note: "Capped by treasury mandate due to drawdown risk.",
    icon: Layers3,
  },
];

const mockMarketData: Record<string, MockMarketDatum> = {
  "USDC Reserve": {
    baseYield: 0.8,
    volatility30d: 0.4,
    liquidityDepth: 96,
    redemptionHours: 0,
    durationDays: 0,
    drawdownP95: 0.2,
    protocolMaturity: 98,
    targetAllocation: 43,
  },
  "Sentinel tUSDY Mirror": {
    baseYield: 4.7,
    volatility30d: 1.1,
    liquidityDepth: 78,
    redemptionHours: 48,
    durationDays: 42,
    drawdownP95: 1.9,
    protocolMaturity: 88,
    targetAllocation: 33,
  },
  "mETH Yield Vault": {
    baseYield: 3.9,
    volatility30d: 8.6,
    liquidityDepth: 72,
    redemptionHours: 24,
    durationDays: 1,
    drawdownP95: 9.8,
    protocolMaturity: 76,
    targetAllocation: 16,
  },
  "High Yield LP": {
    baseYield: 14.2,
    volatility30d: 18.4,
    liquidityDepth: 38,
    redemptionHours: 96,
    durationDays: 7,
    drawdownP95: 24.5,
    protocolMaturity: 54,
    targetAllocation: 4,
  },
};

export function deriveTreasurySignalEngine(
  currentStrategies: Strategy[],
  marketSignals: StrategySignalInputMap = {},
): TreasurySignalEngine {
  const strategySignals = currentStrategies.map((strategy) => deriveStrategySignal(strategy, marketSignals[strategy.name]));
  const strategySignalMap = strategySignals.reduce<Record<string, StrategySignal>>((signals, signal) => {
    signals[signal.strategyName] = signal;
    return signals;
  }, {});

  const averageConfidence = average(strategySignals.map((signal) => signal.confidenceScore));
  const allocationEfficiency = average(strategySignals.map((signal) => signal.allocationEfficiency));
  const highRiskAllocation = currentStrategies
    .filter((strategy) => strategy.risk === "High")
    .reduce((sum, strategy) => sum + strategy.allocation, 0);
  const stableReserveAllocation = currentStrategies.find((strategy) => strategy.name === "USDC Reserve")?.allocation ?? 0;
  const posture =
    highRiskAllocation > 10
      ? "Restricted"
      : stableReserveAllocation >= 44
        ? "Defensive"
        : averageConfidence >= 84
          ? "Balanced"
          : "Opportunistic";
  const strategyHealth = averageConfidence >= 84 ? "Constructive" : highRiskAllocation > 10 ? "Restricted" : "Watch";
  const signalState = `${signalStateLabel(strategyHealth)} portfolio / ${postureLabel(posture)} stance / ${Math.round(allocationEfficiency)}% allocation efficiency`;

  return {
    strategySignals,
    strategySignalMap,
    posture,
    confidence: Math.round(averageConfidence),
    strategyHealth,
    allocationEfficiency: Math.round(allocationEfficiency),
    signalState,
    recommendations: buildRecommendationSignals(strategySignalMap, posture),
  };
}

function deriveStrategySignal(strategy: Strategy, signal?: StrategySignalInput): StrategySignal {
  const market = resolveMarketDatum(strategy.name, signal);
  const yieldScore = clamp(Math.round((market.baseYield / 15) * 100), 5, 98);
  const volatilityScore = clamp(Math.round(100 - market.volatility30d * 4.2 - market.drawdownP95 * 1.1), 12, 99);
  const liquidityScore = clamp(Math.round(market.liquidityDepth - market.redemptionHours * 0.28), 18, 98);
  const policyCompatibility = strategy.status === "Compliant" ? 94 : strategy.status === "Watch" ? 72 : 38;
  const allocationEfficiency = clamp(Math.round(100 - Math.abs(strategy.allocation - market.targetAllocation) * 3.8), 35, 99);
  const riskFit = strategy.risk === "Low" ? 94 : strategy.risk === "Medium" ? 76 : 48;
  const treasuryFit = clamp(
    Math.round(policyCompatibility * 0.3 + liquidityScore * 0.22 + volatilityScore * 0.2 + riskFit * 0.18 + market.protocolMaturity * 0.1),
    20,
    98,
  );
  const confidenceScore = clamp(
    Math.round(
      yieldScore * 0.16 +
        volatilityScore * 0.2 +
        liquidityScore * 0.18 +
        policyCompatibility * 0.22 +
        treasuryFit * 0.2 +
        market.protocolMaturity * 0.04,
    ),
    20,
    98,
  );
  const health: SignalState =
    strategy.status === "Blocked" || confidenceScore < 55 ? "Restricted" : confidenceScore >= 78 ? "Constructive" : "Watch";
  const posture: TreasuryPosture =
    strategy.status === "Blocked" ? "Restricted" : strategy.risk === "Low" ? "Defensive" : strategy.risk === "Medium" ? "Balanced" : "Opportunistic";

  return {
    strategyName: strategy.name,
    marketYield: market.baseYield,
    marketStatus: market.signalStatus,
    marketSource: market.sourceLabel,
    marketTvlUsd: market.tvlUsd,
    yieldScore,
    volatilityScore,
    liquidityScore,
    policyCompatibility,
    treasuryFit,
    confidenceScore,
    health,
    posture,
    allocationEfficiency,
    reasoningSummary: buildReasoningSummary(strategy, confidenceScore, treasuryFit, liquidityScore, market),
    conditions: buildConditions(strategy, market),
    policyConstraints: buildPolicyConstraints(strategy, market),
    expectedImpact: buildExpectedImpact(strategy, market),
    signalState: `${signalStateLabel(health)} signal, ${postureLabel(posture).toLowerCase()} stance, ${allocationEfficiency}% allocation efficiency`,
  };
}

function resolveMarketDatum(strategyName: string, signal?: StrategySignalInput): EffectiveMarketDatum {
  const base = mockMarketData[strategyName];

  if (!signal || signal.status === "loading") {
    return {
      ...base,
      sourceLabel: signal?.source ?? "Seeded treasury model",
      signalStatus: signal?.status ?? "fallback",
      tvlUsd: signal?.tvlUsd ?? 0,
    };
  }

  const tvlScore = Math.log10(Math.max(signal.tvlUsd, 1));
  const liveLiquidityAdjustment = signal.status === "live" ? clamp(Math.round((tvlScore - 6) * 5), -10, 12) : 0;
  const liveMaturityAdjustment = signal.status === "live" ? clamp(Math.round((tvlScore - 6) * 3), -6, 8) : 0;

  return {
    ...base,
    baseYield: signal.apy,
    liquidityDepth: clamp(base.liquidityDepth + liveLiquidityAdjustment, 18, 98),
    protocolMaturity: clamp(base.protocolMaturity + liveMaturityAdjustment, 30, 99),
    sourceLabel: signal.source,
    signalStatus: signal.status,
    tvlUsd: signal.tvlUsd,
  };
}

function buildRecommendationSignals(
  signals: Record<string, StrategySignal>,
  posture: TreasuryPosture,
): RecommendationSignal[] {
  const reserve = signals["USDC Reserve"];
  const tBill = signals["Sentinel tUSDY Mirror"];
  const highYield = signals["High Yield LP"];
  const tBillYieldLiftBps = Math.max(Math.round((tBill.marketYield - reserve.marketYield) * 4), 0);
  const liveTBillSignal = tBill.marketStatus === "live" ? "live APY/TVL signal" : "seeded fallback signal";

  return [
    {
      id: "tBillRebalance",
      from: "USDC Reserve",
      to: "Sentinel tUSDY Mirror",
      amount: "4%",
      status: "Allowed",
      postureLabel: posture,
      confidence: Math.round((reserve.confidenceScore + tBill.confidenceScore + tBill.treasuryFit) / 3),
      confidenceBasis: `Weighted by reserve health, ${liveTBillSignal}, liquidity stability, and policy alignment`,
      why: `Reserve headroom supports a controlled move into short-duration RWA yield using ${formatPercent(tBill.marketYield)} ${tBill.marketStatus === "live" ? "live" : "fallback"} market input.`,
      conditions: [
        "USDC reserve sits 5% above the floor",
        `Target yield input is ${formatPercent(tBill.marketYield)} from ${tBill.marketSource}`,
        "tUSDY mirror liquidity remains inside the modeled T+2 window",
        "Protocol concentration remains within the 30% cap",
      ],
      policyConstraints: [
        "Reserve floor cleared",
        "Protocol concentration cleared",
        "RWA duration cleared",
      ],
      expectedImpact: `+4% productive allocation, about +${tBillYieldLiftBps} bps estimated blended yield, no mandate breach.`,
      signalState: `${signalStateLabel(tBill.health)} target, ${tBill.confidenceScore}% policy-liquidity score`,
    },
    {
      id: "highYieldBlock",
      from: "USDC Reserve",
      to: "High Yield LP",
      amount: "16%",
      status: "Blocked",
      postureLabel: "Restricted",
      confidence: highYield.confidenceScore,
      confidenceBasis: `Weighted by ${formatPercent(highYield.marketYield)} yield input, volatility, liquidity depth, and high-risk exposure`,
      why: "Yield is outweighed by volatility, weaker liquidity, and mandate pressure.",
      conditions: [
        "High-risk exposure would rise to 24%",
        `Yield input is ${formatPercent(highYield.marketYield)} from ${highYield.marketSource}`,
        "30-day volatility exceeds treasury tolerance",
        "Variable liquidity weakens runway protection",
      ],
      policyConstraints: [
        "High-risk exposure cap failed",
        "Reserve floor checked",
        "Liquidity runway checked",
      ],
      expectedImpact: "Avoids a 14% mandate breach and preserves a conservative operating stance.",
      signalState: `${signalStateLabel(highYield.health)} target, ${highYield.confidenceScore}% risk-adjusted score`,
    },
  ];
}

function buildReasoningSummary(
  strategy: Strategy,
  confidence: number,
  treasuryFit: number,
  liquidityScore: number,
  market: EffectiveMarketDatum,
) {
  if (strategy.status === "Blocked") {
    return `${formatPercent(market.baseYield)} yield is overridden by policy risk, thin liquidity, and high-risk exposure.`;
  }

  if (strategy.status === "Watch") {
    return `Useful allocation, held in band by volatility and ${market.signalStatus === "live" ? "live" : "fallback"} market context.`;
  }

  return `Clears policy screens: ${confidence}% confidence, ${treasuryFit}% treasury fit, ${liquidityScore}% liquidity support, ${formatPercent(market.baseYield)} yield input.`;
}

function buildConditions(strategy: Strategy, market: EffectiveMarketDatum) {
  const yieldLabel = market.signalStatus === "live" ? "live yield input" : "fallback yield input";

  if (strategy.name === "mETH Yield Vault") {
    return [
      `${formatPercent(market.baseYield)} mETH ${yieldLabel}`,
      `${market.volatility30d.toFixed(1)}% ETH-beta volatility`,
      `${market.redemptionHours}h liquidity assumption`,
    ];
  }

  return [
    `${formatPercent(market.baseYield)} ${yieldLabel}`,
    `${market.volatility30d.toFixed(1)}% 30-day volatility`,
    `${market.redemptionHours === 0 ? "Instant" : `${market.redemptionHours}h`} redemption`,
  ];
}

function buildPolicyConstraints(strategy: Strategy, market: EffectiveMarketDatum) {
  const constraints = ["Reserve floor checked", "Protocol concentration checked"];

  if (strategy.risk === "High") constraints.unshift("High-risk cap checked");
  if (market.durationDays > 0) constraints.push("Duration checked");
  if (strategy.status === "Blocked") constraints.push("Mandate block active");

  return constraints;
}

function buildExpectedImpact(strategy: Strategy, market: EffectiveMarketDatum) {
  if (strategy.name === "USDC Reserve") return "Preserves runway and immediate settlement capacity.";
  if (strategy.name === "Sentinel tUSDY Mirror") return `Adds ${formatPercent(market.baseYield)} USDY-style RWA productivity within duration policy.`;
  if (strategy.name === "mETH Yield Vault") return "Adds Mantle-native liquid staking exposure with monitored ETH beta.";
  return `${formatPercent(market.baseYield)} yield rejected; risk-adjusted fit is below mandate.`;
}

function parsePercent(value: string) {
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const allocationData = strategies.map((strategy) => ({
  name: strategy.name.replace("Mantle ", ""),
  value: strategy.allocation,
}));

export const performanceData = [
  { month: "Jan", reserves: 12.1, yield: 0.18, risk: 42 },
  { month: "Feb", reserves: 12.2, yield: 0.24, risk: 39 },
  { month: "Mar", reserves: 12.4, yield: 0.32, risk: 36 },
  { month: "Apr", reserves: 12.5, yield: 0.41, risk: 34 },
  { month: "May", reserves: 12.7, yield: 0.51, risk: 30 },
  { month: "Jun", reserves: 12.9, yield: 0.62, risk: 27 },
];

export const policies = [
  {
    label: "High-risk strategy exposure",
    limit: "Max 10%",
    current: "8%",
    state: "Enforced",
  },
  {
    label: "Stable reserve floor",
    limit: "Min 40%",
    current: "45%",
    state: "Enforced",
  },
  {
    label: "RWA duration window",
    limit: "Max 90 days",
    current: "42 days",
    state: "Enforced",
  },
  {
    label: "Single protocol concentration",
    limit: "Max 30%",
    current: "29%",
    state: "Enforced",
  },
];

export const rwaAssetPassport: RwaAssetPassport = {
  assetId: "ondo-usdy-mantle-testnet-mirror",
  passportVersion: "rwa-passport-v1",
  displayName: "Sentinel tUSDY Mirror",
  testnetSymbol: "tUSDY",
  testnetNetwork: "Mantle Sepolia",
  referenceAsset: "Ondo USDY",
  referenceNetwork: "Mantle Mainnet",
  referenceTokenAddress: "0x5bE26527e817998A7206475496fDE1E68957c5A6",
  referenceOracleAddress: "0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f",
  referenceBlocklistAddress: "0xdBd7a7d8807f0C98c9A58f7732f2799c8587e5c6",
  issuer: "Ondo Finance",
  assetType: "Tokenized note secured by short-term US Treasuries and bank demand deposits",
  collateralSummary: "Short-duration treasury and cash-equivalent collateral reference, mirrored only for testnet workflow validation.",
  yieldMechanism: "Accumulating redemption value in the referenced asset model; testnet mirror has no yield or redemption claim.",
  restrictions: [
    "Not on the referenced asset blocklist",
    "Jurisdiction and eligibility review required before production use",
    "No testnet token represents ownership of the real asset",
  ],
  docs: [
    "https://docs.ondo.finance/developer-guides/mantle-integration-guidelines",
    "https://docs.ondo.finance/addresses",
  ],
  mirrorNotice: "Testnet mirror only. No claim on real USDY, treasuries, issuer redemption, or yield.",
};

export const rwaAssetEvidence: RwaAssetEvidence[] = [
  {
    label: "Reference asset",
    value: `${rwaAssetPassport.referenceAsset} on ${rwaAssetPassport.referenceNetwork}`,
    detail: `${rwaAssetPassport.displayName} mirrors the official asset metadata for testnet execution only.`,
  },
  {
    label: "Reference token",
    value: `${rwaAssetPassport.referenceTokenAddress.slice(0, 6)}...${rwaAssetPassport.referenceTokenAddress.slice(-4)}`,
    detail: "Official Mantle mainnet USDY reference address from Ondo documentation.",
  },
  {
    label: "Testnet mirror",
    value: `${rwaAssetPassport.testnetSymbol} on ${rwaAssetPassport.testnetNetwork}`,
    detail: rwaAssetPassport.mirrorNotice,
  },
  {
    label: "Audit anchors",
    value: "Passport + compliance hashes",
    detail: "Each StrategyVault request anchors the RWA passport hash and AI compliance attestation hash.",
  },
];

export function evaluateRwaComplianceChecks(
  currentStrategies: Strategy[] = strategies,
  recommendation?: RecommendationSignal,
): RwaComplianceCheck[] {
  const targetStrategy = currentStrategies.find((strategy) => strategy.name === recommendation?.to) ??
    currentStrategies.find((strategy) => strategy.name === "Sentinel tUSDY Mirror");
  const rwaStrategy = currentStrategies.find((strategy) => strategy.name === "Sentinel tUSDY Mirror");
  const highRiskStrategy = currentStrategies.find((strategy) => strategy.name === "High Yield LP");
  const amountPercent = parsePercent(recommendation?.amount ?? "4%");
  const proposedTargetAllocation = (targetStrategy?.allocation ?? 0) + (recommendation?.status === "Allowed" ? amountPercent : 0);
  const highRiskAfterUnsafeTest = (highRiskStrategy?.allocation ?? 0) + 16;
  const durationDays = mockMarketData["Sentinel tUSDY Mirror"].durationDays;
  const redemptionHours = mockMarketData["Sentinel tUSDY Mirror"].redemptionHours;

  return [
    {
      ruleId: "operator-allowlist",
      label: "Operator authorization",
      status: "Monitored",
      requirement: "Production RWA actions require an allowlisted treasury operator",
      input: "Demo wallet submission; hardened StrategyVault supports operator allowlist controls",
      evidence: "Operator controls are modeled in the contract source and can be enabled before production use.",
      detail: "This remains monitored because the public demo should not claim full KYC or institutional onboarding.",
    },
    {
      ruleId: "jurisdiction-review",
      label: "Jurisdiction filter",
      status: "Monitored",
      requirement: "RWA access must be reviewed for jurisdiction and investor eligibility",
      input: "No production jurisdiction profile attached to the demo wallet",
      evidence: "RWA allocation is tagged for jurisdiction review before production execution.",
      detail: "The app surfaces the compliance dependency instead of pretending a public hackathon wallet is fully permissioned.",
    },
    {
      ruleId: "issuer-duration",
      label: "Issuer and duration mandate",
      status: rwaStrategy?.status === "Compliant" && durationDays <= 90 ? "Cleared" : "Blocked",
      requirement: "Approved RWA sleeve, max 90-day modeled duration",
      input: `${rwaStrategy?.category ?? "Unknown asset"} / ${durationDays} days`,
      evidence: `Duration capped at 90 days; current modeled duration is ${durationDays} days.`,
      detail: "Treasury mandate checks asset class, duration, concentration, and liquidity before settlement.",
    },
    {
      ruleId: "concentration-liquidity",
      label: "Concentration and liquidity",
      status: proposedTargetAllocation <= 33 && redemptionHours <= 72 ? "Cleared" : "Blocked",
      requirement: "Target allocation <= 33%, redemption <= 72 hours",
      input: `${proposedTargetAllocation}% target allocation / ${redemptionHours}h redemption`,
      evidence: "Safe RWA path stays inside concentration and redemption limits.",
      detail: "This rule is recomputed from the current portfolio and selected recommendation.",
    },
    {
      ruleId: "high-risk-substitution",
      label: "High-risk substitution",
      status: highRiskAfterUnsafeTest > 10 ? "Blocked" : "Cleared",
      requirement: "High-risk strategy exposure must remain <= 10%",
      input: `${highRiskAfterUnsafeTest}% exposure after unsafe test`,
      evidence: "High Yield LP path exceeds high-risk exposure tolerance.",
      detail: "Treasury teams can test a blocked path that records the policy failure on Mantle Sepolia.",
    },
  ];
}

export function buildAiComplianceAttestation(
  recommendation: RecommendationSignal | undefined,
  complianceChecks: RwaComplianceCheck[],
  signalEngine: TreasurySignalEngine,
  passport: RwaAssetPassport = rwaAssetPassport,
): AiComplianceAttestation {
  const blockedRules = complianceChecks.filter((check) => check.status === "Blocked");
  const monitoredRules = complianceChecks.filter((check) => check.status === "Monitored");
  const targetSignal = recommendation ? signalEngine.strategySignalMap[recommendation.to] : undefined;
  const allowedRecommendation = recommendation?.status === "Allowed";
  const verdict: AiComplianceAttestation["verdict"] = !allowedRecommendation || blockedRules.length > 0 ? "block" : monitoredRules.length > 0 ? "monitor" : "pass";
  const riskLevel: RiskLevel = verdict === "block" ? "High" : monitoredRules.length > 0 ? "Medium" : "Low";
  const flags = [
    ...monitoredRules.map((check) => `${check.ruleId}:monitor`),
    ...blockedRules.map((check) => `${check.ruleId}:block`),
  ];

  return {
    schema: "sentinel.aiComplianceAttestation.v1",
    assetId: passport.assetId,
    verdict,
    riskLevel,
    confidence: recommendation?.confidence ?? signalEngine.confidence,
    flags,
    summary: allowedRecommendation
      ? `${passport.displayName} is eligible for testnet intent recording with ${targetSignal?.marketStatus ?? "fallback"} market input; production use still requires issuer eligibility and jurisdiction review.`
      : "Requested path is blocked because the target allocation fails one or more treasury or compliance controls.",
    requiredHumanReview: monitoredRules.map((check) => check.label),
  };
}

export const rwaComplianceChecks: RwaComplianceCheck[] = evaluateRwaComplianceChecks(strategies);

export const decisions = [
  {
    time: "May 14, 2026, 10:12",
    title: "Proposal blocked",
    detail: "Move 16% from USDC Reserve into High Yield LP",
    result: "Blocked by policy: high-risk exposure would reach 24%",
    severity: "blocked",
    auditStatus: "blocked",
    reasoningSummary: "Yield failed policy fit after volatility and exposure checks.",
    confidence: 38,
    treasuryPosture: "Restricted",
    signalState: "Constrained target, 38% risk-adjusted score",
  },
  {
    time: "May 14, 2026, 10:07",
    title: "Recommendation generated",
    detail: "Increase Sentinel tUSDY Mirror by 4%",
    result: "Awaiting treasurer approval",
    severity: "pending",
    auditStatus: "pending",
    reasoningSummary: "Reserve buffer cleared floor; T-Bill fit cleared policy screens.",
    confidence: 82,
    treasuryPosture: "Defensive",
    signalState: "Healthy target, 85% policy-liquidity score",
  },
  {
    time: "May 14, 2026, 09:20",
    title: "Signal refresh completed",
    detail: "Re-scored reserve, RWA, staking, and high-yield strategies",
    result: "No mandate changes required",
    severity: "success",
    auditStatus: "approved",
    reasoningSummary: "Liquidity, duration, and exposure inputs remained inside operating bands.",
    confidence: 86,
    treasuryPosture: "Defensive",
    signalState: "Healthy portfolio / Conservative stance / 90% allocation efficiency",
  },
  {
    time: "May 13, 2026, 16:12",
    title: "Rebalance intent recorded",
    detail: "Recorded 3% shift from mETH Yield Vault to USDC Reserve",
    result: "Compliant with all active policies",
    severity: "success",
    auditStatus: "approved",
    reasoningSummary: "Reduced ETH-beta exposure and restored reserve headroom.",
    confidence: 87,
    treasuryPosture: "Defensive",
    signalState: "Healthy reserve, 89% confidence",
  },
];
