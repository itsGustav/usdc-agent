# Lobster Pay Skill

Enable Clawdbot to interact with USDC on blockchain networks via Circle's Programmable Wallets API.

## Overview

This skill allows your Clawdbot to:
- 💰 **Check USDC balances** across multiple chains
- 📤 **Send USDC** to any address
- 📥 **Receive USDC** with generated addresses
- 🌉 **Cross-chain transfers** via Circle's CCTP
- 🤖 **Agent-to-agent payments** for autonomous commerce

**Built for the Circle USDC Hackathon 2026** 🏆

## Requirements

### 1. Circle Developer Account
Sign up at: https://console.circle.com

### 2. API Key
Create in Console: Keys → Create a key → API key → Standard Key

### 3. Entity Secret
Register your entity secret for transaction signing.

## Configuration

Add to your Clawdbot config (`~/.clawdbot/clawdbot.json`):

```json
{
  "skills": {
    "entries": {
      "lobster-pay": {
        "apiKey": "YOUR_CIRCLE_API_KEY",
        "entitySecret": "YOUR_ENTITY_SECRET",
        "network": "testnet"
      }
    }
  }
}
```

Or set environment variables:
- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`

## Supported Networks (Testnet)

| Chain | Network ID | USDC Contract |
|-------|------------|---------------|
| Ethereum Sepolia | ETH-SEPOLIA | Native USDC |
| Polygon Amoy | MATIC-AMOY | Native USDC |
| Avalanche Fuji | AVAX-FUJI | Native USDC |
| Arbitrum Sepolia | ARB-SEPOLIA | Native USDC |

## Usage

### Check Balance

```
User: Check my USDC balance
Agent: Your USDC balance across all wallets:
       - Ethereum Sepolia: 100.00 USDC
       - Polygon Amoy: 50.00 USDC
       Total: 150.00 USDC
```

### Send USDC

```
User: Send 10 USDC to 0x1234...abcd on Polygon
Agent: ✅ Transaction submitted!
       Amount: 10.00 USDC
       To: 0x1234...abcd
       Network: Polygon Amoy
       TX Hash: 0xabc123...
       Status: Confirmed
```

### Get Receive Address

```
User: Give me an address to receive USDC
Agent: Send USDC to this address:
       0x9876...wxyz (Ethereum Sepolia)
       
       Supported networks: ETH, MATIC, AVAX, ARB
```

### Cross-Chain Transfer (CCTP)

```
User: Bridge 25 USDC from Ethereum to Polygon
Agent: 🌉 Cross-chain transfer initiated via CCTP
       From: Ethereum Sepolia
       To: Polygon Amoy
       Amount: 25.00 USDC
       Est. time: ~15 minutes
```

## Commands

| Command | Description |
|---------|-------------|
| `usdc balance` | Check USDC balance across all wallets |
| `usdc send <amount> to <address>` | Send USDC |
| `usdc receive` | Get deposit address |
| `usdc bridge <amount> from <chain> to <chain>` | Cross-chain transfer |
| `usdc history` | Recent transactions |
| `usdc wallets` | List all managed wallets |

## Triggers

The skill activates on phrases like:
- "Check my USDC balance"
- "Send USDC..."
- "Transfer USDC..."
- "Bridge USDC..."
- "What's my wallet address?"
- "USDC balance"

## Security

⚠️ **TESTNET ONLY** — This skill is configured for testnet by default.

- Never use mainnet credentials in automated agents
- API keys should have minimal required permissions
- Entity secrets must be kept secure
- All transactions require proper authentication

## Architecture

```
┌─────────────────────────────────────────┐
│           Clawdbot Agent                │
│  (Claude/GPT interpreting user intent)  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Lobster Pay Skill               │
│   - Balance queries                     │
│   - Transaction creation                │
│   - Wallet management                   │
│   - CCTP bridge calls                   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│     Circle Programmable Wallets API     │
│   - Developer-controlled wallets        │
│   - Transaction signing                 │
│   - Multi-chain support                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           Blockchain Networks           │
│   ETH | MATIC | AVAX | ARB (testnet)    │
└─────────────────────────────────────────┘
```

## API Reference

### CircleClient

```typescript
import { CircleClient } from './lib/circle-client';

const client = new CircleClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

// Get balance
const balance = await client.getBalance(walletId);

// Send USDC
const tx = await client.sendUSDC({
  fromWalletId: 'wallet-123',
  toAddress: '0x...',
  amount: '10.00',
  chain: 'MATIC-AMOY',
});

// Bridge via CCTP
const bridge = await client.bridgeUSDC({
  fromChain: 'ETH-SEPOLIA',
  toChain: 'MATIC-AMOY',
  amount: '25.00',
});
```

## Testnet Faucets

Get testnet USDC from Circle's Developer Console:
https://console.circle.com/faucets

Or use the CLI:
```bash
npx lobster-pay faucet --chain ETH-SEPOLIA --amount 100
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `INSUFFICIENT_BALANCE` | Not enough USDC | Top up via faucet |
| `INVALID_ADDRESS` | Bad destination | Verify address format |
| `RATE_LIMITED` | Too many requests | Wait and retry |
| `AUTH_FAILED` | Bad API key | Check credentials |

## Hackathon Submission

**Track:** Best OpenClaw Skill
**Prize:** $10,000 USDC

This skill demonstrates:
1. ✅ Novel OpenClaw skill for USDC interaction
2. ✅ Circle Programmable Wallets integration
3. ✅ Testnet-safe operation
4. ✅ Real utility for Clawdbot operators

## Resources

- [Circle Developer Docs](https://developers.circle.com)
- [Programmable Wallets API](https://developers.circle.com/wallets)
- [CCTP Documentation](https://developers.circle.com/stablecoins/cctp)
- [Clawdbot Skills Guide](https://docs.clawd.bot/skills)

## License

MIT — Built for the OpenClaw community 🦞
