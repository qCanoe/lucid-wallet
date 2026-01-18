# Lucid Wallet — MVP 0.1

> 用户用自然语言或结构化表单表达意图，系统自动拆解、规划、调用工具、执行交易并处理失败回滚/重试，最终在**最少交互**下完成任务。

## 项目概述

Lucid（Agent Wallet）是一款基于意图驱动的智能钱包。MVP 0.1 实现了：

- **意图闭环**：`swap` 与 `approve+swap`
- **执行状态机**：`DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE/FAILED`
- **权限最小化**：ConsentScope 约束（链、spender、token、金额、有效期）
- **失败恢复**：错误分类与恢复选项（retry / adjust_slippage / adjust_amount）

### 早期模拟 MVP（研究原型）

为了快速验证核心流程，项目包含一个**早期模拟 MVP**，提供：

- **CLI 原型**：命令行工具验证意图→计划→执行闭环
- **模拟执行器**：无需真实链即可测试完整流程
- **实验日志**：自动记录每次运行的意图、计划、结果
- **样例数据集**：5 个固定意图样例用于快速验证
- **自然语言解析**：中英规则/模板解析为 `IntentSpec`（首批覆盖 `send/swap`）

## 目录结构

```
lucidWallet/
├── apps/
│   ├── server/          # Orchestrator + 执行状态机 + CLI
│   │   ├── src/
│   │   │   ├── cli.ts              # CLI 入口
│   │   │   ├── intents/            # 意图解析
│   │   │   ├── plans/               # 计划生成
│   │   │   └── logs/                # 日志记录
│   │   └── web/                     # 前端 UI（任务卡片）
├── datasets/            # 数据集与样例
│   └── mvp-samples/     # 早期模拟 MVP 样例
│       └── intent_samples.json
│   └── nl/              # 自然语言数据集
│       ├── templates/   # 规则模板
│       │   └── send_swap.json
│       └── samples/     # 样例
│           └── send_swap.json
├── experiments/         # 实验日志与运行记录
│   └── logs/            # CLI 运行日志（自动生成）
├── packages/
│   ├── core/            # IntentSpec / Plan / Consent / StepResult schema
│   │   └── src/schemas/
│   │       ├── mvp-intent.ts       # MVP 意图结构
│   │       └── mvp-plan.ts         # MVP 计划结构
│   ├── tools/           # Tool Registry + EVM 工具集
│   │   └── src/
│   │       ├── mock/                # 模拟工具
│   │       │   └── simulate_transfer.ts
│   │       └── evm/                 # EVM 工具（真实链）
│   ├── wallet-core/     # Signer / TxQueue / SecureStorage / AuditLog
│   └── shared/          # 通用常量与错误码
├── prototypes/          # 原型实现与演示脚手架
│   └── mvp-sim-cli/     # 早期模拟 MVP CLI 文档
├── vitest.config.ts
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

**目录说明**：

- `datasets/`：存放研究用的数据集、样例和标注
- `experiments/`：实验运行日志，CLI 会自动写入 `logs/` 目录
- `prototypes/`：原型实现和演示脚手架，包含使用文档

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
npm run test
```

### 构建

```bash
npm run build
```

### 运行早期模拟 MVP CLI

```bash
# 构建项目
npm run build

# 运行默认样例（索引 0）
node apps/server/dist/cli.js

# 运行指定样例索引
node apps/server/dist/cli.js --sample-index 2

# 使用自定义意图（JSON 格式）
node apps/server/dist/cli.js --intent '{"action":"send","chain":"sepolia","asset":"ETH","amount":"0.1","to":"0x1111111111111111111111111111111111111111"}'

# 使用自然语言意图（中英均可）
node apps/server/dist/cli.js --nl "send 0.1 ETH to 0x1111111111111111111111111111111111111111"
node apps/server/dist/cli.js --nl "用200 USDC换ETH滑点0.5%"

# 指定自然语言模板文件
node apps/server/dist/cli.js --nl "swap 200 USDC to ETH" --nl-template-file datasets/nl/templates/send_swap.json

# 使用 OpenAI GPT-5.2 解析自然语言（失败时回退模板）
set LUCIDWALLET_OPENAI_API_KEY=your_key
set LUCIDWALLET_OPENAI_MODEL=gpt-5.2
node apps/server/dist/cli.js --nl "用200 USDC换ETH滑点0.5%"

# 从文件读取意图
node apps/server/dist/cli.js --intent-file path/to/intent.json
```

运行结果会：

- 输出计划步骤和执行结果（JSON 格式）
- 自动保存日志到 `experiments/logs/run_<timestamp>.json`

更多用法请参考 `prototypes/mvp-sim-cli/README.md`

## 核心模块

### 1. Intent & Plan（packages/core）

定义用户意图与执行计划的数据结构：

**完整 IntentSpec**（用于生产环境）：

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

**MVP Intent**（用于早期模拟原型）：

```ts
{
  action: "send",
  chain: "sepolia",
  asset: "ETH",
  amount: "0.1",
  to: "0x1111111111111111111111111111111111111111"
}
```

MVP Intent 是最小化的意图结构，专注于验证核心流程，支持：

- 单动作类型（目前仅 `send`）
- 单链单资产
- 简化的计划生成（2-3 步）

### 2. Tool Registry（packages/tools）

统一工具接口，MVP 包含：

| 工具                  | 职责                              | 类型 |
| --------------------- | --------------------------------- | ---- |
| `chain_read`        | 余额、nonce、allowance 查询       | EVM  |
| `quote_route`       | DEX 报价与路由                    | EVM  |
| `build_tx`          | 生成交易 calldata                 | EVM  |
| `simulate_tx`       | 模拟/预执行                       | EVM  |
| `sign_tx`           | 签名（走 Wallet Core）            | EVM  |
| `send_tx`           | 广播交易                          | EVM  |
| `wait_confirm`      | 确认与收据解析                    | EVM  |
| `simulate_transfer` | 模拟转账执行（返回 mock tx hash） | Mock |

**模拟工具**（`packages/tools/src/mock/`）：

- 用于早期原型验证，无需真实链连接
- 返回模拟的交易哈希和执行摘要
- 支持错误场景测试（如无效金额）

### 3. Orchestrator（apps/server）

核心调度器，负责：

- 意图解析 → Plan 生成
- 执行状态机推进
- 工具输出串联
- 错误分类与恢复

**CLI 入口**（`apps/server/src/cli.ts`）：

- 早期模拟 MVP 的命令行接口
- 支持从样例文件或命令行参数读取意图
- 支持自然语言解析到 `IntentSpec`（`--nl` / `--intent-nl`）
- 自动生成计划并调用模拟执行器
- 输出结果并保存日志到 `experiments/logs/`

### 4. Wallet Core（packages/wallet-core）

- **Signer**：基于 ConsentScope 的签名控制
- **TxQueue**：nonce 管理与并发限制
- **SecureStorage**：本地加密存储
- **AuditLog**：执行日志

## 数据流

### 完整流程（生产环境）

```
用户输入意图
    ↓
IntentSpec 规范化
    ↓
Planner 生成 Plan（含 approve+swap 步骤）
    ↓
Policy 计算 required_permissions
    ↓
UI 展示任务卡片 + 授权清单
    ↓
用户批准 consent
    ↓
执行状态机逐步执行（chain_read → approve → build → simulate → sign → send → confirm）
    ↓
失败则进入恢复分支
    ↓
完成后产出结果摘要
```

### 早期模拟 MVP 流程

```
CLI 输入（JSON / 样例索引 / 自然语言）
    ↓
parseIntent() 解析为 MvpIntent
（自然语言：parseNaturalLanguageIntent() → IntentSpec → 仅 send 映射为 MvpIntent）
    ↓
buildPlan() 生成最小计划（1-2 步）
    ↓
调用 simulate_transfer 工具
    ↓
返回模拟结果（tx_hash + summary）
    ↓
logRun() 保存到 experiments/logs/
```

**关键差异**：

- 无需用户批准（模拟环境）
- 无需真实链连接（mock 工具）
- 最小化计划（仅验证核心流程）
- 自动日志记录（便于实验分析）

## 测试覆盖

### 单元测试

| 测试文件                      | 覆盖内容                        |
| ----------------------------- | ------------------------------- |
| `schemas.test.ts`           | Intent/Plan/Consent schema 校验 |
| `signer.test.ts`            | ConsentScope 约束与拒绝路径     |
| `orchestrator.plan.test.ts` | 计划生成与权限清单              |
| `orchestrator.flow.test.ts` | 执行链路与输出串联              |

### 早期模拟 MVP 验证

- **样例数据集**：`datasets/mvp-samples/intent_samples.json`（5 个固定样例）
- **CLI 测试**：运行 `node apps/server/dist/cli.js` 验证完整流程
- **日志验证**：检查 `experiments/logs/` 中的 JSON 日志格式
- **错误处理**：测试无效输入的错误路径

## 错误码

| 错误码                     | 含义        |
| -------------------------- | ----------- |
| `INSUFFICIENT_BALANCE`   | 余额不足    |
| `INSUFFICIENT_ALLOWANCE` | 授权不足    |
| `SLIPPAGE_TOO_HIGH`      | 滑点过大    |
| `NONCE_CONFLICT`         | nonce 冲突  |
| `REVERT`                 | 合约 revert |

## License

MIT
