# Lucid Wallet

> 基于意图驱动的 Agent 钱包。用户以自然语言或结构化表单表达意图，系统自动拆解、规划、调用工具、执行交易并处理失败恢复，在**最少交互**下完成任务。

[![Tests](https://img.shields.io/badge/tests-77%20passing-brightgreen)](#测试覆盖)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](#license)

---

## 目录

- [项目概述](#项目概述)
- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [CLI 参考](#cli-参考)
- [HTTP API](#http-api)
- [核心模块](#核心模块)
- [数据流](#数据流)
- [数据集规范](#数据集规范)
- [测试覆盖](#测试覆盖)
- [错误码](#错误码)
- [开发路线图](#开发路线图)

---

## 项目概述

Lucid Wallet 是一款以 AI Agent 为核心的意图驱动智能钱包。系统接收用户意图（自然语言或 JSON），规划交易步骤，通过类型化工具注册表逐步执行，并记录完整审计日志。

**功能现状：**

| 功能 | 状态 | 说明 |
|---|---|---|
| 意图解析（NL + JSON） | ✅ | 模板匹配；OpenAI GPT 兜底 |
| 执行编排器 | ✅ | 状态机 + 8 个 EVM 工具 |
| Stub / 离线模式 | ✅ | `LUCIDWALLET_USE_STUBS=true` |
| CLI — `--engine mock\|orchestrator` | ✅ | JSON/样例路径 + NL 路径 |
| HTTP API — `/api/plan` `/api/execute` | ✅ | Node `http`，支持 CORS，默认 stub |
| ConsentScope / Signer | ✅ | 权限最小化签名约束 |
| AuditLog | ✅ | 每步事件写入 `execute()` 返回值 |
| TxQueue | ✅ | Nonce 管理与并发控制 |
| RFC 2119 数据集规范 | ✅ | 6 个规范文件 |
| 真实 EVM RPC | 🔲 | Phase 4 |
| 前端 UI | 🔲 | Phase 5 |

### 执行状态机

```
DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE
                                        ↘ FAILED
```

---

## 目录结构

```
lucid-wallet/
├── apps/
│   └── server/                    # Orchestrator · CLI · HTTP 服务器
│       └── src/
│           ├── cli.ts             # CLI 入口
│           ├── http.ts            # HTTP 服务器（/api/plan, /api/execute）
│           ├── orchestrator.ts    # 编排器 + AuditLog
│           ├── state_machine.ts   # ExecutionStateMachine
│           ├── intents/           # 意图解析
│           │   └── nl/            # 模板 NL 解析器 + OpenAI 兜底
│           ├── plans/             # buildPlan()（mock 路径）
│           ├── logs/              # logRun()
│           └── __tests__/
├── packages/
│   ├── core/                      # IntentSpec · MvpIntent · Plan · Consent · StepResult
│   │   └── src/
│   │       ├── schemas/
│   │       └── dataset/           # DatasetLoader · filter · stats
│   ├── tools/                     # ToolRegistry + 8 个工具
│   │   └── src/
│   │       ├── evm/               # chain_read quote_route build_tx simulate_tx
│   │       │                      # sign_tx send_tx wait_confirm
│   │       └── mock/              # simulate_transfer
│   ├── wallet-core/               # Signer · TxQueue · AuditLog · SecureStorage
│   └── shared/                    # ERROR_CODES
├── datasets/
│   ├── spec/                      # RFC 2119 规范（query metadata constraints tools output coverage）
│   ├── data/samples.jsonl         # JSONL 数据集
│   ├── mvp-samples/               # intent_samples.json（5 个固定样例）
│   └── nl/templates/              # NL 模板文件
├── docs/plans/                    # 带日期的实现计划
├── experiments/logs/              # CLI 运行日志（自动生成）
├── ROADMAP.md                     # 版本化路线图
├── vitest.config.ts
└── package.json
```

---

## 快速开始

```bash
npm install          # 安装依赖
npm run test         # 运行全部测试（77 个，全部通过）
npm run build        # 编译 TypeScript
```

---

## CLI 参考

```bash
node apps/server/dist/cli.js [选项]
```

### 输入标志

| 标志 | 说明 |
|---|---|
| *(无)* | 加载默认样例文件中索引 0 的样例 |
| `--sample-index <n>` | 加载索引 n 的样例 |
| `--sample-file <path>` | 自定义样例 JSON 数组文件 |
| `--intent '<json>'` | 内联 MvpIntent JSON |
| `--intent-file <path>` | 从文件读取 MvpIntent |
| `--nl '<text>'` | 自然语言意图字符串 |
| `--intent-nl '<text>'` | `--nl` 的别名 |
| `--nl-template-file <path>` | 自定义 NL 模板文件 |

### `--engine` 标志

| 值 | 默认适用路径 | 执行方式 |
|---|---|---|
| `mock` | JSON / 样例路径（默认） | `MvpIntent → buildPlan() → simulate_transfer` |
| `orchestrator` | — | `MvpIntent → IntentSpec → Orchestrator.execute()` |
| *(隐式)* | `--nl` 路径 | 始终走 `Orchestrator.execute()` |

### 示例

```bash
# 默认：样例 0，mock 引擎
node apps/server/dist/cli.js

# 指定样例
node apps/server/dist/cli.js --sample-index 2

# JSON 意图，mock 引擎（默认）
node apps/server/dist/cli.js \
  --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0xABCD..."}'

# JSON 意图，走完整 orchestrator + stubs
node apps/server/dist/cli.js \
  --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0xABCD..."}' \
  --engine orchestrator

# 自然语言（模板匹配）
node apps/server/dist/cli.js --nl "swap 200 USDC to ETH with slippage 0.5%"

# 自然语言 + 自定义模板文件
node apps/server/dist/cli.js \
  --nl "swap 200 USDC to ETH with slippage 0.5%" \
  --nl-template-file datasets/nl/templates/send_swap.json

# 自然语言 via OpenAI
LUCIDWALLET_OPENAI_API_KEY=sk-... node apps/server/dist/cli.js \
  --nl "用200 USDC换ETH，滑点0.5%"
```

所有运行结果都会写入 `experiments/logs/run_<timestamp>.json`。

### 环境变量

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `LUCIDWALLET_USE_STUBS` | `true`（CLI/HTTP） | 所有 EVM 工具使用 stub 响应 |
| `LUCIDWALLET_EVM_RPC_URL` | — | 真实链 RPC 地址 |
| `LUCIDWALLET_OPENAI_API_KEY` | — | 开启 OpenAI NL 解析 |
| `LUCIDWALLET_OPENAI_MODEL` | `gpt-5.2` | OpenAI 模型名 |
| `LUCIDWALLET_HTTP_NO_AUTOSTART` | — | 禁止 HTTP 服务器自动启动（测试用） |
| `PORT` | `4000` | HTTP 服务器端口 |

---

## HTTP API

启动服务器：

```bash
node apps/server/dist/http.js
# Lucid API server running on http://localhost:4000
```

### `POST /api/plan`

解析自然语言意图，返回执行计划（不实际执行）。

**请求体：**

```json
{ "text": "swap 200 USDC to ETH with slippage 0.5%", "templateFile": "（可选）" }
```

**响应 200：**

```json
{
  "ok": true,
  "data": {
    "intent_spec": {
      "action_type": "swap",
      "chain": "evm",
      "asset_in": "USDC",
      "asset_out": "ETH",
      "amount": "200",
      "constraints": { "slippage": 0.5 }
    },
    "plan": {
      "plan_id": "plan_...",
      "steps": [...],
      "required_permissions": { "allowance": [...], "signatures": 1 }
    },
    "scope": { "chain": "evm", "max_amount": "200", ... }
  }
}
```

### `POST /api/execute`

解析并完整执行意图（默认 stub 模式）。

**请求体：** 同 `/api/plan`

**响应 200：**

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

### 错误响应

| 状态码 | `error.message` | 原因 |
|---|---|---|
| `400` | `missing_text` | `text` 字段缺失或为空 |
| `404` | `not_found` | 未知路由或 HTTP 方法错误 |
| `413` | `payload_too_large` | 请求体过大 |
| `422` | `schema_validation_error` | Zod schema 校验失败 |
| `500` | *(错误详情)* | NL 解析失败、工具执行错误 |

---

## 核心模块

### 1. Intent & Plan（`packages/core`）

**`IntentSpec`** — 完整生产 schema（11 种 action_type）：

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

**`MvpIntent`** — mock CLI 路径使用的最小化意图：

```ts
{ action: "send", chain: string, asset: string, amount: string, to: string }
```

- `buildPlan(intent: MvpIntent)` → 单步 `simulate_transfer` 计划
- `mvpToIntentSpec(intent: MvpIntent)` → 转换为 `IntentSpec`（供 `--engine orchestrator` 使用）

### 2. Tool Registry（`packages/tools`）

所有工具实现 `ToolDefinition<TInput, TOutput>` 接口，输入/输出均通过 Zod schema 校验。

| 工具 | 类型 | 职责 |
|---|---|---|
| `chain_read` | EVM | 余额、nonce、allowance 查询 |
| `quote_route` | EVM | DEX 报价与路由 |
| `build_tx` | EVM | 生成交易 calldata |
| `simulate_tx` | EVM | 预执行模拟 |
| `sign_tx` | EVM | 通过 ConsentScope 约束的 Signer 签名 |
| `send_tx` | EVM | 广播已签名交易 |
| `wait_confirm` | EVM | 轮询收据并解析日志 |
| `simulate_transfer` | Mock | 模拟转账（返回 mock tx hash） |

设置 `LUCIDWALLET_USE_STUBS=true` 可对所有 EVM 工具启用 stub 响应（无需 RPC）。

### 3. Orchestrator（`apps/server/src/orchestrator.ts`）

```ts
const { plan, results, auditLog } = await orchestrator.execute(intentSpec);
```

- 根据 `IntentSpec` 生成执行计划（支持 `send`、`swap`、`approve+swap`）
- 驱动 `ExecutionStateMachine`：`PLANNED → APPROVED → EXECUTING → CONFIRMED/FAILED`
- 将上一步工具输出串联到下一步输入（如 `build_tx` 的输出传给 `simulate_tx`）
- 每步前后记录 `step_start` / `step_success` / `step_failed` 事件到 `AuditLog`
- 返回 `auditLog: AuditEntry[]`

```ts
orchestrator.plan(intentSpec)   // 仅生成计划，不执行
```

### 4. Wallet Core（`packages/wallet-core`）

| 模块 | 说明 |
|---|---|
| `Signer` | 按 `ConsentScope` 校验每次签名请求：链、spender 白名单、token 列表、最大金额、过期时间、风险等级 |
| `TxQueue` | Nonce 管理与并发控制 |
| `AuditLog` | 内存事件日志 — `record(event, payload)` / `list()` |
| `SecureStorage` | 键值存储（当前内存实现；Phase 3 添加文件持久化） |

**`ConsentScope` 示例：**

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

## 数据流

### Mock 路径（`--engine mock`，JSON/样例输入默认）

```
输入：--sample-index / --intent / --intent-file
  → parseIntent()  →  MvpIntent
  → buildPlan()    →  MvpPlan（1 步：simulate_transfer）
  → simulate_transfer 工具  →  { tx_hash, summary }
  → logRun()  →  experiments/logs/run_<ts>.json
```

### Orchestrator 路径（`--engine orchestrator` 或 `--nl`）

```
输入：--nl <text>  OR  --intent / --sample + --engine orchestrator
  → parseNaturalLanguageIntent()  →  IntentSpec    （NL 路径）
    OR  mvpToIntentSpec()          →  IntentSpec    （JSON 路径）
  → LUCIDWALLET_USE_STUBS=true  （若未设置则自动启用）
  → new Signer(ConsentScope)
  → new Orchestrator(signer)
  → Orchestrator.execute(intentSpec)
      DRAFT → PLANNED → APPROVED → EXECUTING
      每步：
        [step_start]  →  tool.handler()  →  [step_success | step_failed]
        从上一步输出解析当前步骤输入
      → CONFIRMED / FAILED
  → { plan, results, auditLog }
  → logRun()  →  experiments/logs/run_<ts>.json
```

### HTTP API 流程

```
POST /api/plan  or  /api/execute
  → readJsonBody()  →  { text, templateFile? }
  → parseNaturalLanguageIntent(text)  →  IntentSpec
  → buildScope(intentSpec)  →  ConsentScope
  → new Signer(scope)  →  new Orchestrator(signer)
  → orchestrator.plan()      [/api/plan]
    or orchestrator.execute() [/api/execute]
  → JSON: { ok: true, data: { plan?, results?, scope } }
```

---

## 数据集规范

所有规范遵循 RFC 2119（MUST / SHOULD / MAY）。详见 `datasets/spec/`：

| 文件 | 内容 |
|---|---|
| `query.md` | 自然语言意图格式 |
| `metadata.md` | 链、任务类型、难度、账户状态 |
| `constraints.md` | 用户约束 + 系统安全约束 |
| `tools.md` | 工具接口规范（8 个工具） |
| `output.md` | 交易序列输出格式 |
| `coverage.md` | 覆盖矩阵 |

**样例数据文件：**

- `datasets/mvp-samples/intent_samples.json` — 5 个固定 `MvpIntent` 样例
- `datasets/data/samples.jsonl` — JSONL（query + metadata + constraints + expected_output）
- `datasets/nl/templates/send_swap.json` — swap 和 send 的 NL 模板匹配规则

---

## 测试覆盖

**77 个测试 · 13 个文件 · 全部通过**

| 文件 | 包 | 测试数 | 覆盖内容 |
|---|---|---|---|
| `schemas.test.ts` | `core` | 3 | IntentSpec / Plan / ConsentScope Zod 校验 |
| `dataset.test.ts` | `core` | 32 | DatasetLoader、样本校验、过滤、统计 |
| `signer.test.ts` | `wallet-core` | 3 | ConsentScope 授权 / 拒绝路径 |
| `tx_queue.test.ts` | `wallet-core` | 6 | FIFO 队列、并发限制、reset |
| `secure_storage.test.ts` | `wallet-core` | 4 | get/set/覆盖/多键独立 |
| `build_plan.test.ts` | `server` | 1 | `buildPlan()` → `simulate_transfer` 契约 |
| `nl_orchestrator.test.ts` | `server` | 1 | NL → IntentSpec → Orchestrator 端到端（stub） |
| `orchestrator.plan.test.ts` | `server` | 1 | 计划生成与 `required_permissions` |
| `orchestrator.flow.test.ts` | `server` | 2 | 工具输出串联、错误分类 |
| `http.test.ts` | `server` | 6 | `/api/plan`、`/api/execute`、400/404、OPTIONS 预检 |
| `nl_intent.test.ts` | `server` | 8 | 中英文 send + swap 模板，含/不含 chain/slippage |
| `error_codes.test.ts` | `server` | 7 | `mapErrorCode` — 6 种模式 + REVERT 兜底 |
| `cli_dry_run.test.ts` | `server` | 3 | `--dry-run` 退出码、plan JSON、无日志文件 |

```bash
npm run test
```

---

## 错误码

| 错误码 | 含义 |
|---|---|
| `INSUFFICIENT_BALANCE` | 钱包余额不足 |
| `INSUFFICIENT_ALLOWANCE` | ERC-20 授权额度不足 |
| `SLIPPAGE_TOO_HIGH` | 实际滑点超过约束 |
| `NONCE_CONFLICT` | 交易 nonce 冲突 |
| `TIMEOUT` | 操作超时 |
| `NETWORK_ERROR` | RPC 或网络连接失败 |
| `REVERT` | 合约 revert 或通用错误 |

---

## 开发路线图

详见 [ROADMAP.md](./ROADMAP.md)。

| 阶段 | 状态 | 主要内容 |
|---|---|---|
| Phase 0 — 基础建设 | ✅ 完成 | Monorepo · schema · 工具注册表 · mock 工具 |
| Phase 1 — CLI 双路径 | ✅ 完成 | NL 解析 · Orchestrator · 状态机 · RFC 规范 · 43 测试 |
| Phase 2 — API 与可观测性 | ✅ 完成 | `--engine` 标志 · HTTP API + 6 测试 · AuditLog · 49 测试 |
| Phase 3 — 覆盖率与质量 | ✅ 完成 | 6 NL 模板 · TxQueue/SecureStorage 测试 · `--dry-run` · 错误码重构 · 77 测试 |
| Phase 4 — 真实链集成 | 🔲 下一步 | Sepolia RPC · 真实 DEX · 密钥管理 |
| Phase 5 — 生产就绪 | 🔲 远期 | 前端 UI · ConsentScope 授权流程 · 主网部署 |

---

## License

MIT
