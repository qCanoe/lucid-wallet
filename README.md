# Lucid Wallet — MVP 0.1

> Users express intents in natural language or structured forms, and the system automatically decomposes, plans, invokes tools, executes transactions, and handles failure rollback/retry, ultimately completing tasks with **minimal interaction**.

## Project Overview

Lucid (Agent Wallet) is an intent-driven smart wallet. MVP 0.1 implements:

- **Intent Loop**: `swap` and `approve+swap`
- **Execution State Machine**: `DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE/FAILED`
- **Minimal Permissions**: ConsentScope constraints (chain, spender, token, amount, validity period)
- **Failure Recovery**: Error classification and recovery options (retry / adjust_slippage / adjust_amount)

### Early Simulation MVP (Research Prototype)

To quickly validate core workflows, the project includes an **early simulation MVP** that provides:

- **CLI Prototype**: Command-line tool to validate intent → plan → execution loop
- **Simulated Executor**: Test complete workflows without real chain connection
- **Experiment Logs**: Automatically record intent, plan, and results for each run
- **Sample Dataset**: 5 fixed intent samples for quick validation
- **Natural Language Parsing**: Parse Chinese/English rules/templates into `IntentSpec` (initially covers `send/swap`)

## Directory Structure

```
lucidWallet/
├── apps/
│   ├── server/          # Orchestrator + Execution State Machine + CLI
│   │   ├── src/
│   │   │   ├── cli.ts              # CLI entry point
│   │   │   ├── intents/            # Intent parsing
│   │   │   ├── plans/               # Plan generation
│   │   │   └── logs/                # Logging
├── datasets/            # Datasets and samples
│   ├── spec/            # Specification documents (RFC 2119 compliant)
│   │   ├── query.md     # Query specification
│   │   ├── metadata.md  # Metadata specification
│   │   ├── constraints.md # Constraints specification
│   │   ├── tools.md     # Tools & environment specification
│   │   └── output.md    # Output format specification
│   └── data/            # Data files
│       └── samples.jsonl
│   └── nl/              # Natural language datasets
│       ├── templates/   # Rule templates
│       │   └── send_swap.json
│       └── samples/     # Samples
│           └── send_swap.json
├── experiments/         # Experiment logs and run records
│   └── logs/            # CLI run logs (auto-generated)
├── packages/
│   ├── core/            # IntentSpec / Plan / Consent / StepResult schema
│   │   └── src/schemas/
│   │       ├── mvp-intent.ts       # MVP intent structure
│   │       └── mvp-plan.ts          # MVP plan structure
│   ├── tools/           # Tool Registry + EVM toolset
│   │   └── src/
│   │       ├── mock/                # Mock tools
│   │       │   └── simulate_transfer.ts
│   │       └── evm/                 # EVM tools (real chain)
│   ├── wallet-core/     # Signer / TxQueue / SecureStorage / AuditLog
│   └── shared/          # Common constants and error codes
├── prototypes/          # Prototype implementations and demo scaffolding
│   └── mvp-sim-cli/     # Early simulation MVP CLI documentation
├── vitest.config.ts
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

**Directory Notes**:

- `datasets/`: Contains research datasets, samples, and annotations
- `datasets/spec/`: Specification documents following RFC 2119 standards (MUST, SHOULD, MAY)
- `experiments/`: Experiment run logs, CLI automatically writes to `logs/` directory
- `prototypes/`: Prototype implementations and demo scaffolding with usage documentation

## Quick Start

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm run test
```

### Build

```bash
npm run build
```

### Run Early Simulation MVP CLI

```bash
# Build the project
npm run build

# Run default sample (index 0)
node apps/server/dist/cli.js

# Run specific sample index
node apps/server/dist/cli.js --sample-index 2

# Use custom intent (JSON format)
node apps/server/dist/cli.js --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0x1111111111111111111111111111111111111111"}'

# Use natural language intent (Chinese or English)
node apps/server/dist/cli.js --nl "send 0.1 ETH to 0x1111111111111111111111111111111111111111"
node apps/server/dist/cli.js --nl "用200 USDC换ETH滑点0.5%"

# Specify natural language template file
node apps/server/dist/cli.js --nl "swap 200 USDC to ETH" --nl-template-file datasets/nl/templates/send_swap.json

# Use OpenAI GPT-5.2 for natural language parsing (fallback to templates on failure)
set LUCIDWALLET_OPENAI_API_KEY=your_key
set LUCIDWALLET_OPENAI_MODEL=gpt-5.2
node apps/server/dist/cli.js --nl "用200 USDC换ETH滑点0.5%"

# Read intent from file
node apps/server/dist/cli.js --intent-file path/to/intent.json
```

Run results will:

- Output plan steps and execution results (JSON format)
- Automatically save logs to `experiments/logs/run_<timestamp>.json`

For more usage, see `prototypes/mvp-sim-cli/README.md`

## Core Modules

### 1. Intent & Plan (packages/core)

Defines data structures for user intents and execution plans:

**Full IntentSpec** (for production):

```ts
{
  action_type: "swap",
  chain: "evm",
  asset_in: "USDC",
  asset_out: "ETH",
  amount: "200",
  constraints: { slippage: 0.5 }
}
```

**MVP Intent** (for early simulation prototype):

```ts
{
  action: "send",
  chain: "sepolia",
  asset: "ETH",
  amount: "0.1",
  to: "0x1111111111111111111111111111111111111111"
}
```

MVP Intent is a minimal intent structure focused on validating core workflows, supporting:

- Single action type (currently only `send`)
- Single chain, single asset
- Simplified plan generation (2-3 steps)

### 2. Tool Registry (packages/tools)

Unified tool interface. MVP includes:

| Tool                  | Responsibility                          | Type |
| --------------------- | ---------------------------------------- | ---- |
| `chain_read`          | Balance, nonce, allowance queries       | EVM  |
| `quote_route`         | DEX quotes and routing                   | EVM  |
| `build_tx`            | Generate transaction calldata            | EVM  |
| `simulate_tx`         | Simulation/pre-execution                 | EVM  |
| `sign_tx`             | Signing (via Wallet Core)                | EVM  |
| `send_tx`             | Broadcast transaction                   | EVM  |
| `wait_confirm`        | Confirmation and receipt parsing         | EVM  |
| `simulate_transfer`   | Simulate transfer execution (returns mock tx hash) | Mock |

**Mock Tools** (`packages/tools/src/mock/`):

- Used for early prototype validation without real chain connection
- Return simulated transaction hashes and execution summaries
- Support error scenario testing (e.g., invalid amounts)

See `datasets/spec/tools.md` for complete tool specifications following RFC 2119 standards.

### 3. Orchestrator (apps/server)

Core scheduler responsible for:

- Intent parsing → Plan generation
- Execution state machine progression
- Tool output chaining
- Error classification and recovery

**CLI Entry Point** (`apps/server/src/cli.ts`):

- Command-line interface for early simulation MVP
- Supports reading intents from sample files or command-line arguments
- Supports natural language parsing to `IntentSpec` (`--nl` / `--intent-nl`)
- Automatically generates plans and invokes simulated executor
- Outputs results and saves logs to `experiments/logs/`

### 4. Wallet Core (packages/wallet-core)

- **Signer**: Signature control based on ConsentScope
- **TxQueue**: Nonce management and concurrency limits
- **SecureStorage**: Local encrypted storage
- **AuditLog**: Execution logs

## Data Flow

### Complete Flow (Production)

```
User input intent
    ↓
IntentSpec normalization
    ↓
Planner generates Plan (with approve+swap steps)
    ↓
Policy calculates required_permissions
    ↓
UI displays task card + authorization list
    ↓
User approves consent
    ↓
Execution state machine step-by-step execution (chain_read → approve → build → simulate → sign → send → confirm)
    ↓
On failure, enter recovery branch
    ↓
After completion, produce result summary
```

### Early Simulation MVP Flow

```
CLI input (JSON / sample index / natural language)
    ↓
parseIntent() parses to MvpIntent
(Natural language: parseNaturalLanguageIntent() → IntentSpec → only send mapped to MvpIntent)
    ↓
buildPlan() generates minimal plan (1-2 steps)
    ↓
Call simulate_transfer tool
    ↓
Return simulated result (tx_hash + summary)
    ↓
logRun() saves to experiments/logs/
```

**Key Differences**:

- No user approval required (simulated environment)
- No real chain connection required (mock tools)
- Minimal plan (only validates core workflow)
- Automatic log recording (for experiment analysis)

## Dataset Specifications

The project includes standardized dataset specifications following RFC 2119 conventions. See `datasets/spec/` for complete documentation:

- **Query Specification** (`spec/query.md`): Natural language intent format
- **Metadata Specification** (`spec/metadata.md`): Chain, task type, difficulty, account state
- **Constraints Specification** (`spec/constraints.md`): User constraints + system safety constraints
- **Tools & Environment Specification** (`spec/tools.md`): Agent-available tool interfaces
- **Output Format Specification** (`spec/output.md`): Transaction sequence output format

All specifications use normative keywords (MUST, SHOULD, MAY) as defined in RFC 2119 for clarity and precision.

## Test Coverage

### Unit Tests

| Test File                      | Coverage                              |
| ----------------------------- | ------------------------------------- |
| `schemas.test.ts`             | Intent/Plan/Consent schema validation |
| `signer.test.ts`              | ConsentScope constraints and rejection paths |
| `orchestrator.plan.test.ts`   | Plan generation and permission list   |
| `orchestrator.flow.test.ts`   | Execution chain and output chaining   |

### Early Simulation MVP Validation

- **Sample Dataset**: `datasets/mvp-samples/intent_samples.json` (5 fixed samples)
- **CLI Testing**: Run `node apps/server/dist/cli.js` to validate complete flow
- **Log Validation**: Check JSON log format in `experiments/logs/`
- **Error Handling**: Test error paths for invalid inputs

## Error Codes

| Error Code                  | Meaning        |
| -------------------------- | -------------- |
| `INSUFFICIENT_BALANCE`     | Insufficient balance |
| `INSUFFICIENT_ALLOWANCE`   | Insufficient allowance |
| `SLIPPAGE_TOO_HIGH`        | Slippage too high |
| `NONCE_CONFLICT`           | Nonce conflict |
| `REVERT`                   | Contract revert |

## License

MIT
