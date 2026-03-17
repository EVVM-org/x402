# @evvm/x402

A TypeScript library for integrating [EVVM](https://evvm.org) payments into Node.js applications. This package provides middleware for Express.js and Next.js, along with facilitator utilities for handling payment verification and settlement.

## Installation

```bash
npm install @evvm/x402 @evvm/evvm-js
```

or with bun:

```bash
bun add @evvm/x402 @evvm/evvm-js
```

## Setup

Create the facilitator once in a separate file and import it wherever needed:

```typescript
// src/facilitator.ts
import { LocalFacilitator } from "@evvm/x402";
import { createSignerWithEthers } from "@evvm/evvm-js";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const signer = await createSignerWithEthers(wallet);

export const facilitator = new LocalFacilitator(signer);
```

```typescript
// src/offers.ts
import { IEvvmSchema } from "@evvm/x402";

export const offers: IEvvmSchema[] = [
  {
    scheme: "evvm",
    network: "eip155:11155111",
    amount: "1000000000000000",
    asset: "0x0000000000000000000000000000000000000000",
    payTo: "0xReceiverAccount",
    maxTimeoutSeconds: 300,
    extra: {
      coreContractAddress: "0xYourCoreContractAddress",
      evvmId: 1,
    },
  },
];
```

## Middlewares

### Express.js

The Express middleware validates incoming payment headers and settles payments before passing requests to your route handlers.

```typescript
import { requireEvvmPaymentExpress } from "@evvm/x402";
import { facilitator } from "./facilitator";
import { offers } from "./offers";

const app = express();

app.get(
  "/api/secure",
  requireEvvmPaymentExpress(facilitator, offers),
  (req, res) => {
    // Payment was verified and settled
    res.json({ data: "Access granted" });
  },
);
```

#### How it works:

1. **Check for Payment Header**: Looks for `PAYMENT-SIGNATURE` header
2. **Return 402 if Missing**: If not present, returns HTTP 402 with payment requirements
3. **Parse & Validate**: Parses the payment payload and validates the EVVM schema
4. **Verify Signature**: Uses the facilitator to verify the payment signature on-chain
5. **Settle Payment**: Executes the payment transaction
6. **Pass to Handler**: Adds `PAYMENT-RESPONSE` header and continues to your route

### Next.js

The Next.js middleware works with Next.js 15+ App Router:

```typescript
// middleware.ts
import { createEvvmMiddlewareNext } from "@evvm/x402";
import { facilitator } from "./facilitator";
import { offers } from "./offers";

export default createEvvmMiddlewareNext(facilitator, offers);

export const config = {
  matcher: "/api/:path*",
};
```

## Facilitators

Facilitators handle payment verification and settlement. The package includes a built-in `LocalFacilitator` (for local verification and execution of transactions). You can also implement custom facilitators by using the `IFacilitator`; this is useful for cases where the facilitator lives in a different service or location.

### LocalFacilitator

The `LocalFacilitator` verifies signatures and settles payments using a local signer.

#### Features:

- **Signature Verification**: Recovers the signer from the signature and validates it matches the payer
- **Nonce Validation**: Ensures the transaction nonce is correct (for both sync and async executions)
- **Balance Checks**: Verifies the payer has sufficient balance
- **Payment Settlement**: Executes the EVVM payment transaction

### Custom Facilitator

Implement the `IFacilitator` interface for custom payment handling:

```typescript
import type { IFacilitator } from "@evvm/x402";
import type {
  ISerializableSignedAction,
  IPayData,
  HexString,
} from "@evvm/evvm-js";

class CustomFacilitator implements IFacilitator {
  async verifyPaySignature(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<boolean> {
    // Custom verification logic
    return true;
  }

  async settlePayment(
    signedAction: ISerializableSignedAction<IPayData>,
  ): Promise<HexString | null> {
    // Custom settlement logic
    return "0xTransactionHash";
  }
}
```

## Payment Offers

Define payment requirements using the `IEvvmSchema` interface. Create an `offers` file and import it wherever needed (see [Setup](#setup) for the full example):

```typescript
import { IEvvmSchema } from "@evvm/x402";

export const offers: IEvvmSchema[] = [
  {
    scheme: "evvm",
    network: "eip155:1", // Ethereum mainnet
    amount: "1000000000000000", // 0.001 ETH in wei
    asset: "0x0000...", // Token address (ETH = zeros)
    payTo: "0xRecipientAddress", // Payment recipient
    maxTimeoutSeconds: 300, // Max payment timeout
    extra: {
      coreContractAddress: "0xCoreContract",
      evvmId: 1, // EVVM identifier
      originExecutor: "0xExecutor", // Optional executor
    },
  },
];
```

## Response Headers

The middleware adds the following headers:

| Header              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `PAYMENT-REQUIRED`  | Base64-encoded payment requirements (402 response) |
| `PAYMENT-RESPONSE`  | Base64-encoded settlement result                   |
| `PAYMENT-SIGNATURE` | Client-provided payment signature                  |

## API Reference

### Middlewares

- `requireEvvmPaymentExpress(facilitator, offers)` - Express.js middleware
- `createEvvmMiddlewareNext(facilitator, offers)` - Next.js middleware factory

### Utilities

- `parseHeader(header)` - Parse PAYMENT-SIGNATURE header
- `paymentRequiredResponse(offers)` - Create 402 response
- `invalidPaymentResponse(reason)` - Create 400 response for invalid payments

### Types

- `IFacilitator` - Facilitator interface
- `IEvvmSchema` - EVVM payment offer schema
- `LocalFacilitator` - Built-in local facilitator implementation

## Related Links

- [EVVM Official Site](https://evvm.org)
- [EVVM Documentation](https://evvm.info)
- [@evvm/evvm-js](https://github.com/evvm/evvm-js) - JavaScript SDK for EVVM
