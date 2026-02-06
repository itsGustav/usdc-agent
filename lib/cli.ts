#!/usr/bin/env node

/**
 * Pay Lobster CLI - Setup Wizard & Commands
 * 🦞 Payment infrastructure for AI agents
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ethers } from 'ethers';
import { getSwapQuote, executeSwap } from './swap';
import { stats } from './stats';
import { onramp } from './onramp';
import { LobsterAgent } from './agent';
import {
  loadConfig as loadAutonomousConfig,
  saveConfig as saveAutonomousConfig,
  checkTrustGate,
  checkSpendingLimit,
  getSpendingSummary,
  getSpendingHistory,
  getAuditLog,
  TIER_SCORES,
} from './autonomous';

// V3 Contract Addresses (Base Mainnet)
const V3_CONTRACTS = {
  identity: '0xA174ee274F870631B3c330a85EBCad74120BE662',
  reputation: '0x02bb4132a86134684976E2a52E43D59D89E64b29',
  credit: '0xD9241Ce8a721Ef5fcCAc5A11983addC526eC80E1',
  escrow: '0x49EdEe04c78B7FeD5248A20706c7a6c540748806',
};

// V3 Contract ABIs (minimal for CLI)
const V3_ABIS = {
  credit: [
    'function getCreditScore(address agent) view returns (uint256 score, string memory tier)',
    'function getCreditStatus(address agent) view returns (uint256 limit, uint256 available, uint256 inUse)',
    'function getCreditHistory(address agent) view returns (tuple(uint256 borrowed, uint256 repaid, uint256 active, uint256 repaymentRate))',
    'function getTier(address agent) view returns (string memory tier, uint256 score)',
  ],
  reputation: [
    'function getReputation(address agent) view returns (tuple(uint256 overall, uint256 delivery, uint256 communication, uint256 quality, uint256 reliability, uint256 totalRatings))',
    'function getTrustHistory(address agent, uint256 days) view returns (tuple(uint256 timestamp, uint256 score, string memory event)[])',
  ],
  identity: [
    'function getIdentity(address agent) view returns (tuple(uint256 tokenId, string memory name, address owner, uint256 registered, string[] memory capabilities))',
    'function getAllAgents(uint256 offset, uint256 limit) view returns (tuple(address agent, string memory name, uint256 score)[])',
  ],
  escrow: [
    'function getActiveLoans(address agent) view returns (tuple(uint256 id, uint256 amount, uint256 remaining, uint256 dueDate)[])',
    'function getLoanDetails(uint256 loanId) view returns (tuple(uint256 id, uint256 original, uint256 remaining, uint256 paid, uint256 dueDate, address seller))',
    'function repayLoan(uint256 loanId) payable',
  ],
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const c = colors;

// Config file location
const CONFIG_DIR = path.join(process.env.HOME || '~', '.paylobster');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface PayLobsterConfig {
  privateKey?: string;
  network: 'base' | 'base-sepolia';
  rpcUrl: string;
  agentName?: string;
  setupComplete: boolean;
  version: string;
}

const DEFAULT_CONFIG: PayLobsterConfig = {
  network: 'base',
  rpcUrl: 'https://mainnet.base.org',
  setupComplete: false,
  version: '3.0.0',
};

// Simple header
function showBanner(): void {
  console.log(`
  ${c.blue}🦞 Pay Lobster${c.reset}
  ${c.dim}Payment Infrastructure for AI Agents${c.reset}
`);
}

// Create readline interface
function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Prompt helper
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Prompt for password (hidden input)
function promptSecret(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    
    let input = '';
    const onData = (char: Buffer) => {
      const c = char.toString();
      if (c === '\n' || c === '\r') {
        stdin.removeListener('data', onData);
        if (stdin.setRawMode) {
          stdin.setRawMode(wasRaw || false);
        }
        console.log();
        resolve(input);
      } else if (c === '\u0003') {
        process.exit();
      } else if (c === '\u007F') {
        input = input.slice(0, -1);
        process.stdout.write('\b \b');
      } else {
        input += c;
        process.stdout.write('*');
      }
    };
    
    stdin.on('data', onData);
  });
}

// Load config
function loadConfig(): PayLobsterConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (e) {
    // Ignore errors, return default
  }
  return { ...DEFAULT_CONFIG };
}

// Save config
function saveConfig(config: PayLobsterConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// Validate private key
function isValidPrivateKey(key: string): boolean {
  try {
    const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
    new ethers.Wallet(cleanKey);
    return true;
  } catch {
    return false;
  }
}

// Get wallet address from private key
function getAddress(privateKey: string): string {
  const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(cleanKey);
  return wallet.address;
}

// Setup wizard
async function runSetupWizard(): Promise<void> {
  const rl = createRL();
  const config = loadConfig();
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster Setup${c.reset}`);
  console.log(`  ${c.dim}──────────────────────${c.reset}\n`);
  
  console.log(`  ${c.dim}Configure Pay Lobster for your AI agent${c.reset}`);
  console.log(`  ${c.dim}Config: ${CONFIG_FILE}${c.reset}\n`);
  
  // Step 1: Agent Name
  console.log(`  ${c.dim}Step 1/4: Agent Name${c.reset}\n`);
  
  const agentName = await prompt(rl, `  ${c.blue}❯${c.reset} Agent name: `);
  config.agentName = agentName || 'MyAgent';
  console.log(`  ${c.green}✓${c.reset} ${config.agentName}\n`);
  
  // Step 2: Network Selection
  console.log(`  ${c.dim}Step 2/4: Network${c.reset}\n`);
  console.log(`    1) Base Mainnet ${c.dim}(production)${c.reset}`);
  console.log(`    2) Base Sepolia ${c.dim}(testnet)${c.reset}\n`);
  
  const networkChoice = await prompt(rl, `  ${c.blue}❯${c.reset} Select [1/2]: `);
  
  if (networkChoice === '2') {
    config.network = 'base-sepolia';
    config.rpcUrl = 'https://sepolia.base.org';
    console.log(`  ${c.green}✓${c.reset} Base Sepolia (Testnet)\n`);
  } else {
    config.network = 'base';
    config.rpcUrl = 'https://mainnet.base.org';
    console.log(`  ${c.green}✓${c.reset} Base Mainnet\n`);
  }
  
  // Step 3: Wallet Setup
  console.log(`  ${c.dim}Step 3/4: Wallet${c.reset}\n`);
  console.log(`    1) Generate new wallet`);
  console.log(`    2) Import private key`);
  console.log(`    3) Skip ${c.dim}(read-only)${c.reset}\n`);
  
  const walletChoice = await prompt(rl, `  ${c.blue}❯${c.reset} Select [1/2/3]: `);
  
  if (walletChoice === '1') {
    // Generate new wallet
    const wallet = ethers.Wallet.createRandom();
    config.privateKey = wallet.privateKey;
    
    console.log(`\n  ${c.green}✓${c.reset} New wallet generated\n`);
    console.log(`  ${c.red}⚠️  SAVE THIS INFORMATION${c.reset}`);
    console.log(`  ${c.dim}──────────────────────────────────────────────────${c.reset}`);
    console.log(`  Address:     ${c.green}${wallet.address}${c.reset}`);
    console.log(`  Private Key: ${c.yellow}${wallet.privateKey.slice(0, 20)}...${c.reset}`);
    console.log(`  ${c.dim}──────────────────────────────────────────────────${c.reset}\n`);
    console.log(`  ${c.dim}If you lose your key, you lose your funds forever.${c.reset}\n`);
    
    await prompt(rl, `  ${c.dim}Press Enter when saved...${c.reset}`);
    console.log();
    
  } else if (walletChoice === '2') {
    // Import existing
    console.log(`\n  ${c.dim}Enter private key (hidden):${c.reset}\n`);
    
    let validKey = false;
    while (!validKey) {
      const privateKey = await promptSecret(rl, `  ${c.blue}❯${c.reset} Private key: `);
      
      if (isValidPrivateKey(privateKey)) {
        config.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const address = getAddress(config.privateKey);
        const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
        console.log(`  ${c.green}✓${c.reset} Imported ${shortAddr}\n`);
        validKey = true;
      } else {
        console.log(`  ${c.red}✗${c.reset} Invalid key\n`);
      }
    }
    
  } else {
    console.log(`  ${c.dim}Skipped. Read-only mode.${c.reset}\n`);
  }
  
  // Step 4: Verify & Complete
  console.log(`  ${c.dim}Step 4/4: Verification${c.reset}\n`);
  
  // Test RPC connection
  process.stdout.write(`  ${c.dim}Testing ${config.network}...${c.reset} `);
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log(`${c.green}✓${c.reset} Block #${blockNumber}`);
  } catch (e) {
    console.log(`${c.red}✗${c.reset} Failed`);
  }
  
  // Check balance if wallet configured
  if (config.privateKey) {
    process.stdout.write(`  ${c.dim}Checking balance...${c.reset} `);
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const usdcAddress = config.network === 'base' 
        ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      
      const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
      const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);
      const address = getAddress(config.privateKey);
      const balance = await usdc.balanceOf(address);
      const formatted = ethers.formatUnits(balance, 6);
      console.log(`${c.green}✓${c.reset} $${formatted} USDC`);
    } catch (e) {
      console.log(`${c.dim}─${c.reset}`);
    }
  }
  
  // Save config
  config.setupComplete = true;
  saveConfig(config);
  
  console.log(`\n  ${c.green}✓${c.reset} Setup complete\n`);
  
  // Quick start
  console.log(`  ${c.bright}Quick Start${c.reset}\n`);
  console.log(`    paylobster balance       Check balance`);
  console.log(`    paylobster send          Send USDC`);
  console.log(`    paylobster help          All commands\n`);
  
  if (config.network === 'base' && config.privateKey) {
    const address = getAddress(config.privateKey);
    const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    console.log(`  ${c.dim}Your address: ${shortAddr}${c.reset}\n`);
  }
  
  rl.close();
}

// Show help
function showHelp(): void {
  console.log(`
  ${c.blue}🦞 Pay Lobster${c.reset} v3.1.0

  ${c.bright}PAYMENTS${c.reset}
    send <address> <amount>     Send USDC
    escrow create/list/release  Manage escrows
    fund <amount>               Buy USDC with card
    balance                     Check balance
    receive                     Show deposit address

  ${c.bright}IDENTITY${c.reset}
    register <name>             Register agent
    discover [search]           Find agents
    identity [address]          View identity

  ${c.bright}REPUTATION${c.reset}
    score [address]             LOBSTER score
    credit                      Credit status
    trust <address>             Trust info
    reputation [address]        Full reputation

  ${c.bright}CREDIT LOANS${c.reset}
    loans                       Active loans
    loan <id>                   Loan details
    repay <id>                  Repay loan

  ${c.bright}SETTINGS${c.reset}
    setup                       Initial setup
    trust-gate                  Trust gate config
    limits                      Spending limits
    config                      Show config

  ${c.dim}Examples:${c.reset}
    paylobster send 0x8b3f...2e1a 50
    paylobster score
    paylobster credit

  ${c.dim}Docs: https://paylobster.com/docs${c.reset}
`);
}

// Show config
function showConfig(): void {
  const config = loadConfig();
  const address = config.privateKey ? getAddress(config.privateKey) : null;
  const shortAddr = address ? address.slice(0, 10) + '...' + address.slice(-8) : 'None';
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Configuration\n`);
  console.log(`  Agent     ${config.agentName || 'Not set'}`);
  console.log(`  Network   ${config.network}`);
  console.log(`  Wallet    ${address ? c.green + shortAddr + c.reset : c.dim + 'None' + c.reset}`);
  console.log(`  Setup     ${config.setupComplete ? c.green + '✓' + c.reset : c.yellow + '…' + c.reset}\n`);
  console.log(`  ${c.dim}Config: ${CONFIG_FILE}${c.reset}\n`);
}

// Check balance command
async function checkBalance(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const address = getAddress(config.privateKey);
    const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    
    // USDC contract
    const usdcAddress = config.network === 'base' 
      ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);
    
    const balance = await usdc.balanceOf(address);
    const formatted = parseFloat(ethers.formatUnits(balance, 6)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Get ETH balance for gas
    const ethBalance = await provider.getBalance(address);
    const ethFormatted = parseFloat(ethers.formatEther(ethBalance)).toFixed(6);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Balance\n`);
    console.log(`  ${c.bright}$${formatted} USDC${c.reset}`);
    console.log(`  ${c.dim}── on ${config.network} (${shortAddr})${c.reset}\n`);
    console.log(`  ${c.dim}Gas: ${ethFormatted} ETH${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Show receive address
function showReceive(): void {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  const address = getAddress(config.privateKey);
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Receive\n`);
  console.log(`  ${c.green}${address}${c.reset}\n`);
  console.log(`  ${c.dim}Network: ${config.network}${c.reset}`);
  console.log(`  ${c.dim}Send USDC on Base to this address${c.reset}\n`);
}

// Handle swap command: paylobster swap 0.01 ETH to USDC
async function handleSwap(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  // Parse: swap <amount> <from> to <to>
  if (args.length < 4) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster swap <amount> <from> to <to>\n`);
    console.log(`  ${c.dim}paylobster swap 0.01 ETH to USDC${c.reset}`);
    console.log(`  ${c.dim}paylobster swap 50 USDC to ETH${c.reset}\n`);
    return;
  }
  
  const amount = args[0];
  const fromToken = args[1].toUpperCase();
  const toToken = args[3]?.toUpperCase() || args[2]?.toUpperCase();
  
  if (!amount || !fromToken || !toToken) {
    console.log(`\n  ${c.red}✗${c.reset} Invalid format\n`);
    return;
  }
  
  try {
    // Get quote first
    console.log(`\n  ${c.dim}…${c.reset} Getting quote ${amount} ${fromToken} → ${toToken}\n`);
    
    const quote = await getSwapQuote({
      from: fromToken,
      to: toToken,
      amount: amount,
    });
    
    const buyFormatted = parseFloat(quote.buyAmount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
    
    console.log(`  Sell   ${quote.sellAmount} ${quote.sellToken}`);
    console.log(`  Buy    ${buyFormatted} ${quote.buyToken}`);
    console.log(`  Rate   1 ${quote.sellToken} = ${quote.price} ${quote.buyToken}\n`);
    
    if (quote.sources.length > 0) {
      console.log(`  ${c.dim}Route: ${quote.sources.map(s => s.name).join(' → ')}${c.reset}\n`);
    }
    
    // Execute swap
    console.log(`  ${c.dim}…${c.reset} Executing swap\n`);
    
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const signer = new ethers.Wallet(config.privateKey, provider);
    
    const result = await executeSwap(signer, {
      from: fromToken,
      to: toToken,
      amount: amount,
    });
    
    const txShort = result.hash.slice(0, 10) + '...' + result.hash.slice(-8);
    
    console.log(`  ${c.green}✓${c.reset} Swapped ${result.fromAmount} ${result.fromToken} → ${result.toAmount} ${result.toToken}`);
    console.log(`    Tx: ${txShort}`);
    console.log(`\n    ${c.dim}https://basescan.org/tx/${result.hash}${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle quote command: paylobster quote ETH USDC
async function handleQuote(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster quote <from> <to> [amount]\n`);
    console.log(`  ${c.dim}paylobster quote ETH USDC${c.reset}`);
    console.log(`  ${c.dim}paylobster quote ETH USDC 0.5${c.reset}\n`);
    return;
  }
  
  const fromToken = args[0].toUpperCase();
  const toToken = args[1].toUpperCase();
  const amount = args[2] || '1';
  
  try {
    console.log(`\n  ${c.dim}…${c.reset} Quote ${amount} ${fromToken} → ${toToken}\n`);
    
    const quote = await getSwapQuote({
      from: fromToken,
      to: toToken,
      amount: amount,
    });
    
    const buyFormatted = parseFloat(quote.buyAmount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
    
    console.log(`  Sell   ${quote.sellAmount} ${quote.sellToken}`);
    console.log(`  Buy    ${buyFormatted} ${quote.buyToken}`);
    console.log(`  Rate   1 ${quote.sellToken} = ${quote.price} ${quote.buyToken}\n`);
    
    if (quote.sources.length > 0) {
      console.log(`  ${c.dim}Route: ${quote.sources.map(s => s.name).join(' + ')}${c.reset}\n`);
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Show global volume stats
function showGlobalStats(): void {
  const globalStats = stats.load();
  const today = new Date().toISOString().split('T')[0];
  const todayVolume = globalStats.dailyVolume[today] || '0';
  
  console.log(`
  ${c.blue}🦞 Pay Lobster${c.reset} — Global Stats

  Volume       $${formatNumber(globalStats.totalVolume)} USDC
  Txns         ${globalStats.totalTransactions.toLocaleString()}
  Escrow       $${formatNumber(globalStats.totalEscrowVolume)} USDC
  
  Today        $${formatNumber(todayVolume)} USDC
  Wallets      ${globalStats.trackedWallets.length}

  ${c.dim}Updated: ${new Date(globalStats.lastUpdated).toLocaleString()}${c.reset}
`);
}

// Show leaderboard of top wallets
function showLeaderboard(): void {
  const leaderboard = stats.getLeaderboard(10);
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Leaderboard\n`);

  if (leaderboard.length === 0) {
    console.log(`  ${c.dim}No transactions yet${c.reset}\n`);
    return;
  }

  console.log(`  ${c.dim}Rank  Address            Volume         Txns${c.reset}`);
  console.log(`  ${c.dim}────  ────────────────   ─────────────  ────${c.reset}`);
  
  for (const entry of leaderboard) {
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
    const addr = entry.address.slice(0, 6) + '...' + entry.address.slice(-4);
    const vol = '$' + formatNumber(entry.totalVolume);
    console.log(`  ${medal}${entry.rank.toString().padStart(3)}   ${addr.padEnd(17)}  ${c.green}${vol.padStart(12)}${c.reset}   ${entry.transactions}`);
  }
  
  console.log();
}

function formatNumber(num: string | number): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
  return n.toFixed(2);
}

// Handle fund/onramp command: paylobster fund 100
async function handleFund(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  const address = getAddress(config.privateKey);
  const amount = args[0] ? parseFloat(args[0]) : 0;
  
  if (!amount || amount < 5) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster fund <amount>\n`);
    console.log(`  ${c.dim}paylobster fund 100${c.reset}`);
    console.log(`  ${c.dim}paylobster fund 50${c.reset}\n`);
    console.log(`  ${c.dim}Min: $5 USD • Fee: ~1.5%${c.reset}\n`);
    return;
  }
  
  try {
    const url = onramp.getSimpleUrl({
      address,
      amount,
      asset: 'USDC'
    });
    
    const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Fund Wallet\n`);
    console.log(`  Amount   $${amount.toFixed(2)} USD → USDC`);
    console.log(`  To       ${c.dim}${shortAddr}${c.reset}\n`);
    console.log(`  ${c.bright}Complete purchase:${c.reset}\n`);
    console.log(`  ${c.green}${url}${c.reset}\n`);
    console.log(`  ${c.dim}Cards, Apple Pay, Bank, Coinbase${c.reset}`);
    console.log(`  ${c.dim}Fee: ~1.5%${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// ═══════════════════════════════════════════════════════════
// V3 COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════

// Handle score command: paylobster score [address]
async function handleScore(args: string[]): Promise<void> {
  const config = loadConfig();
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const creditContract = new ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
    
    let address: string;
    let shortAddr: string;
    if (args.length > 0) {
      address = args[0];
      shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
    } else {
      if (!config.privateKey) {
        console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
        return;
      }
      address = getAddress(config.privateKey);
      shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
    }
    
    const [score, tier] = await creditContract.getCreditScore(address);
    const scoreNum = Number(score);
    
    // Calculate stars
    const stars = scoreNum >= 850 ? 5 : scoreNum >= 750 ? 4 : scoreNum >= 650 ? 3 : scoreNum >= 550 ? 2 : 1;
    const starStr = '⭐'.repeat(stars);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Credit Score\n`);
    console.log(`  Score    ${c.bright}${scoreNum} / 850${c.reset}    ${starStr}`);
    console.log(`  Tier     ${tier}`);
    
    if (args.length > 0) {
      console.log(`  Address  ${c.dim}${shortAddr}${c.reset}\n`);
    } else {
      console.log(`\n  ${c.dim}See ${c.blue}paylobster credit${c.reset}${c.dim} for limits${c.reset}\n`);
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle credit command: paylobster credit
async function handleCredit(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const creditContract = new ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
    const address = getAddress(config.privateKey);
    
    const [limit, available, inUse] = await creditContract.getCreditStatus(address);
    const [score, tier] = await creditContract.getCreditScore(address);
    
    const limitNum = parseFloat(ethers.formatUnits(limit, 6));
    const availableNum = parseFloat(ethers.formatUnits(available, 6));
    const inUseNum = parseFloat(ethers.formatUnits(inUse, 6));
    const utilization = limitNum > 0 ? ((inUseNum / limitNum) * 100).toFixed(0) : '0';
    
    const limitFormatted = limitNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const availFormatted = availableNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const inUseFormatted = inUseNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Credit\n`);
    console.log(`  Tier       ${tier}`);
    console.log(`  Limit      $${limitFormatted}`);
    console.log(`  Available  ${c.green}$${availFormatted}${c.reset}`);
    console.log(`  In Use     $${inUseFormatted}`);
    console.log(`  Usage      ${utilization}%\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle tier command: paylobster tier
async function handleTier(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const creditContract = new ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
    const address = getAddress(config.privateKey);
    
    const [tier, score] = await creditContract.getTier(address);
    const scoreNum = Number(score);
    
    // Tier thresholds
    const tiers = [
      { name: 'Standard', min: 300, max: 549, stars: 1 },
      { name: 'Bronze', min: 550, max: 649, stars: 2 },
      { name: 'Silver', min: 650, max: 749, stars: 3 },
      { name: 'Gold', min: 750, max: 849, stars: 4 },
      { name: 'Elite', min: 850, max: 850, stars: 5 },
    ];
    
    const currentTierIndex = tiers.findIndex(t => t.name.toLowerCase() === tier.toLowerCase());
    const currentTier = tiers[currentTierIndex];
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;
    
    const starStr = '⭐'.repeat(currentTier.stars);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Tier\n`);
    console.log(`  Current  ${c.bright}${tier}${c.reset} ${starStr}`);
    console.log(`  Score    ${scoreNum} / 850\n`);
    
    if (nextTier) {
      const needed = nextTier.min - scoreNum;
      const progress = ((scoreNum - currentTier.min) / (nextTier.min - currentTier.min)) * 100;
      const bars = Math.floor(progress / 5);
      const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
      
      console.log(`  ${c.dim}Progress to ${nextTier.name}${c.reset}`);
      console.log(`  [${c.green}${progressBar}${c.reset}] ${progress.toFixed(0)}%`);
      console.log(`  ${c.dim}Need: +${needed} points${c.reset}\n`);
    } else {
      console.log(`  ${c.green}✓${c.reset} Highest tier!\n`);
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle credit-history command: paylobster credit-history
async function handleCreditHistory(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const creditContract = new ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
    const address = getAddress(config.privateKey);
    
    const history = await creditContract.getCreditHistory(address);
    const borrowed = parseFloat(ethers.formatUnits(history.borrowed, 6));
    const repaid = parseFloat(ethers.formatUnits(history.repaid, 6));
    const active = parseFloat(ethers.formatUnits(history.active, 6));
    const repaymentRate = Number(history.repaymentRate) / 100;
    
    const borrowedFmt = borrowed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const repaidFmt = repaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const activeFmt = active.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Credit History\n`);
    console.log(`  Borrowed   $${borrowedFmt}`);
    console.log(`  Repaid     $${repaidFmt}`);
    console.log(`  Active     $${activeFmt}`);
    console.log(`  Rate       ${c.green}${repaymentRate.toFixed(1)}%${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle repay command: paylobster repay <loanId>
async function handleRepay(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  if (args.length === 0) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster repay <loanId>\n`);
    console.log(`  ${c.dim}paylobster repay 47${c.reset}\n`);
    return;
  }
  
  const loanId = args[0];
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const signer = new ethers.Wallet(config.privateKey, provider);
    const escrowContract = new ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, signer);
    
    const loan = await escrowContract.getLoanDetails(loanId);
    const remaining = parseFloat(ethers.formatUnits(loan.remaining, 6));
    
    if (remaining === 0) {
      console.log(`\n  ${c.green}✓${c.reset} Loan #${loanId} already repaid\n`);
      return;
    }
    
    const remainingFmt = remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Repay Loan #${loanId}\n`);
    console.log(`  Amount Due  $${remainingFmt}\n`);
    
    console.log(`  ${c.dim}…${c.reset} Sending repayment`);
    const tx = await escrowContract.repayLoan(loanId, {
      value: ethers.parseUnits(remaining.toString(), 6)
    });
    
    console.log(`  ${c.dim}…${c.reset} Confirming`);
    await tx.wait();
    
    const txShort = tx.hash.slice(0, 10) + '...' + tx.hash.slice(-8);
    
    console.log(`\n  ${c.green}✓${c.reset} Repaid $${remainingFmt}`);
    console.log(`    Tx: ${txShort}`);
    console.log(`\n    ${c.dim}https://basescan.org/tx/${tx.hash}${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle loans command: paylobster loans
async function handleLoans(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const escrowContract = new ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, provider);
    const address = getAddress(config.privateKey);
    
    const loans = await escrowContract.getActiveLoans(address);
    
    if (loans.length === 0) {
      console.log(`\n  ${c.dim}No active loans${c.reset}\n`);
      return;
    }
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Active Loans\n`);
    console.log(`  ${c.dim}ID       Amount         Due        Status${c.reset}`);
    console.log(`  ${c.dim}──────   ────────────   ────────   ───────${c.reset}`);
    
    let totalDue = 0;
    const now = Math.floor(Date.now() / 1000);
    
    for (const loan of loans) {
      const id = Number(loan.id);
      const remaining = parseFloat(ethers.formatUnits(loan.remaining, 6));
      const dueDate = Number(loan.dueDate);
      const daysUntil = Math.floor((dueDate - now) / 86400);
      
      totalDue += remaining;
      
      const remainingFmt = remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      let status = '✓';
      let statusColor = c.green;
      let dueText = `${daysUntil}d`;
      
      if (daysUntil < 0) {
        status = '✗';
        statusColor = c.red;
        dueText = 'overdue';
      } else if (daysUntil < 3) {
        status = '⚠';
        statusColor = c.yellow;
      }
      
      console.log(`  #${id.toString().padEnd(7)}$${remainingFmt.padStart(12)}   ${dueText.padEnd(8)}   ${statusColor}${status}${c.reset}`);
    }
    
    const totalFmt = totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    console.log(`  ${c.dim}────────────────────────────────────────────${c.reset}`);
    console.log(`  Total: $${totalFmt}\n`);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle loan details command: paylobster loan <loanId>
async function handleLoanDetails(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (args.length === 0) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster loan <loanId>\n`);
    console.log(`  ${c.dim}paylobster loan 47${c.reset}\n`);
    return;
  }
  
  const loanId = args[0];
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const escrowContract = new ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, provider);
    
    const loan = await escrowContract.getLoanDetails(loanId);
    const original = parseFloat(ethers.formatUnits(loan.original, 6));
    const remaining = parseFloat(ethers.formatUnits(loan.remaining, 6));
    const paid = parseFloat(ethers.formatUnits(loan.paid, 6));
    const dueDate = new Date(Number(loan.dueDate) * 1000);
    const now = new Date();
    const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / 86400000);
    
    const originalFmt = original.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const remainingFmt = remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const paidFmt = paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    let status = '✓ On track';
    let statusColor = c.green;
    if (remaining === 0) {
      status = '✓ Paid in full';
    } else if (daysUntil < 0) {
      status = '✗ Overdue';
      statusColor = c.red;
    } else if (daysUntil < 3) {
      status = '⚠ Due soon';
      statusColor = c.yellow;
    }
    
    const seller = loan.seller.slice(0, 10) + '...' + loan.seller.slice(-8);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Loan #${loanId}\n`);
    console.log(`  Original    $${originalFmt}`);
    console.log(`  Remaining   $${remainingFmt}`);
    console.log(`  Paid        $${paidFmt}`);
    console.log(``);
    console.log(`  Due         ${dueDate.toLocaleDateString()} (${daysUntil}d)`);
    console.log(`  Seller      ${c.dim}${seller}${c.reset}`);
    console.log(`  Status      ${statusColor}${status}${c.reset}\n`);
    
    if (remaining > 0) {
      console.log(`  ${c.dim}Repay: ${c.blue}paylobster repay ${loanId}${c.reset}\n`);
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle reputation command: paylobster reputation [address]
async function handleReputation(args: string[]): Promise<void> {
  const config = loadConfig();
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const reputationContract = new ethers.Contract(V3_CONTRACTS.reputation, V3_ABIS.reputation, provider);
    
    let address: string;
    let shortAddr: string;
    if (args.length > 0) {
      address = args[0];
      shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
    } else {
      if (!config.privateKey) {
        console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
        return;
      }
      address = getAddress(config.privateKey);
      shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
    }
    
    const rep = await reputationContract.getReputation(address);
    const overall = Number(rep.overall);
    const delivery = Number(rep.delivery);
    const communication = Number(rep.communication);
    const quality = Number(rep.quality);
    const reliability = Number(rep.reliability);
    const totalRatings = Number(rep.totalRatings);
    
    const stars = overall >= 90 ? 5 : overall >= 80 ? 4 : overall >= 70 ? 3 : overall >= 60 ? 2 : 1;
    const starStr = '⭐'.repeat(stars);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Reputation\n`);
    console.log(`  Overall     ${c.bright}${overall}/100${c.reset}    ${starStr}`);
    console.log(``);
    console.log(`  Delivery       ${delivery.toString().padStart(3)}/100`);
    console.log(`  Communication  ${communication.toString().padStart(3)}/100`);
    console.log(`  Quality        ${quality.toString().padStart(3)}/100`);
    console.log(`  Reliability    ${reliability.toString().padStart(3)}/100`);
    console.log(``);
    console.log(`  Ratings     ${totalRatings}`);
    
    if (args.length > 0) {
      console.log(`  Address     ${c.dim}${shortAddr}${c.reset}\n`);
    } else {
      console.log();
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle trust-history command: paylobster trust-history
async function handleTrustHistory(): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const reputationContract = new ethers.Contract(V3_CONTRACTS.reputation, V3_ABIS.reputation, provider);
    const address = getAddress(config.privateKey);
    
    const history = await reputationContract.getTrustHistory(address, 90);
    
    if (history.length === 0) {
      console.log(`\n  ${c.dim}No trust history${c.reset}\n`);
      return;
    }
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Trust History\n`);
    console.log(`  ${c.dim}Date          Score   Event${c.reset}`);
    console.log(`  ${c.dim}────────────  ──────  ──────────────────${c.reset}`);
    
    for (const entry of history.slice(0, 10)) {
      const date = new Date(Number(entry.timestamp) * 1000).toLocaleDateString();
      const score = Number(entry.score);
      const event = entry.event;
      console.log(`  ${date.padEnd(12)}  ${score.toString().padStart(3)}/100  ${c.dim}${event}${c.reset}`);
    }
    
    console.log();
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle identity command: paylobster identity [address]
async function handleIdentity(args: string[]): Promise<void> {
  const config = loadConfig();
  
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const identityContract = new ethers.Contract(V3_CONTRACTS.identity, V3_ABIS.identity, provider);
    
    let address: string;
    let shortAddr: string;
    if (args.length > 0) {
      address = args[0];
      shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    } else {
      if (!config.privateKey) {
        console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
        return;
      }
      address = getAddress(config.privateKey);
      shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
    }
    
    const identity = await identityContract.getIdentity(address);
    const tokenId = Number(identity.tokenId);
    const name = identity.name;
    const registered = new Date(Number(identity.registered) * 1000);
    const capabilities = identity.capabilities;
    const daysAgo = Math.floor((Date.now() - registered.getTime()) / 86400000);
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Identity\n`);
    console.log(`  Token ID     #${tokenId}`);
    console.log(`  Name         ${c.bright}${name}${c.reset}`);
    console.log(`  Address      ${c.dim}${shortAddr}${c.reset}`);
    console.log(`  Registered   ${daysAgo}d ago`);
    
    if (capabilities.length > 0) {
      console.log(``);
      console.log(`  Capabilities`);
      for (const cap of capabilities) {
        console.log(`    • ${cap}`);
      }
    }
    
    console.log();
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle agents command: paylobster agents
async function handleAgents(args: string[]): Promise<void> {
  try {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const identityContract = new ethers.Contract(V3_CONTRACTS.identity, V3_ABIS.identity, provider);
    
    const agents = await identityContract.getAllAgents(0, 10);
    
    if (agents.length === 0) {
      console.log(`\n  ${c.dim}No agents registered${c.reset}\n`);
      return;
    }
    
    console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Agents\n`);
    console.log(`  ${c.dim}Name                    Score    Address${c.reset}`);
    console.log(`  ${c.dim}──────────────────────  ───────  ──────────────${c.reset}`);
    
    for (const agent of agents) {
      const name = agent.name.padEnd(22);
      const score = `${agent.score}/100`.padEnd(7);
      const addr = agent.agent.slice(0, 6) + '...' + agent.agent.slice(-4);
      console.log(`  ${name}  ${c.green}${score}${c.reset}  ${c.dim}${addr}${c.reset}`);
    }
    
    console.log();
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle trust-gate status command
async function handleTrustGateStatus(): Promise<void> {
  const config = loadAutonomousConfig();
  const tg = config.trustGate;
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Trust Gate\n`);
  console.log(`  Enabled          ${tg.enabled ? c.green + '✓' : c.dim + '✗'}${c.reset}`);
  console.log(`  Min Score        ${tg.minScore}`);
  console.log(`  Min Tier         ${tg.minTier}`);
  console.log(`  Allow Unscored   ${tg.allowUnscored ? 'Yes' : 'No'}`);
  
  if (tg.exceptions.length > 0) {
    console.log(``);
    console.log(`  Exceptions (${tg.exceptions.length})`);
    for (const addr of tg.exceptions.slice(0, 5)) {
      const short = addr.slice(0, 10) + '...' + addr.slice(-8);
      console.log(`    • ${c.dim}${short}${c.reset}`);
    }
    if (tg.exceptions.length > 5) {
      console.log(`    ${c.dim}...and ${tg.exceptions.length - 5} more${c.reset}`);
    }
  }
  
  console.log();
  
  if (!tg.enabled) {
    console.log(`  ${c.dim}Enable: ${c.blue}paylobster trust-gate set --enable${c.reset}\n`);
  }
}

// Handle trust-gate set command
async function handleTrustGateSet(args: string[]): Promise<void> {
  const config = loadAutonomousConfig();
  const tg = config.trustGate;
  
  let changed = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--enable') {
      tg.enabled = true;
      changed = true;
      console.log(`${c.green}✓${c.reset} Trust gate enabled`);
    } else if (arg === '--disable') {
      tg.enabled = false;
      changed = true;
      console.log(`${c.green}✓${c.reset} Trust gate disabled`);
    } else if (arg === '--min-score') {
      const score = parseInt(args[++i]);
      if (isNaN(score) || score < 0 || score > 1000) {
        console.log(`${c.red}✗${c.reset} Invalid score (must be 0-1000)`);
        continue;
      }
      tg.minScore = score;
      changed = true;
      console.log(`${c.green}✓${c.reset} Minimum score set to ${score}`);
    } else if (arg === '--min-tier') {
      const tier = args[++i]?.toUpperCase();
      if (!['STANDARD', 'BUILDING', 'GOOD', 'EXCELLENT', 'ELITE'].includes(tier)) {
        console.log(`${c.red}✗${c.reset} Invalid tier (must be STANDARD, BUILDING, GOOD, EXCELLENT, or ELITE)`);
        continue;
      }
      tg.minTier = tier as any;
      changed = true;
      console.log(`${c.green}✓${c.reset} Minimum tier set to ${tier}`);
    } else if (arg === '--allow-unscored') {
      tg.allowUnscored = true;
      changed = true;
      console.log(`${c.green}✓${c.reset} Allowing unscored agents`);
    } else if (arg === '--disallow-unscored') {
      tg.allowUnscored = false;
      changed = true;
      console.log(`${c.green}✓${c.reset} Disallowing unscored agents`);
    }
  }
  
  if (changed) {
    saveAutonomousConfig(config);
    console.log(`\n${c.green}✓${c.reset} Configuration saved\n`);
  } else {
    console.log(`\n${c.yellow}⚠${c.reset}  No changes made\n`);
    console.log(`${c.dim}Usage: paylobster trust-gate set [options]${c.reset}`);
    console.log(`${c.dim}Options:${c.reset}`);
    console.log(`  --enable / --disable`);
    console.log(`  --min-score <0-1000>`);
    console.log(`  --min-tier <STANDARD|BUILDING|GOOD|EXCELLENT|ELITE>`);
    console.log(`  --allow-unscored / --disallow-unscored\n`);
  }
}

// Handle trust-gate add-exception command
async function handleTrustGateAddException(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster trust-gate add-exception <address>\n`);
    return;
  }
  
  const address = args[0];
  if (!ethers.isAddress(address)) {
    console.log(`\n${c.red}✗${c.reset} Invalid Ethereum address\n`);
    return;
  }
  
  const config = loadAutonomousConfig();
  const addressLower = address.toLowerCase();
  
  if (config.trustGate.exceptions.some(a => a.toLowerCase() === addressLower)) {
    console.log(`\n${c.yellow}⚠${c.reset}  Address already in exceptions list\n`);
    return;
  }
  
  config.trustGate.exceptions.push(address);
  saveAutonomousConfig(config);
  
  console.log(`\n${c.green}✓${c.reset} Added ${address} to exceptions list\n`);
}

// Handle trust-gate remove-exception command
async function handleTrustGateRemoveException(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster trust-gate remove-exception <address>\n`);
    return;
  }
  
  const address = args[0];
  const config = loadAutonomousConfig();
  const addressLower = address.toLowerCase();
  
  const index = config.trustGate.exceptions.findIndex(a => a.toLowerCase() === addressLower);
  if (index === -1) {
    console.log(`\n${c.yellow}⚠${c.reset}  Address not found in exceptions list\n`);
    return;
  }
  
  config.trustGate.exceptions.splice(index, 1);
  saveAutonomousConfig(config);
  
  console.log(`\n${c.green}✓${c.reset} Removed ${address} from exceptions list\n`);
}

// Handle limits status command
async function handleLimitsStatus(): Promise<void> {
  const config = loadAutonomousConfig();
  const sp = config.spending;
  
  console.log(`\n  ${c.blue}🦞 Pay Lobster${c.reset} — Spending Limits\n`);
  console.log(`  Enabled  ${sp.enabled ? c.green + '✓' : c.dim + '✗'}${c.reset}\n`);
  
  if (sp.globalLimits) {
    const gl = sp.globalLimits;
    const maxTx = parseFloat(ethers.formatUnits(gl.maxTransaction, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const daily = parseFloat(ethers.formatUnits(gl.dailyLimit, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const weekly = parseFloat(ethers.formatUnits(gl.weeklyLimit, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const monthly = parseFloat(ethers.formatUnits(gl.monthlyLimit, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    console.log(`  Global Limits`);
    console.log(`    Max Tx   $${maxTx}`);
    console.log(`    Daily    $${daily}`);
    console.log(`    Weekly   $${weekly}`);
    console.log(`    Monthly  $${monthly}\n`);
    
    // Show current usage
    const summary = getSpendingSummary();
    const dailyUsed = parseFloat(ethers.formatUnits(summary.daily, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const weeklyUsed = parseFloat(ethers.formatUnits(summary.weekly, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const monthlyUsed = parseFloat(ethers.formatUnits(summary.monthly, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const dailyPct = gl.dailyLimit > 0n ? Number((summary.daily * 100n) / gl.dailyLimit) : 0;
    const weeklyPct = gl.weeklyLimit > 0n ? Number((summary.weekly * 100n) / gl.weeklyLimit) : 0;
    const monthlyPct = gl.monthlyLimit > 0n ? Number((summary.monthly * 100n) / gl.monthlyLimit) : 0;
    
    console.log(`  Current Usage`);
    console.log(`    Daily    $${dailyUsed} (${dailyPct.toFixed(0)}%)`);
    console.log(`    Weekly   $${weeklyUsed} (${weeklyPct.toFixed(0)}%)`);
    console.log(`    Monthly  $${monthlyUsed} (${monthlyPct.toFixed(0)}%)\n`);
  }
  
  const perAgentCount = Object.keys(sp.perAgent).length;
  if (perAgentCount > 0) {
    console.log(`  Per-Agent Limits (${perAgentCount})`);
    const agents = Object.entries(sp.perAgent).slice(0, 5);
    for (const [addr, limit] of agents) {
      const short = addr.slice(0, 6) + '...' + addr.slice(-4);
      const max = parseFloat(ethers.formatUnits(limit.maxAmount, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      console.log(`    ${c.dim}${short}${c.reset}  $${max}`);
    }
    if (perAgentCount > 5) {
      console.log(`    ${c.dim}...and ${perAgentCount - 5} more${c.reset}`);
    }
    console.log();
  }
  
  if (!sp.enabled) {
    console.log(`  ${c.dim}Enable: ${c.blue}paylobster limits set-global --enable${c.reset}\n`);
  }
}

// Handle limits set-global command
async function handleLimitsSetGlobal(args: string[]): Promise<void> {
  const config = loadAutonomousConfig();
  const sp = config.spending;
  
  if (!sp.globalLimits) {
    sp.globalLimits = {
      maxTransaction: ethers.parseUnits('1000', 6),
      dailyLimit: ethers.parseUnits('5000', 6),
      weeklyLimit: ethers.parseUnits('20000', 6),
      monthlyLimit: ethers.parseUnits('50000', 6),
    };
  }
  
  let changed = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--enable') {
      sp.enabled = true;
      changed = true;
      console.log(`${c.green}✓${c.reset} Spending limits enabled`);
    } else if (arg === '--disable') {
      sp.enabled = false;
      changed = true;
      console.log(`${c.green}✓${c.reset} Spending limits disabled`);
    } else if (arg === '--max-tx') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      sp.globalLimits.maxTransaction = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Max transaction set to $${amount} USDC`);
    } else if (arg === '--daily') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      sp.globalLimits.dailyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Daily limit set to $${amount} USDC`);
    } else if (arg === '--weekly') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      sp.globalLimits.weeklyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Weekly limit set to $${amount} USDC`);
    } else if (arg === '--monthly') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      sp.globalLimits.monthlyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Monthly limit set to $${amount} USDC`);
    }
  }
  
  if (changed) {
    saveAutonomousConfig(config);
    console.log(`\n${c.green}✓${c.reset} Configuration saved\n`);
  } else {
    console.log(`\n${c.yellow}⚠${c.reset}  No changes made\n`);
    console.log(`${c.dim}Usage: paylobster limits set-global [options]${c.reset}`);
    console.log(`${c.dim}Options:${c.reset}`);
    console.log(`  --enable / --disable`);
    console.log(`  --max-tx <amount>`);
    console.log(`  --daily <amount>`);
    console.log(`  --weekly <amount>`);
    console.log(`  --monthly <amount>\n`);
  }
}

// Handle limits set command
async function handleLimitsSet(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster limits set <address> [options]\n`);
    console.log(`${c.dim}Options:${c.reset}`);
    console.log(`  --max-tx <amount>`);
    console.log(`  --daily <amount>`);
    console.log(`  --weekly <amount>`);
    console.log(`  --monthly <amount>`);
    console.log(`  --total <amount>\n`);
    return;
  }
  
  const address = args[0];
  if (!ethers.isAddress(address)) {
    console.log(`\n${c.red}✗${c.reset} Invalid Ethereum address\n`);
    return;
  }
  
  const config = loadAutonomousConfig();
  const addressLower = address.toLowerCase();
  
  if (!config.spending.perAgent[addressLower]) {
    config.spending.perAgent[addressLower] = {
      address: addressLower,
      maxAmount: ethers.parseUnits('1000', 6),
    };
  }
  
  const limit = config.spending.perAgent[addressLower];
  let changed = false;
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--max-tx') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      limit.maxAmount = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Max transaction set to $${amount} USDC`);
    } else if (arg === '--daily') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      limit.dailyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Daily limit set to $${amount} USDC`);
    } else if (arg === '--weekly') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      limit.weeklyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Weekly limit set to $${amount} USDC`);
    } else if (arg === '--monthly') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      limit.monthlyLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Monthly limit set to $${amount} USDC`);
    } else if (arg === '--total') {
      const amount = parseFloat(args[++i]);
      if (isNaN(amount) || amount <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount`);
        continue;
      }
      limit.totalLimit = ethers.parseUnits(amount.toString(), 6);
      changed = true;
      console.log(`${c.green}✓${c.reset} Lifetime limit set to $${amount} USDC`);
    }
  }
  
  if (changed) {
    saveAutonomousConfig(config);
    console.log(`\n${c.green}✓${c.reset} Configuration saved for ${address}\n`);
  } else {
    console.log(`\n${c.yellow}⚠${c.reset}  No changes made\n`);
  }
}

// Handle limits remove command
async function handleLimitsRemove(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster limits remove <address>\n`);
    return;
  }
  
  const address = args[0];
  const config = loadAutonomousConfig();
  const addressLower = address.toLowerCase();
  
  if (!config.spending.perAgent[addressLower]) {
    console.log(`\n${c.yellow}⚠${c.reset}  No limits configured for this address\n`);
    return;
  }
  
  delete config.spending.perAgent[addressLower];
  saveAutonomousConfig(config);
  
  console.log(`\n${c.green}✓${c.reset} Removed limits for ${address}\n`);
}

// Handle limits history command
async function handleLimitsHistory(args: string[]): Promise<void> {
  const limit = args[0] ? parseInt(args[0]) : 20;
  const history = getSpendingHistory(limit);
  
  if (history.length === 0) {
    console.log(`\n${c.dim}No spending history found.${c.reset}\n`);
    return;
  }
  
  console.log(`\n${c.cyan}┌─────────────────────────────────────────────────────────┐${c.reset}`);
  console.log(`${c.cyan}│${c.reset}  ${c.bright}💸 Recent Spending History${c.reset}                         ${c.cyan}│${c.reset}`);
  console.log(`${c.cyan}└─────────────────────────────────────────────────────────┘${c.reset}\n`);
  
  console.log(`${c.dim}  Date & Time          Recipient            Amount${c.reset}`);
  console.log(`${c.dim}  ──────────────────   ──────────────────   ────────────${c.reset}`);
  
  // Group by recipient
  const byRecipient: Record<string, bigint> = {};
  
  for (const record of history) {
    const date = new Date(record.timestamp).toLocaleString();
    const short = record.recipient.slice(0, 6) + '...' + record.recipient.slice(-4);
    const amount = ethers.formatUnits(record.amount, 6);
    
    console.log(`  ${date.padEnd(19)}  ${short.padEnd(17)}  $${amount.padStart(10)} USDC`);
    
    byRecipient[record.recipient] = (byRecipient[record.recipient] || 0n) + BigInt(record.amount);
  }
  
  // Show summary by recipient
  console.log(`\n${c.cyan}┌─────────────────────────────────────────────────────────┐${c.reset}`);
  console.log(`${c.cyan}│${c.reset}  ${c.bright}Summary by Recipient${c.reset}                                ${c.cyan}│${c.reset}`);
  console.log(`${c.cyan}└─────────────────────────────────────────────────────────┘${c.reset}\n`);
  
  const sorted = Object.entries(byRecipient).sort((a, b) => Number(b[1] - a[1]));
  
  for (const [addr, total] of sorted.slice(0, 10)) {
    const short = addr.slice(0, 10) + '...' + addr.slice(-8);
    const amount = ethers.formatUnits(total, 6);
    console.log(`  ${short.padEnd(25)} $${amount.padStart(10)} USDC`);
  }
  
  console.log();
}

// ═══════════════════════════════════════════════════════════
// PAYMENT & AGENT COMMANDS
// ═══════════════════════════════════════════════════════════

// Handle send command: paylobster send <address> <amount>
async function handleSend(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  if (args.length < 2) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster send <address> <amount>\n`);
    console.log(`  ${c.dim}paylobster send 0x742d... 25.50${c.reset}`);
    console.log(`  ${c.dim}paylobster send agent:DataBot 100${c.reset}\n`);
    return;
  }
  
  const [address, amount] = args;
  const amountNum = parseFloat(amount);
  
  if (isNaN(amountNum) || amountNum <= 0) {
    console.log(`\n  ${c.red}✗${c.reset} Invalid amount\n`);
    return;
  }
  
  // Confirmation prompt (this is real money!)
  const rl = createRL();
  const amountFmt = amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
  
  console.log(`\n  ${c.yellow}⚠️  Sending real money${c.reset}\n`);
  console.log(`  To       ${c.dim}${shortAddr}${c.reset}`);
  console.log(`  Amount   ${c.bright}$${amountFmt} USDC${c.reset}`);
  console.log(`  Network  ${config.network}\n`);
  
  const confirm = await prompt(rl, `  ${c.blue}❯${c.reset} Type 'yes' to confirm: `);
  rl.close();
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log(`\n  ${c.dim}Cancelled${c.reset}\n`);
    return;
  }
  
  try {
    const agent = new LobsterAgent({
      privateKey: config.privateKey,
      network: config.network,
      rpcUrl: config.rpcUrl
    });
    
    await agent.initialize();
    
    console.log(`\n  ${c.dim}…${c.reset} Sending $${amountFmt} USDC\n`);
    
    const transfer = await agent.transfer({ to: address, amount });
    
    const txShort = transfer.hash.slice(0, 10) + '...' + transfer.hash.slice(-8);
    const toDisplay = transfer.toName || transfer.to.slice(0, 10) + '...' + transfer.to.slice(-8);
    
    console.log(`  ${c.green}✓${c.reset} Sent $${transfer.amount} USDC to ${toDisplay}`);
    console.log(`    Tx: ${txShort}`);
    console.log(`\n    ${c.dim}https://basescan.org/tx/${transfer.hash}${c.reset}\n`);
    
    // Record in global stats
    stats.recordTransfer(transfer.from, transfer.to, transfer.amount, transfer.hash || transfer.id);
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle escrow command: paylobster escrow <subcommand>
async function handleEscrow(args: string[]): Promise<void> {
  const config = loadConfig();
  const subcommand = args[0]?.toLowerCase();
  
  if (!subcommand) {
    console.log(`\n  ${c.bright}Usage:${c.reset} paylobster escrow <command>\n`);
    console.log(`    create <address> <amount> <desc>  New escrow`);
    console.log(`    list                              List escrows`);
    console.log(`    release <id>                      Release`);
    console.log(`    refund <id>                       Refund\n`);
    console.log(`  ${c.dim}paylobster escrow create 0x... 500 "Website dev"${c.reset}\n`);
    return;
  }
  
  if (!config.privateKey) {
    console.log(`\n  ${c.red}✗${c.reset} No wallet. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  const agent = new LobsterAgent({
    privateKey: config.privateKey,
    network: config.network,
    rpcUrl: config.rpcUrl
  });
  
  await agent.initialize();
  
  try {
    switch (subcommand) {
      case 'create': {
        if (args.length < 3) {
          console.log(`\n${c.bright}Usage:${c.reset} paylobster escrow create <address> <amount> [description]\n`);
          return;
        }
        
        const [, recipient, amount, ...descParts] = args;
        const description = descParts.join(' ') || 'Escrow payment';
        const amountNum = parseFloat(amount);
        
        if (isNaN(amountNum) || amountNum <= 0) {
          console.log(`${c.red}✗${c.reset} Invalid amount: ${amount}\n`);
          return;
        }
        
        console.log(`\n${c.dim}Creating escrow...${c.reset}\n`);
        console.log(`  ${c.dim}To:${c.reset}          ${recipient}`);
        console.log(`  ${c.dim}Amount:${c.reset}      ${c.green}$${amountNum.toFixed(2)} USDC${c.reset}`);
        console.log(`  ${c.dim}Description:${c.reset} ${description}\n`);
        
        const escrow = await agent.createEscrow({
          recipient,
          amount: amount,
          conditions: {
            type: 'approval',
            description
          }
        });
        
        console.log(`\n${c.green}✓ Escrow Created!${c.reset}\n`);
        console.log(`  ${c.dim}ID:${c.reset}     ${c.bright}${escrow.id}${c.reset}`);
        console.log(`  ${c.dim}Amount:${c.reset} ${c.green}$${escrow.amount} USDC${c.reset}`);
        console.log(`  ${c.dim}Status:${c.reset} ${escrow.status}\n`);
        console.log(`${c.dim}Release with: ${c.cyan}paylobster escrow release ${escrow.id}${c.reset}\n`);
        break;
      }
      
      case 'list': {
        console.log(`\n${c.yellow}⚠${c.reset}  Escrow listing requires indexing.`);
        console.log(`${c.dim}View your escrows at: https://basescan.org/address/${getAddress(config.privateKey)}${c.reset}\n`);
        break;
      }
      
      case 'release': {
        if (args.length < 2) {
          console.log(`\n${c.bright}Usage:${c.reset} paylobster escrow release <escrowId>\n`);
          return;
        }
        
        const escrowId = args[1];
        console.log(`\n${c.dim}Releasing escrow ${escrowId}...${c.reset}`);
        
        await agent.releaseEscrow(escrowId);
        
        console.log(`\n${c.green}✓ Escrow Released!${c.reset}`);
        console.log(`${c.dim}Funds have been transferred to the seller.${c.reset}\n`);
        break;
      }
      
      case 'refund': {
        if (args.length < 2) {
          console.log(`\n${c.bright}Usage:${c.reset} paylobster escrow refund <escrowId>\n`);
          return;
        }
        
        const escrowId = args[1];
        console.log(`\n${c.dim}Refunding escrow ${escrowId}...${c.reset}`);
        
        await agent.refundEscrow(escrowId);
        
        console.log(`\n${c.green}✓ Escrow Refunded!${c.reset}`);
        console.log(`${c.dim}Funds have been returned to you.${c.reset}\n`);
        break;
      }
      
      default:
        console.log(`${c.red}✗${c.reset} Unknown escrow command: ${subcommand}\n`);
        console.log(`Run ${c.cyan}paylobster escrow${c.reset} for help.\n`);
    }
  } catch (e: any) {
    console.log(`\n${c.red}✗${c.reset} Escrow operation failed: ${e.message}\n`);
  }
}

// Handle register command: paylobster register <name> [capabilities]
async function handleRegister(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (!config.privateKey) {
    console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
    return;
  }
  
  if (args.length < 1) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster register <name> [capabilities...]\n`);
    console.log(`${c.dim}Examples:${c.reset}`);
    console.log(`  ${c.cyan}paylobster register DataAnalyzer data-processing analytics${c.reset}`);
    console.log(`  ${c.cyan}paylobster register WebDevBot frontend backend api${c.reset}\n`);
    return;
  }
  
  const [name, ...capabilities] = args;
  const caps = capabilities.length > 0 ? capabilities : ['general'];
  
  console.log(`\n${c.dim}🦞 Registering agent on-chain...${c.reset}\n`);
  console.log(`  ${c.dim}Name:${c.reset}         ${c.bright}${name}${c.reset}`);
  console.log(`  ${c.dim}Capabilities:${c.reset} ${caps.join(', ')}`);
  console.log(`  ${c.dim}Network:${c.reset}      ${config.network}\n`);
  
  try {
    const agent = new LobsterAgent({
      privateKey: config.privateKey,
      network: config.network,
      rpcUrl: config.rpcUrl
    });
    
    await agent.initialize();
    await agent.registerAgent({ name, capabilities: caps });
    
    console.log(`\n${c.green}✓ Agent Registered!${c.reset}\n`);
    console.log(`  ${c.dim}Your agent is now discoverable on-chain.${c.reset}`);
    console.log(`  ${c.dim}Others can find you with: ${c.cyan}paylobster discover${c.reset}\n`);
    
  } catch (e: any) {
    console.log(`\n${c.red}✗${c.reset} Registration failed: ${e.message}\n`);
  }
}

// Handle discover command: paylobster discover [search]
async function handleDiscover(args: string[]): Promise<void> {
  const config = loadConfig();
  const searchTerm = args[0]?.toLowerCase();
  
  try {
    console.log(`\n  ${c.dim}…${c.reset} Discovering agents\n`);
    
    const agent = new LobsterAgent({
      network: config.network || 'base',
      rpcUrl: config.rpcUrl
    });
    
    await agent.initialize();
    const agents = await agent.discoverAgents({ limit: 20 });
    
    if (agents.length === 0) {
      console.log(`  ${c.dim}No agents found${c.reset}\n`);
      return;
    }
    
    // Filter by search term if provided
    const filtered = searchTerm 
      ? agents.filter(a => 
          a.name.toLowerCase().includes(searchTerm) ||
          a.capabilities.some(c => c.toLowerCase().includes(searchTerm))
        )
      : agents;
    
    if (filtered.length === 0) {
      console.log(`  ${c.dim}No matches for "${searchTerm}"${c.reset}\n`);
      return;
    }
    
    console.log(`  ${c.blue}🦞 Pay Lobster${c.reset} — Agents\n`);
    console.log(`  ${c.dim}Name                      Trust    Address${c.reset}`);
    console.log(`  ${c.dim}────────────────────────  ───────  ──────────────${c.reset}`);
    
    for (const ag of filtered.slice(0, 10)) {
      const name = ag.name.padEnd(24);
      const trust = ag.trustScore 
        ? `${ag.trustScore.score}/100`.padEnd(7)
        : 'N/A'.padEnd(7);
      const addr = ag.address.slice(0, 6) + '...' + ag.address.slice(-4);
      const trustColor = (ag.trustScore?.score || 0) >= 80 ? c.green : 
                         (ag.trustScore?.score || 0) >= 60 ? c.blue : c.dim;
      
      console.log(`  ${name}  ${trustColor}${trust}${c.reset}  ${c.dim}${addr}${c.reset}`);
    }
    
    if (filtered.length > 10) {
      console.log(`\n  ${c.dim}...and ${filtered.length - 10} more${c.reset}`);
    }
    
    console.log();
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Handle trust command: paylobster trust <address>
async function handleTrust(args: string[]): Promise<void> {
  const config = loadConfig();
  
  if (args.length < 1) {
    console.log(`\n${c.bright}Usage:${c.reset} paylobster trust <address>\n`);
    console.log(`${c.dim}Examples:${c.reset}`);
    console.log(`  ${c.cyan}paylobster trust 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb${c.reset}`);
    console.log(`  ${c.cyan}paylobster trust agent:DataBot${c.reset}\n`);
    return;
  }
  
  const address = args[0];
  const shortAddr = address.slice(0, 10) + '...' + address.slice(-8);
  
  try {
    console.log(`\n  ${c.dim}…${c.reset} Checking trust\n`);
    
    const agent = new LobsterAgent({
      network: config.network || 'base',
      rpcUrl: config.rpcUrl
    });
    
    await agent.initialize();
    const trustScore = await agent.getTrustScore(address);
    
    const stars = trustScore.score >= 90 ? 5 : 
                  trustScore.score >= 75 ? 4 : 
                  trustScore.score >= 60 ? 3 : 
                  trustScore.score >= 40 ? 2 : 1;
    const starStr = '⭐'.repeat(stars);
    
    const levelEmoji = trustScore.level === 'verified' ? '✅' :
                       trustScore.level === 'trusted' ? '🔵' :
                       trustScore.level === 'established' ? '🟢' : '🆕';
    
    console.log(`  ${c.blue}🦞 Pay Lobster${c.reset} — Trust Score\n`);
    console.log(`  Address      ${c.dim}${shortAddr}${c.reset}`);
    console.log(`  Score        ${c.bright}${trustScore.score}/100${c.reset} ${starStr}`);
    console.log(`  Level        ${levelEmoji} ${trustScore.level}`);
    console.log(`  Txns         ${trustScore.totalTransactions}`);
    console.log(`  Success      ${trustScore.successRate}%\n`);
    
    if (trustScore.level === 'verified') {
      console.log(`  ${c.green}✓${c.reset} Highly trusted\n`);
    } else if (trustScore.level === 'trusted') {
      console.log(`  ${c.green}✓${c.reset} Good reputation\n`);
    } else if (trustScore.level === 'new') {
      console.log(`  ${c.yellow}⚠${c.reset}  New agent\n`);
    }
    
  } catch (e: any) {
    console.log(`\n  ${c.red}✗${c.reset} ${e.message}\n`);
  }
}

// Main CLI entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  // Check if first run
  const config = loadConfig();
  
  if (!command || command === 'setup') {
    showBanner();
    await runSetupWizard();
    return;
  }
  
  // Check if setup needed (allow some commands without setup)
  const noSetupRequired = ['help', 'stats', 'volume', 'leaderboard', 'top'];
  if (!config.setupComplete && !noSetupRequired.includes(command)) {
    console.log(`\n  ${c.yellow}⚠${c.reset}  Not configured. Run ${c.blue}paylobster setup${c.reset}\n`);
    return;
  }
  
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    case 'config':
      showConfig();
      break;
      
    case 'balance':
      await checkBalance();
      break;
      
    case 'receive':
    case 'address':
    case 'wallet':
      showReceive();
      break;
    
    case 'fund':
    case 'onramp':
    case 'card':
      await handleFund(args.slice(1));
      break;
      
    case 'send':
      await handleSend(args.slice(1));
      break;
      
    case 'escrow':
      await handleEscrow(args.slice(1));
      break;
      
    case 'trust':
      await handleTrust(args.slice(1));
      break;
      
    case 'discover':
      await handleDiscover(args.slice(1));
      break;
      
    case 'register':
      await handleRegister(args.slice(1));
      break;
    
    case 'swap':
      await handleSwap(args.slice(1));
      break;
    
    case 'quote':
      await handleQuote(args.slice(1));
      break;
    
    case 'volume':
    case 'stats':
      showGlobalStats();
      break;
    
    case 'leaderboard':
    case 'top':
      showLeaderboard();
      break;
    
    // V3 Credit Score Commands
    case 'score':
      await handleScore(args.slice(1));
      break;
    
    case 'credit':
      await handleCredit();
      break;
    
    case 'tier':
      await handleTier();
      break;
    
    case 'credit-history':
      await handleCreditHistory();
      break;
    
    // V3 Credit Escrow Commands
    case 'repay':
      await handleRepay(args.slice(1));
      break;
    
    case 'loans':
      await handleLoans();
      break;
    
    case 'loan':
      await handleLoanDetails(args.slice(1));
      break;
    
    // V3 Reputation Commands
    case 'reputation':
      await handleReputation(args.slice(1));
      break;
    
    case 'trust-history':
      await handleTrustHistory();
      break;
    
    // V3 Identity Commands
    case 'identity':
      await handleIdentity(args.slice(1));
      break;
    
    case 'agents':
      await handleAgents(args.slice(1));
      break;
    
    // V3.1.0 Autonomous Agent Commands
    case 'trust-gate':
      const tgSubcmd = args[1]?.toLowerCase();
      switch (tgSubcmd) {
        case 'status':
          await handleTrustGateStatus();
          break;
        case 'set':
          await handleTrustGateSet(args.slice(2));
          break;
        case 'add-exception':
          await handleTrustGateAddException(args.slice(2));
          break;
        case 'remove-exception':
          await handleTrustGateRemoveException(args.slice(2));
          break;
        default:
          console.log(`\n  ${c.bright}Usage:${c.reset} paylobster trust-gate <command>\n`);
          console.log(`    status                   Show configuration`);
          console.log(`    set [options]            Configure settings`);
          console.log(`    add-exception <address>  Whitelist`);
          console.log(`    remove-exception <addr>  Remove from whitelist\n`);
      }
      break;
    
    case 'limits':
      const limitsSubcmd = args[1]?.toLowerCase();
      switch (limitsSubcmd) {
        case 'status':
          await handleLimitsStatus();
          break;
        case 'set-global':
          await handleLimitsSetGlobal(args.slice(2));
          break;
        case 'set':
          await handleLimitsSet(args.slice(2));
          break;
        case 'remove':
          await handleLimitsRemove(args.slice(2));
          break;
        case 'history':
          await handleLimitsHistory(args.slice(2));
          break;
        default:
          console.log(`\n  ${c.bright}Usage:${c.reset} paylobster limits <command>\n`);
          console.log(`    status                Show spending limits`);
          console.log(`    set-global [opts]     Configure global`);
          console.log(`    set <addr> [opts]     Per-agent limits`);
          console.log(`    remove <address>      Remove limits`);
          console.log(`    history [count]       Spending history\n`);
      }
      break;
      
    default:
      console.log(`\n  ${c.red}✗${c.reset} Unknown command: ${command}`);
      console.log(`  Run ${c.blue}paylobster help${c.reset}\n`);
  }
}

main().catch(console.error);
