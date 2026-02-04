# 🦞 USDC Agent Skill

> Complete USDC payment infrastructure for Clawdbot via Circle's Programmable Wallets API.

**Built for the Circle USDC Hackathon 2026** 🏆

## Features

### Core Wallet Operations
- 💰 **Check USDC balances** across multiple chains
- 📤 **Send USDC** to any address or contact name
- 📥 **Receive USDC** with generated addresses  
- 🌉 **Cross-chain transfers** via Circle's CCTP
- 🤖 **Agent-to-agent payments** for autonomous commerce

### Invoicing & Billing
- 📄 **Invoice Creation** — Professional invoices with line items, tax
- 📧 **Invoice Delivery** — Send via email, Telegram, etc.
- ✅ **Payment Tracking** — Draft → Sent → Viewed → Paid lifecycle
- 🔗 **Payment Links** — EIP-681 style payment request URLs
- ⏰ **Overdue Detection** — Automatic status updates

### Recurring Payments
- 🔄 **Subscriptions** — Daily, weekly, biweekly, monthly, quarterly, yearly
- ⏸️ **Flexible Control** — Pause, resume, cancel anytime
- 📊 **Payment History** — Full execution history with tx hashes

### Address Book
- 👥 **Contacts** — Store names with multiple chain addresses
- 🏷️ **Tags & Search** — Organize and find contacts
- 🎯 **Name Resolution** — Send to "Alice" instead of 0x addresses
- 📋 **Import/Export** — CSV support for bulk operations

### Security & Approvals
- 🛡️ **Approval Policies** — Require approval for large transactions
- 👥 **Multi-Approver** — Configurable number of required approvals
- 💵 **Daily Limits** — Auto-trigger approval when limit exceeded
- ⏰ **Timeout Handling** — Auto-cancel or auto-approve on expiry

### Notifications
- 🔔 **Real-Time Alerts** — Incoming payments, large outgoing, etc.
- 🌐 **Webhook Support** — POST to external URLs with HMAC signatures
- 💬 **Clawdbot Integration** — Notifications via Telegram, etc.
- ⏱️ **Rate Limiting** — Configurable cooldowns to prevent spam

### Analytics & Reporting
- 📊 **Daily Summaries** — Sent, received, net per day
- 📈 **Category Breakdown** — Spending analysis by category
- 👤 **Contact Analysis** — Volume by contact, top recipients
- 🔗 **Chain Distribution** — Activity breakdown across chains
- 📤 **CSV Export** — Export transactions for accounting

### Tip Jar / Creator Economy
- 💰 **Tip Jars** — Let your community tip you in USDC
- 🏆 **Leaderboards** — Top tippers weekly/monthly/all-time
- 🎉 **Real-Time Notifications** — Get notified instantly on tips
- 🤖 **Agent-to-Agent Tips** — Clawdbots can tip each other

### Real Estate Escrow
- 🏠 **Earnest Money** — Hold deposits with condition-based release
- 🔑 **Security Deposits** — Rental deposits with move-out inspection
- 📋 **Conditions** — Inspection, financing, title, custom conditions
- ✍️ **Multi-Party Approval** — Buyer + seller sign-off for release
- 📄 **Document Tracking** — Attach contracts, inspection reports

## Quick Start

### 1. Get Circle Credentials

Sign up at [console.circle.com](https://console.circle.com) and create:
- API Key (Keys → Create a key → API key → Standard Key)
- Entity Secret

### 2. Set Environment Variables

```bash
export CIRCLE_API_KEY="your-api-key"
export CIRCLE_ENTITY_SECRET="your-entity-secret"
```

### 3. Install & Setup

```bash
cd skills/usdc-agent
npm install
npm run setup
```

### 4. Use It

```bash
# Check balance
npm run balance

# Send USDC
npx ts-node scripts/usdc-cli.ts send 10 to 0x1234...

# Get receive address
npm run receive

# Bridge across chains
npx ts-node scripts/usdc-cli.ts bridge 100 from ETH-SEPOLIA to AVAX-FUJI
```

## Architecture

```
usdc-agent/
├── SKILL.md                 # Clawdbot skill documentation
├── README.md                # This file
├── package.json             # Dependencies
├── lib/
│   ├── circle-client.ts     # Circle Programmable Wallets API client
│   ├── invoices.ts          # Invoice & recurring payment management
│   ├── contacts.ts          # Address book & contact resolution
│   ├── approvals.ts         # Multi-sig style approval workflows
│   ├── notifications.ts     # Real-time alerts & webhooks
│   └── analytics.ts         # Transaction analytics & reporting
├── scripts/
│   └── usdc-cli.ts          # CLI tool for testing
├── data/                    # Local data storage (created at runtime)
└── references/
    └── testnet-info.md      # Testnet contracts & faucets
```

## Supported Networks (Testnet)

| Network | Chain ID | USDC Contract |
|---------|----------|---------------|
| Ethereum Sepolia | ETH-SEPOLIA | Circle managed |
| Polygon Amoy | MATIC-AMOY | Circle managed |
| Avalanche Fuji | AVAX-FUJI | Circle managed |
| Arbitrum Sepolia | ARB-SEPOLIA | Circle managed |

## API Overview

### CircleClient

```typescript
import { CircleClient } from './lib/circle-client';

const client = new CircleClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

// Get balances
const balances = await client.getAllUSDCBalances();

// Send USDC
const tx = await client.sendUSDC({
  fromWalletId: 'wallet-id',
  toAddress: '0x...',
  amount: '100',
});

// Bridge via CCTP
const bridge = await client.bridgeUSDC({
  fromWalletId: 'wallet-id',
  toAddress: '0x...',
  fromChain: 'ETH-SEPOLIA',
  toChain: 'AVAX-FUJI',
  amount: '50',
});
```

### InvoiceManager

```typescript
import { InvoiceManager } from './lib/invoices';

const invoices = new InvoiceManager();

// Create invoice
const invoice = await invoices.create({
  from: { name: 'My Business', walletAddress: '0x...' },
  to: { name: 'Client Corp', email: 'billing@client.com' },
  items: [
    { description: 'Web Development', quantity: 1, unitPrice: '500' },
    { description: 'Hosting (monthly)', quantity: 3, unitPrice: '50' },
  ],
  taxRate: 8.25,
  dueDate: '2026-03-01',
});

// Track payments
await invoices.markPaid(invoice.id, '0xtxhash...');
```

### ContactManager

```typescript
import { ContactManager } from './lib/contacts';

const contacts = new ContactManager();

// Add contact
await contacts.add({
  name: 'Alice Smith',
  alias: 'alice',
  addresses: [
    { chain: 'ETH-SEPOLIA', address: '0x...' },
    { chain: 'AVAX-FUJI', address: '0x...' },
  ],
  tags: ['vendor', 'priority'],
});

// Resolve recipient (by name or address)
const recipient = await contacts.resolveRecipient('alice', 'ETH-SEPOLIA');
```

### ApprovalManager

```typescript
import { ApprovalManager } from './lib/approvals';

const approvals = new ApprovalManager();

// Create policy
await approvals.createPolicy({
  name: 'Large Transactions',
  conditions: { minAmount: '1000' },
  approvers: ['owner-session-id'],
  requiredApprovals: 1,
});

// Submit for approval
const pending = await approvals.submitForApproval({
  type: 'send',
  fromWalletId: '...',
  toAddress: '0x...',
  amount: '5000',
  chain: 'ETH-SEPOLIA',
  requestedBy: 'agent',
});

// Approve
await approvals.decide(pending.id, 'owner-session-id', 'approve');
```

## Testnet Faucets

Get testnet USDC:
- **Circle Faucet**: https://faucet.circle.com/
- **Sepolia ETH**: https://sepoliafaucet.com/

## License

MIT - Built with ❤️ for Circle USDC Hackathon 2026
