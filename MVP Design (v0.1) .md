## Lucid Wallet — MVP Design Document（v0.1）


## 1) 目标与边界

Lucid（Agent Wallet）的 MVP 目标：用户用自然语言或结构化表单表达意图（例如“把 200 USDC 换成 ETH 并存入 Aave，滑点别超过 0.5%”），系统能自动拆解、规划、调用工具、执行交易并处理失败回滚/重试，最终在**最少交互**下完成任务，同时保证“权限最小化、可控、可回退”。

MVP 明确不做：全链覆盖、全协议覆盖、复杂多智能体协作、重度安全审计/形式化验证。MVP 只要把“意图到执行”的闭环跑通，且交互体验显著优于传统钱包多页面点点点。


## 2) 系统分层（推荐四层）

 **A. 体验层（Client/UI）** ：聊天式 + 任务卡片式 UI（输入意图、展示计划、请求授权、显示进度、失败原因与下一步）。

 **B. Agent 层（Orchestrator）** ：单一主 Agent（Orchestrator）负责意图理解、计划、工具编排、状态机推进；可选轻量子模块（非多 agent）：如 Route Finder、Gas Estimator、Risk Gate。

 **C. Tool/Execution 层（Tools & Runners）** ：把外部能力封装成可调用工具：链上读写、报价/路由、签名与广播、模拟、账户与余额、通知等。

 **D. Wallet Core（Key & Policy）** ：密钥与签名、权限策略、会话授权（scoped approval）、交易队列、审计日志。

MVP 的关键是把“Agent → Tools → Wallet Core”这条链做得稳定可控。


## 3) 核心模块与职责

### 3.1 Intent 接入与规范化（Intent Ingress）

输入可以是自然语言，也可以是 UI 表单；最终落到统一的  **IntentSpec** （结构化 DSL/JSON）。MVP 建议先做 8–12 个意图模板（覆盖率比开放式更重要）：

* 转账（send）
* 兑换（swap）
* 授权（approve / revoke）
* 质押/存入（deposit/stake）
* 提取（withdraw/unstake）
* 批量操作（batch）
* 资产整理（rebalance/convert small dust）
* 定投/定时（schedule，可先仅本地计划不自动执行）

IntentSpec 最少字段：`action_type, chain, asset_in/out, amount, constraints(slippage, deadline), target_protocol(optional), recipient(optional)`。


### 3.2 Planner（任务规划器）

把 IntentSpec 变成可执行的  **Plan** ：一组有依赖关系的 Steps（DAG 或线性）。每个 step 指向一个工具调用，并带输入、前置条件、失败策略。

MVP 建议做“可回滚的线性计划 + 明确 checkpoint”，例如 swap→deposit；失败后给出三种恢复策略：重试、降级路线、人工确认后继续。

Plan 结构建议：

* `plan_id`
* `steps[]`：`{step_id, tool, input, preconditions, postconditions, retry_policy}`
* `constraints`：全局滑点、最大 gas、最大总费用、超时
* `required_permissions`：需要的 token allowance、签名次数、spender 列表


### 3.3 Policy & Consent（权限与同意管理）

这是 Agent Wallet 与“自动脚本”最大的区别：你要把授权做成产品能力。

MVP 只需要三件事：

1. **最小权限** ：优先用 Permit/Permit2（能用就不用无限 approve）；不支持时默认“精确额度 approve”。
2. **作用域授权（Session Consent）** ：给每个 Plan 发一个 session token/consent，绑定 `chain + spender allowlist + token + max amount + expiry`。
3. **签名前置闸门** ：高风险操作（新 spender、无限授权、合约升级代理、陌生收款人）强制二次确认。

这里不要求你做“解释性”，但必须做“可控性”，否则 agent 执行会被视为不可信。


### 3.4 Execution State Machine（执行状态机）

把整个任务当成状态机跑：`DRAFT → PLANNED → APPROVED → EXECUTING → CONFIRMED → DONE/FAILED/ABORTED`。

每个 step 再细分：`PREPARE → SIMULATE → SIGN → SEND → CONFIRM → VERIFY`。

MVP 强烈建议把模拟（simulate）做成“默认开”，至少对 EVM 用 `eth_call`/模拟服务；对失败要能产出可展示的错误码（余额不足/授权不足/滑点过大/nonce 冲突/合约 revert）。


### 3.5 Tool Registry（工具注册与约束）

所有能力都封装为工具，统一接口：输入 schema、输出 schema、成本估计、权限需求、可重试性、是否需签名。这样 Orchestrator 才能稳定编排。

MVP 工具集建议最小闭环：

* `chain_read`：余额、nonce、allowance、token 元数据
* `quote_route`：DEX 报价与路由（先集成一个来源即可）
* `build_tx`：生成交易 calldata/tx params
* `simulate_tx`：模拟/预执行
* `sign_tx`：签名（走 Wallet Core）
* `send_tx`：广播
* `wait_confirm`：确认与收据解析
* `notify`：前端通知/系统通知

### 3.6 Wallet Core（密钥、签名、队列）

密钥管理 MVP 可以先做软件密钥（本地/extension），但要把接口设计成可替换：后续换硬件钱包、MPC、AA（4337）都不重构 agent。

提供：

* `Sign(request, policy_scope)`：只有在 policy_scope 允许时签
* `TxQueue`：nonce 管理、并发限制、替换交易（speed-up/cancel）
* `SecureStorage`：本地加密存储 session/配置
* `AuditLog`：plan、step、工具输入输出摘要、tx hash（后续可用于复盘与研究）

---

## 4) 关键数据结构（建议直接落 JSON Schema）

 **IntentSpec（输入）** ：用户意图的规范化结果。

 **Plan（规划输出）** ：steps + 约束 + 权限需求。

 **StepResult（执行输出）** ：模拟结果、tx hash、receipt、资产变化。

 **ConsentScope（同意范围）** ：链、token、spender、金额上限、有效期、风险级别。

MVP 只要把这四个结构定死，你的系统就能持续演进而不散架。

---

## 5) 主数据流（端到端）

用户输入意图 → IntentSpec 规范化 → Planner 生成 Plan → Policy 计算 required_permissions → UI 展示“任务卡片 + 需要的授权清单”（不必解释细节，重点是让用户知道“我将允许什么”）→ 用户批准 consent → 执行状态机逐步跑 steps（每步：构建→模拟→签名→广播→确认）→ 失败则进入恢复分支（重试/降级/请求用户决策）→ 完成后产出结果摘要与可复制的 tx links（如果你愿意的话）。

---

## 6) MVP v0.1 功能切片（最小闭环建议）

为了最快跑通闭环，我建议 v0.1 只做： **单链 EVM + 单钱包账户 + 两个高频意图** ：

1. `swap`（USDC→ETH）
2. `approve+swap` 或 `swap+deposit`（如果你有时间就加 Aave/单协议）

配套必须有：模拟、最小权限授权、执行状态机、失败恢复（至少“重试/改滑点/改金额”三选一）。

---

## 7) 工程实现建议（可选但很实用）

形态上最省事的是  **浏览器扩展 + 本地服务（或纯前端）** ：扩展拿到 provider 与签名能力；agent/orchestrator 可以跑在前端或本地后台。工具层用 TypeScript 封装，Plan/Intent 用 zod 做 schema 校验，执行状态机用 xstate 或自研 reducer 都行。

---

## 8) 你下一步可以立刻开工的任务清单（不展开成大段分点）

先把 IntentSpec 和 Plan 的 JSON schema 定下来；然后写 Tool Registry（6–8 个工具的统一接口）；再实现执行状态机（step 的 prepare/simulate/sign/send/confirm）；最后接 UI 的任务卡片：显示“计划摘要 + 需要授权 + 进度条 + 失败恢复按钮”。只要这四块跑通，Lucid 就是一个真正的 Agent Wallet MVP 了。
