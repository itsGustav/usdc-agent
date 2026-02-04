# ERC-8004 Trustless Agents Integration

> On-chain identity, reputation, and trust for AI agent payments.

## Overview

Lobster Pay integrates with [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) to enable:

- **On-chain Agent Identity** — NFT-based identity in the Identity Registry
- **Reputation System** — Feedback and ratings after transactions
- **Trust Verification** — Verify agents before paying them
- **Agent Discovery** — Find trusted agents by capability

This creates a trust layer for agent-to-agent commerce, ensuring safe USDC payments between AI agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Lobster Pay Skill                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   x402      │    │   Circle    │    │  ERC-8004   │     │
│  │  Protocol   │────│    USDC     │────│   Trust     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│        │                  │                  │              │
│        └──────────────────┼──────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│   Identity    │   │  Reputation   │   │  Validation   │
│   Registry    │   │   Registry    │   │   Registry    │
│   (ERC-721)   │   │  (Feedback)   │   │   (Proofs)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Ethereum    │
                    │   (L1/L2)     │
                    └───────────────┘
```

## Quick Start

### 1. Install & Configure

```typescript
import { ERC8004Client, createERC8004Client } from './lib/erc8004';

// Create client
const erc8004 = createERC8004Client(
  'BASE-SEPOLIA',           // Chain
  process.env.PRIVATE_KEY,  // For transactions
  {
    paymentAddress: '0x...', // Your USDC receive address
    x402Endpoint: 'https://your-agent.com/x402',
  }
);
```

### 2. Register Your Agent

```typescript
// Register with the Identity Registry
const agentId = await erc8004.registerAgent({
  name: 'My Lobster Pay',
  description: 'AI agent that accepts USDC payments for data analysis',
  image: 'https://example.com/agent-logo.png',
  capabilities: ['data-analysis', 'report-generation', 'x402-payments'],
  mcpEndpoint: 'https://my-agent.com/mcp',
  a2aEndpoint: 'https://my-agent.com/.well-known/agent-card.json',
});

console.log(`Registered with Agent ID: ${agentId}`);
```

### 3. Verify Before Paying

```typescript
// Before paying another agent, verify them
const verification = await erc8004.verifyAgent(targetAgentId);

if (verification.verified) {
  console.log(`Agent verified! Trust score: ${verification.trustScore}`);
  console.log(`Recommendation: ${verification.recommendation}`);
} else {
  console.log(`Agent verification failed: ${verification.reasons.join(', ')}`);
}
```

### 4. Check Payment Safety

```typescript
// Check if a payment amount is safe for the agent's trust level
const safety = await erc8004.isPaymentSafe(targetAgentId, 500); // $500 USDC

if (safety.safe) {
  console.log('Payment is within safe limits');
} else {
  console.log(`Warning: ${safety.reason}`);
  console.log(`Max recommended: $${safety.maxRecommendedAmount}`);
}
```

### 5. Post Feedback After Transactions

```typescript
// After successful payment
await erc8004.postPaymentSuccess(
  targetAgentId,
  txHash,
  '100' // Amount in USDC
);

// After failed payment
await erc8004.postPaymentFailure(
  targetAgentId,
  'Service timeout'
);

// After escrow completion
await erc8004.postEscrowFeedback(
  targetAgentId,
  escrowId,
  'released' // or 'refunded' or 'disputed'
);
```

## Contract Addresses

### Testnets (Same addresses across all testnets)

| Registry | Address |
|----------|---------|
| Identity | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

**Supported Testnets:** ETH Sepolia, Base Sepolia, Polygon Amoy, Arbitrum Sepolia

### Mainnets (Same addresses across all mainnets)

| Registry | Address |
|----------|---------|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |

**Supported Mainnets:** Ethereum, Base, Polygon, Arbitrum, BSC, Scroll, Gnosis, Monad

## Trust Levels

Agents are categorized by their reputation:

| Level | Min Score | Min Feedback | Description |
|-------|-----------|--------------|-------------|
| `untrusted` | - | 0 | No history or negative |
| `new` | 0 | 1 | Just started |
| `emerging` | 25 | 5 | Building reputation |
| `established` | 50 | 20 | Consistent track record |
| `trusted` | 75 | 50 | Highly reliable |
| `verified` | 90 | 100 | Elite status |

## Payment Safety Tiers

Maximum recommended payments based on trust score:

| Trust Score | Max Recommended |
|-------------|-----------------|
| 90+ | $10,000 |
| 80+ | $1,000 |
| 70+ | $500 |
| 50+ | $100 |
| 30+ | $25 |
| 0+ | $5 |

## Agent Discovery

### Find Payment-Ready Agents

```typescript
// Find agents that accept x402 payments
const paymentAgents = await erc8004.findPaymentAgents(50); // Min trust score

for (const agent of paymentAgents) {
  console.log(`${agent.agent.registration?.name}`);
  console.log(`  Trust: ${agent.trustScore}`);
  console.log(`  Payment Address: ${agent.paymentAddress}`);
  console.log(`  x402 Endpoint: ${agent.x402Endpoint}`);
}
```

### Find Escrow-Capable Agents

```typescript
// Find agents with escrow capability
const escrowAgents = await erc8004.findEscrowAgents('emerging');

for (const agent of escrowAgents) {
  console.log(`${agent.agent.registration?.name}`);
  console.log(`  Trust Level: ${agent.reputation.trustLevel}`);
  console.log(`  Escrow Support: ${agent.agent.registration?.usdcAgent?.escrowSupport}`);
}
```

## Integration with x402

Combine x402 payments with ERC-8004 trust verification:

```typescript
import { createTrustedX402Payment } from './lib/erc8004';
import { X402Client } from './lib/x402-client';

// Create trusted payment flow
const result = await createTrustedX402Payment({
  erc8004,
  targetAgentId: 42,
  amountUsdc: 10,
  endpoint: 'https://agent-api.com/premium',
  paymentFn: async () => {
    // Your x402 payment logic
    const response = await x402Client.fetch(endpoint);
    return {
      success: response.ok,
      txHash: response.paymentTxHash,
    };
  },
});

console.log(`Payment: ${result.success ? 'Success' : 'Failed'}`);
console.log(`Trust Score: ${result.trustScore}`);
console.log(`Feedback Posted: ${result.feedbackPosted}`);
```

## Agent Registration File

ERC-8004 agents host a registration file at their `agentURI`. Example:

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "USDC Payment Agent",
  "description": "AI agent for USDC payments and escrow services",
  "image": "https://example.com/logo.png",
  "services": [
    {
      "name": "x402",
      "endpoint": "https://agent.example.com/x402",
      "version": "1.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://agent.example.com/mcp",
      "version": "2025-06-18"
    }
  ],
  "x402Support": true,
  "active": true,
  "registrations": [
    {
      "agentId": 42,
      "agentRegistry": "eip155:84532:0x8004A818BFB912233c491871b3d84c89A494BD9e"
    }
  ],
  "supportedTrust": ["reputation"],
  "usdcAgent": {
    "version": "1.0.0",
    "capabilities": ["payments", "escrow", "invoicing"],
    "supportedChains": ["BASE-SEPOLIA", "ETH-SEPOLIA"],
    "paymentAddress": "0x1234...",
    "escrowSupport": true,
    "x402Endpoint": "https://agent.example.com/x402"
  }
}
```

## Best Practices

### For Service Providers (Receiving Payments)

1. **Register early** — Build reputation before needing it
2. **Provide good service** — Positive feedback builds trust
3. **Set appropriate pricing** — Match your trust level
4. **Handle disputes fairly** — Refund when appropriate

### For Service Consumers (Making Payments)

1. **Always verify** — Check trust before large payments
2. **Start small** — Test with small amounts first
3. **Post feedback** — Help the ecosystem
4. **Check safety** — Use payment safety tiers

### For Escrow Operations

1. **Verify both parties** — Check buyer and seller trust
2. **Set clear conditions** — Document in escrow terms
3. **Post feedback on completion** — Builds reputation for all parties
4. **Handle disputes with evidence** — Link to task hashes

## API Reference

### ERC8004Client

```typescript
class ERC8004Client {
  // Registration
  registerAgent(options): Promise<number>
  getMyAgentId(): number | undefined
  
  // Trust
  verifyAgent(agentId): Promise<VerificationResult>
  isPaymentSafe(agentId, amount): Promise<SafetyResult>
  
  // Feedback
  postFeedback(options): Promise<number>
  postPaymentSuccess(agentId, txHash, amount): Promise<number>
  postPaymentFailure(agentId, reason): Promise<number>
  postEscrowFeedback(agentId, escrowId, outcome): Promise<number>
  
  // Discovery
  findPaymentAgents(minTrustScore?): Promise<DiscoveredAgent[]>
  findEscrowAgents(minTrustLevel?): Promise<DiscoveredAgent[]>
  
  // Info
  getMyReputation(): Promise<ReputationSummary | null>
  getContractAddresses(): ContractAddresses
  getAgentRegistry(): string
}
```

## Resources

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Official Contracts](https://github.com/erc-8004/erc-8004-contracts)
- [Example Implementation](https://github.com/vistara-apps/erc-8004-example)
- [Discussion Forum](https://ethereum-magicians.org/t/erc-8004-trustless-agents/25098)

---

*Built for the Circle USDC Hackathon 2026* 🏆
