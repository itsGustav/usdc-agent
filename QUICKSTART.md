# 🚀 Quick Start

Get running with Lobster Pay in under 5 minutes.

## Option 1: Environment Variables (Simplest)

```bash
# 1. Set your Circle credentials
export CIRCLE_API_KEY="your-api-key"
export CIRCLE_ENTITY_SECRET="your-entity-secret"

# 2. Clone and install
git clone https://github.com/itsGustav/lobster-pay
cd usdc-agent && npm install

# 3. Check your balance
npm run balance

# 4. Send USDC
npx ts-node scripts/usdc-cli.ts send 10 to 0x...
```

## Option 2: Code (3 Lines)

```typescript
import { quickStart } from './lib/easy';

const agent = await quickStart();

// Now you can:
await agent.balance();           // Check balance
await agent.send('0x...', '10'); // Send USDC
await agent.pay('https://...');  // Pay for API via x402
await agent.status();            // See trust score
```

## Option 3: Full Control

```typescript
import { createUSDCAgent } from './lib/easy';

const agent = await createUSDCAgent({
  circleApiKey: 'your-api-key',
  circleEntitySecret: 'your-entity-secret',
  
  // Optional: Enable ERC-8004 trust features
  privateKey: 'your-private-key',
  agentName: 'My AI Agent',
  
  // Optional: Network selection
  network: 'testnet', // or 'mainnet'
  chain: 'BASE-SEPOLIA',
});
```

## Get Circle Credentials

1. Go to [console.circle.com](https://console.circle.com)
2. Sign up / Log in
3. Create API Key: **Keys → Create a key → API key → Standard Key**
4. Create Entity Secret: **Keys → Create entity secret**

## Get Testnet USDC

1. Go to [faucet.circle.com](https://faucet.circle.com)
2. Enter your wallet address
3. Select your chain (ETH Sepolia, Base Sepolia, etc.)
4. Receive free testnet USDC

## Common Commands

```bash
# Check balance
npm run balance

# Send USDC
npx ts-node scripts/usdc-cli.ts send <amount> to <address>

# Get receive address
npm run receive

# Create invoice
npx ts-node scripts/usdc-cli.ts invoice create

# Pay via x402
npx ts-node scripts/usdc-cli.ts x402 pay <url>

# Check status (balance + trust score)
npx ts-node scripts/usdc-cli.ts status
```

## What's Next?

- [Full Documentation](./docs/ARCHITECTURE.md)
- [x402 Protocol Guide](./docs/x402-integration.md)
- [ERC-8004 Trust Layer](./docs/erc8004-integration.md)
- [Escrow Templates](./docs/escrow-templates.md)

---

Questions? [Open an issue](https://github.com/itsGustav/lobster-pay/issues)
