export class TxQueue {
  private nonce = 0;
  private pending: string[] = [];
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  nextNonce(): number {
    return this.nonce++;
  }

  enqueue(txId: string): boolean {
    if (this.pending.length >= this.maxConcurrent) return false;
    this.pending.push(txId);
    return true;
  }

  dequeue(): string | undefined {
    return this.pending.shift();
  }

  pendingCount(): number {
    return this.pending.length;
  }

  reset(): void {
    this.nonce = 0;
    this.pending = [];
  }
}
