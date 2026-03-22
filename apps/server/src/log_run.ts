import fs from "node:fs/promises";
import path from "node:path";

export type LogRunPayload = {
  intent?: unknown;
  plan?: unknown;
  results?: unknown;
  error?: unknown;
};

export const logRun = async (payload: LogRunPayload): Promise<string> => {
  const logsDir = path.join(process.cwd(), "experiments", "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const timestamp = Date.now();
  const logFile = path.join(logsDir, `run_${timestamp}.json`);
  await fs.writeFile(logFile, JSON.stringify({ timestamp, ...payload }, null, 2), "utf8");
  return logFile;
};
