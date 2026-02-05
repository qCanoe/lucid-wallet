import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  DatasetLoader,
  DatasetValidationError,
  datasetSampleSchema,
} from "../dataset/index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_SWAP_SAMPLE = {
  id: "001",
  query: "把 100 USDC 换成 ETH",
  metadata: {
    chain_id: 1,
    task_type: "swap",
    level: "medium",
    account_state: {
      address: "0x1234567890123456789012345678901234567890",
      balances: { ETH: "2.0", USDC: "1000" },
      allowances: {},
    },
  },
  constraints: {
    user: { max_slippage: "0.5%" },
    system: {
      no_unlimited_approval: true,
      min_eth_reserve: "0.01",
      blocked_contracts: [],
      blocked_methods: ["personal_sign"],
    },
  },
};

const VALID_SEND_SAMPLE = {
  id: "002",
  query: "给 0xABCDEF1234567890ABCDEF1234567890ABCDEF12 转 0.5 ETH",
  metadata: {
    chain_id: 1,
    task_type: "send",
    level: "easy",
    account_state: {
      address: "0x1234567890123456789012345678901234567890",
      balances: { ETH: "2.0", USDC: "500" },
      allowances: {},
    },
  },
  constraints: {
    user: {},
    system: {
      no_unlimited_approval: true,
      min_eth_reserve: "0.01",
      blocked_contracts: [],
      blocked_methods: ["personal_sign"],
    },
  },
};

const VALID_SAMPLE_WITH_OUTPUT = {
  ...VALID_SEND_SAMPLE,
  id: "003",
  expected_output: {
    success: true,
    transactions: [
      {
        to: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        value: "500000000000000000",
        data: "0x",
        gas_limit: "21000",
        description: "Transfer 0.5 ETH",
      },
    ],
    summary: "Send 0.5 ETH to 0xABCD...EF12.",
  },
};

function toJsonl(...objects: unknown[]): string {
  return objects.map((o) => JSON.stringify(o)).join("\n");
}

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe("datasetSampleSchema", () => {
  it("accepts a valid swap sample", () => {
    const result = datasetSampleSchema.safeParse(VALID_SWAP_SAMPLE);
    expect(result.success).toBe(true);
  });

  it("accepts a valid send sample", () => {
    const result = datasetSampleSchema.safeParse(VALID_SEND_SAMPLE);
    expect(result.success).toBe(true);
  });

  it("accepts a sample with expected_output", () => {
    const result = datasetSampleSchema.safeParse(VALID_SAMPLE_WITH_OUTPUT);
    expect(result.success).toBe(true);
  });

  it("rejects sample with missing id", () => {
    const { id, ...rest } = VALID_SWAP_SAMPLE;
    const result = datasetSampleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects sample with invalid address", () => {
    const bad = {
      ...VALID_SWAP_SAMPLE,
      metadata: {
        ...VALID_SWAP_SAMPLE.metadata,
        account_state: {
          ...VALID_SWAP_SAMPLE.metadata.account_state,
          address: "not-an-address",
        },
      },
    };
    const result = datasetSampleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid slippage format", () => {
    const bad = {
      ...VALID_SWAP_SAMPLE,
      constraints: {
        ...VALID_SWAP_SAMPLE.constraints,
        user: { max_slippage: "0.5" }, // missing %
      },
    };
    const result = datasetSampleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid task_type", () => {
    const bad = {
      ...VALID_SWAP_SAMPLE,
      metadata: { ...VALID_SWAP_SAMPLE.metadata, task_type: "bridge" },
    };
    const result = datasetSampleSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("applies system constraint defaults", () => {
    const minimal = {
      id: "d",
      query: "test",
      metadata: {
        chain_id: 1,
        task_type: "send",
        level: "easy",
        account_state: {
          address: "0x1234567890123456789012345678901234567890",
          balances: { ETH: "1" },
          allowances: {},
        },
      },
      constraints: {
        system: {},
      },
    };
    const result = datasetSampleSchema.parse(minimal);
    expect(result.constraints.system.no_unlimited_approval).toBe(true);
    expect(result.constraints.system.min_eth_reserve).toBe("0.01");
    expect(result.constraints.system.blocked_methods).toEqual([
      "personal_sign",
    ]);
  });
});

// ---------------------------------------------------------------------------
// DatasetLoader tests
// ---------------------------------------------------------------------------

describe("DatasetLoader", () => {
  let loader: DatasetLoader;

  beforeEach(() => {
    loader = new DatasetLoader();
  });

  // ---- loadString --------------------------------------------------------

  describe("loadString", () => {
    it("loads valid JSONL content", () => {
      const content = toJsonl(VALID_SWAP_SAMPLE, VALID_SEND_SAMPLE);
      loader.loadString(content);

      expect(loader.size).toBe(2);
      expect(loader.hasErrors()).toBe(false);
    });

    it("skips invalid lines in lenient mode", () => {
      const content = toJsonl(
        VALID_SWAP_SAMPLE,
        { id: "bad" }, // missing required fields
        VALID_SEND_SAMPLE
      );
      loader.loadString(content);

      expect(loader.size).toBe(2);
      expect(loader.hasErrors()).toBe(true);
      expect(loader.getErrors()).toHaveLength(1);
      expect(loader.getErrors()[0].ok).toBe(false);
    });

    it("throws in strict mode on invalid line", () => {
      const content = toJsonl(
        VALID_SWAP_SAMPLE,
        { id: "bad" }
      );

      expect(() => loader.loadString(content, { strict: true })).toThrow(
        DatasetValidationError
      );
    });

    it("handles invalid JSON gracefully", () => {
      const content = `${JSON.stringify(VALID_SWAP_SAMPLE)}\n{not json}`;
      loader.loadString(content);

      expect(loader.size).toBe(1);
      expect(loader.hasErrors()).toBe(true);
    });

    it("handles empty content", () => {
      loader.loadString("");
      expect(loader.size).toBe(0);
      expect(loader.hasErrors()).toBe(false);
    });

    it("handles blank lines", () => {
      const content = `\n${JSON.stringify(VALID_SWAP_SAMPLE)}\n\n${JSON.stringify(VALID_SEND_SAMPLE)}\n`;
      loader.loadString(content);
      expect(loader.size).toBe(2);
    });
  });

  // ---- loadObjects -------------------------------------------------------

  describe("loadObjects", () => {
    it("loads an array of valid objects", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE, VALID_SEND_SAMPLE]);
      expect(loader.size).toBe(2);
    });

    it("reports errors for invalid objects", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE, { id: "bad" }]);
      expect(loader.size).toBe(1);
      expect(loader.hasErrors()).toBe(true);
    });

    it("throws in strict mode", () => {
      expect(() =>
        loader.loadObjects([{ id: "bad" }], { strict: true })
      ).toThrow(DatasetValidationError);
    });
  });

  // ---- loadFile ----------------------------------------------------------

  describe("loadFile", () => {
    it("loads the real samples.jsonl file", async () => {
      const samplesPath = resolve(
        __dirname,
        "../../../../datasets/data/samples.jsonl"
      );
      await loader.loadFile(samplesPath);

      expect(loader.size).toBeGreaterThanOrEqual(6);
      expect(loader.hasErrors()).toBe(false);
    });
  });

  // ---- getById -----------------------------------------------------------

  describe("getById", () => {
    it("returns the correct sample", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE, VALID_SEND_SAMPLE]);
      const sample = loader.getById("001");
      expect(sample).toBeDefined();
      expect(sample!.id).toBe("001");
      expect(sample!.metadata.task_type).toBe("swap");
    });

    it("returns undefined for unknown id", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE]);
      expect(loader.getById("999")).toBeUndefined();
    });
  });

  // ---- filter ------------------------------------------------------------

  describe("filter", () => {
    beforeEach(() => {
      loader.loadObjects([
        VALID_SWAP_SAMPLE,
        VALID_SEND_SAMPLE,
        VALID_SAMPLE_WITH_OUTPUT,
      ]);
    });

    it("filters by task_type", () => {
      const swaps = loader.filter({ task_type: "swap" });
      expect(swaps).toHaveLength(1);
      expect(swaps[0].id).toBe("001");
    });

    it("filters by level", () => {
      const easy = loader.filter({ level: "easy" });
      expect(easy).toHaveLength(2); // 002 and 003
    });

    it("filters by chain_id", () => {
      const eth = loader.filter({ chain_id: 1 });
      expect(eth).toHaveLength(3);
    });

    it("filters by ids", () => {
      const result = loader.filter({ ids: ["001", "003"] });
      expect(result).toHaveLength(2);
    });

    it("combines multiple filters (AND)", () => {
      const result = loader.filter({ task_type: "send", level: "easy" });
      expect(result).toHaveLength(2);
    });

    it("returns empty array when nothing matches", () => {
      const result = loader.filter({ chain_id: 9999 });
      expect(result).toHaveLength(0);
    });
  });

  // ---- withExpectedOutput ------------------------------------------------

  describe("withExpectedOutput", () => {
    it("returns only samples with ground truth", () => {
      loader.loadObjects([
        VALID_SWAP_SAMPLE,
        VALID_SEND_SAMPLE,
        VALID_SAMPLE_WITH_OUTPUT,
      ]);
      const withOutput = loader.withExpectedOutput();
      expect(withOutput).toHaveLength(1);
      expect(withOutput[0].id).toBe("003");
    });
  });

  // ---- stats -------------------------------------------------------------

  describe("stats", () => {
    it("computes correct statistics", () => {
      loader.loadObjects([
        VALID_SWAP_SAMPLE,
        VALID_SEND_SAMPLE,
        VALID_SAMPLE_WITH_OUTPUT,
      ]);

      const s = loader.stats();
      expect(s.total).toBe(3);
      expect(s.valid).toBe(3);
      expect(s.invalid).toBe(0);
      expect(s.byTaskType).toEqual({ swap: 1, send: 2 });
      expect(s.byLevel).toEqual({ medium: 1, easy: 2 });
      expect(s.byChain).toEqual({ 1: 3 });
      expect(s.withExpectedOutput).toBe(1);
    });

    it("counts errors in stats.total and stats.invalid", () => {
      const content = toJsonl(VALID_SWAP_SAMPLE, { id: "bad" });
      loader.loadString(content);

      const s = loader.stats();
      expect(s.total).toBe(2);
      expect(s.valid).toBe(1);
      expect(s.invalid).toBe(1);
    });
  });

  // ---- clear + chaining --------------------------------------------------

  describe("clear", () => {
    it("resets all state", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE]);
      expect(loader.size).toBe(1);

      loader.clear();
      expect(loader.size).toBe(0);
      expect(loader.hasErrors()).toBe(false);
    });
  });

  describe("chaining", () => {
    it("supports method chaining", () => {
      const result = loader
        .loadString(toJsonl(VALID_SWAP_SAMPLE))
        .loadObjects([VALID_SEND_SAMPLE]);

      expect(result).toBe(loader);
      expect(loader.size).toBe(2);
    });
  });

  // ---- all() returns a copy ----------------------------------------------

  describe("all", () => {
    it("returns a defensive copy", () => {
      loader.loadObjects([VALID_SWAP_SAMPLE]);
      const a = loader.all();
      a.pop();
      expect(loader.size).toBe(1); // original unchanged
    });
  });
});
