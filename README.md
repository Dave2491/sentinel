```md
# sentinel

sentinel is a policy-aware treasury intelligence and execution layer for onchain capital allocation, built for the mantle ai x rwa hackathon track.

it helps treasury operators evaluate allocation opportunities, check them against deterministic policy constraints, execute approved actions on mantle sepolia, and preserve an audit-ready record of every recommendation and outcome.

sentinel is intentionally not an autonomous trading bot. the ai layer only explains deterministic policy signals in institutional language. it does not control recommendations, submit transactions, or override execution constraints.

## deployment proof

- network: mantle sepolia
- frontend: 'https://sentinel-nine-lemon.vercel.app/'
- mock usdc: `0x2e7BE27fdb3Eaf194B4064224736a033826b45bb`
- testnet rwa mirror: `0xe762A07f880c25Cd11f9A8b58f49CCA62dd29341`
- execution guard: `0x3BC3b56a7859B0296b74c47459e03e527D93E42B`
- strategy vault: `0xD3BAFf222ea9EB9e5ec7751d3A730F637fF6cDd7`
- sentinel agent identity: `0x32E1a1587aa20Af79F4b93A072863101f2d93E05`
- safe strategy: `0x5E4DFcDD0A8e4df99b3b15E5b542E9012D3e7Cc2`
- unsafe strategy: `0xC1563b06e9535f255959F991532382a7eB64F5FA`
- agent metadata update tx: https://sepolia.mantlescan.xyz/tx/0xcdba207b5503fbc21fff9145dd88dac825e3834c293042e93983571a8fe7e6d2

### proof transactions

- approved execution: `https://sepolia.mantlescan.xyz/tx/0x677196a6469713172520a4e10642ce331b99772d88a849ab3797bfde83ff6810`
- blocked mandate: `https://sepolia.mantlescan.xyz/tx/0x59d456fc19af5753ab836d1e2b1fc451b05ff74204b794d6015a497bf1ebfbd6`

these transactions demonstrate both sides of sentinel’s execution model: an approved treasury allocation and a policy-blocked allocation that records the mandate failure.

> note: if the contracts are redeployed again, replace the addresses and proof transaction links above with the latest deployment output and latest successful demo transactions.

## product walkthrough

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

## judging criteria alignment

### ai x rwa integration

sentinel treats ai as an explanation and structured review layer for a deterministic rwa treasury workflow. the target allocation references ondo usdy on mantle mainnet and uses a non-redeemable `TestnetUSDY` mirror on mantle sepolia so teams can test the full workflow safely.

the ai/rwa flow now includes:

- a real-world reference asset: ondo usdy on mantle mainnet
- a clearly labeled testnet mirror: sentinel `tUSDY`
- an rwa asset passport with official reference token, oracle, blocklist, and restriction metadata
- a structured ai compliance attestation with verdict, risk level, flags, confidence, and required human review
- onchain hashes for the asset passport and compliance attestation

the mirror token does not represent ownership of real usdy, treasuries, redemption rights, or yield.

### compliance awareness

the frontend now surfaces explicit compliance controls before execution:

- investor eligibility review
- jurisdiction filter review
- issuer and duration mandate
- high-risk substitution block

these controls are not represented as production kyc/aml infrastructure. they are intentionally modeled as visible governance checks so teams can see how sentinel would fit a permissioned rwa treasury workflow.

### mantle network integration

sentinel uses mantle sepolia as the execution and audit layer. the deployed strategy vault records approved and blocked allocation outcomes, including a bytes32 audit evidence hash tied to the recommendation, policy version, portfolio signal, compliance controls, rwa asset passport hash, and ai compliance attestation hash.

### demo proof

the recommended proof path is:

1. open the treasury cockpit.
2. review the rwa asset evidence and compliance gate.
3. approve the t-bill allocation path.
4. test the blocked high-risk allocation path.
5. open the decision log and inspect policy version, execution status, confidence, signal state, tx link, and ai rationale evidence hash.

teams can also use the no-wallet proof mode on the dashboard. it links directly to the approved and blocked mantle sepolia proof transactions, so the workflow remains reviewable even if a wallet connection is not available.

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
- live/fallback market signal input
- recommended treasury actions
- execution readiness indicators

### deterministic policy engine

recommendations are generated from deterministic treasury logic, including:

- reserve posture
- liquidity conditions
- volatility context
- live/fallback APY and TVL-style market signals
- target allocation fit
- policy compatibility
- confidence score
- execution risk status

given the same input data, market signal snapshot, and policy constraints, the engine should produce the same recommendation outcome. live DefiLlama APY/TVL-style data is used as a scoring input when available; seeded fallback values are used when the live source is unavailable.

### compliance rule evaluation

sentinel evaluates RWA compliance controls as explicit rules rather than static labels.

the current rule set checks:

- operator authorization posture
- jurisdiction and investor eligibility review status
- approved RWA sleeve and duration limit
- target concentration and redemption window
- high-risk substitution exposure cap

each rule exposes the requirement, current input, result, and evidence so reviewers can see why a path is cleared, monitored, or blocked.

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

the frontend can copy or download the full audit packet json used to generate the hash. the onchain hash provides a compact verification anchor, while the exported packet lets teams recompute the hash from the recommendation, market signal, portfolio state, and compliance rule inputs.

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

this gives teams a clear governance review surface instead of a one-off dashboard action.

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
- testnet usdy mirror token with explicit no-redemption notice
- strategy vault simulation
- blocked execution path for unsafe allocation
- audit trail with transaction links and policy metadata
- live market signal layer that feeds recommendation scoring, with fallback data
- computed RWA compliance rules with visible inputs and requirements
- RWA asset passport referencing official Mantle USDY metadata
- AI compliance attestation hash anchored onchain
- exportable audit packet json for hash verification
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
    TestnetUSDY.sol
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

### `TestnetUSDY.sol`

non-redeemable testnet mirror of an ondo usdy-style rwa asset. it stores an asset passport hash and includes an onchain notice that the token has no claim on real usdy, treasuries, issuer redemption, or yield.

### `ExecutionGuard.sol`

policy guard contract that validates whether an allocation is allowed before execution.

### `StrategyVault.sol`

demo strategy vault used to record approved treasury allocation intent, simulated strategy accounting, and policy-blocked attempts.

the vault records execution metadata including recommendation ids, ai rationale evidence hashes, rwa asset passport hashes, and ai compliance attestation hashes, giving the demo a verifiable onchain audit trail.

the contract also includes future-ready production controls that can be enabled by the owner after redeployment:

- authorized operator checks
- vault balance coverage checks
- an `AuditEvidenceAnchored` event that records the recommendation id, rationale hash, and policy version
- an `RwaEvidenceAnchored` event that records the recommendation id, rwa asset id, asset passport hash, compliance attestation hash, and policy version

these controls are disabled by default to preserve the public demo path, but they make the intended production boundary explicit in code and tests.

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

the ai/compliance layer does:

- explain a deterministic treasury signal
- produce concise institutional rationale
- produce a structured compliance attestation artifact from policy and rwa passport inputs
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
VITE_OPENROUTER_API_KEY=

VITE_MOCK_USDC_ADDRESS=0x2e7BE27fdb3Eaf194B4064224736a033826b45bb
VITE_TESTNET_RWA_ADDRESS=0xe762A07f880c25Cd11f9A8b58f49CCA62dd29341
VITE_EXECUTION_GUARD_ADDRESS=0x3BC3b56a7859B0296b74c47459e03e527D93E42B
VITE_STRATEGY_VAULT_ADDRESS=0xD3BAFf222ea9EB9e5ec7751d3A730F637fF6cDd7
VITE_SENTINEL_AGENT_IDENTITY_ADDRESS=0x32E1a1587aa20Af79F4b93A072863101f2d93E05
VITE_SAFE_STRATEGY_ADDRESS=0x5E4DFcDD0A8e4df99b3b15E5b542E9012D3e7Cc2
VITE_UNSAFE_STRATEGY_ADDRESS=0xC1563b06e9535f255959F991532382a7eB64F5FA
```

the openrouter key is optional for the core deterministic flow. if it is missing or unavailable, sentinel uses deterministic fallback rationale. if you add a key locally, keep it in `.env`, do not commit it, and do not add spaces around the `=` sign.

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
2. `TestnetUSDY`
3. `ExecutionGuard`
4. `StrategyVault`
5. `SentinelAgentIdentity`
6. a safe strategy placeholder
7. an unsafe strategy placeholder

after deployment, copy the deployed addresses into the frontend `.env` file.

the frontend requires the new mirror address:

```bash
VITE_TESTNET_RWA_ADDRESS=your_testnet_usdy_mirror_address
```

for verification, also add:

```bash
TESTNET_RWA_ADDRESS=your_testnet_usdy_mirror_address
```

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

- approved execution: `https://sepolia.mantlescan.xyz/tx/0x677196a6469713172520a4e10642ce331b99772d88a849ab3797bfde83ff6810`
- blocked mandate: `https://sepolia.mantlescan.xyz/tx/0x59d456fc19af5753ab836d1e2b1fc451b05ff74204b794d6015a497bf1ebfbd6`

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
