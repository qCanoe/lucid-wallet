import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

const CLI = path.join(process.cwd(), "apps", "server", "dist", "cli.js");

describe("CLI --dry-run", () => {
  it("exits 0 and prints plan JSON without executing", async () => {
    const { stdout, stderr } = await execFileAsync("node", [CLI, "--dry-run"], {
      env: { ...process.env, LUCIDWALLET_USE_STUBS: "true" }
    });
    const parsed = JSON.parse(stdout);
    expect(parsed.dry_run).toBe(true);
    expect(parsed.plan).toBeDefined();
    expect(typeof parsed.plan.plan_id).toBe("string");
    expect(stderr).toBe("");
  });

  it("--dry-run with --nl produces plan without execution", async () => {
    const { stdout } = await execFileAsync(
      "node",
      [CLI, "--dry-run", "--nl", "swap 100 USDC to ETH with slippage 0.5%"],
      { env: { ...process.env, LUCIDWALLET_USE_STUBS: "true" } }
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.dry_run).toBe(true);
    expect(parsed.plan).toBeDefined();
    expect(Array.isArray(parsed.plan.steps)).toBe(true);
  });

  it("--dry-run writes no log file", async () => {
    const logsDir = path.join(process.cwd(), "experiments", "logs");
    const before = await fs.readdir(logsDir).catch(() => [] as string[]);

    await execFileAsync("node", [CLI, "--dry-run"], {
      env: { ...process.env, LUCIDWALLET_USE_STUBS: "true" }
    });

    const after = await fs.readdir(logsDir).catch(() => [] as string[]);
    expect(after.length).toBe(before.length);
  });
});
