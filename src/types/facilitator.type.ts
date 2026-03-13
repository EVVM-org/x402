import type {
  HexString,
  IPayData,
  ISerializableSignedAction,
} from "@evvm/evvm-js";

export interface IFacilitator {
  verifyPaySignature(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<boolean>;

  settlePayment(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<HexString | null>;
}
