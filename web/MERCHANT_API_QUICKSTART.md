# 🦞 Pay Lobster Merchant API - Quick Start

## 1️⃣ Register Your Business (One Time)

```bash
curl -X POST https://paylobster.com/api/v1/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Business Name",
    "website": "https://yourbusiness.com",
    "webhook_url": "https://yourbusiness.com/webhooks/paylobster",
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Response:**
```json
{
  "merchant_id": "abc123",
  "api_key": "pk_live_...",
  "api_secret": "sk_live_..."
}
```

⚠️ **Save your `api_secret` securely! It's shown only once.**

---

## 2️⃣ Create a Payment Link

```bash
curl -X POST https://paylobster.com/api/v1/payment-links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \
  -d '{
    "amount": 10.00,
    "description": "Premium Subscription",
    "redirect_url": "https://yourbusiness.com/success",
    "metadata": {
      "user_id": "user123",
      "plan": "premium"
    }
  }'
```

**Response:**
```json
{
  "link_id": "link_xyz",
  "url": "https://paylobster.com/pay/link_xyz"
}
```

📤 **Send this URL to your customer to complete payment**

---

## 3️⃣ Alternative: Create a Charge

```bash
curl -X POST https://paylobster.com/api/v1/charges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY" \
  -d '{
    "amount": 5.00,
    "currency": "USDC",
    "description": "Monthly subscription",
    "customer_email": "customer@example.com",
    "redirect_url": "https://yourbusiness.com/success"
  }'
```

**Response:**
```json
{
  "charge_id": "ch_abc",
  "payment_url": "https://paylobster.com/pay/link_123",
  "status": "pending"
}
```

---

## 4️⃣ Check Payment Status

```bash
curl https://paylobster.com/api/v1/charges/ch_abc \
  -H "Authorization: Bearer sk_live_YOUR_SECRET_KEY"
```

**Response:**
```json
{
  "charge_id": "ch_abc",
  "status": "completed",
  "amount": 5.00,
  "paid_at": "2026-02-06T12:00:00Z",
  "tx_hash": "0x..."
}
```

---

## 5️⃣ Handle Webhooks

When payment completes, you'll receive:

```json
POST https://yourbusiness.com/webhooks/paylobster
{
  "event": "payment.completed",
  "data": {
    "charge_id": "ch_abc",
    "amount": 5.00,
    "currency": "USDC",
    "from": "0x...",
    "tx_hash": "0x...",
    "metadata": {
      "user_id": "user123"
    }
  },
  "timestamp": "2026-02-06T12:00:00Z",
  "signature": "hmac_sha256..."
}
```

### Verify Webhook Signature (Node.js)

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/paylobster', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, PAYLOBSTER_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  if (req.body.event === 'payment.completed') {
    // ✅ Payment confirmed! Fulfill the order
    fulfillOrder(req.body.data.charge_id, req.body.data.metadata);
  }
  
  res.json({ received: true });
});
```

---

## 📱 Merchant Dashboard

Visit **https://paylobster.com/merchant** to:
- View your API keys
- Create payment links via UI
- See payment history
- View stats (volume, transaction count)
- Get integration code examples

---

## 🔑 API Keys

### Public Key (pk_live_...)
- ✅ Safe to use in client-side code
- Used for: Frontend integrations (coming soon)

### Secret Key (sk_live_...)
- ⚠️ **NEVER expose in client-side code**
- ⚠️ **Store securely (environment variables)**
- Used for: Creating payment links and charges

---

## 💻 Code Examples

### Node.js / Express
```javascript
const PAYLOBSTER_SECRET = process.env.PAYLOBSTER_SECRET_KEY;

app.post('/api/create-payment', async (req, res) => {
  const response = await fetch('https://paylobster.com/api/v1/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAYLOBSTER_SECRET}`
    },
    body: JSON.stringify({
      amount: 10.00,
      currency: 'USDC',
      description: 'Premium Plan',
      redirect_url: 'https://myapp.com/success',
      metadata: { user_id: req.user.id }
    })
  });
  
  const charge = await response.json();
  res.json({ payment_url: charge.payment_url });
});
```

### Next.js (App Router)
```typescript
// app/api/create-payment/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  const response = await fetch('https://paylobster.com/api/v1/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PAYLOBSTER_SECRET_KEY}`
    },
    body: JSON.stringify({
      amount: body.amount,
      currency: 'USDC',
      description: body.description,
      redirect_url: `${process.env.NEXT_PUBLIC_URL}/success`
    })
  });
  
  const charge = await response.json();
  return Response.json(charge);
}
```

### Python / Flask
```python
import requests
import os

PAYLOBSTER_SECRET = os.getenv('PAYLOBSTER_SECRET_KEY')

@app.route('/api/create-payment', methods=['POST'])
def create_payment():
    response = requests.post(
        'https://paylobster.com/api/v1/charges',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {PAYLOBSTER_SECRET}'
        },
        json={
            'amount': 10.00,
            'currency': 'USDC',
            'description': 'Premium Plan',
            'redirect_url': 'https://myapp.com/success'
        }
    )
    return response.json()
```

---

## 🧪 Test Your Integration

```bash
# Run the test suite
node scripts/test-merchant-api.js

# Test against your local development
BASE_URL=http://localhost:3000 node scripts/test-merchant-api.js
```

---

## ✅ Production Checklist

- [ ] Store API secret in environment variables
- [ ] Set up webhook endpoint
- [ ] Verify webhook signatures
- [ ] Handle payment.completed events
- [ ] Test with small amounts first
- [ ] Set up error monitoring
- [ ] Configure CORS if needed
- [ ] Test redirect flow

---

## 🆘 Troubleshooting

### "Invalid API credentials" error
- Check you're using `sk_live_...` (secret key), not `pk_live_...`
- Verify the key is in `Authorization: Bearer sk_live_...` header

### Payment link returns 404
- Link may have expired (7 days)
- Check link_id is correct in URL

### Webhook not received
- Verify webhook URL is publicly accessible
- Check your server logs for incoming requests
- Test with webhook.site first

### Payment not completing
- Ensure user has USDC in wallet
- Check wallet is connected to Base network
- Verify merchant wallet address is correct

---

## 📚 Full Documentation

- **Complete API Reference:** `MERCHANT_API_README.md`
- **Implementation Details:** `MERCHANT_API_DELIVERY.md`
- **Test Script:** `scripts/test-merchant-api.js`

---

## 🚀 You're Ready!

1. Register your merchant account
2. Create a payment link or charge
3. Share the URL with your customer
4. Handle the webhook when payment completes
5. ✨ Profit!

**Questions?** Check the full documentation or test the API with the provided test script.

---

**Pay Lobster - The easiest way to accept USDC payments** 🦞💙
