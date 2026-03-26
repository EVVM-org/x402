import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { IEvvmSchema, IFacilitator } from "../types";
import { invalidPaymentResponse, paymentRequiredResponse } from "../lib";
import {
  getSerializableSignedActionSchema,
  PayDataSchema,
} from "@evvm/evvm-js";
import type { SettleResponse } from "@x402/core/types";
import {
  PaymentPayloadV2Schema,
  type PaymentPayloadV2,
} from "@x402/core/schemas";

const parseHeaderEdge = (
  paymentSignatureHeader: string,
): PaymentPayloadV2 | null => {
  const decodedString = atob(paymentSignatureHeader);

  let payload = null;
  try {
    payload = PaymentPayloadV2Schema.parse(JSON.parse(decodedString));
  } catch (error) {
    console.error("Failed to parse payment payload");
    console.error(error);
    return null;
  }

  return payload;
};

/**
 * Creates a payment required middleware for nextjs
 */
export const createEvvmMiddlewareNext =
  (facilitator: IFacilitator, offers: IEvvmSchema[]) =>
  async (req: NextRequest) => {
    const paymentHeader = req.headers.get("PAYMENT-SIGNATURE");

    if (!paymentHeader) {
      return paymentRequiredResponse(offers);
    }

    const parsed = parseHeaderEdge(paymentHeader);
    if (!parsed) {
      return invalidPaymentResponse("Invalid payment");
    }

    const { success, data: signedAction } = getSerializableSignedActionSchema(
      PayDataSchema,
    ).safeParse(parsed.payload);

    if (!success) {
      return invalidPaymentResponse("Not an evvm payment");
    }

    const verifyResult = await facilitator.verifyPaySignature(signedAction);
    if (!verifyResult.success) {
      return invalidPaymentResponse(verifyResult.error || "Invalid signature");
    }

    const txHash = await facilitator.settlePayment(signedAction);

    if (!txHash) {
      return invalidPaymentResponse("Settlement failed");
    }

    const settleResponse: SettleResponse = {
      success: true,
      payer: signedAction.data.from,
      transaction: txHash,
      network: parsed.accepted.network as `${string}:${string}`,
    };

    const jsonString = JSON.stringify(settleResponse);
    const base64Payload = btoa(jsonString);

    // Clone the request and add the header - route handlers receive a new request
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("PAYMENT-RESPONSE", base64Payload);

    // Pass through to the route handler with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  };

export default createEvvmMiddlewareNext;
