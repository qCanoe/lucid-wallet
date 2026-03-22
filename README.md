# Lucid Wallet

> An intent-driven agent wallet. Users express intents in natural language or structured form; the system automatically decomposes, plans, invokes tools, executes transactions, and handles failure recovery — completing tasks with **minimal interaction**.

[![Tests](https://img.shields.io/badge/tests-77%20passing-brightgreen)](#test-coverage)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](#license)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [HTTP API](#http-api)
- [Core Modules](#core-modules)
- [Data Flow](#data-flow)
- [Dataset Specifications](#dataset-specifications)
- [Test Coverage](#test-coverage)
- [Error Codes](#error-codes)
- [Roadmap](#roadmap)

---

## Project Overview

Lucid Wallet is an intent-driven smart wallet built as an AI agent. It takes a user intent (natural language or JSON), plans a transaction sequence, executes it step-by-step through a typed tool registry, and records a full audit trail.

**Current feature status:**

| Feature | Status | Notes |
|---|---|---|
| Intent parsing — NL + JSON | ✅ | Template-based; OpenAI GPT fallback |
| Execution orchestrator | ✅ | State machine, 8 EVM tools |
| Stub / offline mode | ✅ | `LUCIDWALLET_USE_STUBS=true` |
| CLI — `--engine mock\|orchestrator` | ✅ | JSON/sample + NL paths |
| HTTP API — `/api/plan` `/api/execute` | ✅ | Node `http`, CORS, stub mode |
| ConsentScope / Signer | ✅ | Permission-minimized signing |
| AuditLog | ✅ | Per-step events in `execute()` return value |
| TxQueue | ✅ | Nonce management, concurrency limits |
| RFC 2119 dataset specs | ✅ | 6 spec files |
| Real EVM RPC | 🔲 | Phase 4 |
| Frontend UI | 🔲 | Phase 5 |

### Execution State Machine

```
DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE
                                        ↘ FAILED
```

---

## Directory Structure

```
lucid-wallet/
├── apps/
│   └── server/                    # Orchestrator · CLI · HTTP server
│       └── src/
│           ├── cli.ts             # CLI entry point
│           ├── http.ts            # HTTP server (/api/plan, /api/execute)
│           ├── orchestrator.ts    # Orchestrator + AuditLog
│           ├── state_machine.ts   # ExecutionStateMachine
│           ├── intents/           # Intent parsing
│           │   └── nl/            # Template NL parser + OpenAI fallback
│           ├── plans/             # buildPlan() for mock path
│           ├── logs/              # logRun()
│           └── __tests__/
├── packages/
│   ├── core/                      # IntentSpec · MvpIntent · Plan · Consent · StepResult
│   │   └── src/
│   │       ├── schemas/
│   │       └── dataset/           # DatasetLoader · filter · stats
│   ├── tools/                     # ToolRegistry + 8 tools
│   │   └── src/
│   │       ├── evm/               # chain_read quote_route build_tx simulate_tx
│   │       │                      # sign_tx send_tx wait_confirm
│   │       └── mock/              # simulate_transfer
│   ├── wallet-core/               # Signer · TxQueue · AuditLog · SecureStorage
│   └── shared/                    # ERROR_CODES
├── datasets/
│   ├── spec/                      # RFC 2119 specs (query metadata constraints tools output coverage)
│   ├── data/samples.jsonl         # JSONL dataset
│   ├── mvp-samples/               # intent_samples.json (5 fixed intents)
│   └── nl/templates/              # NL template files
├── docs/plans/                    # Dated implementation plans
├── experiments/logs/              # CLI run logs (auto-generated)
├── ROADMAP.md                     # Versioned roadmap
├── vitest.config.ts
└── package.json
```

---

## Quick Start

```bash
npm install          # install dependencies
npm run test         # run all tests (77 passing)
npm run build        # compile TypeScript
```

---

## CLI Reference

```bash
node apps/server/dist/cli.js [options]
```

### Input flags

| Flag | Description |
|---|---|
| *(none)* | Load sample 0 from default sample file |
| `--sample-index <n>` | Load sample at index n |
| `--sample-file <path>` | Custom sample JSON array file |
| `--intent '<json>'` | Inline MvpIntent JSON |
| `--intent-file <path>` | Load MvpIntent from file |
| `--nl '<text>'` | Natural language intent |
| `--intent-nl '<text>'` | Alias for `--nl` |
| `--nl-template-file <path>` | Custom NL template file |

### `--engine` flag

| Value | Default for | Execution path |
|---|---|---|
| `mock` | JSON / sample path | `MvpIntent → buildPlan() → simulate_transfer` |
| `orchestrator` | — | `MvpIntent → IntentSpec → Orchestrator.execute()` |
| *(implicit)* | `--nl` path | always uses `Orchestrator.execute()` |

### Examples

```bash
# Default: sample 0, mock engine
node apps/server/dist/cli.js

# Specific sample
node apps/server/dist/cli.js --sample-index 2

# JSON intent, mock engine (default)
node apps/server/dist/cli.js \
  --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0xABCD..."}'

# JSON intent, full orchestrator + stubs
node apps/server/dist/cli.js \
  --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0xABCD..."}' \
  --engine orchestrator

# Natural language (template-matched)
node apps/server/dist/cli.js --nl "swap 200 USDC to ETH with slippage 0.5%"

# Natural language with custom template file
node apps/server/dist/cli.js \
  --nl "swap 200 USDC to ETH with slippage 0.5%" \
  --nl-template-file datasets/nl/templates/send_swap.json

# Natural language via OpenAI
LUCIDWALLET_OPENAI_API_KEY=sk-... node apps/server/dist/cli.js \
  --nl "用200 USDC换ETH，滑点0.5%"
```

All runs write a JSON log to `experiments/logs/run_<timestamp>.json`.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `LUCIDWALLET_USE_STUBS` | `true` (CLI/HTTP) | Stub responses for all EVM tools |
| `LUCIDWALLET_EVM_RPC_URL` | — | RPC endpoint for real chain calls |
| `LUCIDWALLET_OPENAI_API_KEY` | — | Enable OpenAI NL parsing |
| `LUCIDWALLET_OPENAI_MODEL` | `gpt-5.2` | OpenAI model name |
| `LUCIDWALLET_HTTP_NO_AUTOSTART` | — | Suppress HTTP server auto-start (tests) |
| `PORT` | `4000` | HTTP server port |

---

## HTTP API

Start the server:

```bash
node apps/server/dist/http.js
# Lucid API server running on http://localhost:4000
```

### `POST /api/plan`

Parse a natural language intent and return the execution plan (no execution).

**Request:**

```json
{ "text": "swap 200 USDC to ETH with slippage 0.5%", "templateFile": "..." }
```

`templateFile` is optional.

**Response 200:**

```json
{
  "ok": true,
  "data": {
    "intent_spec": { "action_type": "swap", "chain": "evm", "asset_in": "USDC", "asset_out": "ETH", "amount": "200", "constraints": { "slippage": 0.5 } },
    "plan": { "plan_id": "plan_...", "steps": [...], "required_permissions": { ... } },
    "scope": { "chain": "evm", "max_amount": "200", ... }
  }
}
```

### `POST /api/execute`

Parse and fully execute the intent (stub mode by default).

**Request:** same as `/api/plan`

**Response 200:**

```json
{
  "ok": true,
  "data": {
    "plan": { ... },
    "results": [
      { "step_id": "chain_read", "status": "success" },
      { "step_id": "quote_route", "status": "success" },
      { "step_id": "build_swap_tx", "status": "success" },
      ...
    ],
    "scope": { ... }
  }
}
```

### Error responses

| Status | `error.message` | Cause |
|---|---|---|
| `400` | `missing_text` | `text` field absent or blank |
| `404` | `not_found` | Unknown route or wrong HTTP method |
| `413` | `payload_too_large` | Request body too large |
| `422` | `schema_validation_error` | Zod schema validation failure |
| `500` | *(error detail)* | NL parse failure, tool error |

---

## Core Modules

### 1. Intent & Plan (`packages/core`)

**`IntentSpec`** — full production schema (11 action types):

```ts
{
  action_type: "swap" | "send" | "approve" | "revoke" | "deposit" |
               "stake" | "withdraw" | "unstake" | "batch" | "rebalance" | "schedule",
  chain: string,
  asset_in?: string,
  asset_out?: string,
  amount: string,
  constraints?: { slippage?: number; deadline?: number },
  target_protocol?: string,
  recipient?: string
}
```

**`MvpIntent`** — minimal intent for the mock CLI path:

```ts
{ action: "send", chain: string, asset: string, amount: string, to: string }
```

`buildPlan(intent: MvpIntent)` → single `simulate_transfer` step.
`mvpToIntentSpec(intent: MvpIntent)` → `IntentSpec` for `--engine orchestrator`.

### 2. Tool Registry (`packages/tools`)

All tools implement `ToolDefinition<TInput, TOutput>` with Zod-validated schemas.

| Tool | Type | Responsibility |
|---|---|---|
| `chain_read` | EVM | Balance, nonce, allowance queries |
| `quote_route` | EVM | DEX quote and route |
| `build_tx` | EVM | Generate transaction calldata |
| `simulate_tx` | EVM | Pre-execution simulation |
| `sign_tx` | EVM | Sign via ConsentScope-gated Signer |
| `send_tx` | EVM | Broadcast signed transaction |
| `wait_confirm` | EVM | Poll for receipt and parse logs |
| `simulate_transfer` | Mock | Simulated transfer (returns mock tx hash) |

`LUCIDWALLET_USE_STUBS=true` activates stub responses for all EVM tools.

### 3. Orchestrator (`apps/server/src/orchestrator.ts`)

```ts
const { plan, results, auditLog } = await orchestrator.execute(intentSpec);
```

- Builds plan from `IntentSpec` (supports `send`, `swap`, `approve+swap`)
- Drives `ExecutionStateMachine`: `PLANNED → APPROVED → EXECUTING → CONFIRMED/FAILED`
- Chains tool outputs into subsequent step inputs (e.g. `build_tx` output feeds `simulate_tx`)
- Records `step_start` / `step_success` / `step_failed` events in `AuditLog`
- Returns `auditLog: AuditEntry[]` in the result

```ts
orchestrator.plan(intentSpec)   // plan generation only, no execution
```

### 4. Wallet Core (`packages/wallet-core`)

| Module | Description |
|---|---|
| `Signer` | Validates signing requests against `ConsentScope`: chain, spender allowlist, token list, max amount, expiry, risk level |
| `TxQueue` | Nonce management and concurrency control |
| `AuditLog` | In-memory event log — `record(event, payload)` / `list()` |
| `SecureStorage` | Key-value store (in-memory; file persistence planned in Phase 3) |

**`ConsentScope` example:**

```ts
{
  chain: "evm",
  spender_allowlist: ["0xSWAP_CONTRACT"],
  tokens: ["USDC"],
  max_amount: "200",
  expiry: Date.now() + 60_000,
  risk_level: "low"
}
```

---

## Data Flow

### Mock path (`--engine mock`, default for JSON/sample input)

```
Input: --sample-index / --intent / --intent-file
  → parseIntent()  →  MvpIntent
  → buildPlan()    →  MvpPlan  (1 step: simulate_transfer)
  → simulate_transfer tool  →  { tx_hash, summary }
  → logRun()  →  experiments/logs/run_<ts>.json
```

### Orchestrator path (`--engine orchestrator` or `--nl`)

```
Input: --nl <text>  OR  --intent / --sample with --engine orchestrator
  → parseNaturalLanguageIntent()  →  IntentSpec    (NL path)
    OR  mvpToIntentSpec()          →  IntentSpec    (JSON path)
  → LUCIDWALLET_USE_STUBS=true  (auto-set if not already set)
  → new Signer(ConsentScope)
  → new Orchestrator(signer)
  → Orchestrator.execute(intentSpec)
      DRAFT → PLANNED → APPROVED → EXECUTING
      for each step:
        [step_start]  →  tool.handler()  →  [step_success | step_failed]
        resolve input from previous step outputs
      → CONFIRMED / FAILED
  → { plan, results, auditLog }
  → logRun()  →  experiments/logs/run_<ts>.json
```

### HTTP API flow

```
POST /api/plan  or  /api/execute
  → readJsonBody()  →  { text, templateFile? }
  → parseNaturalLanguageIntent(text)  →  IntentSpec
  → buildScope(intentSpec)  →  ConsentScope
  → new Signer(scope)  →  new Orchestrator(signer)
  → orchestrator.plan()      [for /api/plan]
    or orchestrator.execute() [for /api/execute]
  → JSON: { ok: true, data: { plan?, results?, scope } }
```

---

## Dataset Specifications

All specifications follow RFC 2119 (MUST / SHOULD / MAY). See `datasets/spec/`:

| File | Contents |
|---|---|
| `query.md` | Natural language intent format |
| `metadata.md` | Chain, task type, difficulty, account state |
| `constraints.md` | User constraints + system safety constraints |
| `tools.md` | Tool interface specifications (all 8 tools) |
| `output.md` | Transaction sequence output format |
| `coverage.md` | Coverage matrix |

**Sample data files:**

- `datasets/mvp-samples/intent_samples.json` — 5 fixed `MvpIntent` samples
- `datasets/data/samples.jsonl` — JSONL (query + metadata + constraints + expected_output)
- `datasets/nl/templates/send_swap.json` — NL template patterns for swap and send

---

## Test Coverage

**77 tests · 13 files · all passing**

| File | Package | Tests | What it covers |
|---|---|---|---|
| `schemas.test.ts` | `core` | 3 | IntentSpec / Plan / ConsentScope Zod validation |
| `dataset.test.ts` | `core` | 32 | DatasetLoader, sample validation, filter, stats |
| `signer.test.ts` | `wallet-core` | 3 | ConsentScope grant / deny paths |
| `tx_queue.test.ts` | `wallet-core` | 6 | FIFO queue, concurrency limit, reset |
| `secure_storage.test.ts` | `wallet-core` | 4 | get/set/overwrite/multi-key |
| `build_plan.test.ts` | `server` | 1 | `buildPlan()` → `simulate_transfer` contract |
| `nl_orchestrator.test.ts` | `server` | 1 | NL → IntentSpec → Orchestrator end-to-end (stubs) |
| `orchestrator.plan.test.ts` | `server` | 1 | Plan generation, `required_permissions` |
| `orchestrator.flow.test.ts` | `server` | 2 | Tool output chaining, error classification |
| `http.test.ts` | `server` | 6 | `/api/plan`, `/api/execute`, 400/404, OPTIONS |
| `nl_intent.test.ts` | `server` | 8 | EN/ZH send + swap templates with/without chain/slippage |
| `error_codes.test.ts` | `server` | 7 | `mapErrorCode` — 6 patterns + REVERT fallback |
| `cli_dry_run.test.ts` | `server` | 3 | `--dry-run` exit code, plan JSON, no log file |

```bash
npm run test
```

---

## Error Codes

| Code | Meaning |
|---|---|
| `INSUFFICIENT_BALANCE` | Wallet balance below required amount |
| `INSUFFICIENT_ALLOWANCE` | ERC-20 allowance below required amount |
| `SLIPPAGE_TOO_HIGH` | Actual slippage exceeds constraint |
| `NONCE_CONFLICT` | Transaction nonce conflict |
| `TIMEOUT` | Operation timed out |
| `NETWORK_ERROR` | RPC or network connectivity failure |
| `REVERT` | Contract revert or generic failure |

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full versioned roadmap.

| Phase | Status | Highlights |
|---|---|---|
| Phase 0 — Foundation | ✅ Done | Monorepo · schemas · tool registry · mock tools |
| Phase 1 — CLI Dual-Path | ✅ Done | NL parser · orchestrator · state machine · RFC specs · 43 tests |
| Phase 2 — API & Observability | ✅ Done | `--engine` flag · HTTP API + 6 tests · AuditLog · 49 tests |
| Phase 3 — Coverage & Quality | ✅ Done | 6 NL templates · TxQueue/SecureStorage tests · `--dry-run` · error codes · 77 tests |
| Phase 4 — Real Chain Integration | 🔲 Next | Sepolia RPC · real DEX · key management |
| Phase 5 — Production | 🔲 Future | Frontend · ConsentScope approval UI · mainnet |

---

## License

MIT
