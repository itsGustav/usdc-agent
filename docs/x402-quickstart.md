# x402 Quick Start Guide

Get started with HTTP micropayments in 5 minutes.

## What is x402?

x402 enables seamless micropayments for HTTP requests using the `402 Payment Required` status code. When a server returns 402, the client automatically pays with USDC and retries the request.

**No subscriptions. No accounts. Just pay-per-use.**

## Installation

```bash
# Clone usdc-agent
git clone https://github.com/itsGustav/lobster-pay
cd usdc-agent

# Install dependencies
npm install

# Set up Circle credentials
export CIRCLE_API_KEY=your_api_key
export CIRCLE_ENTITY_SECRET=your_entity_secret
```

Get Circle credentials at: https://console.circle.com

## Client Usage (Pay for APIs)

### Basic Example

```typescript
import { CircleClient } from './lib/circle-client';
import { createX402Fetch } from './lib/x402-client';

// Initialize wallet
const wallet = new CircleClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// Create payment-enabled fetch
const x402Fetch = createX402Fetch({
  wallet,
  maxAutoPayUSDC: '1.00',  // Auto-pay up to $1
  onPayment: (amount, url) => {
    console.log(`Paid ${amount} USDC for ${url}`);
  },
});

// Use like normal fetch - payment happens automatically
const response = await x402Fetch('https://api.example.com/premium');
const data = await response.json();
```

That's it! The client will:
1. Detect 402 responses
2. Pay the requested amount
3. Retry with payment signature
4. Return the response

### Advanced Options

```typescript
const x402Fetch = createX402Fetch({
  wallet,
  walletId: 'specific-wallet-id',    // Use specific wallet
  maxAutoPayUSDC: '5.00',            // Higher auto-pay limit
  requireConfirmation: true,         // Prompt before paying
  cacheReceipts: true,               // Cache payments (default)
  
  // Hooks
  onChallenge: (challenge) => {
    console.log(`Payment required: ${challenge['x-payment-required'].amount} USDC`);
  },
  onPayment: (amount, url, txHash) => {
    console.log(`Paid ${amount} USDC | TX: ${txHash}`);
  },
  onVerified: (receipt) => {
    console.log(`Payment cached until ${new Date(receipt.expiresAt * 1000)}`);
  },
  onError: (error, url) => {
    console.error(`Failed to access ${url}:`, error.message);
  },
});
```

## Server Usage (Monetize APIs)

### Basic Paywall

```typescript
import express from 'express';
import { configureX402Server, paywall } from './lib/x402-server';

const app = express();

// Configure once
configureX402Server({
  network: 'ETH-SEPOLIA',
  receiverAddress: '0xYourWalletAddress',
});

// Add paywall to any endpoint
app.get('/api/premium',
  paywall('0.10', 'Premium API access'),
  (req, res) => {
    res.json({ data: 'premium content' });
  }
);

app.listen(3000);
```

### Dynamic Pricing

```typescript
import { dynamicPaywall } from './lib/x402-server';

// Price based on request parameters
app.get('/api/compute/:intensity',
  dynamicPaywall(
    (req) => {
      const intensity = req.params.intensity;
      return intensity === 'high' ? '0.50' : '0.10';
    },
    (req) => `Compute: ${req.params.intensity}`,
  ),
  (req, res) => {
    // Process request
  }
);
```

### Usage-Based Billing

```typescript
import { usagePaywall } from './lib/x402-server';

app.post('/api/storage',
  usagePaywall({
    basePrice: '0.05',
    perUnit: '0.01',
    unit: 'MB',
    calculate: (req) => {
      const size = JSON.stringify(req.body).length;
      return Math.ceil(size / 1024 / 1024); // MB
    },
  }),
  (req, res) => {
    // Store data
  }
);
```

### Pricing Tiers

```typescript
import { PricingTier } from './lib/x402-server';

const skillPricing = new PricingTier()
  .add('basic', '0.10')
  .add('premium', '0.50')
  .add('enterprise', '2.00');

app.post('/skills/:tier/access',
  skillPricing.middleware(
    (req) => req.params.tier,
    (req) => `Skill access: ${req.params.tier}`,
  ),
  (req, res) => {
    // Grant access
  }
);
```

## CLI Usage

The usdc-cli now supports x402 payments:

### Manual Payment

```bash
$ usdc-cli x402 pay https://api.example.com/premium

Fetching payment challenge...
💳 Payment Required: 0.10 USDC
   Description: Premium data access

Sending payment...
✅ Payment sent! TX: 0xabcd...1234

Retrying with payment signature...
✅ Success!
```

### View Payment History

```bash
$ usdc-cli x402 receipts

Recent 402 Payments:
────────────────────────────────────────
📄 0.10 USDC → api.example.com/premium
   Paid: 2025-02-04 13:45:00
   TX: 0xabcd...1234

Total: 0.10 USDC in 1 payment
```

### Auto-Pay Mode

```bash
$ usdc-cli x402 auto https://api.example.com/*

Auto-pay enabled for: https://api.example.com/*
Max amount: 1.00 USDC per request
```

## Use Cases

### 1. Agent-to-Agent Communication

Agents can charge each other for services:

```typescript
// Agent A (client)
const analysis = await x402Fetch('https://agent-b.com/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ property: '123 Main St' }),
});

// Agent B (server)
app.post('/api/analyze',
  paywall('0.25', 'Property analysis'),
  async (req, res) => {
    const { property } = req.body;
    const analysis = await analyzeProperty(property);
    res.json(analysis);
  }
);
```

### 2. Invoice Payment

Generate payment-gated invoice URLs:

```typescript
import { InvoiceManager } from './lib/invoices';

const invoiceManager = new InvoiceManager();

// Create invoice
const invoice = await invoiceManager.create({
  from: { name: 'Acme Corp', walletAddress: '0x...' },
  to: { name: 'Client', email: 'client@example.com' },
  items: [{ description: 'Consulting', quantity: 10, unitPrice: '150' }],
});

// Generate x402 payment URL
const paymentUrl = await invoiceManager.enableX402Payment(invoice.id);

// Client pays by fetching the URL
const receipt = await x402Fetch(paymentUrl);
```

### 3. Premium Escrow Features

Gate expensive operations:

```typescript
import { generateX402EscrowUrls } from './lib/escrow';

const escrow = await escrowManager.create({...});

// Generate premium feature URLs
const urls = generateX402EscrowUrls(escrow.id);

// Enable yield optimization (costs 0.25 USDC)
await x402Fetch(urls.optimize);

// Add insurance (costs 0.50 USDC)
await x402Fetch(urls.insure);
```

### 4. Contact Verification

Premium verification services:

```typescript
import { generateX402VerificationUrl } from './lib/contacts';

const contact = await contactManager.get(contactId);

// Basic verification (0.05 USDC)
const url = generateX402VerificationUrl(contact.id, 'basic');
const result = await x402Fetch(url);

// Full report with risk analysis (0.25 USDC)
const reportUrl = generateX402VerificationUrl(contact.id, 'report');
const fullReport = await x402Fetch(reportUrl);
```

## Testing

### Run Examples

```bash
# Start server example
npm run example:x402-server

# In another terminal, run client example
npm run example:x402-client
```

### Mock Verification

For testing, use mock verification instead of Coinbase facilitator:

```typescript
import { configureX402Server, mockVerification } from './lib/x402-server';

configureX402Server({
  network: 'ETH-SEPOLIA',
  receiverAddress: '0x...',
  verifyPayment: mockVerification(),  // Accept any signature
});
```

## Environment Variables

```bash
# Circle Wallet (required)
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret

# x402 Server (required for server)
X402_RECEIVER_ADDRESS=0xYourWalletAddress
X402_NETWORK=ETH-SEPOLIA

# Optional
X402_FACILITATOR=https://x402.coinbase.com
X402_BASE_URL=https://api.your-domain.com
X402_MAX_AUTO_PAY=1.00
```

## Pricing Guidelines

Recommended pricing for common operations:

| Operation | Price | Use Case |
|-----------|-------|----------|
| 0.005 USDC | Micro | Chat message, small query |
| 0.01 USDC | Tiny | Status check, basic lookup |
| 0.05 USDC | Small | Simple operation, quick task |
| 0.10 USDC | Standard | API call, data fetch |
| 0.25 USDC | Medium | Analysis, processing |
| 0.50 USDC | Large | Complex operation, premium feature |
| 1.00+ USDC | Premium | High-value service, monthly access |

Use the `PRICING` helper:

```typescript
import { PRICING } from './lib/x402-server';

app.get('/api/micro', paywall(PRICING.micro, 'Micro service'));
app.get('/api/premium', paywall(PRICING.premium, 'Premium service'));
```

## Payment Flow

```
┌─────────┐                    ┌─────────┐
│ Client  │                    │ Server  │
└────┬────┘                    └────┬────┘
     │                              │
     │  GET /premium                │
     ├─────────────────────────────>│
     │                              │
     │  402 Payment Required        │
     │  { amount: "0.10 USDC" }     │
     │<─────────────────────────────┤
     │                              │
     │  Send USDC via Circle        │
     ├──────────────┐               │
     │              │               │
     │<─────────────┘               │
     │  TX: 0xabcd...               │
     │                              │
     │  GET /premium                │
     │  x-payment-signature: sig    │
     ├─────────────────────────────>│
     │                              │
     │                              │ Verify with
     │                              │ facilitator
     │                              ├──────┐
     │                              │      │
     │                              │<─────┘
     │                              │ Valid ✓
     │                              │
     │  200 OK                      │
     │  { data: "..." }             │
     │<─────────────────────────────┤
     │                              │
```

## Next Steps

- Read the [full integration guide](./x402-integration.md)
- See [example implementations](../examples/)
- Check out the [API reference](./x402-api-reference.md)
- Join the [Discord community](#) for support

## Resources

- [x402 Protocol Spec](https://github.com/x402-protocol/spec)
- [Circle Developer Docs](https://developers.circle.com/w3s)
- [Coinbase x402 Facilitator](https://x402.coinbase.com)
- [Example Apps](../examples/)

## FAQ

**Q: What if the client doesn't have USDC?**  
A: The fetch will fail with an error. You can catch this and prompt the user to fund their wallet.

**Q: What if the payment is too expensive?**  
A: Set `maxAutoPayUSDC` to limit auto-payments. Requests above the limit will throw an error.

**Q: How do I prevent double-charging?**  
A: Receipts are cached automatically. Subsequent requests to the same URL reuse the payment signature.

**Q: What about refunds?**  
A: Refunds are handled off-chain. Implement a refund endpoint that sends USDC back to the original sender.

**Q: Can I use this on mainnet?**  
A: Yes! Change `network` to mainnet values (`ETH`, `MATIC`, etc.) and use production API keys.

**Q: How do I test without spending real USDC?**  
A: Use Circle's testnet (Sepolia) and get free testnet USDC from their faucet.

---

**Ready to build?** Start with the [client example](../examples/x402-client-example.ts) or [server example](../examples/x402-server-example.ts)!
