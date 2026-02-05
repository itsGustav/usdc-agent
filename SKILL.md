# Pay Lobster - USDC Payment Skill 🦞

**Status**: ✅ **FULLY LIVE** - Real smart contracts on Base mainnet

**Version**: 1.1.0  
**npm**: `pay-lobster@1.1.0`  
**Website**: [paylobster.com](https://paylobster.com)

---

## Smart Contracts (Base Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **PayLobsterEscrow** | `0xa091fC821c85Dfd2b2B3EF9e22c5f4c8B8A24525` | Trustless USDC escrow |
| **PayLobsterRegistry** | `0x10BCa62Ce136A70F914c56D97e491a85d1e050E7` | Agent identity & trust |
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Circle USDC token |

**Network**: Base Mainnet (Chain ID: 8453)  
**RPC**: https://mainnet.base.org

---

## ⚙️ Configuration

To enable autonomous payments, set the private key:

```bash
export PAYLOBSTER_PRIVATE_KEY="0x..."
```

**Security Notes:**
- Keep private key secure — anyone with it can spend funds
- Use a dedicated hot wallet with limited funds
- Never commit private keys to git

---

## 💰 Wallet Commands

### `paylobster balance`
Check real USDC & ETH balance from blockchain.
```
🦞 Pay Lobster Balance

Wallet: 0xf775...8b7B
Network: Base Mainnet

💰 USDC: $42.50
⟠ ETH:  0.057026 (for gas)
```

### `paylobster wallet` / `paylobster receive`
Show wallet address for deposits.
```
🦞 Pay Lobster Wallet

Address: 0xf775f0224A680E2915a066e53A389d0335318b7B
Network: Base Mainnet

Send USDC to this address on Base.
```

### `paylobster history`
Query recent USDC transfers from blockchain.
```
🦞 Recent Transactions

1. -$10.00 → 0x742d...bEb (2h ago)
2. +$25.00 ← 0x891a...cDf (1d ago)
3. -$5.00 → 0x123...456 (2d ago)
```

---

## 💸 Payment Commands

### `paylobster send $X to <address>` ✅ REAL
Signs and broadcasts USDC transfer on-chain.
```
🦞 Sending $10 USDC...

📤 Transaction: 0x7f3a...8c2d
✅ Confirmed in block 12345678

View: basescan.org/tx/0x7f3a...8c2d
```

### `paylobster tip $X @agent` ✅ REAL
Tip another agent with real on-chain transfer.
```
🦞 Tip Sent!

Amount: $5 USDC
To: @agent (0x...)

📤 tx: 0x7f3a...8c2d
✅ Confirmed!
```

### `paylobster gas`
Check current Base gas prices.
```
🦞 Base Gas Prices

⚡ Low: 0.001 gwei (~$0.001)
🚗 Medium: 0.002 gwei (~$0.002)
🚀 High: 0.005 gwei (~$0.005)

Base L2 = cheap gas 💪
```

---

## 🔒 Escrow Commands (On-Chain)

All escrow operations use the PayLobsterEscrow smart contract.

### `paylobster escrow $X @seller "description"` ✅ REAL
Creates escrow on-chain, locks USDC in contract.
```
🦞 Escrow Created

ID: 0
Amount: $100 USDC
Seller: 0x...
Description: "Website delivery"

Funds locked in contract until release.
```

### `paylobster release <id>` ✅ REAL
Releases escrow funds to seller (buyer only).
```
🦞 Escrow Released!

ID: 0
Amount: $100 USDC sent to seller
tx: 0x...
```

### `paylobster refund <id>` ✅ REAL
Refunds escrow to buyer (seller only, or buyer after deadline).
```
🦞 Escrow Refunded!

ID: 0
Amount: $100 USDC returned to buyer
tx: 0x...
```

### `paylobster dispute <id>` ✅ REAL
Flags escrow for arbitration.
```
🦞 Escrow Disputed

ID: 0 is now in dispute.
Arbiter will review and resolve.
```

---

## ⭐ Trust & Registry Commands (On-Chain)

All registry operations use the PayLobsterRegistry smart contract.

### `paylobster register "name" capabilities` ✅ REAL
Register agent identity on-chain.
```
🦞 Agent Registered!

Name: MyAgent
Capabilities: payments,escrow,code-review
Address: 0x...

Your on-chain identity is live!
```

### `paylobster trust <address>` ✅ REAL
Query agent trust score from on-chain ratings.
```
🦞 Trust Score: 0x...

Score: 85/100
Level: Trusted
Ratings: 12
```

### `paylobster rate <address> <1-5> "comment"` ✅ REAL
Rate an agent (stored on-chain forever).
```
🦞 Rating Submitted!

Agent: 0x...
Rating: ⭐⭐⭐⭐⭐ (5/5)
Comment: "Excellent service!"

tx: 0x...
```

### `paylobster discover` ✅ REAL
Find registered agents from on-chain registry.
```
🦞 Registered Agents

1. PayLobster (100/100) — payments,escrow
2. CodeReviewer (92/100) — code-review,audit
3. DataBot (78/100) — analysis,reports

Query: registry.discoverAgents()
```

---

## 🔄 Self-Update Command

### `paylobster update`
Updates Pay Lobster to the latest version.
```
🦞 Pay Lobster Self-Update

Current: 1.1.0
Latest:  1.2.0

📦 Updating npm package...
📥 Fetching latest skill file...

✅ Pay Lobster updated to v1.2.0!
```

**What it updates:**
- npm package (`pay-lobster@latest`)
- Skill file (SKILL.md)
- Contract addresses (if changed)

**Run manually:**
```bash
~/clawd/skills/pay-lobster/scripts/update.sh
```

---

## 📊 Analytics Commands

### `paylobster stats`
Spending summary.
```
🦞 Your Stats

This Month:
• Sent: $245.00
• Received: $180.00
• Net: -$65.00

All Time:
• Total volume: $2,450.00
• Transactions: 47
```

---

## 🔧 SDK Usage

```typescript
import { LobsterAgent } from 'pay-lobster';

const agent = new LobsterAgent({
  privateKey: process.env.PAYLOBSTER_PRIVATE_KEY,
  network: 'base'
});

await agent.initialize();

// Check balance
const balance = await agent.getBalance();

// Send USDC (REAL!)
const tx = await agent.send('0x...', '10');

// Create escrow (REAL!)
const escrow = await agent.createEscrow({
  amount: '100',
  recipient: '0x...',
  conditions: { description: 'Website delivery' }
});

// Release escrow
await agent.releaseEscrow('0');

// Register agent
await agent.registerAgent({
  name: 'MyAgent',
  capabilities: ['payments', 'escrow']
});

// Rate agent
await agent.rateAgent({
  agent: '0x...',
  rating: 5,
  comment: 'Excellent!'
});

// Get trust score
const trust = await agent.getTrustScore('0x...');

// Discover agents
const agents = await agent.discoverAgents({ limit: 10 });
```

---

## 📝 Notes

- All transactions are **REAL** on Base mainnet
- Escrow funds are locked in smart contracts
- Ratings are stored on-chain permanently
- Trust scores calculated from on-chain ratings
- Gas fees are ~$0.001-0.01 per transaction

**Contract Links:**
- [Escrow on BaseScan](https://basescan.org/address/0xa091fC821c85Dfd2b2B3EF9e22c5f4c8B8A24525)
- [Registry on BaseScan](https://basescan.org/address/0x10BCa62Ce136A70F914c56D97e491a85d1e050E7)

🦞 **Pay Lobster — Real autonomous payments for AI agents**
