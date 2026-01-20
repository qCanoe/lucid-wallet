# Tools/Environment（工具与环境）规范

## 概述

Agent 只能通过预定义的工具接口与链上环境交互，确保评测的可控性和可复现性。

## 工具列表

### get_balance

查询账户资产余额。

**输入**：
```json
{
  "chain_id": 1,
  "address": "0x...",
  "asset": "ETH"
}
```

**输出**：
```json
{
  "balance": "1.5",
  "decimals": 18
}
```

---

### get_allowance

查询 ERC20 代币授权额度。

**输入**：
```json
{
  "chain_id": 1,
  "owner": "0x...",
  "spender": "0x...",
  "token": "0x..."
}
```

**输出**：
```json
{
  "allowance": "1000000000",
  "decimals": 6
}
```

---

### get_quote

获取代币兑换报价。

**输入**：
```json
{
  "chain_id": 1,
  "from_token": "USDC",
  "to_token": "ETH",
  "amount": "100"
}
```

**输出**：
```json
{
  "from_amount": "100",
  "to_amount": "0.05",
  "price_impact": "0.1%",
  "route": ["USDC", "WETH", "ETH"],
  "protocol": "uniswap_v3"
}
```

---

### simulate_tx

模拟交易执行，返回预期结果。

**输入**：
```json
{
  "chain_id": 1,
  "from": "0x...",
  "to": "0x...",
  "value": "0",
  "data": "0x..."
}
```

**输出**：
```json
{
  "success": true,
  "gas_used": "150000",
  "logs": [...],
  "balance_changes": {
    "ETH": "-0.01",
    "USDC": "+100"
  }
}
```

---

### get_risk_label

查询地址或合约的风险标签。

**输入**：
```json
{
  "address": "0x..."
}
```

**输出**：
```json
{
  "risk_level": "low",
  "labels": ["verified", "audited"],
  "warnings": []
}
```

---

### build_tx

根据操作类型构造交易。

**输入**：
```json
{
  "action": "swap",
  "params": {
    "from_token": "USDC",
    "to_token": "ETH",
    "amount": "100",
    "slippage": "0.5%"
  }
}
```

**输出**：
```json
{
  "to": "0x...",
  "value": "0",
  "data": "0x...",
  "gas": "200000"
}
```

## 环境约束

| 约束 | 说明 |
|------|------|
| 固定区块高度 | 使用固定区块快照，确保状态一致 |
| 测试网优先 | MVP 阶段使用 Sepolia 测试网 |
| 确定性返回 | 相同输入必须返回相同输出 |
| 无外部依赖 | 工具返回值由数据集预定义或模拟 |

## 工具调用约定

1. Agent 必须使用工具获取链上状态，不能假设或硬编码
2. 工具调用失败时返回标准错误格式
3. 每个工具调用计入评测的"步骤数"指标
