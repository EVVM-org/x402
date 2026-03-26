import { type SettleResponse } from "@x402/core/types";
import { type PaymentRequirementsV2 } from "@x402/core/schemas";

/**
 * Creates the 402 payment required response, with headers, amounts and
 * everything else needed, returns the actual response (this should go directly to
 * the user)
 */
export const paymentRequiredResponse = (
  offers: PaymentRequirementsV2[],
): Response => {
  const jsonString = JSON.stringify({ offers });
  const base64Payload = Buffer.from(jsonString).toString("base64");

  const headers = new Headers();
  headers.set("PAYMENT-REQUIRED", base64Payload);
  headers.set("Access-Control-Expose-Headers", "PAYMENT-REQUIRED");
  headers.set("Content-Type", "application/json");
  headers.set("connection", "keep-alive");

  return new Response("Payment Required", { headers, status: 402 });
};

/**
 * Returned when an invalid response is received
 */
export const invalidPaymentResponse = (reason: string): Response => {
  const settleResponse: SettleResponse = {
    success: false,
    errorMessage: "Invalid Payment",
    errorReason: reason,
    transaction: "",
    network: ":",
  };

  const jsonString = JSON.stringify(settleResponse);
  const base64Payload = Buffer.from(jsonString).toString("base64");

  const headers = new Headers();
  headers.set("PAYMENT-RESPONSE", base64Payload);

  return new Response(`Payment Invalid: ${reason}`, { status: 400, headers });
};

// export const successfulPaymentResponse = (
//   txHash: HexString,
//   payload: IPaymentPayload,
// ) => {
//   const settleResponse: SettleResponse = {
//     success: true,
//     payer: payload.payload.data.from,
//     transaction: txHash,
//     network: payload.accepted.network as "${string}:${string}",
//   };
//
//   const jsonString = JSON.stringify(settleResponse);
//   const base64Payload = Buffer.from(jsonString).toString("base64");
//   const headers = new Headers();
//   headers.set("PAYMENT-REQUIRED", base64Payload);
//
//   return new Response("Payment Required", { headers, status: 402 });
// };
