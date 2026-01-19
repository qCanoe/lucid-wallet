import http from "node:http";
import { URL } from "node:url";
import { consentScopeSchema } from "@lucidwallet/core";
import { ERROR_CODES } from "@lucidwallet/shared";
import { Signer } from "@lucidwallet/wallet-core";
import { parseNaturalLanguageIntent } from "./intents/nl/parse_nl_intent.js";
import { Orchestrator } from "./orchestrator.js";

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

type PlanPayload = {
  text: string;
  templateFile?: string;
};

const mapErrorCode = (message: string): string => {
  const normalized = message.toLowerCase();
  if (normalized.includes("parse")) {
    return ERROR_CODES.REVERT;
  }
  if (normalized.includes("invalid_amount")) {
    return ERROR_CODES.REVERT;
  }
  if (normalized.includes("payload_too_large")) {
    return ERROR_CODES.REVERT;
  }
  return ERROR_CODES.REVERT;
};

const sendJson = <T>(res: http.ServerResponse, status: number, payload: ApiResponse<T>) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
};

const readJsonBody = async (req: http.IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new Error("payload_too_large");
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
};

const buildScope = (intentSpec: { chain: string; asset_in?: string; amount?: string }) => {
  const maxAmount = intentSpec.amount ?? "0";
  return consentScopeSchema.parse({
    chain: intentSpec.chain,
    spender_allowlist: ["0xSWAP_CONTRACT"],
    tokens: intentSpec.asset_in ? [intentSpec.asset_in] : [],
    max_amount: maxAmount,
    expiry: Date.now() + 60_000,
    risk_level: "low"
  });
};

const ensureStubs = () => {
  if (!process.env.LUCIDWALLET_USE_STUBS) {
    process.env.LUCIDWALLET_USE_STUBS = "true";
  }
};

const handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (req.method !== "POST" || (url.pathname !== "/api/plan" && url.pathname !== "/api/execute")) {
    sendJson(res, 404, {
      ok: false,
      error: { code: ERROR_CODES.REVERT, message: "not_found" }
    });
    return;
  }

  try {
    const body = (await readJsonBody(req)) as PlanPayload | null;
    if (!body || typeof body.text !== "string" || !body.text.trim()) {
      sendJson(res, 400, {
        ok: false,
        error: { code: ERROR_CODES.REVERT, message: "missing_text" }
      });
      return;
    }

    ensureStubs();
    const intentSpec = await parseNaturalLanguageIntent(body.text, {
      templateFile: body.templateFile
    });
    const scope = buildScope(intentSpec);
    const signer = new Signer(scope);
    const orchestrator = new Orchestrator(signer);

    if (url.pathname === "/api/plan") {
      const plan = orchestrator.plan(intentSpec);
      sendJson(res, 200, {
        ok: true,
        data: { intent_spec: intentSpec, plan, scope }
      });
      return;
    }

    const execution = await orchestrator.execute(intentSpec);
    sendJson(res, 200, {
      ok: true,
      data: { plan: execution.plan, results: execution.results, scope }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const code = mapErrorCode(message);
    sendJson(res, 500, {
      ok: false,
      error: { code, message }
    });
  }
};

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(port, () => {
  console.log(`Lucid API server running on http://localhost:${port}`);
});
