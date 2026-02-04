/**
 * Lobster Pay - Easy Mode
 * 
 * One-liner APIs for the most common operations.
 * Designed for humans AND AI agents to use with minimal setup.
 */

import { CircleClient, CircleClientConfig } from './circle-client';
import { X402Client } from './x402-client';
import { EscrowManager } from './escrow';
import { EscrowTemplates } from './escrow-templates';
import { ERC8004Client, createERC8004Client } from './erc8004';
import { ContactManager } from './contacts';
import { InvoiceManager } from './invoices';

// Re-export everything for convenience
export * from './circle-client';
export * from './x402-client';
export * from './x402-server';
export * from './escrow';
export * from './escrow-templates';
export * from './condition-builder';
export * from './erc8004';
export * from './contacts';
export * from './invoices';
export * from './approvals';
export * from './notifications';
export * from './analytics';
export * from './tips';
export * from './commission';

/**
 * Quick Setup - Get started in 3 lines
 */
export interface QuickConfig {
  // Circle credentials (required)
  circleApiKey: string;
  circleEntitySecret: string;
  
  // Network (default: testnet)
  network?: 'testnet' | 'mainnet';
  chain?: string;
  
  // Optional: ERC-8004 for trust
  privateKey?: string;
  
  // Optional: Your agent info
  agentName?: string;
  agentDescription?: string;
}

export interface LobsterAgent {
  // Core
  circle: CircleClient;
  x402: X402Client;
  escrow: EscrowManager;
  contacts: ContactManager;
  invoices: InvoiceManager;
  
  // Trust (if privateKey provided)
  trust?: ERC8004Client;
  agentId?: number;
  
  // Easy methods
  balance: () => Promise<string>;
  send: (to: string, amount: string, memo?: string) => Promise<string>;
  pay: (url: string, maxAmount?: string) => Promise<any>;
  createEscrow: (template: string, params: any) => Promise<any>;
  
  // Status
  status: () => Promise<AgentStatus>;
}

export interface AgentStatus {
  walletId: string;
  chain: string;
  balance: string;
  agentId?: number;
  trustScore?: number;
  reputation?: {
    score: number;
    feedbackCount: number;
    level: string;
  };
}

/**
 * Create a Lobster Pay with one function call
 * 
 * @example
 * ```typescript
 * const agent = await createLobsterAgent({
 *   circleApiKey: process.env.CIRCLE_API_KEY!,
 *   circleEntitySecret: process.env.CIRCLE_ENTITY_SECRET!,
 * });
 * 
 * // Check balance
 * console.log(await agent.balance());
 * 
 * // Send USDC
 * await agent.send('0x...', '10');
 * 
 * // Pay for an API call
 * const data = await agent.pay('https://api.example.com/premium');
 * ```
 */
export async function createLobsterAgent(config: QuickConfig): Promise<LobsterAgent> {
  const network = config.network || 'testnet';
  const chain = config.chain || (network === 'testnet' ? 'ETH-SEPOLIA' : 'ETH-MAINNET');
  
  // Initialize Circle client
  const circle = new CircleClient({
    apiKey: config.circleApiKey,
    entitySecret: config.circleEntitySecret,
  });
  
  // Setup wallet
  await circle.ensureWalletSet();
  const walletId = circle.getWalletId()!;
  
  // Initialize other services
  const x402 = new X402Client({
    circleClient: circle,
    walletId,
    chain,
  });
  
  const escrow = new EscrowManager({ circleClient: circle });
  const contacts = new ContactManager();
  const invoices = new InvoiceManager();
  
  // Initialize trust layer if privateKey provided
  let trust: ERC8004Client | undefined;
  let agentId: number | undefined;
  
  if (config.privateKey) {
    const erc8004Chain = chain.includes('SEPOLIA') ? 'ETH-SEPOLIA' : 
                         chain.includes('AMOY') ? 'MATIC-AMOY' :
                         chain.includes('BASE') ? 'BASE-SEPOLIA' : 'ETH-SEPOLIA';
    
    trust = createERC8004Client(
      erc8004Chain as any,
      config.privateKey,
      { paymentAddress: await circle.getReceiveAddress(chain) }
    );
    
    // Register agent if name provided
    if (config.agentName) {
      try {
        agentId = await trust.registerAgent({
          name: config.agentName,
          description: config.agentDescription || `${config.agentName} - USDC payment agent`,
          capabilities: ['usdc-payments', 'x402', 'escrow'],
        });
        console.log(`Registered as Agent #${agentId}`);
      } catch (e) {
        console.warn('Agent registration failed (may already be registered):', e);
      }
    }
  }
  
  // Build the agent interface
  const agent: LobsterAgent = {
    circle,
    x402,
    escrow,
    contacts,
    invoices,
    trust,
    agentId,
    
    // Easy balance check
    balance: async () => {
      const balances = await circle.getAllUSDCBalances();
      const chainBalance = balances.find((b: any) => b.chain === chain);
      return chainBalance?.amount || '0';
    },
    
    // Easy send
    send: async (to: string, amount: string, memo?: string) => {
      // Check if 'to' is a contact name
      let address = to;
      if (!to.startsWith('0x')) {
        const contact = await contacts.resolveRecipient(to, chain);
        if (contact) {
          address = contact.address;
        } else {
          throw new Error(`Unknown recipient: ${to}. Use an address or add them as a contact.`);
        }
      }
      
      const tx = await circle.sendUSDC({
        fromWalletId: walletId,
        toAddress: address,
        amount,
        chain,
      });
      
      return tx.id;
    },
    
    // Easy x402 payment
    pay: async (url: string, maxAmount: string = '10') => {
      const response = await x402.fetch(url, {
        method: 'GET',
        maxPayment: maxAmount,
      });
      
      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    // Easy escrow creation
    createEscrow: async (template: string, params: any) => {
      const templateFn = (EscrowTemplates as any)[template];
      if (!templateFn) {
        throw new Error(`Unknown template: ${template}. Available: freelance, realEstate, commerce, p2p`);
      }
      
      return escrow.createFromTemplate(templateFn(params));
    },
    
    // Status check
    status: async () => {
      const balance = await agent.balance();
      
      const status: AgentStatus = {
        walletId,
        chain,
        balance,
        agentId,
      };
      
      if (trust && agentId) {
        const rep = await trust.getMyReputation();
        if (rep) {
          status.trustScore = await trust.reputation.calculateTrustScore(agentId);
          status.reputation = {
            score: rep.averageScore,
            feedbackCount: rep.totalFeedback,
            level: rep.trustLevel,
          };
        }
      }
      
      return status;
    },
  };
  
  return agent;
}

/**
 * Even simpler: Environment-based setup
 * 
 * Just set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET env vars
 */
export async function quickStart(): Promise<LobsterAgent> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  
  if (!apiKey || !entitySecret) {
    throw new Error(
      'Missing environment variables. Set:\n' +
      '  CIRCLE_API_KEY=your-api-key\n' +
      '  CIRCLE_ENTITY_SECRET=your-entity-secret\n\n' +
      'Get credentials at: https://console.circle.com'
    );
  }
  
  return createLobsterAgent({
    circleApiKey: apiKey,
    circleEntitySecret: entitySecret,
    privateKey: process.env.PRIVATE_KEY,
    agentName: process.env.AGENT_NAME,
    network: (process.env.NETWORK as any) || 'testnet',
  });
}

/**
 * CLI helper - parse command line for common operations
 */
export async function runCLI(args: string[]): Promise<void> {
  const agent = await quickStart();
  const [command, ...rest] = args;
  
  switch (command) {
    case 'balance':
      console.log(`Balance: ${await agent.balance()} USDC`);
      break;
      
    case 'send':
      if (rest.length < 2) {
        console.error('Usage: send <to> <amount>');
        process.exit(1);
      }
      const txId = await agent.send(rest[0], rest[1]);
      console.log(`Sent! Transaction: ${txId}`);
      break;
      
    case 'pay':
      if (rest.length < 1) {
        console.error('Usage: pay <url> [max-amount]');
        process.exit(1);
      }
      const data = await agent.pay(rest[0], rest[1] || '10');
      console.log('Response:', JSON.stringify(data, null, 2));
      break;
      
    case 'status':
      const status = await agent.status();
      console.log('Agent Status:');
      console.log(`  Wallet: ${status.walletId}`);
      console.log(`  Chain: ${status.chain}`);
      console.log(`  Balance: ${status.balance} USDC`);
      if (status.agentId) {
        console.log(`  Agent ID: ${status.agentId}`);
        console.log(`  Trust Score: ${status.trustScore}`);
        console.log(`  Reputation: ${status.reputation?.level} (${status.reputation?.feedbackCount} reviews)`);
      }
      break;
      
    default:
      console.log(`
Lobster Pay CLI

Commands:
  balance              Check your USDC balance
  send <to> <amount>   Send USDC to an address or contact
  pay <url> [max]      Pay for an API call via x402
  status               Show agent status and trust score

Environment Variables:
  CIRCLE_API_KEY       Your Circle API key
  CIRCLE_ENTITY_SECRET Your Circle entity secret
  PRIVATE_KEY          (Optional) For ERC-8004 trust features
  AGENT_NAME           (Optional) Register with this name
  NETWORK              (Optional) testnet or mainnet

Get started:
  1. Get credentials at https://console.circle.com
  2. Set environment variables
  3. Run: npx lobster-pay balance
      `);
  }
}

// Export templates for easy access
export { EscrowTemplates } from './escrow-templates';
