# Metadata（任务元信息）规范

## 概述

Metadata 定义每条样例的上下文信息，包括链、任务类型、难度和账户初始状态。

## 字段定义

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | number | 是 | 链 ID |
| `task_type` | string | 是 | 任务类型 |
| `level` | string | 是 | 难度等级 |
| `account_state` | object | 是 | 初始账户状态 |

## chain_id 取值

| chain_id | 网络 |
|----------|------|
| 1 | Ethereum Mainnet |
| 11155111 | Sepolia Testnet |
| 137 | Polygon |
| 42161 | Arbitrum One |

## task_type 取值（MVP）

| 值 | 说明 |
|----|------|
| `swap` | 代币兑换 |
| `send` | 转账 |

## level 取值

| 值 | 说明 |
|----|------|
| `easy` | 简单：单步操作，无复杂约束 |
| `medium` | 中等：需要授权或多步操作 |
| `hard` | 困难：复杂约束、多链或批量操作 |

## account_state 结构

```json
{
  "account_state": {
    "address": "0x...",
    "balances": {
      "ETH": "1.5",
      "USDC": "1000",
      "DAI": "500"
    },
    "allowances": {
      "USDC": {
        "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "1000"
      }
    }
  }
}
```

### balances

资产余额映射，key 为代币符号，value 为人类可读数量（字符串）。

### allowances

已有授权映射，结构为 `{ token: { spender: amount } }`。

## 完整示例

```json
{
  "metadata": {
    "chain_id": 1,
    "task_type": "swap",
    "level": "medium",
    "account_state": {
      "address": "0x1234567890123456789012345678901234567890",
      "balances": {
        "ETH": "2.0",
        "USDC": "1000"
      },
      "allowances": {}
    }
  }
}
```
