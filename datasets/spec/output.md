# Output Format（输出格式）规范

## 概述

Agent 的输出必须是结构化的 JSON 格式，包含交易序列和摘要说明。

## 输出结构

```json
{
  "success": true,
  "transactions": [...],
  "summary": "..."
}
```

## 字段定义

### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `success` | boolean | 是 | 任务是否成功完成 |
| `transactions` | array | 是 | 交易序列（可为空） |
| `summary` | string | 是 | 任务摘要说明 |
| `error` | string | 否 | 失败时的错误信息 |

### transactions 数组元素

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `to` | string | 是 | 目标合约/地址（0x 开头） |
| `value` | string | 是 | 发送的原生代币（wei） |
| `data` | string | 是 | calldata（0x 开头） |
| `gas` | string | 是 | 建议 gas limit |
| `description` | string | 是 | 该步骤的可读说明 |

## 示例

### Swap 成功输出

```json
{
  "success": true,
  "transactions": [
    {
      "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "value": "0",
      "data": "0x095ea7b3000000000000000000000000...",
      "gas": "50000",
      "description": "Approve 100 USDC to Uniswap Router"
    },
    {
      "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "value": "0",
      "data": "0x38ed1739000000000000000000000000...",
      "gas": "200000",
      "description": "Swap 100 USDC to ETH via Uniswap V2"
    }
  ],
  "summary": "将 100 USDC 兑换为约 0.05 ETH，需要 2 笔交易：先授权后兑换"
}
```

### Send 成功输出

```json
{
  "success": true,
  "transactions": [
    {
      "to": "0x1234567890123456789012345678901234567890",
      "value": "500000000000000000",
      "data": "0x",
      "gas": "21000",
      "description": "Transfer 0.5 ETH to 0x1234...7890"
    }
  ],
  "summary": "向 0x1234...7890 转账 0.5 ETH"
}
```

### 失败输出

```json
{
  "success": false,
  "transactions": [],
  "summary": "无法完成任务",
  "error": "余额不足：需要 100 USDC，当前余额 50 USDC"
}
```

## 输出验证规则

评测时检查以下项目：

1. **格式正确**：符合 JSON Schema
2. **地址有效**：所有地址为有效的 0x 格式（40 位 hex）
3. **data 有效**：calldata 为有效的 0x hex 字符串
4. **可模拟执行**：每笔交易可通过 simulate_tx 验证
5. **约束满足**：不违反 constraints 中的规则
