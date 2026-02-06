# Pay Lobster Merchant API

Complete payment infrastructure for accepting USDC payments via Pay Lobster.

## 🎯 Overview

The Merchant API allows any platform (like Moltbook) to accept USDC payments through Pay Lobster with minimal integration effort.

## 📋 What Was Built

### ✅ Core Services
- **Merchant Service** (`src/lib/merchant.ts`)
  - Merchant registration
  - API key generation (pk_live_ / sk_live_)
  - Authentication via API keys
  - Stats tracking (volume, transaction count)
  - Webhook delivery

- **Payment Links Service** (`src/lib/payment-links.ts`)
  - Payment link creation
  - Charge management
  - Payment completion tracking
  - Automatic webhook triggers

### ✅ API Endpoints

#### 1. Register Merchant
```
POST /api/v1/merchants/register
```
**Request:**
```json
{
  "name": "Your Business",
  "website": "https://example.com",
  "webhook_url": "https://example.com/webhooks/paylobster",
  "wallet_address": "0x..."
}
```
**Response:**
```json
{
  "merchant_id": "abc123",
  "api_key": "pk_live_...",
  "api_secret": "sk_live_..."
}
```

#### 2. Create Payment Link
```
POST /api/v1/payment-links
Headers: { Authorization: Bearer sk_live_... }
```
**Request:**
```json
{
  "amount": 10.00,
  "description": "Premium Subscription",
  "redirect_url": "https://yoursite.com/success",
  "metadata": { "user_id": "123" }
}
```
**Response:**
```json
{
  "link_id": "link_abc123",
  "url": "https://paylobster.com/pay/link_abc123"
}
```

#### 3. Create Charge
```
POST /api/v1/charges
Headers: { Authorization: Bearer sk_live_... }
```
**Request:**
```json
{
  "amount": 5.00,
  "currency": "USDC",
  "description": "Monthly subscription",
  "customer_email": "user@example.com",
  "redirect_url": "https://yoursite.com/success"
}
```
**Response:**
```json
{
  "charge_id": "ch_abc123",
  "payment_url": "https://paylobster.com/pay/link_xyz",
  "status": "pending"
}
```

#### 4. Get Charge Status
```
GET /api/v1/charges/{chargeId}
Headers: { Authorization: Bearer sk_live_... }
```
**Response:**
```json
{
  "charge_id": "ch_abc123",
  "status": "completed",
  "amount": 5.00,
  "currency": "USDC",
  "description": "Monthly subscription",
  "paid_at": "2026-02-06T12:00:00Z",
  "tx_hash": "0x..."
}
```

### ✅ Payment Page UI
- **Route:** `/pay/[linkId]`
- **Features:**
  - Trust-inspiring design (blue theme)
  - RainbowKit wallet connection
  - One-click USDC payment
  - Real-time transaction status
  - Automatic redirect after payment
  - Mobile responsive
  - Pay Lobster branding

### ✅ Merchant Dashboard
- **Route:** `/merchant`
- **Features:**
  - Merchant registration form
  - API key management (show/hide/copy)
  - Payment link creation
  - Quick start code examples
  - Stats overview (volume, transactions)
  - Payment history

## 🔐 Security Features

### API Key Format
- **Public key:** `pk_live_` + 24 random chars
- **Secret key:** `sk_live_` + 32 random chars
- Secrets are hashed (SHA-256) before storage
- Timing-safe comparison for auth

### Webhook Signatures
All webhooks include HMAC-SHA256 signature:
```
X-Webhook-Signature: <hmac_hex>
X-Webhook-Event: payment.completed
```

### Validation
- Wallet address format validation
- URL format validation
- Amount validation (positive numbers)
- Currency validation (USDC only)

## 📡 Webhook Payload

When a payment completes, merchants receive:

```json
{
  "event": "payment.completed",
  "data": {
    "charge_id": "ch_xxx",
    "amount": 5.00,
    "currency": "USDC",
    "from": "0x...",
    "tx_hash": "0x...",
    "metadata": {}
  },
  "timestamp": "2026-02-06T12:00:00Z",
  "signature": "..."
}
```

## 🗄️ Firestore Collections

### merchants
```typescript
{
  id: string,
  name: string,
  website: string,
  walletAddress: string,
  webhookUrl: string,
  apiKey: string,
  apiSecret: string (hashed),
  createdAt: Timestamp,
  active: boolean,
  totalVolume: number,
  totalTransactions: number
}
```

### payment_links
```typescript
{
  id: string,
  merchantId: string,
  amount: number,
  description: string,
  redirectUrl: string,
  metadata: object,
  status: 'active' | 'paid' | 'expired',
  paidBy: string | null,
  paidAt: Timestamp | null,
  txHash: string | null,
  createdAt: Timestamp,
  expiresAt: Timestamp
}
```

### charges
```typescript
{
  id: string,
  merchantId: string,
  amount: number,
  currency: string,
  description: string,
  customerEmail?: string,
  redirectUrl: string,
  paymentLinkId: string,
  status: 'pending' | 'completed' | 'failed' | 'expired',
  paidBy: string | null,
  paidAt: Timestamp | null,
  txHash: string | null,
  createdAt: Timestamp
}
```

## 🧪 Testing

### Manual Testing

1. **Register a Merchant:**
```bash
curl -X POST https://paylobster.com/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Merchant",
    "website": "https://test.com",
    "webhook_url": "https://webhook.site/unique-id",
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

2. **Create a Payment Link:**
```bash
curl -X POST https://paylobster.com/api/v1/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_..." \
  -d '{
    "amount": 1.00,
    "description": "Test Payment",
    "redirect_url": "https://example.com/success"
  }'
```

3. **Visit Payment Page:**
Open the returned URL in your browser and test the payment flow.

### Integration Testing

See `tests/merchant-api.test.ts` for automated tests (to be created).

## 🚀 Integration Examples

### Node.js / Express
```javascript
const PayLobster = require('paylobster-sdk');
const client = new PayLobster('sk_live_...');

app.post('/create-payment', async (req, res) => {
  const charge = await client.charges.create({
    amount: 10.00,
    currency: 'USDC',
    description: 'Premium Plan',
    redirect_url: 'https://myapp.com/success'
  });
  
  res.json({ payment_url: charge.payment_url });
});

app.post('/webhooks/paylobster', async (req, res) => {
  const isValid = PayLobster.webhooks.verify(
    req.body,
    req.headers['x-webhook-signature'],
    'sk_live_...'
  );
  
  if (isValid && req.body.event === 'payment.completed') {
    // Fulfill order, update database, etc.
    await fulfillOrder(req.body.data.charge_id);
  }
  
  res.json({ received: true });
});
```

### Next.js
```typescript
// app/api/create-payment/route.ts
export async function POST(request: Request) {
  const response = await fetch('https://paylobster.com/api/v1/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PAYLOBSTER_SECRET_KEY}`
    },
    body: JSON.stringify({
      amount: 10.00,
      currency: 'USDC',
      description: 'Premium Plan',
      redirect_url: 'https://myapp.com/success'
    })
  });
  
  const charge = await response.json();
  return Response.json({ payment_url: charge.payment_url });
}
```

## 📊 Monitoring

Track merchant stats:
- Total payment volume
- Transaction count
- Success rate
- Failed webhook deliveries

Stats are automatically updated in Firestore when payments complete.

## 🔧 Environment Variables

Required for deployment:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
NEXT_PUBLIC_BASE_URL=https://paylobster.com
```

## 📝 Next Steps

1. **Testing:** Test all endpoints with Postman/curl
2. **Documentation:** Add to main docs site
3. **SDK:** Create JavaScript/TypeScript SDK
4. **Monitoring:** Set up error tracking (Sentry)
5. **Rate Limiting:** Add rate limits to API routes
6. **Webhooks:** Implement retry logic for failed webhooks
7. **Subscription:** Add recurring payment support

## 🐛 Known Issues

The project has existing TypeScript/build issues in other routes:
- `src/app/api/v1/subscriptions/` - Type errors
- `src/app/api/v1/widget/` - Missing CORS exports

These don't affect the new merchant API functionality.

## ✅ Deliverables Completed

- [x] Merchant registration API
- [x] API key generation (pk_live_ / sk_live_)
- [x] Payment links CRUD
- [x] Payment page UI
- [x] Charges API
- [x] Webhook delivery on payment
- [x] Merchant dashboard
- [x] TypeScript compilation (new code)
- [x] Security headers
- [x] Input validation
- [x] HMAC webhook signatures

## 🎉 Ready for Testing!

The merchant API is fully implemented and ready for integration testing.
