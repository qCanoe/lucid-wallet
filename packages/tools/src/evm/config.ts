import { Interface, JsonRpcProvider, getAddress, isAddress } from "ethers";

// Native token placeholder for 1inch API
const NATIVE_TOKEN_PLACEHOLDER = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Singleton instances
let provider: JsonRpcProvider | null = null;
let erc20Interface: Interface | null = null;

export type DexConfig = {
  baseUrl: string;
  apiKey?: string;
  chainId: number;
};

// Check if stub mode should be used (for tests or explicit override)
export const useStubs = (): boolean =>
  process.env.NODE_ENV === "test" || process.env.LUCIDWALLET_USE_STUBS === "true";

export const getRpcUrl = (): string => {
  const url = process.env.LUCIDWALLET_EVM_RPC_URL;
  if (!url) {
    throw new Error("rpc_url_not_configured");
  }
  return url;
};

// Get or create singleton RPC provider
export const getProvider = (): JsonRpcProvider => {
  if (!provider) {
    provider = new JsonRpcProvider(getRpcUrl());
  }
  return provider;
};

export const getChainId = (): number => {
  const raw = process.env.LUCIDWALLET_EVM_CHAIN_ID;
  if (!raw) {
    throw new Error("chain_id_not_configured");
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error("chain_id_invalid");
  }
  return parsed;
};

export const getDexConfig = (): DexConfig => {
  const baseUrl =
    process.env.LUCIDWALLET_EVM_DEX_BASE_URL ?? "https://api.1inch.dev/swap/v6.0";
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey: process.env.LUCIDWALLET_EVM_DEX_API_KEY,
    chainId: getChainId()
  };
};

// Resolve token symbol to contract address via env vars or return address if already valid
export const resolveTokenAddress = (asset: string): string => {
  const trimmed = asset.trim();
  if (trimmed.length === 0) {
    throw new Error("token_symbol_empty");
  }
  // Return as-is if already a valid address
  if (trimmed.startsWith("0x") && isAddress(trimmed)) {
    return getAddress(trimmed);
  }
  const symbol = trimmed.toUpperCase();
  // ETH uses native token placeholder
  if (symbol === "ETH") {
    return NATIVE_TOKEN_PLACEHOLDER;
  }
  // Try env var LUCIDWALLET_EVM_TOKEN_<SYMBOL>
  const envKey = `LUCIDWALLET_EVM_TOKEN_${symbol}`;
  const envValue = process.env[envKey];
  if (envValue && isAddress(envValue)) {
    return getAddress(envValue);
  }
  // Fallback to USDC-specific env var
  if (symbol === "USDC" && process.env.LUCIDWALLET_EVM_USDC_ADDRESS) {
    const usdc = process.env.LUCIDWALLET_EVM_USDC_ADDRESS;
    if (usdc && isAddress(usdc)) {
      return getAddress(usdc);
    }
  }
  throw new Error(`token_address_not_configured:${symbol}`);
};

// Get singleton ERC20 interface for balanceOf and allowance calls
export const getErc20Interface = (): Interface => {
  if (!erc20Interface) {
    erc20Interface = new Interface([
      "function balanceOf(address) view returns (uint256)",
      "function allowance(address,address) view returns (uint256)"
    ]);
  }
  return erc20Interface;
};
