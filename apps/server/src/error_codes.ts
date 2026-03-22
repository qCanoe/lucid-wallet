import { ERROR_CODES } from "@lucidwallet/shared";

export const mapErrorCode = (message: string): string => {
  const n = message.toLowerCase();
  if (n.includes("insufficient_balance") || n.includes("balance")) return ERROR_CODES.INSUFFICIENT_BALANCE;
  if (n.includes("insufficient_allowance") || n.includes("allowance")) return ERROR_CODES.INSUFFICIENT_ALLOWANCE;
  if (n.includes("slippage")) return ERROR_CODES.SLIPPAGE_TOO_HIGH;
  if (n.includes("nonce")) return ERROR_CODES.NONCE_CONFLICT;
  if (n.includes("timeout") || n.includes("timedout")) return ERROR_CODES.TIMEOUT;
  if (n.includes("network") || n.includes("econnrefused") || n.includes("fetch")) return ERROR_CODES.NETWORK_ERROR;
  return ERROR_CODES.REVERT;
};
