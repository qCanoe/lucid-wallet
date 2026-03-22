import { describe, expect, it, beforeEach } from "vitest";
import { SecureStorage } from "..";

describe("SecureStorage", () => {
  let storage: SecureStorage;

  beforeEach(() => {
    storage = new SecureStorage();
  });

  it("set and get round-trips a value", () => {
    storage.set("key1", "value1");
    expect(storage.get("key1")).toBe("value1");
  });

  it("get returns undefined for a missing key", () => {
    expect(storage.get("nonexistent")).toBeUndefined();
  });

  it("set overwrites an existing key", () => {
    storage.set("key1", "first");
    storage.set("key1", "second");
    expect(storage.get("key1")).toBe("second");
  });

  it("multiple keys are stored independently", () => {
    storage.set("a", "alpha");
    storage.set("b", "beta");
    storage.set("c", "gamma");
    expect(storage.get("a")).toBe("alpha");
    expect(storage.get("b")).toBe("beta");
    expect(storage.get("c")).toBe("gamma");
  });
});
