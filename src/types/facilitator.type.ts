import type {
  HexString,
  IPayData,
  ISerializableSignedAction,
} from "@evvm/evvm-js";

export interface IFacilitator {
  verifyPaySignature(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<{ success: boolean; error?: string }>;

  settlePayment(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<HexString | null>;
}
