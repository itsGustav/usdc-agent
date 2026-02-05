# Pay Lobster — Base Builder Grant Application

## Project Name
**Pay Lobster** 🦞

## One-liner
Payment infrastructure for AI agents — send, receive, and escrow USDC with built-in trust verification on Base.

## Project Links
- **Website:** https://paylobster.com
- **Demo:** https://paylobster.com/demo
- **Demo Video:** https://drive.google.com/file/d/13yOGtL9xx4YIF_U_xpPw-HPBnoJ0E1-r/view
- **GitHub:** https://github.com/itsGustav/Pay-Lobster
- **npm:** https://www.npmjs.com/package/pay-lobster
- **Basename:** paylobster.base.eth

## Smart Contracts (Base Mainnet)
- **PayLobsterEscrow:** [0xa091fC821c85Dfd2b2B3EF9e22c5f4c8B8A24525](https://basescan.org/address/0xa091fC821c85Dfd2b2B3EF9e22c5f4c8B8A24525)
- **PayLobsterRegistry:** [0x10BCa62Ce136A70F914c56D97e491a85d1e050E7](https://basescan.org/address/0x10BCa62Ce136A70F914c56D97e491a85d1e050E7)

## Socials
- **Twitter/X:** @PayLobster_com (project), @jakubadamo (builder)
- **Farcaster:** @ChaseKeyes

---

## What does your project do?

Pay Lobster is the complete payment stack for the agentic economy. We provide everything AI agents need to handle money autonomously:

### Core Features (All Live on Base Mainnet)
1. **Instant USDC Transfers** — Programmatic send/receive with sub-cent fees
2. **Trustless Escrow** — Smart contract-based milestone payments (create, release, refund, dispute)
3. **On-Chain Agent Registry** — Identity verification via ERC-8004 standard
4. **Trust Scores** — Reputation system based on transaction history and ratings
5. **Agent Discovery** — Find verified agents by capability and trust level

### Why It Matters
AI agents are becoming economic actors. They hire other agents, pay for API calls, and complete freelance work. But existing payment infrastructure wasn't built for autonomous systems — it requires human approval, web UIs, and centralized intermediaries.

Pay Lobster removes those barriers. Agents can transact trustlessly, verify counterparties on-chain, and use smart escrow for milestone payments — all without human intervention.

---

## How does it work?

### For Developers
```bash
npm install pay-lobster
paylobster setup  # Interactive CLI wizard
```

```typescript
import { LobsterAgent } from 'pay-lobster';

const agent = new LobsterAgent({ privateKey });
await agent.initialize();

// Send USDC
await agent.send('0x...', '25.00');

// Create escrow
await agent.createEscrow({
  amount: '500',
  recipient: '0x...',
  conditions: { description: 'Website delivery' }
});

// Check trust score before transacting
const trust = await agent.getTrustScore('0x...');
```

### For AI Agents (Chat Interface)
```
paylobster balance       — Check USDC balance
paylobster send $25 to 0x...  — Send USDC
paylobster escrow $500 @seller "desc"  — Create escrow
paylobster trust 0x...   — Check trust score
paylobster discover      — Find agents by capability
```

---

## Impact on Base Ecosystem

1. **Enables Agent Economy** — Agents can now transact autonomously on Base
2. **Increases USDC Utility** — New use case: agent-to-agent payments
3. **Drives TVL** — Escrow contracts hold USDC on-chain
4. **Open Source** — Full SDK + contracts available for ecosystem builders
5. **Standards Adoption** — Implements ERC-8004 for agent identity

---

## Traction

- **npm Package:** pay-lobster@1.1.4 (published)
- **Smart Contracts:** 2 deployed on Base mainnet
- **OpenClaw Skill:** Available for 1000+ AI agents
- **Hackathon:** Circle USDC Hackathon submission (Feb 2026)
- **Community:** Active on Moltbook with engaged following

---

## Team

**Jakub Adamowicz**
- Real estate entrepreneur + software builder
- Orlando, FL
- Twitter: @jakubadamo
- Farcaster: @ChaseKeyes

---

## Grant Request

Requesting **3-5 ETH** to:
1. Fund escrow demonstration transactions
2. Cover gas for registry operations
3. Sponsor early adopter transaction fees
4. Continue development of managed wallet service

---

## Why Base?

- **Sub-cent fees** — Essential for microtransactions between agents
- **Speed** — Sub-second finality for real-time payments
- **USDC native** — Circle's home for stablecoins
- **AI-forward** — AgentKit and ecosystem support for autonomous agents
- **Community** — Builder-first culture aligned with our mission

---

*🦞 Pay Lobster — Real autonomous payments for AI agents. Built on Base.*
