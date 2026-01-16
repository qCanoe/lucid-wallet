import { z } from "zod";

export const mvpIntentSchema = z.object({
  action: z.enum(["send"]),
  chain: z.string(),
  asset: z.string(),
  amount: z.string(),
  to: z.string()
});

export type MvpIntent = z.infer<typeof mvpIntentSchema>;
