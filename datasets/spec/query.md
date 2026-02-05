# Query Specification

## Purpose

`query` is a natural-language description of the user's intent. It should describe **what outcome** the user wants, without prescribing the exact on-chain execution details.

## Type and encoding

- **Type**: string
- **Encoding**: UTF-8
- **Recommended length**: 5–200 characters (longer is allowed if needed)
- **Language**: any natural language (the dataset may contain Chinese and/or English)

## Content rules (normative)

The `query` field:

- **MUST** describe a single primary task (e.g., one swap or one send).
- **SHOULD** include the minimum parameters needed to make the intent unambiguous:
  - For `send`: recipient (address or ENS) and amount/asset.
  - For `swap`: input amount/asset and desired output asset.
- **MUST NOT** contain private keys, seed phrases, or other secrets.
- **SHOULD NOT** specify low-level execution choices such as DEX names, routing hops, calldata, gas parameters, or contract addresses, unless the user explicitly included them.
- **MAY** include addresses (`0x…`) or ENS names (e.g., `vitalik.eth`) when the recipient/target is part of the intent.

## MVP task types covered

The dataset focuses on two task types (see `metadata.task_type`):

| `task_type` | Meaning | Example `query` |
|---|---|---|
| `swap` | Swap one asset for another | `Swap 50 DAI to USDT` |
| `send` | Send an asset to a recipient | `Transfer 1 ETH to vitalik.eth` |

## Examples

### Swap

```
把 100 USDC 换成 ETH
用 0.1 ETH 买 USDC
Swap 50 DAI to USDT
```

### Send

```
给 0xABCDEF1234567890ABCDEF1234567890ABCDEF12 转 0.5 ETH
发送 200 USDC 到 0x9876543210987654321098765432109876543210
Transfer 1 ETH to vitalik.eth
```

## JSON field example

```json
{
  "query": "Swap 50 DAI to USDT"
}
```
