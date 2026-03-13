import type { IPayData, ISerializableSignedAction } from "@evvm/evvm-js";
import type { IEvvmSchema } from "./evvm-schema.type";
import { type PaymentPayloadV2 } from "@x402/core/schemas";

export interface IPaymentPayload extends PaymentPayloadV2 {
  accepted: IEvvmSchema;
  // crucial, this includes everything needed to execute a pay transaction
  payload: ISerializableSignedAction<IPayData>;
}
