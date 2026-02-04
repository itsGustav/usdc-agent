# Product Hunt Launch Copy

## Product Name
**Lobster Pay**

## Tagline (60 chars max)
Payment infrastructure for AI agents 🤖💰

## Description (260 chars)
Send, receive, and escrow USDC between AI agents. Built-in trust verification via ERC-8004. x402 protocol for automatic HTTP payments. One line of code to start. Open source.

## Full Description

### The Problem
AI agents are everywhere—coding, browsing, making decisions. But when Agent A needs to pay Agent B for a service, there's no standard way to do it. Manual invoices? Doesn't scale. Direct wallet transfers? No trust verification.

### The Solution
**Lobster Pay** is the complete payment stack for AI agents:

🔹 **Circle USDC Integration** — Send, receive, and bridge USDC across Ethereum, Polygon, Avalanche, Arbitrum, and Base via Circle's Programmable Wallets.

🔹 **x402 Protocol** — HTTP-native micropayments. When an API returns `402 Payment Required`, your agent automatically pays and retries. No invoices, no manual steps.

🔹 **ERC-8004 Trust Layer** — On-chain identity and reputation. Verify agents before paying, post feedback after transactions. Higher trust scores unlock higher payment limits.

🔹 **Escrow as a Service** — Pre-built templates for freelance, real estate, commerce, and P2P transactions. Condition-based release with multi-party approval.

### How It Works
```typescript
// Initialize your agent
const agent = await createLobsterAgent({
  circleApiKey: '...',
  circleEntitySecret: '...',
});

// Check balance
await agent.balance(); // "1000"

// Send payment
await agent.send('0x...', '100');

// Pay for API call automatically
const data = await agent.pay('https://api.example.com/premium');

// Check trust score
await agent.status(); // { trustScore: 85, reputation: 'trusted' }
```

### Why Now?
- AI agents are becoming autonomous economic actors
- Circle provides the best stablecoin infrastructure
- ERC-8004 just launched for agent trust
- The agentic economy needs payment rails

### Open Source
MIT licensed. Built by the community, for the community.

GitHub: https://github.com/itsGustav/lobster-pay

---

## Topics/Categories
- Artificial Intelligence
- Fintech
- Crypto
- Developer Tools
- Open Source

## Makers
@itsGustav (or your handle)

## First Comment (from maker)
Hey Product Hunt! 👋

I built Lobster Pay because I kept running into the same problem: AI agents need to pay each other, but there's no good way to do it.

So I combined:
- Circle's USDC infrastructure (best stablecoin API)
- x402 protocol (HTTP-native payments)
- ERC-8004 (on-chain agent identity & trust)

The result is a one-liner SDK that gives any AI agent a wallet with built-in trust verification.

This started as a hackathon project, but I think it could be foundational infrastructure for the agentic economy.

Would love your feedback! What features would you want to see next?

## Gallery Images Needed
1. Hero image with logo + tagline
2. Architecture diagram
3. Code snippet screenshot
4. Landing page screenshot
5. Trust score visualization
6. Demo GIF

## Promotional Tweet
Just launched @usdc_agent on @ProductHunt!

Payment infrastructure for AI agents 🤖💰

• Circle USDC integration
• x402 automatic payments
• ERC-8004 trust verification
• Escrow templates

Give it an upvote! 🚀

[Product Hunt link]

#ProductHunt #AI #USDC #Circle
