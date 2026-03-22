import http from "node:http";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

// Suppress auto-start before importing the handler
process.env.LUCIDWALLET_HTTP_NO_AUTOSTART = "true";
process.env.LUCIDWALLET_USE_STUBS = "true";

const { handler } = await import("../http.js");

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

const post = async (path: string, body: unknown): Promise<{ status: number; json: unknown }> => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(path, baseUrl);
    const req = http.request(
      { hostname: url.hostname, port: Number(url.port), path: url.pathname, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode ?? 0, json: JSON.parse(text) });
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const options = async (path: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      { hostname: url.hostname, port: Number(url.port), path: url.pathname, method: "OPTIONS" },
      (res) => resolve(res.statusCode ?? 0)
    );
    req.on("error", reject);
    req.end();
  });
};

describe("HTTP API", () => {
  it("OPTIONS /api/plan → 204", async () => {
    const status = await options("/api/plan");
    expect(status).toBe(204);
  });

  it("POST /api/plan with valid NL text → 200 with plan", async () => {
    const { status, json } = await post("/api/plan", {
      text: "swap 100 USDC to ETH with slippage 0.5%"
    });
    const body = json as { ok: boolean; data?: { plan?: unknown }; error?: { message: string } };
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.plan).toBeDefined();
  });

  it("POST /api/execute with valid NL text → 200 with results", async () => {
    const { status, json } = await post("/api/execute", {
      text: "swap 50 USDC to ETH with slippage 1%"
    });
    expect(status).toBe(200);
    const body = json as { ok: boolean; data?: { results?: unknown[] } };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data?.results)).toBe(true);
  });

  it("POST /api/plan with missing text → 400", async () => {
    const { status, json } = await post("/api/plan", { other: "field" });
    expect(status).toBe(400);
    const body = json as { ok: boolean; error?: { message: string } };
    expect(body.ok).toBe(false);
    expect(body.error?.message).toBe("missing_text");
  });

  it("POST /api/plan with empty text → 400", async () => {
    const { status, json } = await post("/api/plan", { text: "   " });
    expect(status).toBe(400);
    const body = json as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it("POST /api/unknown → 404", async () => {
    const { status, json } = await post("/api/unknown", { text: "anything" });
    expect(status).toBe(404);
    const body = json as { ok: boolean };
    expect(body.ok).toBe(false);
  });
});
