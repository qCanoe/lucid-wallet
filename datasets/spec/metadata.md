# Metadata Specification

## Purpose

`metadata` provides the contextual information needed to interpret a dataset sample, including the target chain, task category, difficulty level, and an initial (informational) account snapshot.

## Normative keywords

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## Dataset record shape (top-level)

Each JSONL line in `datasets/data/*.jsonl` is a JSON object with the following top-level fields:

| Field | Type | Required | Description |
|---|---:|:---:|---|
| `id` | string | YES | Unique sample identifier within the file/dataset. |
| `query` | string | YES | Natural-language user intent (see `spec/query.md`). |
| `metadata` | object | YES | Context for the sample (this document). |
| `constraints` | object | YES | User + system constraints (see `spec/constraints.md`). |

## `metadata` fields

| Field | Type | Required | Description |
|---|---:|:---:|---|
| `chain_id` | number | YES | EVM chain id. |
| `task_type` | string | YES | Task category for MVP (`send` or `swap`). |
| `level` | string | YES | Difficulty level (`easy`, `medium`, `hard`). |
| `account_state` | object | YES | Informational account snapshot (see below). |

## `chain_id` values (common)

| `chain_id` | Network |
|---:|---|
| 1 | Ethereum Mainnet |
| 11155111 | Sepolia Testnet |
| 137 | Polygon |
| 42161 | Arbitrum One |

Notes:

- The dataset MAY include additional chain IDs beyond this table.
- Tools may use environment configuration for chain selection; `chain_id` is the authoritative dataset label.

## `task_type` values (MVP)

| Value | Meaning |
|---|---|
| `send` | Transfer an asset to a recipient |
| `swap` | Swap one asset for another |

## `level` values

| Value | Intended difficulty meaning |
|---|---|
| `easy` | Single-step, minimal constraints |
| `medium` | May require allowance checks, approvals, or multi-step flows |
| `hard` | Complex constraints, multi-hop/multi-asset, or advanced safety considerations |

## `account_state` object

`account_state` is an **informational snapshot** of the initial wallet state as represented in the dataset. Agents SHOULD still use tools to validate real balances/allowances when executing.

**Shape**

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

### `address`

- **Type**: string
- **Meaning**: the wallet address used as the source of funds.
- **Format**: `0x`-prefixed 40-hex characters. Checksummed addresses are recommended.

### `balances`

- **Type**: object map `{ [asset: string]: string }`
- **Meaning**: human-readable amounts (decimal strings) keyed by asset symbol (e.g., `ETH`, `USDC`).
- **Notes**:
  - These values are intended for dataset readability and may not be in base units.
  - Agents SHOULD NOT assume these are authoritative without tool verification.

### `allowances`

- **Type**: nested object map `{ [asset: string]: { [spender: string]: string } }`
- **Meaning**: pre-existing allowances (decimal strings) for ERC-20 assets, keyed by token symbol and spender address.
- **Notes**:
  - Spender keys SHOULD be EVM addresses.
  - As with balances, values may be informational rather than authoritative.

## Complete example

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
