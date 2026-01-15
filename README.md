# Lucid Wallet — MVP 0.1

> 用户用自然语言或结构化表单表达意图，系统自动拆解、规划、调用工具、执行交易并处理失败回滚/重试，最终在**最少交互**下完成任务。

## 项目概述

Lucid（Agent Wallet）是一款基于意图驱动的智能钱包。MVP 0.1 实现了：

- **意图闭环**：`swap` 与 `approve+swap`
- **执行状态机**：`DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE/FAILED`
- **权限最小化**：ConsentScope 约束（链、spender、token、金额、有效期）
- **失败恢复**：错误分类与恢复选项（retry / adjust_slippage / adjust_amount）

## 目录结构

```
lucidWallet/
├── apps/
│   ├── server/          # Orchestrator + 执行状态机
│   └── web/             # 前端 UI（任务卡片）
├── packages/
│   ├── core/            # IntentSpec / Plan / Consent / StepResult schema
│   ├── tools/           # Tool Registry + EVM 工具集
│   ├── wallet-core/     # Signer / TxQueue / SecureStorage / AuditLog
│   └── shared/          # 通用常量与错误码
├── vitest.config.ts
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

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

## 核心模块

### 1. Intent & Plan（packages/core）

定义用户意图与执行计划的数据结构：

```ts
// IntentSpec 示例
{
  action_type: "swap",
  chain: "evm",
  asset_in: "USDC",
  asset_out: "ETH",
  amount: "200",
  constraints: { slippage: 0.5 }
}
```

### 2. Tool Registry（packages/tools）

统一工具接口，MVP 包含：

| 工具 | 职责 |
|------|------|
| `chain_read` | 余额、nonce、allowance 查询 |
| `quote_route` | DEX 报价与路由 |
| `build_tx` | 生成交易 calldata |
| `simulate_tx` | 模拟/预执行 |
| `sign_tx` | 签名（走 Wallet Core） |
| `send_tx` | 广播交易 |
| `wait_confirm` | 确认与收据解析 |

### 3. Orchestrator（apps/server）

核心调度器，负责：

- 意图解析 → Plan 生成
- 执行状态机推进
- 工具输出串联
- 错误分类与恢复

### 4. Wallet Core（packages/wallet-core）

- **Signer**：基于 ConsentScope 的签名控制
- **TxQueue**：nonce 管理与并发限制
- **SecureStorage**：本地加密存储
- **AuditLog**：执行日志

## 数据流

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

## 测试覆盖

| 测试文件 | 覆盖内容 |
|----------|----------|
| `schemas.test.ts` | Intent/Plan/Consent schema 校验 |
| `signer.test.ts` | ConsentScope 约束与拒绝路径 |
| `orchestrator.plan.test.ts` | 计划生成与权限清单 |
| `orchestrator.flow.test.ts` | 执行链路与输出串联 |

## 错误码

| 错误码 | 含义 |
|--------|------|
| `INSUFFICIENT_BALANCE` | 余额不足 |
| `INSUFFICIENT_ALLOWANCE` | 授权不足 |
| `SLIPPAGE_TOO_HIGH` | 滑点过大 |
| `NONCE_CONFLICT` | nonce 冲突 |
| `REVERT` | 合约 revert |

## 下一步

- [ ] 接入真实 RPC 与 DEX 路由
- [ ] 完善 Web UI（React/Vue）
- [ ] 支持更多意图类型（deposit/withdraw/stake）
- [ ] 集成硬件钱包/MPC/AA（ERC-4337）

## License

MIT
