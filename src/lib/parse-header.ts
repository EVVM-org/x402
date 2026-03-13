import {
  PaymentPayloadV2Schema,
  type PaymentPayloadV2,
} from "@x402/core/schemas";

/**
 * Parses the PAYMENT-SIGNATURE header into PaymentPayloadV2 from x402/core
 * @returns PaymentPayloadV2 if it's a valid payload, null otherwise
 */
export const parseHeader = (
  paymentSignatureHeader: string,
): PaymentPayloadV2 | null => {
  // decode header (it's a base64 encoded string)
  const decodedString = Buffer.from(paymentSignatureHeader, "base64").toString(
    "utf-8",
  );

  // assert it has the correct schema
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
