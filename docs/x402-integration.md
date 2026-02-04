# x402 Protocol Integration

## Overview

The x402 protocol enables seamless HTTP micropayments using the `402 Payment Required` status code. This integration adds payment-gated HTTP services to lobster-pay, allowing agents to monetize APIs, services, and skills automatically.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Agent                           │
│                                                                   │
│  ┌────────────────┐         ┌─────────────────┐                 │
│  │  Application   │────────▶│  x402Fetch      │                 │
│  │  Code          │         │  Wrapper        │                 │
│  └────────────────┘         └─────────────────┘                 │
│                                     │                            │
│                                     ▼                            │
│                             ┌───────────────┐                    │
│                             │ CircleClient  │                    │
│                             │ (Pay USDC)    │                    │
│                             └───────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP Request
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Server Agent                           │
│                                                                   │
│  ┌────────────────┐         ┌─────────────────┐                 │
│  │   Express      │────────▶│  x402 Paywall   │                 │
│  │   Router       │         │  Middleware     │                 │
│  └────────────────┘         └─────────────────┘                 │
│                                     │                            │
│                             No Payment?                          │
│                                     │                            │
│                                     ▼                            │
│                             ┌───────────────┐                    │
│                             │  402 Response │                    │
│                             │  + Challenge  │                    │
│                             └───────────────┘                    │
│                                                                   │
│                             Payment Provided?                    │
│                                     │                            │
│                                     ▼                            │
│                             ┌───────────────┐                    │
│                             │ Verify via    │                    │
│                             │ Coinbase x402 │                    │
│                             │ Facilitator   │                    │
│                             └───────────────┘                    │
│                                     │                            │
│                                     ▼                            │
│                             ┌───────────────┐                    │
│                             │  Execute      │                    │
│                             │  Endpoint     │                    │
│                             └───────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## Payment Flow

### Step 1: Initial Request (No Payment)

```
Client                           Server
  │                                │
  │  GET /api/premium-data         │
  │───────────────────────────────▶│
  │                                │
  │                                │ Check for x-payment-signature
  │                                │ Not found
  │                                │
  │  402 Payment Required          │
  │◀───────────────────────────────│
  │  {                             │
  │    "x-payment-required": {     │
  │      "version": "1",           │
  │      "network": "ETH-SEPOLIA", │
  │      "receiver": "0x...",      │
  │      "asset": "USDC",          │
  │      "amount": "0.10",         │
  │      "description": "...",     │
  │      "expires": 1738882800,    │
  │      "nonce": "uuid"           │
  │    }                           │
  │  }                             │
```

### Step 2: Auto-Pay & Retry

```
Client                           Server
  │                                │
  │  Send USDC via Circle          │
  │  Get payment signature         │
  │                                │
  │  GET /api/premium-data         │
  │  x-payment-signature: sig123   │
  │───────────────────────────────▶│
  │                                │
  │                                │ Verify signature with facilitator
  │                                │ Payment valid ✓
  │                                │
  │  200 OK                        │
  │  { data: ... }                 │
  │◀───────────────────────────────│
```

## Use Cases

### 1. Agent-to-Agent Communication

Agents can charge each other for:
- Data queries
- Skill execution
- API access
- Compute time

```typescript
// Agent A requests data from Agent B
const agentB = createX402Fetch({
  wallet: circleClient,
  maxAutoPayUSDC: '1.00',
});

const data = await agentB('https://agent-b.com/api/analysis?property=123');
// Auto-pays if Agent B returns 402
```

### 2. Monetized Skills

Skill developers can gate premium features:

```typescript
// Free tier
app.get('/skills/basic', (req, res) => {
  res.json({ features: ['basic', 'standard'] });
});

// Premium tier (0.50 USDC)
app.get('/skills/premium',
  paywall('0.50', 'Premium skill features'),
  (req, res) => {
    res.json({ features: ['basic', 'standard', 'advanced', 'pro'] });
  }
);
```

### 3. Real Estate Services

Gate expensive operations in escrow/invoice systems:

```typescript
// Invoice generation - FREE
const invoice = await invoiceManager.create({...});

// Invoice delivery with tracking - 0.05 USDC
app.post('/invoices/:id/deliver',
  paywall('0.05', 'Invoice delivery with tracking'),
  async (req, res) => {
    // Send via email/SMS with tracking
    // Premium service requires payment
  }
);

// Escrow creation - FREE
const escrow = await escrowManager.create({...});

// Premium escrow with yield optimization - 0.25 USDC
app.post('/escrow/:id/optimize',
  paywall('0.25', 'Yield optimization for escrow'),
  async (req, res) => {
    // Route funds through yield-bearing vault
    // Generate higher returns for deposited funds
  }
);
```

### 4. Premium Contact Lookup

```typescript
// Basic contact info - FREE
const contact = await contactManager.get(id);

// Contact verification with on-chain history - 0.10 USDC
app.get('/contacts/:id/verify',
  paywall('0.10', 'Contact verification with on-chain history'),
  async (req, res) => {
    const contact = await contactManager.get(req.params.id);
    const onChainHistory = await analyzeOnChainActivity(contact);
    const riskScore = calculateRiskScore(onChainHistory);
    
    res.json({
      contact,
      onChainHistory,
      riskScore,
      verified: true,
    });
  }
);
```

## Technical Components

### x402Client (lib/x402-client.ts)

Payment-enabled HTTP client that wraps `fetch()`:

```typescript
import { createX402Fetch } from './lib/x402-client';
import { CircleClient } from './lib/circle-client';

const wallet = new CircleClient(config);

const x402Fetch = createX402Fetch({
  wallet,
  maxAutoPayUSDC: '1.00',      // Auto-pay up to $1
  onPayment: (amount, url) => {
    console.log(`💸 Paid ${amount} USDC for ${url}`);
  },
  onChallenge: (challenge) => {
    console.log(`💳 Payment required: ${challenge.amount} USDC`);
  },
});

// Use like normal fetch - payment happens automatically
const response = await x402Fetch('https://api.example.com/premium');
const data = await response.json();
```

Features:
- Auto-detects 402 responses
- Pays via Circle Programmable Wallets
- Retries with payment signature
- Caches payment receipts
- Configurable auto-pay limits
- Payment event hooks

### x402Server (lib/x402-server.ts)

Express middleware for payment-gated endpoints:

```typescript
import { paywall, createPaymentChallenge } from './lib/x402-server';

// Simple paywall
app.get('/api/data',
  paywall('0.10', 'Premium data access'),
  async (req, res) => {
    res.json({ data: 'premium content' });
  }
);

// Dynamic pricing
app.get('/api/compute/:intensity',
  async (req, res, next) => {
    const cost = calculateCost(req.params.intensity);
    paywall(cost, `Compute job: ${req.params.intensity}`)(req, res, next);
  },
  async (req, res) => {
    const result = await runCompute(req.params.intensity);
    res.json({ result });
  }
);

// Manual challenge generation
app.post('/api/custom-flow', async (req, res) => {
  if (!hasCredits(req.user)) {
    const challenge = createPaymentChallenge('0.50', 'Refill credits');
    return res.status(402).json(challenge);
  }
  
  // Process request
});
```

### Integration with Existing Modules

#### Invoices (lib/invoices.ts)

Add x402 payment links to invoices:

```typescript
// Generate x402-enabled payment link
invoice.x402PaymentUrl = generateX402PaymentUrl(invoice);

// Client can fetch invoice and auto-pay
const response = await x402Fetch(invoice.x402PaymentUrl);
const receipt = await response.json();
```

#### Escrow (lib/escrow.ts)

Gate premium escrow operations:

```typescript
// Basic escrow creation - FREE
const escrow = await escrowManager.create({...});

// Premium features - PAID
app.post('/escrow/:id/optimize',
  paywall('0.25', 'Yield optimization'),
  async (req, res) => {
    // Enable yield-bearing escrow
  }
);

app.post('/escrow/:id/insurance',
  paywall('0.50', 'Escrow insurance'),
  async (req, res) => {
    // Add insurance coverage
  }
);
```

#### Contacts (lib/contacts.ts)

Premium verification services:

```typescript
// Basic lookup - FREE
const contact = await contactManager.get(id);

// Verification services - PAID
app.get('/contacts/:id/verify',
  paywall('0.10', 'Contact verification'),
  async (req, res) => {
    // On-chain history analysis
    // Risk scoring
    // Fraud detection
  }
);
```

## CLI Commands

### `usdc-cli x402 pay <url>`

Manually pay for a 402-protected resource:

```bash
$ usdc-cli x402 pay https://api.example.com/premium

Fetching payment challenge...
💳 Payment Required: 0.10 USDC
   Description: Premium data access
   Receiver: 0x1234...abcd

Sending payment...
✅ Payment sent! TX: 0xabcd...1234

Retrying with payment signature...
✅ Success! Response received.
```

### `usdc-cli x402 auto <url>`

Enable auto-pay mode for a URL pattern:

```bash
$ usdc-cli x402 auto https://api.example.com/*

Auto-pay enabled for: https://api.example.com/*
Max amount: 1.00 USDC per request

All future requests to this pattern will auto-pay.
```

### `usdc-cli x402 receipts`

Show payment history:

```bash
$ usdc-cli x402 receipts

Recent 402 Payments:
───────────────────────────────────────────────────
📄 0.10 USDC → api.example.com/premium
   Paid: 2025-02-04 13:45:00
   TX: 0xabcd...1234

📄 0.05 USDC → agent-b.com/api/analysis
   Paid: 2025-02-04 12:30:15
   TX: 0x5678...efgh

Total: 0.15 USDC in 2 payments
```

## Configuration

### Environment Variables

```bash
# Circle API credentials
CIRCLE_API_KEY=your_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret

# x402 Server configuration
X402_RECEIVER_ADDRESS=0x1234...abcd
X402_NETWORK=ETH-SEPOLIA
X402_FACILITATOR=https://x402.coinbase.com

# Auto-pay limits (optional)
X402_MAX_AUTO_PAY=1.00
X402_REQUIRE_CONFIRMATION=true
```

### Client Configuration

```typescript
interface X402ClientConfig {
  wallet: CircleClient;
  maxAutoPayUSDC?: string;        // Max amount to auto-pay
  requireConfirmation?: boolean;  // Prompt before paying
  cacheReceipts?: boolean;        // Cache payment receipts
  
  // Event hooks
  onPayment?: (amount: string, url: string, tx: string) => void;
  onChallenge?: (challenge: PaymentChallenge) => void;
  onVerified?: (receipt: PaymentReceipt) => void;
  onError?: (error: Error) => void;
}
```

### Server Configuration

```typescript
interface X402ServerConfig {
  facilitatorUrl: string;
  network: string;              // e.g., 'ETH-SEPOLIA'
  receiverAddress: string;
  acceptedAssets: string[];     // ['USDC']
  challengeExpiry?: number;     // Seconds (default: 300)
  
  // Custom verification
  verifyPayment?: (signature: string, amount: string) => Promise<boolean>;
}
```

## Security Considerations

### Payment Verification

- All payments verified through Coinbase x402 facilitator
- Signatures cannot be reused (nonce-based)
- Time-limited challenges (5 min default)
- Amount must match exactly

### Rate Limiting

Implement rate limits to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);
```

### Replay Protection

- Each challenge includes unique nonce
- Payments tied to specific challenge
- Expired challenges rejected

### Amount Verification

- Server verifies exact amount paid
- Overpayment rejected (prevents griefing)
- Underpayment rejected

## Testing

### Testnet Setup

1. Get Circle API credentials (testnet)
2. Create wallets on Sepolia
3. Get testnet USDC from Circle faucet
4. Configure x402 server with testnet addresses

### Test Scenarios

```typescript
// Test 1: Auto-pay works
const response = await x402Fetch('https://test.com/api/paid');
assert(response.ok);

// Test 2: Payment required detection
const response = await fetch('https://test.com/api/paid');
assert(response.status === 402);

// Test 3: Invalid signature rejected
const response = await fetch('https://test.com/api/paid', {
  headers: { 'x-payment-signature': 'invalid' },
});
assert(response.status === 402);

// Test 4: Max auto-pay limit honored
const client = createX402Fetch({ maxAutoPayUSDC: '0.50' });
await assert.rejects(
  client('https://test.com/expensive'), // Costs 1.00
  /exceeds max auto-pay/
);
```

## Performance

### Caching

Payment receipts cached locally to avoid double-payment:

```typescript
{
  "url": "https://api.example.com/premium",
  "nonce": "uuid-123",
  "signature": "sig-abc",
  "expiresAt": 1738885200,
  "txHash": "0xabcd..."
}
```

### Retry Strategy

1. First request (no payment)
2. Receive 402 + challenge
3. Send payment (~2-5 seconds)
4. Retry with signature
5. Cache receipt for reuse

Total latency: ~3-7 seconds for first paid request  
Subsequent requests: Instant (cached)

## Future Enhancements

### Subscription Model

Monthly subscriptions via x402:

```typescript
app.use('/api/premium/*',
  subscriptionPaywall({
    price: '10.00',
    period: 'monthly',
    benefits: ['Unlimited API calls', 'Priority support'],
  })
);
```

### Usage-Based Billing

Pay per compute/storage/bandwidth:

```typescript
app.post('/api/compute',
  usagePaywall({
    basePrice: '0.10',
    perUnit: '0.01',
    unit: 'cpu-second',
  }),
  async (req, res) => {
    const usage = trackUsage(req);
    const cost = calculateCost(usage);
    // Charge based on actual usage
  }
);
```

### Cross-Chain Support

Support multiple chains and assets:

```typescript
const challenge = createPaymentChallenge({
  amount: '0.10',
  acceptedAssets: [
    { asset: 'USDC', chain: 'ETH-SEPOLIA' },
    { asset: 'USDC', chain: 'MATIC-AMOY' },
    { asset: 'USDC', chain: 'BASE-SEPOLIA' },
  ],
});
```

## Resources

- [x402 Protocol Spec](https://github.com/x402-protocol/spec)
- [Coinbase x402 Facilitator](https://x402.coinbase.com)
- [Circle Programmable Wallets](https://developers.circle.com/w3s)
- [HTTP 402 Status Code](https://httpwg.org/specs/rfc9110.html#status.402)

---

**Status:** Implementation Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-02-04
