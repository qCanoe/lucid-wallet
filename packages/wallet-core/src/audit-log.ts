export type AuditEntry = {
  event: string;
  payload: Record<string, unknown>;
  timestamp: number;
};

export class AuditLog {
  private entries: AuditEntry[] = [];

  record(event: string, payload: Record<string, unknown>): void {
    this.entries.push({ event, payload, timestamp: Date.now() });
  }

  list(): AuditEntry[] {
    return this.entries;
  }
}
