# Lucid Wallet — Roadmap

This document tracks completed milestones and planned work. Each phase has a clear goal, deliverables, and acceptance criteria.

---

## Completed

### ✅ Phase 0 — Foundation
**Goal:** Stand up the monorepo with typed schemas and a working tool registry.

| Deliverable | Status |
|---|---|
| TypeScript monorepo (4 packages + 1 app) | ✅ |
| `IntentSpec` schema (11 action types, Zod) | ✅ |
| `MvpIntent` / `MvpPlan` schemas | ✅ |
| `ConsentScope` schema | ✅ |
| `StepResult` schema | ✅ |
| `ToolRegistry` with `ToolDefinition<TInput, TOutput>` | ✅ |
| 8 EVM tool stubs (`chain_read` → `wait_confirm`) | ✅ |
| `simulate_transfer` mock tool | ✅ |
| `Signer` with ConsentScope enforcement | ✅ |
| `TxQueue` nonce manager | ✅ |
| `AuditLog` + `SecureStorage` (in-memory) | ✅ |
| `ExecutionStateMachine` | ✅ |
| RFC 2119 dataset specs (query / metadata / constraints / tools / output / coverage) | ✅ |
| Vitest setup, path aliases | ✅ |

---

### ✅ Phase 1 — CLI Dual-Path Alignment
**Goal:** Deliver a working CLI with two execution paths; lock behavior with contract tests; align docs.

| Deliverable | Status |
|---|---|
| `Orchestrator.execute()` — EVM tool chain, step output chaining | ✅ |
| `Orchestrator.plan()` — plan-only (no execution) | ✅ |
| Template-based NL parser (`parseNaturalLanguageIntent`) | ✅ |
| OpenAI GPT fallback in NL parser | ✅ |
| CLI Path A: `--nl` → `IntentSpec` → `Orchestrator.execute()` | ✅ |
| CLI Path B: `--intent` / `--sample-index` → `MvpIntent` → `buildPlan()` → `simulate_transfer` | ✅ |
| `logRun()` → `experiments/logs/run_<ts>.json` | ✅ |
| 5 MVP intent samples (`datasets/mvp-samples/intent_samples.json`) | ✅ |
| NL template file (`datasets/nl/templates/send_swap.json`) | ✅ |
| `samples.jsonl` dataset with constraint-conflict samples | ✅ |
| Contract test: `build_plan.test.ts` | ✅ |
| E2E stub test: `nl_orchestrator.test.ts` | ✅ |
| Plan test: `orchestrator.plan.test.ts` | ✅ |
| Flow test: `orchestrator.flow.test.ts` | ✅ |
| README (EN + CN) aligned with dual-path CLI | ✅ |
| **Total tests: 43** | ✅ |

---

### ✅ Phase 2 — API & Observability
**Goal:** Add `--engine` flag to unify CLI paths; add HTTP API with tests; wire AuditLog into Orchestrator.

| Deliverable | Status |
|---|---|
| `--engine mock\|orchestrator` CLI flag | ✅ |
| `mvpToIntentSpec()` converter (MvpIntent → IntentSpec) | ✅ |
| JSON/sample path now supports full orchestrator engine | ✅ |
| HTTP server: `POST /api/plan` | ✅ |
| HTTP server: `POST /api/execute` | ✅ |
| HTTP handler exported for test isolation | ✅ |
| `LUCIDWALLET_HTTP_NO_AUTOSTART` env guard | ✅ |
| `http.test.ts` — 6 tests (plan, execute, 400, 404, OPTIONS) | ✅ |
| `AuditLog` integrated into `Orchestrator.execute()` | ✅ |
| `execute()` returns `auditLog: AuditEntry[]` | ✅ |
| Per-step events: `step_start`, `step_success`, `step_failed` | ✅ |
| README (EN + CN) fully updated | ✅ |
| ROADMAP.md created | ✅ |
| **Total tests: 49** | ✅ |

---

---

### ✅ Phase 3 — Coverage & Quality
**Goal:** Expand NL coverage, harden error handling, add missing tests, improve developer experience.

| Deliverable | Status |
|---|---|
| Fix vitest glob — unlock `nl_intent.test.ts` (was excluded from `src/__tests__/` pattern) | ✅ |
| NL template expansion — add send (EN+ZH), swap (ZH), send+chain (EN), swap+chain (EN) | ✅ |
| `nl_intent.test.ts` — 8 tests for EN/ZH send+swap with/without chain/slippage | ✅ |
| `tx_queue.test.ts` — 6 tests: nextNonce, enqueue, dequeue (FIFO), concurrency limit, reset | ✅ |
| `TxQueue` expanded — enqueue/dequeue/pendingCount/reset/maxConcurrent | ✅ |
| `secure_storage.test.ts` — 4 tests: get/set/overwrite/multiple keys | ✅ |
| `--dry-run` CLI flag — all 3 engine paths; prints plan JSON, no execution, no log file | ✅ |
| `log_run.ts` created — missing source file restored from dist | ✅ |
| `error_codes.ts` shared module — extracted from cli/http | ✅ |
| `ERROR_CODES` expanded — TIMEOUT, NETWORK_ERROR added | ✅ |
| `mapErrorCode` improved — 6 specific patterns instead of catch-all REVERT | ✅ |
| HTTP API error handler — 422 for ZodError, 413 for payload_too_large | ✅ |
| `error_codes.test.ts` — 7 tests covering all error code mappings | ✅ |
| `cli_dry_run.test.ts` — 3 integration tests (exit code, plan JSON, no log file) | ✅ |
| **Total tests: 77** (target was ≥65) | ✅ |

## Upcoming

---

### 🔲 Phase 4 — Real Chain Integration
**Goal:** Connect to real EVM chains (Sepolia testnet); execute real transactions in a controlled environment.

#### 4.1 EVM RPC Integration
- [ ] `chain_read` connects to real RPC (`LUCIDWALLET_EVM_RPC_URL`)
- [ ] `send_tx` broadcasts to testnet
- [ ] `wait_confirm` polls real receipt
- [ ] Integration test suite gated by `LUCIDWALLET_E2E=true`

#### 4.2 DEX Quote API
- [ ] `quote_route` integrates with a real DEX aggregator (1inch or 0x Protocol)
- [ ] Slippage validation against real quotes

#### 4.3 Key Management
- [ ] Wallet key loaded from `SecureStorage` (encrypted file)
- [ ] `sign_tx` uses real private key via ethers.js `Wallet`
- [ ] No plaintext keys in logs or environment variables

#### 4.4 Testnet E2E Demo
- [ ] CLI demo: send 0.001 ETH on Sepolia, full log output
- [ ] CLI demo: swap USDC → ETH on Sepolia (via DEX)

**Acceptance criteria:** E2E test sends a real transaction on Sepolia; transaction hash verifiable on Etherscan.

---

### 🔲 Phase 5 — Production Ready
**Goal:** Deployable product with frontend UI and secure key handling.

#### 5.1 Frontend Wallet UI
- [ ] React/Next.js wallet interface
- [ ] Intent input (natural language text box)
- [ ] Plan preview card with step visualization
- [ ] ConsentScope approval flow (user reviews and approves permissions)
- [ ] Transaction result display with tx hash link

#### 5.2 ConsentScope Approval UX
- [ ] UI shows: chain, spender, token, max amount, expiry
- [ ] User can modify scope before approving
- [ ] Rejection returns clear error to intent flow

#### 5.3 Multi-Chain Support
- [ ] Chain registry: Ethereum mainnet, Arbitrum, Polygon, Base, Optimism
- [ ] `IntentSpec.chain` resolves to chain config (RPC, chain ID, native asset)
- [ ] `quote_route` multi-chain routing

#### 5.4 Security & Audit
- [ ] Dependency audit (`npm audit`)
- [ ] No secrets in git history
- [ ] Rate limiting on HTTP API
- [ ] Input sanitization for NL text

#### 5.5 Deployment
- [ ] Docker image for HTTP server
- [ ] CI/CD pipeline (GitHub Actions: test → build → deploy)
- [ ] Environment-specific configs (staging / production)

**Acceptance criteria:** Demo wallet usable in browser; real swap executable on Arbitrum mainnet with user approval.

---

## Metrics

| Metric | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 target |
|---|---|---|---|---|---|
| Tests passing | — | 43 | 49 | **77** | ≥80 (E2E gated) |
| NL template types | 0 | 1 (swap) | 1 (swap) | **6** | ≥8 |
| HTTP endpoints | 0 | 0 | **2** | **2 + 422/413** | 2 + /health |
| EVM tool coverage | 7 stubs | 7 stubs | 7 stubs + AuditLog | 7 stubs + real RPC (Phase 4) |
| Supported action types (orchestrator) | — | send, swap, approve+swap | send, swap, approve+swap | send, swap, approve+swap, deposit |
