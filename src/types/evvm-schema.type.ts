import { type HexString } from "@evvm/evvm-js";
import { type PaymentRequirements } from "@x402/core/types";

export interface IEvvmSchema extends PaymentRequirements {
  scheme: "evvm";
  network: `eip155:${number}`;
  amount: string;
  asset: HexString;
  payTo: string;
  maxTimeoutSeconds: number;
  /**
   * Custom metadata for successful evvm signature construction
   */
  extra: {
    coreContractAddress: HexString;
    evvmId?: number;
    originExecutor?: HexString;
  };
}
