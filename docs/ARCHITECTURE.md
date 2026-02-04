# Lobster Pay Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLAWDBOT GATEWAY                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Telegram   │  │   Discord   │  │    CLI      │  ...            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    USDC AGENT SKILL                          │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │                 Natural Language Parser               │   │  │
│  │  │  "send 100 usdc to alice" → { action, amount, to }   │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  │                           │                                  │  │
│  │  ┌────────────────────────┼────────────────────────────┐    │  │
│  │  │                        ▼                            │    │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │    │  │
│  │  │  │ Wallet  │  │ Invoice │  │ Contact │  │  Tips  │ │    │  │
│  │  │  │  Ops    │  │ Manager │  │ Manager │  │  Jar   │ │    │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │    │  │
│  │  │       │            │            │           │       │    │  │
│  │  │  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐  ┌──┴─────┐ │    │  │
│  │  │  │Recurring│  │ Escrow  │  │Approval │  │Notifier│ │    │  │
│  │  │  │Payments │  │ Manager │  │ System  │  │        │ │    │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │    │  │
│  │  │       │            │            │           │       │    │  │
│  │  │       └────────────┼────────────┼───────────┘       │    │  │
│  │  │                    ▼            ▼                   │    │  │
│  │  │         ┌─────────────────────────────┐             │    │  │
│  │  │         │    Analytics Engine         │             │    │  │
│  │  │         │  (Reporting, CSV Export)    │             │    │  │
│  │  │         └─────────────────────────────┘             │    │  │
│  │  │                        │                            │    │  │
│  │  └────────────────────────┼────────────────────────────┘    │  │
│  │                           ▼                                  │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │                 Circle Client                         │   │  │
│  │  │  • Programmable Wallets API                          │   │  │
│  │  │  • CCTP Bridge Integration                           │   │  │
│  │  │  • Entity Secret Encryption                          │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CIRCLE INFRASTRUCTURE                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ Programmable    │  │      CCTP       │  │   Gas Station   │     │
│  │ Wallets API     │  │   (Bridging)    │  │   (Gasless)     │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BLOCKCHAIN NETWORKS                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ Ethereum │  │ Polygon  │  │ Avalanche│  │ Arbitrum │    │   │
│  │  │ (Sepolia)│  │  (Amoy)  │  │  (Fuji)  │  │ (Sepolia)│    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### Core Modules

| Module | File | Purpose |
|--------|------|---------|
| **Circle Client** | `lib/circle-client.ts` | API wrapper for Circle Programmable Wallets |
| **Invoices** | `lib/invoices.ts` | Invoice creation, tracking, recurring payments |
| **Contacts** | `lib/contacts.ts` | Address book, name resolution |
| **Approvals** | `lib/approvals.ts` | Multi-sig style transaction approvals |
| **Notifications** | `lib/notifications.ts` | Real-time alerts, webhooks |
| **Analytics** | `lib/analytics.ts` | Reporting, CSV export |
| **Tips** | `lib/tips.ts` | Tip jars, creator economy |
| **Escrow** | `lib/escrow.ts` | Real estate escrow (earnest money, security deposits) |

### Data Flow

```
User Command → Parse → Validate → Check Approvals → Execute → Notify → Log
     │            │         │            │              │         │       │
     │            │         │            │              │         │       │
     ▼            ▼         ▼            ▼              ▼         ▼       ▼
"send 50    Extract     Contact     If policy     Circle      Push    Record in
USDC to     action,     lookup,     triggers,     API         to      analytics
alice"      amount,     address     queue for     call        webhook
            recipient   validation  approval
```

## Security Model

### Transaction Approval Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    APPROVAL POLICY CHECK                        │
│                                                                 │
│  Transaction Request                                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────┐     No      ┌──────────────────┐         │
│  │ Policy Matches? │────────────▶│ Execute Directly │         │
│  └────────┬────────┘             └──────────────────┘         │
│           │ Yes                                                 │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Queue for       │                                           │
│  │ Approval        │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Notify          │                                           │
│  │ Approvers       │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐  Rejected  ┌──────────────────┐          │
│  │ Collect         │───────────▶│ Cancel & Notify  │          │
│  │ Approvals       │            └──────────────────┘          │
│  └────────┬────────┘                                           │
│           │ Approved                                            │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Execute         │                                           │
│  │ Transaction     │                                           │
│  └─────────────────┘                                           │
└────────────────────────────────────────────────────────────────┘
```

## Escrow Architecture

### Earnest Money Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    EARNEST MONEY ESCROW                          │
│                                                                  │
│  1. CREATE                                                       │
│     Buyer ──▶ Create Escrow ──▶ Escrow Address Generated        │
│                                                                  │
│  2. FUND                                                         │
│     Buyer ──▶ Send USDC ──▶ Escrow Address ──▶ Status: FUNDED   │
│                                                                  │
│  3. CONDITIONS                                                   │
│     ┌────────────┬────────────┬────────────┐                    │
│     │ Inspection │ Financing  │   Title    │                    │
│     │  ⏳ Pending │ ⏳ Pending  │ ⏳ Pending  │                    │
│     └─────┬──────┴─────┬──────┴─────┬──────┘                    │
│           │            │            │                            │
│           ▼            ▼            ▼                            │
│     ┌────────────┬────────────┬────────────┐                    │
│     │ ✅ Passed  │ ✅ Approved │ ✅ Clear   │                    │
│     └────────────┴────────────┴────────────┘                    │
│                         │                                        │
│                         ▼                                        │
│  4. APPROVAL                                                     │
│     Buyer ✓  +  Seller ✓  ──▶ Ready for Release                 │
│                                                                  │
│  5. RELEASE (at closing)                                         │
│     Escrow ──▶ Release to Seller ──▶ Status: RELEASED           │
│                                                                  │
│  OR REFUND (condition failed)                                    │
│     Escrow ──▶ Refund to Buyer ──▶ Status: REFUNDED             │
└──────────────────────────────────────────────────────────────────┘
```

## API Integration Points

### Circle APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Wallet Sets | `/developer/walletSets` | Create/list wallet containers |
| Wallets | `/wallets` | Create/list developer wallets |
| Balances | `/wallets/{id}/balances` | Get token balances |
| Transfers | `/developer/transactions/transfer` | Send USDC |
| Contract Exec | `/developer/transactions/contractExecution` | CCTP bridge calls |

### Webhook Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `payment_received` | Incoming USDC transfer | `{ amount, from, to, chain, txHash }` |
| `payment_sent` | Outgoing USDC transfer | `{ amount, from, to, chain, txHash }` |
| `approval_required` | Transaction needs approval | `{ txId, amount, to, policy }` |
| `escrow_funded` | Escrow receives funds | `{ escrowId, amount, txHash }` |
| `tip_received` | Tip jar receives tip | `{ jarId, amount, from, message }` |

## Data Storage

All data is stored locally in JSON files:

```
data/
├── invoices.json       # Invoice records
├── recurring.json      # Recurring payment schedules
├── contacts.json       # Address book
├── approval-policies.json
├── pending-transactions.json
├── daily-spending.json
├── notification-configs.json
├── notification-history.json
├── transactions.json   # Analytics records
├── tip-jars.json
├── tips.json
└── escrows.json
```

In production, these would be replaced with:
- Encrypted database (SQLite/PostgreSQL)
- Smart contract state for escrows
- Distributed storage for multi-agent scenarios

## Future Enhancements

1. **Smart Contract Escrows** - Deploy actual escrow contracts on-chain
2. **Gasless Transactions** - Integrate Circle Paymaster for gas sponsorship
3. **Multi-chain Invoices** - Accept payment on any supported chain
4. **Streaming Payments** - Sablier-style continuous payment streams
5. **DAO Treasury Integration** - Multi-sig treasury management
