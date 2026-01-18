import fs from "node:fs/promises";
import path from "node:path";
import { IntentSpec, intentSpecSchema } from "@lucidwallet/core";

type SlotType = "amount" | "asset" | "address" | "chain" | "slippage";

type SlotSpec = {
  type: SlotType;
  aliases?: Record<string, string>;
};

type Template = {
  id: string;
  intent_type: "send" | "swap";
  language?: "zh" | "en" | "any";
  patterns: string[];
  slots: Record<string, SlotSpec>;
  mapping: Record<string, string>;
  defaults?: Record<string, unknown>;
  confidence?: number;
};

type TemplateFile = {
  templates: Template[];
};

export type ParseNlOptions = {
  templateFile?: string;
};

const DEFAULT_TEMPLATE_FILE = path.join(
  process.cwd(),
  "datasets",
  "nl",
  "templates",
  "send_swap.json"
);

let cachedTemplates: Template[] | null = null;
let cachedTemplateFile: string | null = null;

const getOpenAiConfig = (): { apiKey: string; model: string } | null => {
  const apiKey = process.env.LUCIDWALLET_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const model = process.env.LUCIDWALLET_OPENAI_MODEL ?? "gpt-5.2";
  return { apiKey, model };
};

const assertTemplateFile = (raw: unknown): TemplateFile => {
  if (!raw || typeof raw !== "object") {
    throw new Error("nl_template_invalid:root_not_object");
  }
  const data = raw as { templates?: unknown };
  if (!Array.isArray(data.templates)) {
    throw new Error("nl_template_invalid:missing_templates");
  }
  const templates = data.templates.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`nl_template_invalid:template_${index}_not_object`);
    }
    const template = entry as Template;
    if (!template.id || typeof template.id !== "string") {
      throw new Error(`nl_template_invalid:template_${index}_id`);
    }
    if (template.intent_type !== "send" && template.intent_type !== "swap") {
      throw new Error(`nl_template_invalid:template_${index}_intent_type`);
    }
    if (!Array.isArray(template.patterns) || template.patterns.length === 0) {
      throw new Error(`nl_template_invalid:template_${index}_patterns`);
    }
    if (!template.slots || typeof template.slots !== "object") {
      throw new Error(`nl_template_invalid:template_${index}_slots`);
    }
    if (!template.mapping || typeof template.mapping !== "object") {
      throw new Error(`nl_template_invalid:template_${index}_mapping`);
    }
    return template;
  });
  return { templates };
};

const loadTemplates = async (filePath = DEFAULT_TEMPLATE_FILE): Promise<Template[]> => {
  if (cachedTemplates && cachedTemplateFile === filePath) {
    return cachedTemplates;
  }
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const { templates } = assertTemplateFile(parsed);
  cachedTemplates = templates;
  cachedTemplateFile = filePath;
  return templates;
};

const normalizeText = (raw: string): string => {
  return raw
    .trim()
    .replace(/[，、]/g, " ")
    .replace(/[。！？!?\u3002]+$/g, "")
    .replace(/\s+/g, " ");
};

const CHAIN_ALIASES: Record<string, string> = {
  eth: "evm",
  ethereum: "evm",
  evm: "evm",
  mainnet: "evm",
  sepolia: "sepolia",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  polygon: "polygon",
  matic: "polygon"
};

const ASSET_ALIASES: Record<string, string> = {
  eth: "ETH",
  ether: "ETH",
  usdc: "USDC",
  usdt: "USDT",
  dai: "DAI"
};

const resolveAlias = (raw: string, aliases?: Record<string, string>): string => {
  const key = raw.trim().toLowerCase();
  if (aliases && aliases[key]) {
    return aliases[key];
  }
  if (ASSET_ALIASES[key]) {
    return ASSET_ALIASES[key];
  }
  if (CHAIN_ALIASES[key]) {
    return CHAIN_ALIASES[key];
  }
  return raw;
};

const slotRegexFor = (slotName: string, slotSpec: SlotSpec): string => {
  switch (slotSpec.type) {
    case "amount":
      return `(?<${slotName}>[0-9]+(?:\\.[0-9]+)?)`;
    case "asset":
      return `(?<${slotName}>[A-Za-z0-9]+)`;
    case "address":
      return `(?<${slotName}>0x[a-fA-F0-9]{40})`;
    case "chain":
      return `(?<${slotName}>[A-Za-z0-9_-]+)`;
    case "slippage":
      return `(?<${slotName}>[0-9]+(?:\\.[0-9]+)?%?)`;
    default:
      return `(?<${slotName}>.+)`;
  }
};

const escapeRegex = (raw: string): string =>
  raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compilePattern = (pattern: string, slots: Record<string, SlotSpec>): RegExp => {
  let output = "";
  let cursor = 0;
  const matcher = /{([a-zA-Z0-9_]+)}/g;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(pattern))) {
    output += escapeRegex(pattern.slice(cursor, match.index));
    const slotName = match[1];
    const slotSpec = slots[slotName];
    if (!slotSpec) {
      throw new Error(`nl_template_invalid:slot_not_defined:${slotName}`);
    }
    output += `\\s*${slotRegexFor(slotName, slotSpec)}\\s*`;
    cursor = match.index + match[0].length;
  }
  output += escapeRegex(pattern.slice(cursor));
  output = output.replace(/\s+/g, "\\s+");
  return new RegExp(`^\\s*${output}\\s*[.!?。！？]*$`, "i");
};

const normalizeSlotValue = (spec: SlotSpec, rawValue: string): string | number => {
  const resolved = resolveAlias(rawValue, spec.aliases);
  switch (spec.type) {
    case "amount":
      return resolved.replace(/,/g, "");
    case "asset":
      return resolved.toUpperCase();
    case "address":
      return resolved.toLowerCase();
    case "chain": {
      const normalized = resolved.trim().toLowerCase();
      return CHAIN_ALIASES[normalized] ?? normalized;
    }
    case "slippage": {
      const trimmed = resolved.replace(/%/g, "");
      const value = Number.parseFloat(trimmed);
      if (!Number.isFinite(value)) {
        throw new Error("intent_parse_failed:invalid_slippage");
      }
      return value;
    }
    default:
      return resolved;
  }
};

const setPath = (target: Record<string, unknown>, key: string, value: unknown): void => {
  const parts = key.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== "object") {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
};

const parseWithOpenAi = async (input: string): Promise<IntentSpec> => {
  const config = getOpenAiConfig();
  if (!config) {
    throw new Error("nlp_not_configured");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "你是钱包意图解析器。把用户自然语言转换成 IntentSpec JSON。只输出 JSON，不要解释。"
        },
        {
          role: "user",
          content: input
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "IntentSpec",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              action_type: {
                type: "string",
                enum: [
                  "send",
                  "swap",
                  "approve",
                  "revoke",
                  "deposit",
                  "stake",
                  "withdraw",
                  "unstake",
                  "batch",
                  "rebalance",
                  "schedule"
                ]
              },
              chain: { type: "string" },
              asset_in: { type: "string" },
              asset_out: { type: "string" },
              amount: { type: "string" },
              constraints: {
                type: "object",
                additionalProperties: false,
                properties: {
                  slippage: { type: "number" },
                  deadline: { type: "number" }
                }
              },
              target_protocol: { type: "string" },
              recipient: { type: "string" }
            },
            required: ["action_type", "chain", "amount"]
          }
        }
      }
    })
  });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`nlp_failed:${response.status}:${payload}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("nlp_failed:empty_response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    throw new Error(`nlp_failed:invalid_json:${message}`);
  }
  return intentSpecSchema.parse(parsed);
};

const resolveMappingValue = (
  templateValue: string,
  slots: Record<string, string | number>
): string | number | undefined => {
  const placeholder = templateValue.match(/^{([a-zA-Z0-9_]+)}$/);
  if (placeholder) {
    return slots[placeholder[1]];
  }
  return templateValue;
};

const buildIntentFromTemplate = (
  template: Template,
  slots: Record<string, string | number>
): IntentSpec => {
  const output: Record<string, unknown> = { ...(template.defaults ?? {}) };
  for (const [key, value] of Object.entries(template.mapping)) {
    const resolved = resolveMappingValue(value, slots);
    if (resolved === undefined) {
      continue;
    }
    setPath(output, key, resolved);
  }
  return intentSpecSchema.parse(output);
};

export const parseNaturalLanguageIntent = async (
  raw: string,
  options: ParseNlOptions = {}
): Promise<IntentSpec> => {
  const text = normalizeText(raw);
  if (!text) {
    throw new Error("intent_parse_failed:empty_input");
  }
  const config = getOpenAiConfig();
  if (config) {
    try {
      return await parseWithOpenAi(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      if (!message.startsWith("nlp_not_configured")) {
        // Fall back to template matching when LLM fails.
        // eslint-disable-next-line no-empty
      }
    }
  }

  const templates = await loadTemplates(options.templateFile);
  let bestIntent: IntentSpec | null = null;
  let bestScore = -1;

  for (const template of templates) {
    for (const pattern of template.patterns) {
      const regex = compilePattern(pattern, template.slots);
      const match = regex.exec(text);
      if (!match) {
        continue;
      }
      const groups = match.groups ?? {};
      const slotValues: Record<string, string | number> = {};
      for (const [slotName, slotSpec] of Object.entries(template.slots)) {
        const rawValue = groups[slotName];
        if (!rawValue) {
          continue;
        }
        slotValues[slotName] = normalizeSlotValue(slotSpec, rawValue);
      }
      const intent = buildIntentFromTemplate(template, slotValues);
      const slotCount = Object.keys(template.slots).length;
      const matchedCount = Object.keys(slotValues).length;
      const score =
        (template.confidence ?? 0.6) + (slotCount > 0 ? matchedCount / slotCount : 0);
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    }
  }

  if (!bestIntent) {
    throw new Error("intent_parse_failed:template_not_matched");
  }

  return bestIntent;
};
