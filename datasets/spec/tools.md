# Tools & Environment Specification

## Purpose

Agents MUST interact with the blockchain environment exclusively through a fixed set of tool interfaces. This ensures evaluation is controllable, reproducible, and auditable.

This document specifies the **tool contract** (names, inputs, outputs, and error conventions) and the **environmental constraints** used during evaluation.

## Normative keywords

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as described in RFC 2119.

## General conventions

- **JSON only**: tool inputs/outputs are JSON objects.
- **Numeric encoding**: unless explicitly stated otherwise, numeric quantities are encoded as **decimal strings**.
- **Addresses**: EVM addresses are `0x`-prefixed hex strings. Agents SHOULD prefer checksummed addresses when available.
- **Error behavior**: on failure, a tool raises an error (machine-readable in the error message). Agents SHOULD treat tool errors as non-authoritative until verified (e.g., retryable network errors).

## Tool catalog (MVP)

The following tool names are considered canonical for MVP and match the exported tools in `packages/tools`.

### `chain_read`

Read an account balance (native or ERC-20) and optionally an ERC-20 allowance.

**Input**

```json
{
  "address": "0x...",
  "token": "ETH",
  "spender": "0x...",
  "required_amount": "1000000000000000000",
  "required_allowance": "1000000"
}
```

- `address` (string, required): owner address.
- `token` (string, optional): token symbol (e.g., `USDC`) or token address. If omitted, reads native balance.
- `spender` (string, optional): if provided with `token`, returns allowance for `spender`.
- `required_amount` (string, optional): if provided, environment MAY fail early with `insufficient_balance`.
- `required_allowance` (string, optional): if provided, environment MAY fail early with `insufficient_allowance`.

**Output**

```json
{
  "balance": "1000000000000000000",
  "nonce": 0,
  "allowance": "0"
}
```

- `balance` (string, required): base units (wei for native ETH; token base units for ERC-20).
- `nonce` (number, optional): transaction count for `address` (when available).
- `allowance` (string, optional): base units (only when `spender` was provided).

**Common errors**

- `rpc_url_not_configured`
- `chain_id_not_configured`
- `token_address_not_configured:<SYMBOL>`
- `insufficient_balance`
- `insufficient_allowance`

---

### `quote_route`

Get a swap quote and a coarse route description (protocol names / hops).

**Input**

```json
{
  "asset_in": "USDC",
  "asset_out": "ETH",
  "amount_in": "1000000",
  "slippage": 0.5
}
```

- `amount_in` is in **base units** of `asset_in`.
- `slippage` is a **percentage** number (e.g., `0.5` means 0.5%).

**Output**

```json
{
  "amount_out": "123456789",
  "route": ["uniswap_v3"]
}
```

**Common errors**

- `dex_quote_failed:<status>:<payload>`
- `dex_quote_missing_amount`

---

### `build_tx`

Construct an unsigned transaction payload from provided `to`, `data`, and optional `value`.

**Input**

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0"
}
```

**Output**

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0",
  "gas_limit": "21000"
}
```

Notes:

- `gas_limit` is a hint/estimate and MAY be omitted.

---

### `simulate_tx`

Simulate execution for an unsigned transaction payload.

**Input**

```json
{
  "to": "0x...",
  "data": "0x...",
  "value": "0"
}
```

**Output**

```json
{
  "success": true,
  "gas_used": "150000"
}
```

**Common errors**

- `simulation_failed:<message>`

---

### `sign_tx`

Sign a transaction payload with a wallet/signer provided by the environment.

**Input**

```json
{
  "chain": "evm:1",
  "to": "0x...",
  "data": "0x...",
  "value": "0"
}
```

**Output**

```json
{
  "signed_tx": "0x..."
}
```

**Common errors**

- `signer_not_available`

---

### `send_tx`

Broadcast a signed transaction.

**Input**

```json
{
  "signed_tx": "0x..."
}
```

**Output**

```json
{
  "tx_hash": "0x..."
}
```

---

### `wait_confirm`

Wait for a transaction to be confirmed or marked as failed.

**Input**

```json
{
  "tx_hash": "0x..."
}
```

**Output**

```json
{
  "status": "confirmed",
  "receipt": {
    "transactionHash": "0x..."
  }
}
```

---

### `simulate_transfer` (mock)

A lightweight mock tool used by MVP flows to simulate a transfer without assembling raw calldata.

**Input**

```json
{
  "chain": "evm:1",
  "asset": "ETH",
  "amount": "1",
  "to": "vitalik.eth"
}
```

**Output**

```json
{
  "tx_hash": "0x...",
  "summary": "Simulated send 1 ETH to vitalik.eth on evm:1.",
  "fee_estimate": "21000"
}
```

## Environment constraints

- **Determinism**: given the same dataset sample and tool inputs, the environment SHOULD be deterministic.
- **No out-of-band access**: agents MUST NOT assume chain state without tool calls.
- **Fixed configuration**: chain RPC / chain id / token address mapping MAY be provided via environment configuration.
- **Stub mode**: the environment MAY run in a stubbed mode for testing, in which tools return simulated outputs.

## Evaluation conventions

- Each tool invocation MAY count toward a "steps" metric.
- Agents SHOULD minimize unnecessary tool calls while still verifying balances/allowances and simulating risky transactions.
