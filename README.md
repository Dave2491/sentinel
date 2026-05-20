# Sentinel

Sentinel is a policy-aware treasury intelligence and execution layer for onchain capital allocation, built for the Mantle AI x RWA hackathon track.

It presents institutional treasury recommendations, validates them against deterministic policy constraints, and records execution outcomes for governance review. The product is designed around explainability, auditability, and controlled execution rather than autonomous trading.

## Thesis

Onchain treasuries need more than yield discovery. They need capital allocation systems that can explain why an action is recommended, prove that mandate constraints were checked, and preserve a clear record of approvals, blocks, and execution state.

Sentinel addresses that workflow:

- treasury signals are computed from a deterministic model
- recommendations are explained before execution
- policy constraints are evaluated before transactions are submitted
- execution outcomes are recorded in governance-grade decision logs
- live market data informs context without destabilizing the policy engine

Sentinel is not an autonomous trading bot, a retail DeFi dashboard, or an AI chatbot. It is a controlled treasury intelligence interface for policy-aware allocation decisions.

## Core Features

- Mantle Sepolia wallet connection with RainbowKit
- StrategyVault execution flow for policy-cleared allocation requests
- ExecutionGuard policy enforcement for approved strategy limits
- MockUSDC treasury asset for demo liquidity and repeatable testing
- deterministic Treasury Signal Engine
- AI-assisted governance commentary through OpenRouter
- explainable recommendations with confidence, posture, policy checks, and expected impact
- live APY/TVL-style signal layer through DefiLlama public data
- seeded fallback values for stable demo behavior
- governance-grade decision logs with reasoning summaries and signal state
- Mantlescan transaction links
- mETH positioned as Mantle-native liquid staking exposure
- responsive, institutional dark UI

## Architecture

```text
Frontend UI
  React + Vite + TypeScript
  wagmi + viem + RainbowKit
  Tailwind + Recharts

Treasury Intelligence
  deterministic strategy scoring
  recommendation explainability
  AI rationale summarization
  seeded portfolio state
  live market signal context with fallback

Onchain Execution
  MockUSDC
  ExecutionGuard
  StrategyVault
  Mantle Sepolia

Audit Surface
  decision logs
  execution state
  policy verdicts
  Mantlescan links
```

Sentinel has no backend service. The frontend reads seeded treasury state, fetches public market signal data client-side, and interacts directly with deployed Mantle Sepolia contracts through the connected wallet.

## Treasury Signal Engine

The Treasury Signal Engine derives strategy-level scores from deterministic treasury inputs:

- yield score
- volatility score
- liquidity score
- policy compatibility
- treasury fit
- confidence score
- allocation efficiency
- strategy health
- treasury posture

These scores are used to generate recommendation context and dashboard state. The engine is intentionally deterministic so the same treasury state produces the same recommendation rationale. This is important for governance workflows where committees and signers need reproducible reasoning, not opaque model output.

## AI Governance Commentary

Sentinel includes a lightweight AI rationale layer using OpenRouter's chat completions API with `openrouter/free`.

The model receives structured treasury context such as strategy name, confidence, stance, policy status, liquidity condition, reserve posture, APY context, and expected impact. It returns a short governance-oriented summary for the recommendation panel.

This layer is explanation-only. It does not control recommendations, policy validation, transaction submission, strategy scoring, or treasury logic. If the OpenRouter API key is missing or the request fails, Sentinel falls back to deterministic recommendation text.

For the hackathon demo, the OpenRouter key is read from a Vite environment variable and is therefore exposed to the browser like any `VITE_*` value. A production deployment should route LLM calls through a controlled backend or edge function with rate limits and key protection.

## Policy Validation

Policy validation is split between the interface and the onchain execution path.

The interface explains the policy checks before the user acts. The contract layer enforces execution constraints through `ExecutionGuard`, which stores strategy approval and allocation limits. `StrategyVault` calls the guard before recording a simulated allocation.

This separation keeps the recommendation layer informative while ensuring the execution layer remains policy-aware.

## Recommendation Logic

Recommendations are deterministic and explainable. Each recommendation includes:

- why the recommendation exists
- treasury conditions that triggered it
- policy constraints checked
- expected impact
- confidence percentage
- confidence basis
- treasury posture
- live or fallback market signal context

Live market data is used as contextual intelligence, not as uncontrolled execution authority. Policy outcomes remain stable and deterministic.

## Live Market Signal Layer

Sentinel includes a lightweight read-only market signal layer using the DefiLlama public yields API.

The app fetches APY and TVL-style metrics for comparable DeFi strategies and injects those values into strategy cards and recommendation context. If the API is unavailable, malformed, or returns no usable match, Sentinel falls back to seeded market values.

The UI labels this state clearly:

- `Live signal`
- `Loading signal`
- `Seeded fallback`
- `Last updated`

This keeps the demo market-aware without depending on a backend service or a production data pipeline.

## Governance And Audit Trail

Sentinel records decision events with:

- recommendation or execution title
- execution result
- reasoning summary
- confidence
- treasury posture
- signal state at execution time
- transaction hash when available
- Mantle Sepolia explorer link

The goal is to make treasury activity reviewable after the fact. A blocked allocation should be as explainable as an approved one.

## Mantle Ecosystem Alignment

Sentinel is built around Mantle Sepolia execution and Mantle ecosystem treasury context.

- contracts are deployed for Mantle Sepolia testing
- transaction links resolve to Mantlescan
- the strategy book includes Mantle T-Bill and mETH-oriented treasury strategies
- mETH is presented as Mantle-native liquid staking exposure for yield-bearing ETH allocation context
- live market signals support Mantle or comparable DeFi yield metrics where available

The product framing is infrastructural: Sentinel treats Mantle as the execution and ecosystem context for controlled treasury allocation.

## AI x RWA Positioning

Sentinel fits the AI x RWA track through policy-aware treasury intelligence rather than autonomous execution.

The AI-aligned component is the explainability and signal layer: recommendations are ranked, scored, and narrated in a way that a treasury team can review. The RWA component is represented through short-duration treasury allocation modeling, simulated RWA vault exposure, policy limits, duration checks, and allocation constraints.

The system is intentionally conservative. It does not execute trades autonomously, integrate real RWA issuers, or route funds into external protocols.

## Smart Contracts

The contract package lives in `contracts/`.

### `MockUSDC`

A demo ERC20 treasury asset with 6 decimals. It mints initial supply to the deployer and includes a capped public faucet mint so judge wallets can obtain test liquidity.

### `ExecutionGuard`

Stores strategy approval status and maximum allocation limits in basis points. It exposes validation methods used by the vault before allocation requests are recorded.

### `StrategyVault`

Accepts treasury asset deposits and records simulated strategy allocations after policy validation. For the hackathon testnet deployment, rebalance requests are public so judges can submit transactions from their own wallets. If a requested allocation fails policy, it emits an `AllocationBlocked` event instead of recording the allocation.

No production DeFi integrations, bridges, validator mechanics, governance modules, or onchain AI systems are included.

## Reference Mantle Sepolia Contracts

The repository includes verification configuration for these Mantle Sepolia deployments:

| Contract | Address |
| --- | --- |
| MockUSDC | `0x32683D42103B44e54eF3c624470C92A343837bCF` |
| ExecutionGuard | `0xeE1F44D2a3a9d2FFa0dCbCDE16a6087DDe0f9465` |
| StrategyVault | `0x5F49F2108338902Ae9E4eeba36AFfC1A42D9C265` |

Strategy placeholder addresses are produced by the deployment script and should be copied into the frontend `.env` with the other contract addresses.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- wagmi
- viem
- RainbowKit
- Recharts
- Hardhat
- Solidity
- OpenZeppelin
- Mantle Sepolia
- DefiLlama public API

## Project Structure

```text
sentinel/
  src/
    App.tsx                 # application shell, routes, dashboard, execution flow
    contracts.ts            # frontend ABIs and env-based contract addresses
    wallet.ts               # RainbowKit/wagmi configuration
    data/
      treasury.ts           # seeded treasury model and signal engine
      marketSignals.ts      # DefiLlama live signal layer with fallback
    assets/
      mantle-logo.png       # Mantle ecosystem mark

  contracts/
    contracts/
      MockUSDC.sol
      ExecutionGuard.sol
      StrategyVault.sol
    scripts/
      deploy.ts
      verify.ts
    test/
      SentinelContracts.ts
```

## Frontend Setup

Install dependencies:

```bash
npm install
```

Create a frontend environment file:

```bash
cp .env.example .env
```

Configure:

```bash
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_MOCK_USDC_ADDRESS=0x...
VITE_EXECUTION_GUARD_ADDRESS=0x...
VITE_STRATEGY_VAULT_ADDRESS=0x...
VITE_SAFE_STRATEGY_ADDRESS=0x...
VITE_UNSAFE_STRATEGY_ADDRESS=0x...
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

If contract addresses are not configured, Sentinel still runs with seeded treasury state and demo-safe signals. Wallet execution is disabled until the required Mantle Sepolia addresses are present.

For the hackathon testnet deployment, judge wallets can mint capped demo MockUSDC and submit rebalance requests directly. `ExecutionGuard` remains authoritative: it validates strategy approval and allocation limits before the vault records an executed or blocked outcome.

## Contract Setup

Install contract dependencies:

```bash
cd contracts
npm install
```

Compile:

```bash
npm run compile
```

Run tests:

```bash
npm test
```

Create a contract environment file:

```bash
cp .env.example .env
```

Configure:

```bash
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=your_deployer_private_key_without_0x
MANTLESCAN_API_KEY=your_mantlescan_or_etherscan_api_key
SENTINEL_OWNER_ADDRESS=deployer_address_used_for_constructor_args
MOCK_USDC_ADDRESS=deployed_mock_usdc_address
EXECUTION_GUARD_ADDRESS=deployed_execution_guard_address
STRATEGY_VAULT_ADDRESS=deployed_strategy_vault_address
```

Do not commit private keys or funded deployer credentials.

## Mantle Sepolia Deployment

From the `contracts/` directory:

```bash
npm run deploy:mantle-sepolia
```

The deployment script deploys:

1. `MockUSDC`
2. `ExecutionGuard`
3. `StrategyVault`
4. a safe strategy placeholder address
5. an unsafe strategy placeholder address

It then configures policy limits in `ExecutionGuard`:

- safe strategy: approved with a 40% maximum allocation
- unsafe strategy: approved with a 10% maximum allocation

After deployment, copy the printed addresses into the root `.env` file.

Redeploy the contracts after changing Solidity source. Existing `.env` addresses will continue pointing at the previous deployment until they are updated.

Verify contracts on Mantlescan:

```bash
npm run verify:mantle-sepolia
```

The verification script is configured for Mantle Sepolia using Hardhat's Etherscan-compatible verifier.

## Screenshots

Add final screenshots here before submission.

### Landing Page

`docs/screenshots/landing.png`

### Treasury Dashboard

`docs/screenshots/dashboard.png`

### Strategy Universe

`docs/screenshots/strategies.png`

### Recommendation Panel

`docs/screenshots/recommendations.png`

### Decision Log

`docs/screenshots/decision-log.png`

## Demo Notes

Sentinel is designed to remain stable during live demos:

- market signals fall back to seeded values if DefiLlama is unavailable
- AI governance commentary falls back to deterministic text if OpenRouter is unavailable
- recommendations are deterministic
- seeded audit timestamps are generated relative to the current browser time
- confirmed transactions update the session allocation view from contract events
- policy checks are explicit
- blocked execution paths remain available for judges to test
- Mantlescan links appear when transactions are submitted
- no backend process is required

## Scope Boundaries

Sentinel deliberately avoids:

- autonomous trading
- AI chat interfaces
- backend custody services
- bridge integrations
- validator or staking execution mechanics
- real RWA issuer integrations
- production yield routing

These boundaries are intentional. The project demonstrates how treasury intelligence, policy validation, and onchain execution controls can work together without turning recommendation logic into uncontrolled capital movement.

## License

This repository was built for hackathon demonstration purposes. Add a formal license before production or open-source distribution.
