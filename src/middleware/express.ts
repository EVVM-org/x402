import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { IEvvmSchema, IFacilitator } from "../types";
import {
  invalidPaymentResponse,
  parseHeader,
  paymentRequiredResponse,
} from "../lib";
import {
  getSerializableSignedActionSchema,
  PayDataSchema,
} from "@evvm/evvm-js";
import type { SettleResponse } from "@x402/core/types";

/**
 * This is used to parse Web API Response objects to express compatible
 * responses
 */
const handleWebResponse = async (res: ExpressResponse, webRes: Response) => {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await webRes.text();
  res.send(body);
};

/**
 * ExpressJS middleware that expects EVVM payments
 */
export const requireEvvmPaymentExpress =
  (facilitator: IFacilitator, offers: IEvvmSchema[]) =>
  async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // assert payment is present
    const paymentHeader = req.header("PAYMENT-SIGNATURE");
    // if not present, return payment required
    if (!paymentHeader)
      return handleWebResponse(res, paymentRequiredResponse(offers));

    // if present, parse and validate it
    const parsed = parseHeader(paymentHeader);
    if (!parsed) {
      return handleWebResponse(res, invalidPaymentResponse("Invalid payment"));
    }

    const { success, data: signedAction } = getSerializableSignedActionSchema(
      PayDataSchema,
    ).safeParse(parsed.payload);

    if (!success) {
      return handleWebResponse(
        res,
        invalidPaymentResponse("Not an evvm payment"),
      );
    }

    // verify it
    const verifyResult = await facilitator.verifyPaySignature(signedAction);
    if (!verifyResult.success) {
      return handleWebResponse(
        res,
        invalidPaymentResponse(verifyResult.error || "Invalid signature"),
      );
    }

    // settle it
    const txHash = await facilitator.settlePayment(signedAction);

    if (!txHash) {
      return handleWebResponse(
        res,
        invalidPaymentResponse("Settlement failed"),
      );
    }

    const settleResponse: SettleResponse = {
      success: true,
      payer: signedAction.data.from,
      transaction: txHash,
      network: parsed.accepted.network as `${string}:${string}`,
    };

    const jsonString = JSON.stringify(settleResponse);
    const base64Payload = Buffer.from(jsonString).toString("base64");

    res.setHeader("PAYMENT-RESPONSE", base64Payload);

    next();
  };
