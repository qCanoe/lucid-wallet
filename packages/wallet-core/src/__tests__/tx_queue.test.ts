import { describe, expect, it } from "vitest";
import { TxQueue } from "..";

describe("TxQueue", () => {
  it("nextNonce starts at 0 and increments", () => {
    const queue = new TxQueue();
    expect(queue.nextNonce()).toBe(0);
    expect(queue.nextNonce()).toBe(1);
    expect(queue.nextNonce()).toBe(2);
  });

  it("enqueue adds to pending and pendingCount reflects it", () => {
    const queue = new TxQueue();
    expect(queue.pendingCount()).toBe(0);
    queue.enqueue("tx_a");
    expect(queue.pendingCount()).toBe(1);
    queue.enqueue("tx_b");
    expect(queue.pendingCount()).toBe(2);
  });

  it("enqueue returns false when at maxConcurrent limit", () => {
    const queue = new TxQueue(2);
    expect(queue.enqueue("tx_a")).toBe(true);
    expect(queue.enqueue("tx_b")).toBe(true);
    expect(queue.enqueue("tx_c")).toBe(false);
    expect(queue.pendingCount()).toBe(2);
  });

  it("dequeue returns FIFO order and reduces pendingCount", () => {
    const queue = new TxQueue();
    queue.enqueue("tx_first");
    queue.enqueue("tx_second");
    expect(queue.dequeue()).toBe("tx_first");
    expect(queue.pendingCount()).toBe(1);
    expect(queue.dequeue()).toBe("tx_second");
    expect(queue.pendingCount()).toBe(0);
  });

  it("dequeue returns undefined when queue is empty", () => {
    const queue = new TxQueue();
    expect(queue.dequeue()).toBeUndefined();
  });

  it("reset clears nonce and pending queue", () => {
    const queue = new TxQueue();
    queue.nextNonce();
    queue.nextNonce();
    queue.enqueue("tx_a");
    queue.reset();
    expect(queue.nextNonce()).toBe(0);
    expect(queue.pendingCount()).toBe(0);
  });
});
