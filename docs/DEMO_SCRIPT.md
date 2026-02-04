# USDC Agent Demo Script

**Duration:** 3-5 minutes  
**Format:** Screen recording with voiceover

---

## Opening (15 sec)

**[Screen: Clawdbot logo + USDC Agent title card]**

> "USDC Agent is a Clawdbot skill that brings full USDC payment infrastructure to AI agents. Send, receive, invoice, escrow — all through natural language."

---

## Part 1: Basic Operations (45 sec)

**[Screen: Telegram chat with Clawdbot]**

### Check Balance
```
User: "What's my USDC balance?"
Bot: "💰 Your USDC balances:
      • ETH-Sepolia: $1,250.00 USDC
      • Polygon-Amoy: $500.00 USDC
      Total: $1,750.00 USDC"
```

> "Check balances across multiple chains instantly."

### Send Payment
```
User: "Send 100 USDC to alice"
Bot: "📤 Sending 100 USDC to Alice Smith (0x1234...5678)
      Chain: ETH-Sepolia
      ✅ Transaction confirmed: 0xabc..."
```

> "Send to contacts by name — no need to remember addresses."

### Cross-Chain Bridge
```
User: "Bridge 200 USDC from Ethereum to Avalanche"
Bot: "🌉 Bridging via CCTP...
      From: ETH-Sepolia
      To: AVAX-Fuji
      ✅ Bridge complete in ~30 seconds"
```

> "Cross-chain transfers powered by Circle's CCTP."

---

## Part 2: Invoicing (45 sec)

**[Screen: Invoice creation flow]**

### Create Invoice
```
User: "Create invoice for ACME Corp: website development $2,500, hosting $150"
Bot: "📄 Invoice INV-K9XY2 created!
      To: ACME Corp
      • Website development: $2,500.00
      • Hosting: $150.00
      Total: $2,650.00 USDC
      
      Payment link generated. Send to client?"
```

> "Professional invoices with line items. Track from draft to paid."

### Track Invoices
```
User: "Show unpaid invoices"
Bot: "📋 Outstanding invoices:
      • INV-K9XY2 — ACME Corp — $2,650 (sent 3 days ago)
      • INV-J8WZ1 — Client B — $800 (overdue)"
```

> "Full lifecycle tracking: draft, sent, viewed, paid, overdue."

---

## Part 3: Contacts & Address Book (30 sec)

**[Screen: Contact management]**

```
User: "Add contact: Bob Smith, Ethereum 0x7890..., tag: vendor"
Bot: "✅ Contact added: Bob Smith
      ETH: 0x7890...
      Tags: vendor"

User: "Send 50 USDC to Bob"
Bot: "📤 Sending to Bob Smith...
      ✅ Confirmed"
```

> "Build your address book. Send by name, not by address. Tag and organize contacts."

---

## Part 4: Recurring Payments (30 sec)

**[Screen: Subscription setup]**

```
User: "Set up monthly payment: $99 to alice for hosting"
Bot: "🔄 Recurring payment scheduled:
      • $99 USDC to Alice
      • Frequency: Monthly
      • Next payment: March 1
      
      I'll handle it automatically."
```

> "Subscriptions, payroll, rent — automated recurring payments."

---

## Part 5: Transaction Approvals (30 sec)

**[Screen: Approval flow]**

```
User: "Send 5,000 USDC to new vendor"
Bot: "⚠️ This transaction requires approval (amount > $500)
      Pending approval from: owner
      
      [Approve] [Reject]"

Owner: [Clicks Approve]
Bot: "✅ Approved. Transaction executing...
      ✅ Sent 5,000 USDC"
```

> "Built-in security. Set policies for large transactions, require multi-party approval."

---

## Part 6: Real Estate Escrow (45 sec)

**[Screen: Escrow creation]**

```
User: "Create earnest money escrow for 123 Main St, $10,000, buyer: John, seller: Jane"
Bot: "🏠 Earnest Money Escrow Created
      ID: EM-XYZ123
      Property: 123 Main St, Orlando, FL
      Amount: $10,000 USDC
      
      Conditions:
      ⏳ Home inspection
      ⏳ Financing approval
      ⏳ Title clear
      
      Escrow address: 0x...
      Funding deadline: Feb 6"
```

> "Real estate escrow for earnest money deposits. Conditions-based release, multi-party approval, full audit trail."

### Satisfy Condition
```
User: "Mark inspection passed for EM-XYZ123"
Bot: "✅ Condition satisfied: Home inspection
      2/3 conditions remaining"
```

> "Track contingencies. Auto-release on closing or refund on failed conditions."

---

## Part 7: Tip Jar (30 sec)

**[Screen: Creator economy]**

```
User: "Create my tip jar"
Bot: "💰 Tip Jar Created!
      Name: Gustav's Tip Jar
      Link: tip.clawd.bot/gustav
      
      Suggested amounts: $5, $10, $25, $50"

[Someone tips]
Bot: "🎉 You received a $10 USDC tip from @alice!
      'Thanks for the help!'"
```

> "Creator economy built in. Let your community tip you in USDC."

---

## Part 8: Analytics (30 sec)

**[Screen: Analytics dashboard]**

```
User: "Show my USDC report for January"
Bot: "📊 USDC Activity Report - January 2026
      
      • Total Sent: $12,450 USDC
      • Total Received: $18,200 USDC
      • Net Flow: +$5,750 USDC
      • Transactions: 47
      
      Top contacts by volume:
      1. Alice Smith — $8,500
      2. ACME Corp — $5,200
      
      [Export CSV]"
```

> "Full analytics and reporting. Export to CSV for accounting."

---

## Closing (15 sec)

**[Screen: Feature summary + links]**

> "USDC Agent: Complete payment infrastructure for AI agents.
> 
> Built with Circle Programmable Wallets, CCTP, and ❤️.
> 
> GitHub: github.com/itsGustav/usdc-agent
> Built for Circle Hackathon 2026"

---

## Recording Tips

1. **Clean terminal** — Hide sensitive info, use testnet
2. **Slow down** — Pause briefly after each command
3. **Show results** — Let transaction confirmations display
4. **Use real data** — Pre-populate contacts, invoices for demo
5. **Background music** — Light, upbeat, not distracting

## Required Assets

- [ ] Clawdbot logo
- [ ] USDC Agent title card
- [ ] Circle logo (attribution)
- [ ] Screen recording software (OBS/Loom)
- [ ] Test wallet with testnet USDC
- [ ] Pre-populated demo data
