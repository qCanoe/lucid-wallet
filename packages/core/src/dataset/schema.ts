import { z } from "zod";

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/** 0x-prefixed 40-hex-char EVM address */
const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

/** Percentage string like "0.5%" or "1%" */
const percentageString = z.string().regex(/^\d+(\.\d+)?%$/);

/** Non-negative integer encoded as string */
const uintString = z.string().regex(/^\d+$/);

/** Decimal numeric string (e.g. "1.5", "0", "1000") */
const decimalString = z.string().regex(/^\d+(\.\d+)?$/);

/** Hex string, at least "0x" */
const hexString = z.string().regex(/^0x[0-9a-fA-F]*$/);

// ---------------------------------------------------------------------------
// Account State
// ---------------------------------------------------------------------------

export const accountStateSchema = z.object({
  /** Wallet address */
  address: evmAddress,

  /** Human-readable balances keyed by asset symbol */
  balances: z.record(z.string(), decimalString),

  /** Pre-existing allowances: { token: { spender: amount } } */
  allowances: z.record(
    z.string(),
    z.record(z.string(), decimalString)
  ),
});

export type AccountState = z.infer<typeof accountStateSchema>;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const taskType = z.enum(["send", "swap"]);

export const difficultyLevel = z.enum(["easy", "medium", "hard"]);

export const metadataSchema = z.object({
  /** EVM chain id */
  chain_id: z.number().int().positive(),

  /** Task category */
  task_type: taskType,

  /** Difficulty level */
  level: difficultyLevel,

  /** Informational account snapshot */
  account_state: accountStateSchema,
});

export type DatasetMetadata = z.infer<typeof metadataSchema>;

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

export const userConstraintsSchema = z.object({
  /** Maximum allowed slippage, e.g. "0.5%" */
  max_slippage: percentageString.optional(),

  /** Maximum gas limit for a single tx */
  max_gas: uintString.optional(),

  /** Unix timestamp (seconds) deadline */
  deadline: z.number().int().positive().optional(),

  /** Preferred DEX venue */
  preferred_dex: z.string().optional(),
}).strict();

export const systemConstraintsSchema = z.object({
  /** Prohibit unlimited ERC-20 approvals */
  no_unlimited_approval: z.boolean().default(true),

  /** Minimum ETH reserve after execution */
  min_eth_reserve: decimalString.default("0.01"),

  /** Blacklisted contract addresses */
  blocked_contracts: z.array(evmAddress).default([]),

  /** Disallowed signing / RPC methods */
  blocked_methods: z.array(z.string()).default(["personal_sign"]),
}).strict();

export const constraintsSchema = z.object({
  user: userConstraintsSchema.default({}),
  system: systemConstraintsSchema,
});

export type UserConstraints = z.infer<typeof userConstraintsSchema>;
export type SystemConstraints = z.infer<typeof systemConstraintsSchema>;
export type DatasetConstraints = z.infer<typeof constraintsSchema>;

// ---------------------------------------------------------------------------
// Expected Output (ground truth)
// ---------------------------------------------------------------------------

export const expectedTransactionSchema = z.object({
  /** Destination address */
  to: evmAddress,

  /** Calldata hex string */
  data: hexString,

  /** Native value in wei (decimal string) */
  value: decimalString,

  /** Suggested gas limit */
  gas_limit: uintString.optional(),

  /** Human-readable description */
  description: z.string(),
});

export const expectedOutputSchema = z.object({
  /** Whether the agent should find a valid solution */
  success: z.boolean(),

  /** Ordered transaction sequence */
  transactions: z.array(expectedTransactionSchema),

  /** Short human-readable summary */
  summary: z.string(),

  /** Present when success is false */
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type ExpectedTransaction = z.infer<typeof expectedTransactionSchema>;
export type ExpectedOutput = z.infer<typeof expectedOutputSchema>;

// ---------------------------------------------------------------------------
// Dataset Sample (top-level JSONL record)
// ---------------------------------------------------------------------------

export const datasetSampleSchema = z.object({
  /** Unique sample identifier */
  id: z.string().min(1),

  /** Natural-language user intent */
  query: z.string().min(1),

  /** Context for the sample */
  metadata: metadataSchema,

  /** User + system constraints */
  constraints: constraintsSchema,

  /** Ground truth output (optional — existing data may not have it yet) */
  expected_output: expectedOutputSchema.optional(),
});

export type DatasetSample = z.infer<typeof datasetSampleSchema>;
