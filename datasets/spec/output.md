# Output Format Specification

## Purpose

The agent MUST return a structured JSON output describing whether the task can be completed and, if so, the proposed transaction sequence and a human-readable summary.

This output is intended to be:

- **Machine-checkable** (schema + validation rules)
- **Auditable** (clear descriptions)
- **Safe-by-default** (respects `constraints`)

## Normative keywords

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## Top-level shape

```json
{
  "success": true,
  "transactions": [],
  "summary": "..."
}
```

## Field definitions

### Top-level fields

| Field | Type | Required | Description |
|---|---:|:---:|---|
| `success` | boolean | YES | Whether the agent found a valid, constraint-compliant solution. |
| `transactions` | array | YES | Ordered transaction sequence to execute (MAY be empty). |
| `summary` | string | YES | Short human-readable explanation of what will happen. |
| `error` | object | NO | Present when `success` is `false`. |

### `error` object

| Field | Type | Required | Description |
|---|---:|:---:|---|
| `code` | string | YES | Machine-readable error code (e.g., `INSUFFICIENT_BALANCE`). |
| `message` | string | YES | Human-readable explanation. |

### `transactions[]` element

Each entry represents a single EVM transaction payload.

| Field | Type | Required | Description |
|---|---:|:---:|---|
| `to` | string | YES | Destination address (contract or EOA). |
| `data` | string | YES | Calldata hex string (`0x`-prefixed). Use `"0x"` for a plain ETH transfer. |
| `value` | string | YES | Native value in wei (decimal string). Use `"0"` when not sending native value. |
| `gas_limit` | string | NO | Suggested gas limit (integer string). |
| `description` | string | YES | Human-readable description of the intent of this transaction. |

Notes:

- Amounts MUST be represented as decimal strings.
- Addresses MUST be valid EVM addresses (or resolvable prior to output).
- The agent SHOULD include `gas_limit` when it can be reasonably estimated.

## Examples

### Swap success

```json
{
  "success": true,
  "transactions": [
    {
      "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "value": "0",
      "data": "0x095ea7b3000000000000000000000000...",
      "gas_limit": "50000",
      "description": "Approve 100 USDC to the router contract."
    },
    {
      "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      "value": "0",
      "data": "0x38ed1739000000000000000000000000...",
      "gas_limit": "200000",
      "description": "Swap 100 USDC for ETH."
    }
  ],
  "summary": "Swap 100 USDC to ETH in 2 transactions: approve then swap."
}
```

### Send success

```json
{
  "success": true,
  "transactions": [
    {
      "to": "0x1234567890123456789012345678901234567890",
      "value": "500000000000000000",
      "data": "0x",
      "gas_limit": "21000",
      "description": "Transfer 0.5 ETH to 0x1234...7890."
    }
  ],
  "summary": "Send 0.5 ETH to 0x1234...7890."
}
```

### Failure

```json
{
  "success": false,
  "transactions": [],
  "summary": "Cannot complete the request.",
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Not enough USDC to swap 100 USDC."
  }
}
```

## Output validation rules (for evaluation)

Evaluation SHOULD check:

1. **Valid JSON**: output parses as JSON and matches the required fields.
2. **Address validity**: each `to` is a valid `0x`-address (40 hex chars).
3. **Hex validity**: each `data` is a valid `0x`-prefixed hex string.
4. **Simulatable**: each transaction SHOULD be simulatable via `simulate_tx` without reverting.
5. **Constraint compliance**: the plan MUST respect `spec/constraints.md` (slippage, gas, reserves, blocked targets/methods).
