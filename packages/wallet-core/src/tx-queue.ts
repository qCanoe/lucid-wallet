export class TxQueue {
  private nonce = 0;

  nextNonce(): number {
    return this.nonce++;
  }
}
