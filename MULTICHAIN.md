# Pay Lobster v2.1 - Multi-Chain Architecture 🦞

Pay Lobster now supports **Base (Ethereum L2)** and **Solana** with the new **x402 protocol** for automatic HTTP payments!

**New in v2.1:** Fund wallets with debit/credit cards via Coinbase Onramp! See [Card Payments](#card-payments).

## 🚀 What's New

### 1. **Multi-Chain Support**
Send USDC on Base or Solana using the same simple API:

```typescript
import { MultiChainLobsterAgent } from 'pay-lobster';

const agent = new MultiChainLobsterAgent({
  chains: {
    base: {
      privateKey: process.env.BASE_PRIVATE_KEY,
    },
    solana: {
      privateKey: process.env.SOLANA_PRIVATE_KEY,
      rpc: 'https://api.devnet.solana.com',
    },
  },
  defaultChain: 'base',
});

await agent.initialize();

// Send on Base
await agent.send('0x...', 10, { chain: 'base' });

// Send on Solana
await agent.send('7xKXtg2CW...', 5, { chain: 'solana' });

// Get balances on all chains
const balances = await agent.getAllBalances();
```

### 2. **x402 Protocol - HTTP Payments Made Easy**
Automatically pay for APIs that return `402 Payment Required`:

```typescript
const agent = new MultiChainLobsterAgent({
  chains: { /* ... */ },
  x402: {
    enabled: true,
    maxAutoPayUSDC: 10,  // Auto-approve payments up to $10
  },
});

// Fetch with auto-payment
const response = await agent.payX402('https://paid-api.example.com/endpoint');
const data = await response.json();

// Check payment history
const receipts = agent.getX402Receipts();
```

### 3. **Chain Abstraction Layer**
Unified interface for different blockchains:

```typescript
import { MultiChainManager } from 'pay-lobster/chains';

const manager = new MultiChainManager({
  chains: {
    base: { privateKey: '...' },
    solana: { privateKey: '...' },
  },
});

// Get provider for any chain
const baseProvider = manager.getProvider('base');
const solanaProvider = manager.getProvider('solana');

// Check balances across all chains
const balances = await manager.getAllBalances();
```

## 📦 Installation

```bash
npm install pay-lobster@2.0.0
```

New dependencies:
- `@solana/web3.js` - Solana blockchain support
- `@solana/spl-token` - SPL token (USDC) transfers
- `tweetnacl` - Cryptographic signing for Solana

## 🔑 Configuration

### Base (Ethereum L2)
```typescript
{
  base: {
    privateKey: '0x...',  // Ethereum private key
    rpc: 'https://mainnet.base.org',  // Optional
    escrowAddress: '0x...',  // Optional
    registryAddress: '0x...',  // Optional
  }
}
```

### Solana
```typescript
{
  solana: {
    privateKey: '[1,2,3,...]',  // Base58 or JSON array
    rpc: 'https://api.mainnet-beta.solana.com',  // Optional
  }
}
```

**Solana USDC Address (Mainnet):** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## 🎯 Use Cases

### 1. Cross-Chain Agent Payments
```typescript
// AI agent accepts payments on both Base and Solana
const agent = new MultiChainLobsterAgent({
  chains: { base: {...}, solana: {...} },
  defaultChain: 'solana',  // Lower fees!
});

// Customer pays on their preferred chain
await agent.send(customerAddress, 100, {
  chain: customerPreference,  // 'base' or 'solana'
});
```

### 2. Pay-Per-Use APIs with x402
```typescript
// Server returns 402 Payment Required
// Pay Lobster automatically:
// 1. Detects 402 response
// 2. Parses payment challenge
// 3. Sends USDC on preferred chain
// 4. Retries request with payment proof

const response = await agent.payX402('https://api.example.com/generate-image');
```

### 3. Multi-Chain Escrow (Coming Soon)
```typescript
// Create escrow on Solana (lower fees than Base)
await agent.createEscrow({
  recipient: '7xKXtg2CW...',
  amount: '1000',
  chain: 'solana',
  conditions: { type: 'milestone', description: 'Website completed' },
});
```

## 🔧 API Reference

### MultiChainLobsterAgent

#### `initialize()`
Initialize all configured chains.

#### `send(to, amount, opts?)`
Send USDC to an address.
- `to` - Recipient address (Base: 0x..., Solana: base58)
- `amount` - Amount in USDC
- `opts.chain?` - 'base' or 'solana' (default: defaultChain)
- `opts.memo?` - Optional memo

#### `getAllBalances()`
Get USDC and native balances on all chains.

#### `getMultiChainSummary()`
Get formatted summary of all wallets.

#### `payX402(url, options?)`
Fetch with automatic x402 payment handling.

#### `getX402Receipts()`
Get history of x402 payments.

### Chain Providers

Each chain implements the `ChainProvider` interface:

```typescript
interface ChainProvider {
  getAddress(): string;
  getBalance(address: string): Promise<bigint>;
  sendUSDC(to: string, amount: number): Promise<string>;
  signMessage(message: string): Promise<string>;
  getNativeBalance(address: string): Promise<string>;
  waitForConfirmation(txHash: string): Promise<boolean>;
}
```

## 🚦 Roadmap

- [x] Base chain support (v1.x)
- [x] Solana chain support (v2.0)
- [x] x402 protocol client (v2.0)
- [x] Chain abstraction layer (v2.0)
- [ ] Solana escrow contracts (v2.1)
- [ ] Solana registry contracts (v2.1)
- [ ] Polygon support (v2.2)
- [ ] Arbitrum support (v2.2)
- [ ] Cross-chain swaps (v2.3)

## 🏆 Hackathons

This release targets:
- **Circle USDC Hackathon** (Feb 8) - Multi-chain USDC payments
- **Colosseum Solana Hackathon** (Feb 12) - Solana integration

## 📝 Migration from v1.x

Pay Lobster v2.0 is **backwards compatible**. Existing Base-only code continues to work:

```typescript
// v1.x code still works
import { LobsterAgent } from 'pay-lobster';

const agent = new LobsterAgent({
  privateKey: '0x...',
});

await agent.initialize();
await agent.send('0x...', 10);
```

To use multi-chain, import `MultiChainLobsterAgent` instead:

```typescript
// v2.0 multi-chain
import { MultiChainLobsterAgent } from 'pay-lobster';
```

## 🐞 Known Issues

1. Solana escrow contracts not yet deployed (coming in v2.1)
2. x402 protocol still experimental
3. Base58 keypair parsing is basic (use JSON array format if issues)

## 📚 Examples

See `examples/multichain-example.ts` for complete working examples.

## 💳 Card Payments

**New in v2.1!** Fund wallets with debit/credit cards via Coinbase Onramp.

### CLI
```bash
paylobster fund 100    # Opens URL for $100 USDC purchase
```

### SDK
```typescript
// Generate Coinbase Onramp URL
const { url } = await agent.fundWithCard(100);
console.log('Click to add funds:', url);

// Simple URL (no CDP credentials needed)
const simpleUrl = agent.getSimpleOnrampUrl(100, 'USDC');
```

### Supported Methods
- Debit/credit cards (Visa, MC, etc.)
- Apple Pay (US users)
- Bank transfers (ACH, SEPA)
- Coinbase balance

**Fees:** ~1.5% (industry lowest)  
**KYC:** Handled by Coinbase

---

## 🙏 Credits

Built by [@itsGustav](https://github.com/itsGustav) for the AI agent economy.

Powered by:
- [Base](https://base.org) - Ethereum L2
- [Solana](https://solana.com) - High-performance blockchain
- [Circle USDC](https://www.circle.com/en/usdc) - Stablecoin infrastructure

---

**Version:** 2.1.0  
**License:** MIT  
**Website:** https://paylobster.com
