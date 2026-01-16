import { MvpIntent, mvpIntentSchema } from "@lucidwallet/core";

export const parseIntent = (raw: string): MvpIntent => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    throw new Error(`intent_parse_failed:${message}`);
  }

  return mvpIntentSchema.parse(parsed);
};
