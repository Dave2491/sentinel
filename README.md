```md
# sentinel

sentinel is a policy-aware treasury intelligence and execution layer for onchain capital allocation, built for the mantle ai x rwa hackathon track.

it helps treasury operators evaluate allocation opportunities, check them against deterministic policy constraints, execute approved actions on mantle sepolia, and preserve an audit-ready record of every recommendation and outcome.

sentinel is intentionally not an autonomous trading bot. the ai layer only explains deterministic policy signals in institutional language. it does not control recommendations, submit transactions, or override execution constraints.

## deployment proof

- network: mantle sepolia
- frontend: 'https://sentinel-nine-lemon.vercel.app/'
- mock usdc: `0x9aCf6726F02FAd9F25c3603B613D0d0783423Ae9`
- execution guard: `0x0faB35f64B661CB2B0B6927F2fceF1B0e4b760E9`
- strategy vault: `0x7d76927cb553C8591327D0a87cA3fC0C9A50ac71`
- sentinel agent identity: `0x910072C6352D69cca6281231e2d3529857c09896`
- safe strategy: `0xE8F5735A8EEAbeE56eA6c508832CeE8299164Ab7`
- unsafe strategy: `0x63c414E01E74FF0D3304AE48352e01a368Ddcf5B`
- agent metadata update tx: https://sepolia.mantlescan.xyz/tx/0xcdba207b5503fbc21fff9145dd88dac825e3834c293042e93983571a8fe7e6d2

### proof transactions

- approved execution: `https://sepolia.mantlescan.xyz/tx/0x94caf43e95f1eef2e529de74f4dbb8a81faff1634a9818dcdb260139e5a0bacd`
- blocked mandate: `https://sepolia.mantlescan.xyz/tx/0x3b2bab20672d6441edee43f97a31d2750f6a8b9843ef385f24ba6f05d68de3e8`

these transactions demonstrate both sides of sentinel’s execution model: an approved treasury allocation and a policy-blocked allocation that records the mandate failure.

> note: if the contracts are redeployed again, replace the addresses and proof transaction links above with the latest deployment output and latest successful demo transactions.

## judge quickstart

sentinel demonstrates a controlled treasury decision workflow on mantle sepolia.

### recommended demo flow

1. open the treasury dashboard.
2. review the recommended treasury allocation.
3. inspect the policy pre-check and risk stance.
4. connect a wallet on mantle sepolia.
5. mint demo mock usdc if needed.
6. execute the policy-approved allocation.
7. test a mandate-blocked allocation.
8. open the decision log.
9. inspect the audit trail, status labels, confidence score, policy result, and transaction links.

### what to look for

- a deterministic treasury signal engine, not random ai output
- a clear separation between recommendation, rationale, policy validation, and execution
- approved actions that can proceed through the execution flow
- blocked actions that are stopped by treasury mandate constraints
- governance-ready audit records for recommendation history
- mantle sepolia transaction links for executed actions
- onchain agent identity contract for sentinel

## why sentinel matters

most treasury dashboards show balances, yields, and positions. sentinel goes further by answering the operational question that matters before capital moves:

> is this allocation policy-aligned, explainable, and safe to execute?

onchain treasuries need systems that can:

- evaluate allocation opportunities against treasury mandates
- explain why a recommendation exists
- prevent policy-violating execution
- preserve a reviewable governance trail
- keep ai as an explanation layer, not an unchecked capital controller

sentinel demonstrates that workflow with a policy-aware dashboard, deterministic treasury logic, ai-generated rationale, mantle sepolia execution, an onchain agent identity, and an audit trail built for review.

## core product thesis

ai should not directly control treasury capital.

instead, ai should help governance participants and treasury operators understand deterministic signals that are already constrained by policy.

sentinel follows this architecture:

```text
market + treasury data
        ↓
deterministic signal engine
        ↓
policy pre-check
        ↓
ai rationale layer
        ↓
wallet-controlled execution
        ↓
onchain execution record
        ↓
governance audit trail
```

this creates a safer model for ai-assisted treasury operations:

- the deterministic engine decides the signal
- policy rules define execution boundaries
- the ai layer explains the rationale
- the wallet holder approves transactions
- smart contracts enforce execution constraints
- the audit trail records the outcome

## main features

### treasury intelligence dashboard

sentinel presents a high-level treasury console with:

- treasury value and reserve posture
- allocation breakdown
- policy alignment status
- confidence scoring
- market signal context
- recommended treasury actions
- execution readiness indicators

### deterministic policy engine

recommendations are generated from deterministic treasury logic, including:

- reserve posture
- liquidity conditions
- volatility context
- target allocation fit
- policy compatibility
- confidence score
- execution risk status

given the same input data and policy constraints, the engine should produce the same recommendation outcome.

### ai rationale layer

sentinel uses a lightweight openrouter text-generation helper to produce institutional explanations for treasury recommendations.

the ai layer:

- explains deterministic treasury signals
- writes in formal, governance-ready language
- avoids chatbot-style advice
- does not control execution
- falls back to deterministic rationale if the api is unavailable

### onchain ai evidence hash

sentinel records an ai rationale evidence hash with execution events.

the full text rationale remains in the frontend audit trail, while the onchain hash provides a compact verification anchor that the recommendation had associated rationale evidence at execution time.

### onchain agent identity

sentinel includes a deployed agent identity contract on mantle sepolia.

this gives the project a verifiable onchain identity for the sentinel treasury intelligence agent, separate from the execution contracts.

### policy-aware execution gate

before execution, sentinel checks whether a proposed allocation fits the treasury mandate.

approved recommendations can proceed through the wallet execution flow.

blocked recommendations are stopped and recorded as policy violations.

### mantle sepolia execution

sentinel integrates with mantle sepolia using:

- rainbowkit
- wagmi
- viem
- walletconnect
- mantle sepolia chain configuration

the demo execution flow uses smart contracts to simulate treasury allocation control.

### decision log / audit trail

sentinel records treasury decisions with:

- recommendation title
- timestamp
- status: approved, pending, or blocked
- execution result
- policy rationale
- confidence score
- signal state
- chain label
- transaction hash where available

this gives judges a clear governance review surface instead of a one-off dashboard action.

## technical highlights

- vite + react + typescript frontend
- tailwind-based institutional dashboard ui
- deterministic treasury recommendation engine
- openrouter chat-completions helper for text rationale
- deterministic fallback if ai generation fails
- rainbowkit / wagmi / viem wallet integration
- mantle sepolia execution flow
- smart-contract policy guard
- mock usdc demo token
- strategy vault simulation
- blocked execution path for unsafe allocation
- audit trail with transaction links and policy metadata
- live market signal layer with fallback data
- onchain ai rationale evidence hash attached to execution events
- onchain sentinel agent identity contract

## architecture overview

```text
src/
  App.tsx
    application shell, routes, dashboard, execution flow, audit trail
  data/
    treasury.ts
      seeded treasury model, recommendation data, deterministic signal engine
    marketSignals.ts
      live market signal layer with fallback values
  lib/
    aiRationale.ts
      openrouter-powered treasury rationale helper with deterministic fallback
  contracts.ts
    frontend contract abis and environment-based addresses
  wallet.ts
    rainbowkit, wagmi, viem, and mantle sepolia wallet configuration

contracts/
  contracts/
    MockUSDC.sol
    ExecutionGuard.sol
    StrategyVault.sol
    SentinelAgentIdentity.sol
  scripts/
    deploy.ts
    verify.ts
  test/
    SentinelContracts.ts
```

## smart contracts

sentinel uses a small contract system for hackathon demonstration purposes.

### `MockUSDC.sol`

demo usdc token used to simulate treasury balances on mantle sepolia.

### `ExecutionGuard.sol`

policy guard contract that validates whether an allocation is allowed before execution.

### `StrategyVault.sol`

demo strategy vault used to record approved treasury allocation movement and policy-blocked attempts.

the vault records execution metadata including recommendation ids and ai rationale evidence hashes, giving the demo a verifiable onchain audit trail.

### `SentinelAgentIdentity.sol`

minimal onchain agent identity nft used to represent sentinel as a deployed treasury intelligence agent on mantle sepolia.

this supports the hackathon’s agent identity direction by giving sentinel a verifiable onchain identity separate from the execution contracts.

the smart contract layer is intentionally scoped for the hackathon demo. it demonstrates policy enforcement and controlled execution boundaries, not production treasury custody.

## ai usage

sentinel uses openrouter only for text explanation.

the ai model does not:

- choose the recommendation
- approve treasury movement
- submit transactions
- override policy checks
- manage private keys
- perform autonomous trading

the ai model does:

- explain a deterministic treasury signal
- produce concise institutional rationale
- help governance reviewers understand the recommendation
- fall back safely when unavailable

## environment variables

create a frontend environment file:

```bash
cp .env.example .env
```

configure the values needed for the frontend:

```bash
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

VITE_MOCK_USDC_ADDRESS=0x9aCf6726F02FAd9F25c3603B613D0d0783423Ae9
VITE_EXECUTION_GUARD_ADDRESS=0x0faB35f64B661CB2B0B6927F2fceF1B0e4b760E9
VITE_STRATEGY_VAULT_ADDRESS=0x7d76927cb553C8591327D0a87cA3fC0C9A50ac71
VITE_SAFE_STRATEGY_ADDRESS=0xE8F5735A8EEAbeE56eA6c508832CeE8299164Ab7
VITE_UNSAFE_STRATEGY_ADDRESS=0x63c414E01E74FF0D3304AE48352e01a368Ddcf5B
```

the openrouter key is optional for the core deterministic flow. if it is missing or unavailable, sentinel uses deterministic fallback rationale.

## frontend setup

install dependencies:

```bash
npm install
```

start the development server:

```bash
npm run dev
```

build for production:

```bash
npm run build
```

preview the production build:

```bash
npm run preview
```

## mantle sepolia deployment

from the `contracts/` directory, install dependencies:

```bash
npm install
```

create a contracts environment file:

```bash
cp .env.example .env
```

configure the mantle sepolia deployment variables:

```bash
PRIVATE_KEY=your_testnet_wallet_private_key
MANTLE_SEPOLIA_RPC_URL=your_mantle_sepolia_rpc_url
```

deploy contracts:

```bash
npm run deploy:mantle-sepolia
```

the deployment script deploys:

1. `MockUSDC`
2. `ExecutionGuard`
3. `StrategyVault`
4. `SentinelAgentIdentity`
5. a safe strategy placeholder
6. an unsafe strategy placeholder

after deployment, copy the deployed addresses into the frontend `.env` file.

## verification

run the frontend build:

```bash
npm run build
```

run contract tests from the `contracts/` directory:

```bash
npm test
```

verify the live onchain demo evidence:

- approved execution: `https://sepolia.mantlescan.xyz/tx/0x94caf43e95f1eef2e529de74f4dbb8a81faff1634a9818dcdb260139e5a0bacd`
- blocked mandate: `https://sepolia.mantlescan.xyz/tx/0x3b2bab20672d6441edee43f97a31d2750f6a8b9843ef385f24ba6f05d68de3e8`

## demo boundaries

sentinel deliberately avoids:

- autonomous trading
- ai-controlled execution
- backend custody services
- production yield routing
- bridge integrations
- validator or staking execution mechanics
- real rwa issuer integrations
- production treasury management claims

these boundaries are intentional. sentinel demonstrates how treasury intelligence, policy validation, ai explanation, and onchain execution controls can work together without turning recommendation logic into uncontrolled capital movement.

## hackathon positioning

sentinel is best understood as:

> an institutional treasury console for policy-aware onchain capital allocation.

it is not a chatbot and not a trading bot.

the strongest judging angle is the separation of responsibilities:

- deterministic logic for treasury signals
- policy contracts for execution boundaries
- ai for explanation only
- wallet approval for transaction control
- audit logs for governance review

## future extensions

possible future work includes:

- multi-policy treasury mandates
- dao proposal ingestion
- multi-chain treasury views
- real rwa vault adapters
- formal risk scoring modules
- governance approval workflows
- automated report generation
- role-based treasury operator permissions
- exportable audit reports
- production-grade contract verification and monitoring

## licence

this repository was built for hackathon demonstration purposes. add a formal licence before production or open-source distribution.
```