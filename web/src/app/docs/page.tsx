'use client';

import { Card } from '@/components/ui/Card';
import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-16">
      {/* Hero */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full text-blue-400 text-sm font-medium mb-6">
          <span className="text-lg">🦞</span>
          <span>Payment Infrastructure for AI Agents</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-50 to-gray-400 bg-clip-text text-transparent">
          Pay Lobster Documentation
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          Build trustless payment systems for AI agents with identity, reputation, credit scoring, and escrow services on Base.
        </p>
      </div>

      {/* Quick Start */}
      <section id="quick-start" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>⚡</span>
          <span>Get Started in 5 Minutes</span>
        </h2>
        <Card>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">1. Install the OpenClaw Skill</h3>
              <p className="text-gray-400 mb-4">
                If you're using OpenClaw, install the Pay Lobster skill to get started instantly:
              </p>
              <CodeBlock 
                code="openclaw skills install pay-lobster"
                language="bash"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">2. Set Up Your Wallet</h3>
              <p className="text-gray-400 mb-4">
                Connect your wallet and register your agent identity:
              </p>
              <CodeBlock 
                code="paylobster setup"
                language="bash"
              />
              <p className="text-sm text-gray-500 mt-3">
                This creates your ERC-721 NFT identity on Base and initializes your LOBSTER score.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">3. Accept Your First Payment</h3>
              <p className="text-gray-400 mb-4">
                Share your payment link and start accepting USDC:
              </p>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-300 mb-2">Your payment link:</p>
                <code className="text-blue-400 text-lg">paylobster.com/pay/your-agent</code>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                That's it! You're now accepting USDC payments on Base.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Installation */}
      <section id="installation" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>📦</span>
          <span>Installation</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Web Integration</h3>
              <p className="text-gray-400 mb-4">
                Add Pay Lobster to your web application:
              </p>
              <CodeBlock 
                code="npm install @paylobster/sdk"
                language="bash"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">CLI Tool</h3>
              <p className="text-gray-400 mb-4">
                Install the CLI for agent development:
              </p>
              <CodeBlock 
                code="npm install -g @paylobster/cli"
                language="bash"
              />
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Requirements</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Node.js 18+ or Bun</li>
                <li>A Web3 wallet (MetaMask, Coinbase Wallet, etc.)</li>
                <li>USDC on Base (for transactions)</li>
                <li>ETH on Base (for gas fees)</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* First Payment */}
      <section id="first-payment" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>💰</span>
          <span>Your First Payment</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Let's walk through creating and receiving your first payment:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Create a Payment Link</h3>
              <CodeBlock 
                code={`paylobster create-link \\
  --amount 5.00 \\
  --description "Pro Plan Subscription" \\
  --expires 7d`}
                language="bash"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Share the Link</h3>
              <p className="text-gray-400 mb-3">
                Send the generated link to your customer. They'll be able to pay with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Any Web3 wallet (MetaMask, Coinbase Wallet, WalletConnect)</li>
                <li>USDC on Base (ultra-low fees)</li>
                <li>No account required</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Receive Payment</h3>
              <p className="text-gray-400">
                Payments are settled instantly on-chain. Check your balance:
              </p>
              <CodeBlock 
                code="paylobster balance"
                language="bash"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* For Agents */}
      <section id="accept-payments" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🤖</span>
          <span>Accept Payments in Chat</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              AI agents can request and accept payments directly in conversation:
            </p>

            <CodeBlock 
              title="Agent Payment Request"
              code={`import { PayLobster } from '@paylobster/sdk';

const payLobster = new PayLobster({
  agentAddress: process.env.AGENT_ADDRESS,
  privateKey: process.env.PRIVATE_KEY
});

// Create a payment request
const payment = await payLobster.createPayment({
  amount: 5.00,
  description: 'Premium AI Analysis',
  metadata: {
    taskId: 'task_123',
    userId: 'user_456'
  }
});

// Share the payment link
console.log(\`Pay here: \${payment.paymentUrl}\`);

// Listen for payment confirmation
payment.on('completed', async (tx) => {
  console.log('Payment received!', tx.hash);
  // Deliver the service
  await deliverPremiumAnalysis();
});`}
              language="javascript"
              showLineNumbers
            />
          </div>
        </Card>
      </section>

      {/* Tips & Donations */}
      <section id="tips-donations" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>💝</span>
          <span>Tips & Donations</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Accept tips and donations with optional amounts:
            </p>

            <CodeBlock 
              title="Tip Jar Example"
              code={`// Create a tip link (no fixed amount)
const tipLink = await payLobster.createPayment({
  type: 'tip',
  description: 'Tip for helpful advice',
  suggestedAmounts: [1, 5, 10, 25]
});

// Or with a suggested amount
const donation = await payLobster.createPayment({
  type: 'donation',
  suggestedAmount: 10.00,
  description: 'Support my open source work'
});`}
              language="javascript"
            />

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
              <p className="text-blue-400 font-medium mb-2">💡 Pro Tip</p>
              <p className="text-gray-400 text-sm">
                Tips help build your reputation faster! Each transaction contributes to your LOBSTER score.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Escrow */}
      <section id="escrow" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🔒</span>
          <span>Escrow Services</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Secure payments with trustless escrow for larger transactions:
            </p>

            <CodeBlock 
              title="Create Escrow"
              code={`// Create an escrow transaction
const escrow = await payLobster.createEscrow({
  amount: 100.00,
  recipient: '0x...', // Service provider
  description: 'Website Development',
  conditions: {
    deliveryDeadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    milestones: [
      { description: 'Design mockups', amount: 30 },
      { description: 'Development', amount: 50 },
      { description: 'Final delivery', amount: 20 }
    ]
  }
});

// Buyer deposits funds
await escrow.deposit();

// Provider completes work
await escrow.releaseMilestone(0); // Release 30 USDC

// Buyer approves final delivery
await escrow.complete(); // Release remaining funds`}
              language="javascript"
              showLineNumbers
            />

            <div>
              <h3 className="text-lg font-semibold mb-3">Dispute Resolution</h3>
              <p className="text-gray-400 mb-3">
                If there's a disagreement, either party can open a dispute:
              </p>
              <CodeBlock 
                code={`// Open a dispute
await escrow.openDispute({
  reason: 'Work not completed as specified',
  evidence: ['screenshot1.png', 'screenshot2.png']
});

// Mediators vote on the outcome
// Funds are distributed based on the verdict`}
                language="javascript"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Reputation */}
      <section id="reputation" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>⭐</span>
          <span>Building Reputation</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Your LOBSTER score is built through completed transactions and positive interactions:
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-3xl mb-2">💚</div>
                <h4 className="font-semibold mb-1">Complete Transactions</h4>
                <p className="text-sm text-gray-400">Every successful payment builds trust</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-semibold mb-1">Fast Delivery</h4>
                <p className="text-sm text-gray-400">Quick turnaround improves your score</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-semibold mb-1">Zero Disputes</h4>
                <p className="text-sm text-gray-400">Clean record = higher score</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Score Tiers</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                  <span className="text-2xl">🌱</span>
                  <div className="flex-1">
                    <div className="font-semibold">300-599: Starter</div>
                    <div className="text-sm text-gray-400">Building trust, basic features</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-green-600/10 border border-green-600/20 rounded-lg p-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <div className="font-semibold text-green-400">600-749: Trusted</div>
                    <div className="text-sm text-gray-400">Unlocks credit-backed escrow</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-600/20 rounded-lg p-3">
                  <span className="text-2xl">⭐</span>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-400">750+: Elite</div>
                    <div className="text-sm text-gray-400">Premium features, highest credit limits</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* For Platforms - Merchant API */}
      <section id="merchant-api" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🏢</span>
          <span>Merchant API</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Integrate Pay Lobster into your platform with our REST API:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3">Authentication</h3>
              <CodeBlock 
                title="API Key Setup"
                code={`// Get your API key from dashboard.paylobster.com
const headers = {
  'Authorization': 'Bearer your_api_key_here',
  'Content-Type': 'application/json'
};`}
                language="javascript"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Create a Charge</h3>
              <CodeBlock 
                title="POST /api/v1/charges"
                code={`{
  "amount": 25.00,
  "currency": "USDC",
  "description": "Pro Plan - Monthly",
  "customer": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "metadata": {
    "user_id": "user_123",
    "plan": "pro"
  },
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel"
}`}
                language="json"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Response</h3>
              <CodeBlock 
                code={`{
  "id": "ch_1234567890",
  "amount": 25.00,
  "status": "pending",
  "payment_url": "https://paylobster.com/pay/ch_1234567890",
  "created_at": "2026-02-06T00:00:00Z"
}`}
                language="json"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Payment Links */}
      <section id="payment-links" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🔗</span>
          <span>Payment Links</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Create shareable payment links in seconds—no code required:
            </p>

            <CodeBlock 
              title="Create Payment Link"
              code={`POST /api/v1/payment-links
{
  "amount": 5.00,
  "description": "Pro Plan",
  "expires_in": 604800
}`}
              language="json"
            />

            <div>
              <h3 className="text-lg font-semibold mb-3">Response</h3>
              <CodeBlock 
                code={`{
  "id": "pl_abc123",
  "url": "https://paylobster.com/pay/pl_abc123",
  "qr_code": "https://paylobster.com/qr/pl_abc123.png",
  "expires_at": "2026-02-13T00:00:00Z"
}`}
                language="json"
              />
            </div>

            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
              <p className="text-blue-400 font-medium mb-2">✨ Features</p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Instant creation, no approval needed</li>
                <li>• QR codes included</li>
                <li>• Mobile-optimized payment pages</li>
                <li>• Automatic expiration</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Checkout Widget */}
      <section id="checkout-widget" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🛒</span>
          <span>Checkout Widget</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Embed a complete checkout experience in one line of code:
            </p>

            <CodeBlock 
              title="HTML"
              code={`<script src="https://paylobster.com/js/checkout.js"></script>

<button id="pay-button">Pay with Pay Lobster</button>

<script>
  const checkout = PayLobster.checkout({
    publicKey: 'pk_live_...',
    amount: 10.00,
    description: 'Premium Feature',
    onSuccess: (payment) => {
      console.log('Payment successful!', payment);
      // Unlock the feature
    },
    onCancel: () => {
      console.log('Payment cancelled');
    }
  });

  document.getElementById('pay-button')
    .addEventListener('click', () => {
      checkout.open();
    });
</script>`}
              language="javascript"
              showLineNumbers
            />

            <div>
              <h3 className="text-lg font-semibold mb-3">React Component</h3>
              <CodeBlock 
                title="PayLobsterButton.tsx"
                code={`import { PayLobsterCheckout } from '@paylobster/react';

export function PayButton() {
  return (
    <PayLobsterCheckout
      amount={10.00}
      description="Premium Feature"
      onSuccess={(payment) => {
        console.log('Paid!', payment);
      }}
    >
      Pay with Pay Lobster
    </PayLobsterCheckout>
  );
}`}
                language="typescript"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Subscriptions */}
      <section id="subscriptions" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🔄</span>
          <span>Subscriptions</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Create recurring subscription plans with automated billing:
            </p>

            <CodeBlock 
              title="Create Subscription Plan"
              code={`POST /api/v1/subscription-plans
{
  "name": "Pro Plan",
  "amount": 29.00,
  "interval": "month",
  "trial_days": 14,
  "features": [
    "Unlimited API calls",
    "Priority support",
    "Advanced analytics"
  ]
}`}
              language="json"
            />

            <div>
              <h3 className="text-lg font-semibold mb-3">Subscribe a Customer</h3>
              <CodeBlock 
                code={`POST /api/v1/subscriptions
{
  "plan_id": "plan_abc123",
  "customer": {
    "email": "user@example.com",
    "wallet": "0x..."
  }
}`}
                language="json"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Manage Subscriptions</h3>
              <CodeBlock 
                code={`// Cancel subscription
DELETE /api/v1/subscriptions/:id

// Upgrade/downgrade
PATCH /api/v1/subscriptions/:id
{
  "plan_id": "plan_xyz789"
}

// Pause subscription
POST /api/v1/subscriptions/:id/pause`}
                language="bash"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🪝</span>
          <span>Webhooks</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              Get real-time notifications for payment events:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3">Setup Webhook Endpoint</h3>
              <CodeBlock 
                title="webhook-handler.ts"
                code={`import { PayLobster } from '@paylobster/sdk';

export async function POST(req: Request) {
  const signature = req.headers.get('paylobster-signature');
  const payload = await req.text();

  // Verify webhook signature
  const event = PayLobster.webhooks.verify(payload, signature);

  switch (event.type) {
    case 'payment.completed':
      await handlePaymentCompleted(event.data);
      break;
    case 'payment.failed':
      await handlePaymentFailed(event.data);
      break;
    case 'subscription.created':
      await handleSubscriptionCreated(event.data);
      break;
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(event.data);
      break;
  }

  return new Response('OK', { status: 200 });
}`}
                language="typescript"
                showLineNumbers
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Webhook Events</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded p-2">
                  <code className="text-blue-400">payment.completed</code>
                  <span className="text-gray-400">— Payment successfully processed</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded p-2">
                  <code className="text-blue-400">payment.failed</code>
                  <span className="text-gray-400">— Payment failed or rejected</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded p-2">
                  <code className="text-blue-400">subscription.created</code>
                  <span className="text-gray-400">— New subscription started</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded p-2">
                  <code className="text-blue-400">subscription.cancelled</code>
                  <span className="text-gray-400">— Subscription cancelled</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded p-2">
                  <code className="text-blue-400">dispute.opened</code>
                  <span className="text-gray-400">— Dispute filed on transaction</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Smart Contracts - Architecture */}
      <section id="architecture" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🏗️</span>
          <span>Architecture</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-400/10 border border-blue-600/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-3">ERC-8004 Compliant</h3>
              <p className="text-gray-300">
                Pay Lobster implements the <strong>Trustless Agents</strong> standard (ERC-8004), 
                authored by engineers from <strong>MetaMask</strong>, <strong>Ethereum Foundation</strong>, 
                <strong>Google</strong>, and <strong>Coinbase</strong>.
              </p>
            </div>

            <p className="text-gray-400">
              The Pay Lobster protocol consists of four integrated smart contracts deployed on Base:
            </p>

            <div className="space-y-4">
              <div className="bg-gray-900/50 border-l-4 border-blue-600 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">AgentIdentity (ERC-721)</h4>
                <p className="text-gray-400 text-sm mb-2">
                  Portable, on-chain identity for AI agents. Each agent gets a unique NFT handle.
                </p>
                <code className="text-xs text-gray-500 break-all">
                  0xA174ee274F870631B3c330a85EBCad74120BE662
                </code>
              </div>

              <div className="bg-gray-900/50 border-l-4 border-green-600 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">TrustScore Registry</h4>
                <p className="text-gray-400 text-sm mb-2">
                  Multi-dimensional reputation built from verified on-chain transactions.
                </p>
                <code className="text-xs text-gray-500 break-all">
                  0x02bb4132a86134684976E2a52E43D59D89E64b29
                </code>
              </div>

              <div className="bg-gray-900/50 border-l-4 border-orange-600 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">CreditScore System</h4>
                <p className="text-gray-400 text-sm mb-2">
                  300-850 LOBSTER score (like FICO for agents). Your score × $1 = credit limit.
                </p>
                <code className="text-xs text-gray-500 break-all">
                  0xD9241Ce8a721Ef5fcCAc5A11983addC526eC80E1
                </code>
              </div>

              <div className="bg-gray-900/50 border-l-4 border-purple-600 rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-2">Escrow Contract</h4>
                <p className="text-gray-400 text-sm mb-2">
                  Trustless USDC payment holding with milestone releases and dispute resolution.
                </p>
                <code className="text-xs text-gray-500 break-all">
                  0x49EdEe04c78B7FeD5248A20706c7a6c540748806
                </code>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Identity Registry */}
      <section id="identity" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🆔</span>
          <span>Identity Registry</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              The AgentIdentity contract is an ERC-721 NFT that serves as a portable, verifiable identity for AI agents:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3">Register an Agent</h3>
              <CodeBlock 
                title="Solidity Interface"
                code={`function registerAgent(
  string memory name,
  string memory metadata
) external returns (uint256 tokenId);

// Example usage
const tokenId = await agentIdentity.registerAgent(
  "MyAIAgent",
  "ipfs://QmHash..."
);`}
                language="javascript"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Key Features</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 ml-4">
                <li>Unique, immutable on-chain identity</li>
                <li>Portable across platforms</li>
                <li>Linked to reputation and credit score</li>
                <li>Tradeable (can transfer ownership)</li>
                <li>Metadata stored on IPFS</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Trust Score */}
      <section id="trust-score" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>📊</span>
          <span>Reputation Registry</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              The TrustScore contract tracks multi-dimensional reputation metrics:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3">Reputation Factors</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Transaction History</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Total transactions</li>
                    <li>• Success rate</li>
                    <li>• Average amount</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Performance</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Delivery speed</li>
                    <li>• Dispute rate</li>
                    <li>• Customer feedback</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Query Reputation</h3>
              <CodeBlock 
                code={`// Get trust metrics
const metrics = await trustScore.getMetrics(agentTokenId);

console.log({
  totalTransactions: metrics.totalTx,
  successRate: metrics.successRate,
  averageRating: metrics.avgRating,
  disputeRate: metrics.disputeRate
});`}
                language="javascript"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Credit Score */}
      <section id="credit-score" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>💳</span>
          <span>Credit System</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              The LOBSTER score (Ledger-Onchain-Based Score for Trust, Exchange, and Reputation) 
              is a 300-850 credit rating for AI agents:
            </p>

            <div className="bg-gradient-to-r from-red-600/20 via-yellow-600/20 via-green-600/20 to-blue-600/20 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold">300</span>
                <span className="text-gray-400">Your Score</span>
                <span className="text-2xl font-bold">850</span>
              </div>
              <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-600 via-yellow-600 via-green-600 to-blue-600 w-2/3"></div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-4xl font-bold text-blue-400">680</div>
                <div className="text-sm text-gray-400">Trusted Tier</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">How It Works</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>Score × $1 = Credit Limit</strong> — A 680 score gives you $680 in credit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>600+ Unlocks Credit</strong> — Access to credit-backed escrow services</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span><strong>750+ Elite Status</strong> — Maximum credit limits and premium features</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Check Your Score</h3>
              <CodeBlock 
                code={`const score = await creditScore.getScore(agentTokenId);
const creditLimit = await creditScore.getCreditLimit(agentTokenId);

console.log(\`Score: \${score}\`);
console.log(\`Credit Limit: $\${creditLimit}\`);`}
                language="javascript"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Escrow Contract */}
      <section id="escrow-contract" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>⚖️</span>
          <span>Escrow Contract</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <p className="text-gray-400">
              The Escrow contract holds USDC payments securely until conditions are met:
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-3">Create Escrow</h3>
              <CodeBlock 
                code={`function createEscrow(
  address recipient,
  uint256 amount,
  uint256 deadline,
  string memory terms
) external returns (uint256 escrowId);

// Example
const escrowId = await escrow.createEscrow(
  providerAddress,
  ethers.utils.parseUnits("100", 6), // 100 USDC
  Date.now() + 7 * 24 * 60 * 60, // 7 days
  "Website development with 3 milestones"
);`}
                language="javascript"
                showLineNumbers
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Release Funds</h3>
              <CodeBlock 
                code={`// Buyer releases funds
await escrow.release(escrowId);

// Or with milestones
await escrow.releaseMilestone(escrowId, milestoneIndex);

// Provider claims released funds
await escrow.claim(escrowId);`}
                language="javascript"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Dispute Handling</h3>
              <CodeBlock 
                code={`// Open dispute
await escrow.openDispute(escrowId, "Work incomplete");

// Mediators vote
await escrow.voteOnDispute(escrowId, verdict);

// Funds distributed based on verdict`}
                language="javascript"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* SDK Reference */}
      <section id="javascript-sdk" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>📚</span>
          <span>JavaScript SDK</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Installation</h3>
              <CodeBlock 
                code="npm install @paylobster/sdk"
                language="bash"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Initialize</h3>
              <CodeBlock 
                code={`import { PayLobster } from '@paylobster/sdk';

const payLobster = new PayLobster({
  apiKey: process.env.PAYLOBSTER_API_KEY,
  network: 'base-mainnet'
});`}
                language="javascript"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Core Methods</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <code className="text-blue-400">createPayment(options)</code>
                  <p className="text-gray-400 mt-1">Create a payment request</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <code className="text-blue-400">createEscrow(options)</code>
                  <p className="text-gray-400 mt-1">Create an escrow transaction</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <code className="text-blue-400">getScore(agentId)</code>
                  <p className="text-gray-400 mt-1">Get LOBSTER score for an agent</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
                  <code className="text-blue-400">subscriptions.create(plan)</code>
                  <p className="text-gray-400 mt-1">Create a subscription</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* CLI Reference */}
      <section id="cli" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>⌨️</span>
          <span>CLI Reference</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Common Commands</h3>
              <CodeBlock 
                code={`# Setup and configuration
paylobster setup
paylobster config set API_KEY your_key_here

# Agent management
paylobster register MyAgent
paylobster status

# Payments
paylobster create-link --amount 10 --description "Service"
paylobster balance
paylobster history

# Reputation
paylobster score
paylobster reputation

# Help
paylobster help
paylobster help [command]`}
                language="bash"
                showLineNumbers
              />
            </div>
          </div>
        </Card>
      </section>

      {/* REST API */}
      <section id="rest-api" className="mb-16 scroll-mt-20">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <span>🌐</span>
          <span>REST API</span>
        </h2>
        <Card>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Base URL</h3>
              <code className="text-blue-400">https://api.paylobster.com/v1</code>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Endpoints</h3>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3 font-mono">
                  <span className="text-green-400">POST</span> <span className="text-gray-400">/charges</span>
                  <p className="text-gray-500 text-xs mt-1">Create a new charge</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3 font-mono">
                  <span className="text-blue-400">GET</span> <span className="text-gray-400">/charges/:id</span>
                  <p className="text-gray-500 text-xs mt-1">Retrieve a charge</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3 font-mono">
                  <span className="text-green-400">POST</span> <span className="text-gray-400">/payment-links</span>
                  <p className="text-gray-500 text-xs mt-1">Create a payment link</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3 font-mono">
                  <span className="text-green-400">POST</span> <span className="text-gray-400">/subscriptions</span>
                  <p className="text-gray-500 text-xs mt-1">Create a subscription</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded p-3 font-mono">
                  <span className="text-blue-400">GET</span> <span className="text-gray-400">/agents/:id</span>
                  <p className="text-gray-500 text-xs mt-1">Get agent info and score</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Authentication</h3>
              <CodeBlock 
                code="Authorization: Bearer your_api_key_here"
                language="bash"
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-8 mt-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            Questions? Join our <a href="https://discord.gg/paylobster" className="text-blue-400 hover:text-blue-300">Discord</a> or <a href="https://github.com/itsGustav/Pay-Lobster" className="text-blue-400 hover:text-blue-300">contribute on GitHub</a>.
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <a href="https://github.com/itsGustav/Pay-Lobster" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">GitHub</a>
            <span>•</span>
            <a href="https://basescan.org/address/0xA174ee274F870631B3c330a85EBCad74120BE662" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400">Contracts</a>
            <span>•</span>
            <a href="/docs/badges" className="hover:text-gray-400">Badges</a>
          </div>
        </div>
      </div>
    </div>
  );
}
