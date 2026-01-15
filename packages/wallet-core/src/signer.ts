import { ConsentScope } from "@lucidwallet/core";

export type SignRequest = {
  chain: string;
  to: string;
  data: string;
  value?: string;
  token?: string;
  amount?: string;
  spender?: string;
};

export type SignResult = {
  signed_tx: string;
};

export class Signer {
  constructor(private readonly scope: ConsentScope) {}

  async sign(request: SignRequest): Promise<SignResult> {
    if (request.chain !== this.scope.chain) {
      throw new Error("chain_not_allowed");
    }
    if (Date.now() > this.scope.expiry) {
      throw new Error("consent_expired");
    }
    if (request.spender && !this.scope.spender_allowlist.includes(request.spender)) {
      throw new Error("spender_not_allowed");
    }
    if (request.token && !this.scope.tokens.includes(request.token)) {
      throw new Error("token_not_allowed");
    }
    if (request.amount) {
      const requested = BigInt(request.amount);
      const maxAllowed = BigInt(this.scope.max_amount);
      if (requested > maxAllowed) {
        throw new Error("amount_exceeds_scope");
      }
    }
    return { signed_tx: "0xSIGNED" };
  }
}
