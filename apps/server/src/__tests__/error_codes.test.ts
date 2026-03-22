import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@lucidwallet/shared";
import { mapErrorCode } from "../error_codes.js";

describe("mapErrorCode", () => {
  it("maps balance messages to INSUFFICIENT_BALANCE", () => {
    expect(mapErrorCode("insufficient_balance")).toBe(ERROR_CODES.INSUFFICIENT_BALANCE);
    expect(mapErrorCode("not enough balance")).toBe(ERROR_CODES.INSUFFICIENT_BALANCE);
  });

  it("maps allowance messages to INSUFFICIENT_ALLOWANCE", () => {
    expect(mapErrorCode("insufficient_allowance")).toBe(ERROR_CODES.INSUFFICIENT_ALLOWANCE);
    expect(mapErrorCode("check allowance failed")).toBe(ERROR_CODES.INSUFFICIENT_ALLOWANCE);
  });

  it("maps slippage messages to SLIPPAGE_TOO_HIGH", () => {
    expect(mapErrorCode("slippage exceeded")).toBe(ERROR_CODES.SLIPPAGE_TOO_HIGH);
  });

  it("maps nonce messages to NONCE_CONFLICT", () => {
    expect(mapErrorCode("nonce too low")).toBe(ERROR_CODES.NONCE_CONFLICT);
  });

  it("maps timeout messages to TIMEOUT", () => {
    expect(mapErrorCode("timeout occurred")).toBe(ERROR_CODES.TIMEOUT);
    expect(mapErrorCode("request timedout")).toBe(ERROR_CODES.TIMEOUT);
  });

  it("maps network messages to NETWORK_ERROR", () => {
    expect(mapErrorCode("network error")).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(mapErrorCode("ECONNREFUSED")).toBe(ERROR_CODES.NETWORK_ERROR);
    expect(mapErrorCode("fetch failed")).toBe(ERROR_CODES.NETWORK_ERROR);
  });

  it("falls back to REVERT for unknown messages", () => {
    expect(mapErrorCode("some unknown error")).toBe(ERROR_CODES.REVERT);
    expect(mapErrorCode("contract execution failed")).toBe(ERROR_CODES.REVERT);
  });
});
