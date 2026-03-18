import {
  Core,
  execute,
  getSerializableSignedActionSchema,
  PayDataSchema,
  type HexString,
  type IPayData,
  type ISerializableSignedAction,
  type ISigner,
} from "@evvm/evvm-js";
import { recoverMessageAddress } from "viem";
import type { IFacilitator } from "../types";

export class LocalFacilitator implements IFacilitator {
  constructor(public signer: ISigner) {}

  /**
   * Reconstructs the signed message and recovers the signer from the signature provided
   * to validate it. Asserts the nonce provided is valid.
   * @returns true if the recovered address match signedAction.data.from; false otherwise
   */
  async verifyPaySignature(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<boolean> {
    if (signedAction.functionName !== "pay")
      throw new Error("verifyPaySignature can only verify core.pay signatures");

    const { success, error } =
      getSerializableSignedActionSchema(PayDataSchema).safeParse(signedAction);

    if (!success)
      throw new Error(
        `The provided signedAction is not valid: ${error.message}`,
      );

    const core = new Core({
      address: signedAction.contractAddress as HexString,
      signer: this.signer,
      chainId: signedAction.chainId,
    });
    // replicate signed message
    const evvmId = await core.getEvvmID();
    const hashPayload = core.buildHashPayload(signedAction.functionName, {
      to_address: signedAction.data.to_address,
      to_identity: signedAction.data.to_identity,
      token: signedAction.data.token,
      amount: signedAction.data.amount,
      priorityFee: signedAction.data.priorityFee,
    });

    const message = core.buildMessageToSign(
      evvmId,
      signedAction.data.senderExecutor,
      hashPayload,
      signedAction.data.originExecutor,
      signedAction.data.nonce,
      signedAction.data.isAsyncExec,
    );

    // recover signer of the message
    const address = await recoverMessageAddress({
      message,
      signature: signedAction.data.signature as HexString,
    });

    if (address !== signedAction.data.from) {
      console.error("Couldn't recover address from signature");
      return false;
    }

    // verify nonces are ok
    if (signedAction.data.isAsyncExec) {
      // async execution, assert nonce hasn't been used before
      const used = await core.getIfUsedAsyncNonce(signedAction.data.nonce);
      if (used) {
        console.error("Invalid async nonce");
        return false;
      }
    } else {
      const nextExpectedNonce = await core.getNextCurrentSyncNonce();
      if (nextExpectedNonce.toString() != signedAction.data.nonce.toString()) {
        console.error("Invalid sync nonce");
        return false;
      }
    }

    // assert balances
    const balance = await core.getBalance(
      signedAction.data.from,
      signedAction.data.token,
    );
    if (balance <= signedAction.data.amount) {
      console.error("Insufficient balance");
      return false;
    }

    return true;
  }

  /**
   * Executes the evvm transaction.
   * @returns tx hash
   */
  async settlePayment(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<HexString | null> {
    try {
      const txHash = await execute(this.signer, signedAction);
      return txHash;
    } catch (error) {
      console.error("Failed to settle payment");
      console.error(error);
      return null;
    }
  }
}
