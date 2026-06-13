import type { Strategy } from "./treasury";

export type MarketSignalStatus = "loading" | "live" | "fallback";

export type StrategyMarketSignal = {
  strategyName: string;
  apy: number;
  tvlUsd: number;
  status: MarketSignalStatus;
  source: string;
  lastUpdated: string;
  note?: string;
};

export type MarketSignalMap = Record<string, StrategyMarketSignal>;

type DefiLlamaPool = {
  chain?: string;
  project?: string;
  symbol?: string;
  poolMeta?: string;
  tvlUsd?: number;
  apy?: number;
  stablecoin?: boolean;
  ilRisk?: string;
};

const DEFI_LLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

export const seededMarketSignals: MarketSignalMap = {
  "USDC Reserve": {
    strategyName: "USDC Reserve",
    apy: 0.8,
    tvlUsd: 5_794_000,
    status: "fallback",
    source: "Seeded treasury model",
    lastUpdated: "10:42",
    note: "Reserve yield benchmark",
  },
  "Sentinel tUSDY Mirror": {
    strategyName: "Sentinel tUSDY Mirror",
    apy: 4.7,
    tvlUsd: 3_734_000,
    status: "fallback",
    source: "Seeded treasury model",
    lastUpdated: "10:42",
    note: "USDY-style RWA mirror proxy",
  },
  "mETH Yield Vault": {
    strategyName: "mETH Yield Vault",
    apy: 3.9,
    tvlUsd: 2_317_000,
    status: "fallback",
    source: "Seeded treasury model",
    lastUpdated: "10:42",
    note: "mETH liquid staking APY/TVL context",
  },
  "High Yield LP": {
    strategyName: "High Yield LP",
    apy: 14.2,
    tvlUsd: 1_030_000,
    status: "fallback",
    source: "Seeded treasury model",
    lastUpdated: "10:42",
    note: "Constrained DeFi proxy",
  },
};

export function getLoadingMarketSignals() {
  return mapSeededSignals("loading", "Loading live signal");
}

export async function fetchMarketSignals(strategies: Strategy[]): Promise<MarketSignalMap> {
  try {
    const response = await fetch(DEFI_LLAMA_YIELDS_URL, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`DefiLlama responded with ${response.status}`);
    }

    const payload = (await response.json()) as { data?: DefiLlamaPool[] };
    const pools = Array.isArray(payload.data) ? payload.data.filter(isUsablePool) : [];

    if (pools.length === 0) {
      throw new Error("No usable DefiLlama pools returned");
    }

    const updatedAt = currentTimeLabel();

    return strategies.reduce<MarketSignalMap>((signals, strategy) => {
      const pool = selectPoolForStrategy(strategy, pools);
      const seeded = seededMarketSignals[strategy.name];

      signals[strategy.name] = pool
        ? {
            strategyName: strategy.name,
            apy: roundSignal(pool.apy ?? seeded.apy),
            tvlUsd: Math.round(pool.tvlUsd ?? seeded.tvlUsd),
            status: "live",
            source: `DefiLlama / ${pool.project ?? "Yield pool"} / ${pool.chain ?? "Multi-chain"}`,
            lastUpdated: updatedAt,
            note: buildSignalNote(strategy, pool, seeded),
          }
        : {
            ...seeded,
            status: "fallback",
            source: "Seeded fallback",
            lastUpdated: updatedAt,
          };

      return signals;
    }, {});
  } catch {
    return mapSeededSignals("fallback", "Seeded fallback", currentTimeLabel());
  }
}

function mapSeededSignals(status: MarketSignalStatus, source: string, lastUpdated = "10:42") {
  return Object.fromEntries(
    Object.entries(seededMarketSignals).map(([strategyName, signal]) => [
      strategyName,
      {
        ...signal,
        status,
        source,
        lastUpdated,
      },
    ]),
  ) as MarketSignalMap;
}

function selectPoolForStrategy(strategy: Strategy, pools: DefiLlamaPool[]) {
  const scored = pools
    .map((pool) => ({ pool, score: scorePool(strategy.name, pool) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.pool;
}

function buildSignalNote(strategy: Strategy, pool: DefiLlamaPool, seeded: StrategyMarketSignal) {
  if (strategy.name === "mETH Yield Vault") {
    return "mETH liquid staking APY/TVL context";
  }

  return pool.symbol ?? pool.poolMeta ?? seeded.note;
}

function scorePool(strategyName: string, pool: DefiLlamaPool) {
  const text = `${pool.chain ?? ""} ${pool.project ?? ""} ${pool.symbol ?? ""} ${pool.poolMeta ?? ""}`.toLowerCase();
  const apy = pool.apy ?? 0;
  const tvlUsd = pool.tvlUsd ?? 0;
  const mantleBonus = text.includes("mantle") ? 80 : 0;
  const tvlScore = Math.min(Math.log10(Math.max(tvlUsd, 1)) * 8, 60);

  if (strategyName === "USDC Reserve") {
    const stableMatch = pool.stablecoin || /usdc|usdt|dai|usd/.test(text);
    if (!stableMatch || apy <= 0 || apy > 8) return 0;
    return mantleBonus + tvlScore + (text.includes("usdc") ? 20 : 8) + (apy <= 4 ? 8 : 0);
  }

  if (strategyName === "Sentinel tUSDY Mirror") {
    const stableYield = /usdc|usdt|dai|usd|rwa|treasury|bill|ondo/.test(text);
    if (!stableYield || apy < 2 || apy > 9) return 0;
    return mantleBonus + tvlScore + (apy >= 3.5 && apy <= 6.5 ? 24 : 10);
  }

  if (strategyName === "mETH Yield Vault") {
    const stakingMatch = /meth|cmeth|steth|reth|frxeth|sfrxeth|weth|staking|lst|liquid/.test(text);
    if (!stakingMatch || apy <= 0 || apy > 12) return 0;
    return mantleBonus + tvlScore + (text.includes("meth") ? 40 : 12) + (/staking|liquid|lst/.test(text) ? 12 : 0);
  }

  if (strategyName === "High Yield LP") {
    if (apy < 8 || apy > 60) return 0;
    return mantleBonus + tvlScore + Math.min(apy, 30);
  }

  return 0;
}

function isUsablePool(pool: DefiLlamaPool) {
  return Number.isFinite(pool.apy) && Number.isFinite(pool.tvlUsd) && (pool.tvlUsd ?? 0) > 10_000;
}

function roundSignal(value: number) {
  return Math.round(value * 10) / 10;
}

function currentTimeLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
