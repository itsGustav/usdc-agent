#!/usr/bin/env node
"use strict";
/**
 * Pay Lobster CLI - Setup Wizard & Commands
 * 🦞 Payment infrastructure for AI agents
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const ethers_1 = require("ethers");
const swap_1 = require("./swap");
const stats_1 = require("./stats");
const onramp_1 = require("./onramp");
const agent_1 = require("./agent");
const autonomous_1 = require("./autonomous");
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
const DEFAULT_CONFIG = {
    network: 'base',
    rpcUrl: 'https://mainnet.base.org',
    setupComplete: false,
    version: '3.0.0',
};
// Simple header
function showBanner() {
    console.log(`
  ${c.blue}🦞 Pay Lobster${c.reset}
  ${c.dim}Payment Infrastructure for AI Agents${c.reset}
`);
}
// Create readline interface
function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}
// Prompt helper
function prompt(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}
// Prompt for password (hidden input)
function promptSecret(rl, question) {
    return new Promise((resolve) => {
        process.stdout.write(question);
        const stdin = process.stdin;
        const wasRaw = stdin.isRaw;
        if (stdin.setRawMode) {
            stdin.setRawMode(true);
        }
        stdin.resume();
        let input = '';
        const onData = (char) => {
            const c = char.toString();
            if (c === '\n' || c === '\r') {
                stdin.removeListener('data', onData);
                if (stdin.setRawMode) {
                    stdin.setRawMode(wasRaw || false);
                }
                console.log();
                resolve(input);
            }
            else if (c === '\u0003') {
                process.exit();
            }
            else if (c === '\u007F') {
                input = input.slice(0, -1);
                process.stdout.write('\b \b');
            }
            else {
                input += c;
                process.stdout.write('*');
            }
        };
        stdin.on('data', onData);
    });
}
// Load config
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    }
    catch (e) {
        // Ignore errors, return default
    }
    return { ...DEFAULT_CONFIG };
}
// Save config
function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}
// Validate private key
function isValidPrivateKey(key) {
    try {
        const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
        new ethers_1.ethers.Wallet(cleanKey);
        return true;
    }
    catch {
        return false;
    }
}
// Get wallet address from private key
function getAddress(privateKey) {
    const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new ethers_1.ethers.Wallet(cleanKey);
    return wallet.address;
}
// Setup wizard
async function runSetupWizard() {
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
    }
    else {
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
        const wallet = ethers_1.ethers.Wallet.createRandom();
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
    }
    else if (walletChoice === '2') {
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
            }
            else {
                console.log(`  ${c.red}✗${c.reset} Invalid key\n`);
            }
        }
    }
    else {
        console.log(`  ${c.dim}Skipped. Read-only mode.${c.reset}\n`);
    }
    // Step 4: Verify & Complete
    console.log(`  ${c.dim}Step 4/4: Verification${c.reset}\n`);
    // Test RPC connection
    process.stdout.write(`  ${c.dim}Testing ${config.network}...${c.reset} `);
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const blockNumber = await provider.getBlockNumber();
        console.log(`${c.green}✓${c.reset} Block #${blockNumber}`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Failed`);
    }
    // Check balance if wallet configured
    if (config.privateKey) {
        process.stdout.write(`  ${c.dim}Checking balance...${c.reset} `);
        try {
            const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
            const usdcAddress = config.network === 'base'
                ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
            const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
            const usdc = new ethers_1.ethers.Contract(usdcAddress, usdcAbi, provider);
            const address = getAddress(config.privateKey);
            const balance = await usdc.balanceOf(address);
            const formatted = ethers_1.ethers.formatUnits(balance, 6);
            console.log(`${c.green}✓${c.reset} $${formatted} USDC`);
        }
        catch (e) {
            console.log(`${c.dim}─${c.reset}`);
        }
    }
    // Save config
    config.setupComplete = true;
    saveConfig(config);
    console.log(`\n${c.green}✓${c.reset} Configuration saved to ${c.dim}${CONFIG_FILE}${c.reset}\n`);
    // Success message
    console.log(`${c.bright}${c.green}═══════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright}${c.green}              🦞 Setup Complete!${c.reset}`);
    console.log(`${c.bright}${c.green}═══════════════════════════════════════════════════════════${c.reset}\n`);
    console.log(`${c.bright}Quick Start:${c.reset}\n`);
    console.log(`  ${c.cyan}paylobster balance${c.reset}          Check your USDC balance`);
    console.log(`  ${c.cyan}paylobster send${c.reset}             Send USDC to an address`);
    console.log(`  ${c.cyan}paylobster escrow create${c.reset}    Create a new escrow`);
    console.log(`  ${c.cyan}paylobster discover${c.reset}         Find agents by capability`);
    console.log(`  ${c.cyan}paylobster help${c.reset}             Show all commands\n`);
    if (config.network === 'base' && config.privateKey) {
        const address = getAddress(config.privateKey);
        console.log(`${c.dim}Fund your wallet with USDC on Base:${c.reset}`);
        console.log(`${c.cyan}${address}${c.reset}\n`);
    }
    console.log(`${c.dim}Docs: https://paylobster.com/docs${c.reset}`);
    console.log(`${c.dim}GitHub: https://github.com/itsGustav/Pay-Lobster${c.reset}\n`);
    rl.close();
}
// Show help
function showHelp() {
    console.log(`
${c.bright}Pay Lobster CLI${c.reset} - Payment infrastructure for AI agents

${c.bright}USAGE${c.reset}
  paylobster <command> [options]

${c.bright}COMMANDS${c.reset}
  ${c.cyan}setup${c.reset}                 Run the setup wizard
  ${c.cyan}balance${c.reset}               Check USDC balance
  ${c.cyan}send <amount> <to>${c.reset}    Send USDC to address or agent
  ${c.cyan}receive${c.reset}               Show your wallet address
  ${c.cyan}fund <amount>${c.reset}         Fund wallet with card (Coinbase Onramp)
  ${c.cyan}swap <amt> <from> to <to>${c.reset}  Swap tokens (ETH/USDC)
  ${c.cyan}quote <from> <to>${c.reset}     Get swap quote
  ${c.cyan}escrow create${c.reset}         Create new escrow
  ${c.cyan}escrow list${c.reset}           List your escrows
  ${c.cyan}escrow release <id>${c.reset}   Release escrow funds
  ${c.cyan}trust <agent>${c.reset}         Check agent trust score
  ${c.cyan}discover${c.reset}              Find agents by capability
  ${c.cyan}register${c.reset}              Register your agent
  ${c.cyan}stats${c.reset}                 Show global volume stats
  ${c.cyan}volume${c.reset}                Alias for stats
  ${c.cyan}leaderboard${c.reset}           Top wallets by volume
  
  ${c.bright}V3 CREDIT SCORE${c.reset}
  ${c.cyan}score [address]${c.reset}       Check LOBSTER credit score (300-850)
  ${c.cyan}credit${c.reset}                Your credit limit & available
  ${c.cyan}tier${c.reset}                  Your tier (Standard/Bronze/Silver/Gold/Elite)
  ${c.cyan}credit-history${c.reset}        Credit usage history
  
  ${c.bright}V3 CREDIT ESCROW${c.reset}
  ${c.cyan}repay <loanId>${c.reset}        Repay credit portion of escrow
  ${c.cyan}loans${c.reset}                 List active credit loans
  ${c.cyan}loan <loanId>${c.reset}         Loan details
  
  ${c.bright}V3 REPUTATION${c.reset}
  ${c.cyan}reputation [addr]${c.reset}     Full trust vector breakdown
  ${c.cyan}trust-history${c.reset}         How trust changed over time
  
  ${c.bright}V3 IDENTITY${c.reset}
  ${c.cyan}identity [address]${c.reset}    Agent NFT details
  ${c.cyan}agents${c.reset}                List all registered agents
  
  ${c.cyan}config${c.reset}                Show current configuration
  ${c.cyan}help${c.reset}                  Show this help message

${c.bright}EXAMPLES${c.reset}
  ${c.dim}# Send 25 USDC to another agent${c.reset}
  paylobster send 25.00 agent:DataAnalyzer

  ${c.dim}# Create escrow for a job${c.reset}
  paylobster escrow create 500 agent:WebDevBot --milestone "Landing page"

  ${c.dim}# Check an agent's reputation${c.reset}
  paylobster trust agent:WebDevBot

${c.bright}V3 CONTRACTS (Base Mainnet)${c.reset}
  Identity:   ${c.dim}${V3_CONTRACTS.identity}${c.reset}
  Reputation: ${c.dim}${V3_CONTRACTS.reputation}${c.reset}
  Credit:     ${c.dim}${V3_CONTRACTS.credit}${c.reset}
  Escrow V3:  ${c.dim}${V3_CONTRACTS.escrow}${c.reset}

${c.dim}Documentation: https://paylobster.com/docs${c.reset}
`);
}
// Show config
function showConfig() {
    const config = loadConfig();
    console.log(`\n${c.bright}Pay Lobster Configuration${c.reset}\n`);
    console.log(`${c.dim}Config file: ${CONFIG_FILE}${c.reset}\n`);
    console.log(`  Agent Name:  ${c.cyan}${config.agentName || 'Not set'}${c.reset}`);
    console.log(`  Network:     ${c.cyan}${config.network}${c.reset}`);
    console.log(`  RPC URL:     ${c.dim}${config.rpcUrl}${c.reset}`);
    if (config.privateKey) {
        const address = getAddress(config.privateKey);
        console.log(`  Wallet:      ${c.green}${address}${c.reset}`);
    }
    else {
        console.log(`  Wallet:      ${c.yellow}Not configured${c.reset}`);
    }
    console.log(`  Setup:       ${config.setupComplete ? `${c.green}Complete${c.reset}` : `${c.yellow}Incomplete${c.reset}`}`);
    console.log();
}
// Check balance command
async function checkBalance() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    console.log(`\n${c.dim}🔍 Querying ${config.network}...${c.reset}\n`);
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const address = getAddress(config.privateKey);
        // USDC contract
        const usdcAddress = config.network === 'base'
            ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
            : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
        const usdc = new ethers_1.ethers.Contract(usdcAddress, usdcAbi, provider);
        const balance = await usdc.balanceOf(address);
        const formatted = ethers_1.ethers.formatUnits(balance, 6);
        // Get ETH balance for gas
        const ethBalance = await provider.getBalance(address);
        const ethFormatted = ethers_1.ethers.formatEther(ethBalance);
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💰 Wallet Balance${c.reset}                  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  USDC:   ${c.green}${formatted.padStart(15)} USDC${c.reset}    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ETH:    ${c.dim}${parseFloat(ethFormatted).toFixed(6).padStart(15)} ETH${c.reset}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        console.log(`\n${c.dim}Wallet: ${address}${c.reset}`);
        console.log(`${c.dim}Network: ${config.network}${c.reset}\n`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}`);
    }
}
// Show receive address
function showReceive() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    const address = getAddress(config.privateKey);
    console.log(`\n${c.bright}Your Pay Lobster Wallet${c.reset}\n`);
    console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  ${c.green}${address}${c.reset}  ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}`);
    console.log(`\n${c.dim}Network: ${config.network}${c.reset}`);
    console.log(`${c.dim}Send USDC on Base to this address.${c.reset}\n`);
}
// Handle swap command: paylobster swap 0.01 ETH to USDC
async function handleSwap(args) {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    // Parse: swap <amount> <from> to <to>
    // Example: swap 0.01 ETH to USDC
    if (args.length < 4) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster swap <amount> <from> to <to>\n`);
        console.log(`${c.dim}Examples:${c.reset}`);
        console.log(`  ${c.cyan}paylobster swap 0.01 ETH to USDC${c.reset}`);
        console.log(`  ${c.cyan}paylobster swap 50 USDC to ETH${c.reset}\n`);
        return;
    }
    const amount = args[0];
    const fromToken = args[1].toUpperCase();
    const toToken = args[3]?.toUpperCase() || args[2]?.toUpperCase();
    if (!amount || !fromToken || !toToken) {
        console.log(`${c.red}✗${c.reset} Invalid swap format. Use: swap <amount> <from> to <to>`);
        return;
    }
    console.log(`\n${c.bright}🦞 Pay Lobster Swap${c.reset}\n`);
    try {
        // Get quote first
        console.log(`${c.dim}Getting quote for ${amount} ${fromToken} → ${toToken}...${c.reset}\n`);
        const quote = await (0, swap_1.getSwapQuote)({
            from: fromToken,
            to: toToken,
            amount: amount,
        });
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}Swap Quote${c.reset}                        ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Sell: ${c.yellow}${quote.sellAmount.padStart(15)} ${quote.sellToken}${c.reset}    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Buy:  ${c.green}${parseFloat(quote.buyAmount).toFixed(6).padStart(15)} ${quote.buyToken}${c.reset}    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Rate: ${c.dim}1 ${quote.sellToken} = ${quote.price} ${quote.buyToken}${c.reset} ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        if (quote.sources.length > 0) {
            console.log(`\n${c.dim}Route: ${quote.sources.map(s => s.name).join(' → ')}${c.reset}`);
        }
        // Execute swap
        console.log(`\n${c.dim}Executing swap...${c.reset}`);
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const signer = new ethers_1.ethers.Wallet(config.privateKey, provider);
        const result = await (0, swap_1.executeSwap)(signer, {
            from: fromToken,
            to: toToken,
            amount: amount,
        });
        console.log(`\n${c.green}✓ Swap Complete!${c.reset}\n`);
        console.log(`  ${c.dim}TX:${c.reset} ${c.cyan}${result.hash}${c.reset}`);
        console.log(`  ${c.dim}Sold:${c.reset} ${result.fromAmount} ${result.fromToken}`);
        console.log(`  ${c.dim}Bought:${c.reset} ${c.green}${result.toAmount} ${result.toToken}${c.reset}`);
        console.log(`\n  ${c.dim}View: https://basescan.org/tx/${result.hash}${c.reset}\n`);
    }
    catch (e) {
        console.log(`\n${c.red}✗${c.reset} Swap failed: ${e.message}\n`);
    }
}
// Handle quote command: paylobster quote ETH USDC
async function handleQuote(args) {
    if (args.length < 2) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster quote <from> <to> [amount]\n`);
        console.log(`${c.dim}Examples:${c.reset}`);
        console.log(`  ${c.cyan}paylobster quote ETH USDC${c.reset}        ${c.dim}(quote for 1 ETH)${c.reset}`);
        console.log(`  ${c.cyan}paylobster quote ETH USDC 0.5${c.reset}    ${c.dim}(quote for 0.5 ETH)${c.reset}\n`);
        return;
    }
    const fromToken = args[0].toUpperCase();
    const toToken = args[1].toUpperCase();
    const amount = args[2] || '1';
    console.log(`\n${c.dim}Getting quote for ${amount} ${fromToken} → ${toToken}...${c.reset}\n`);
    try {
        const quote = await (0, swap_1.getSwapQuote)({
            from: fromToken,
            to: toToken,
            amount: amount,
        });
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💱 Swap Quote${c.reset}                     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Sell: ${c.yellow}${quote.sellAmount.padStart(15)} ${quote.sellToken}${c.reset}    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Buy:  ${c.green}${parseFloat(quote.buyAmount).toFixed(6).padStart(15)} ${quote.buyToken}${c.reset}    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Rate: ${c.bright}1 ${quote.sellToken} = ${quote.price} ${quote.buyToken}${c.reset}  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        if (quote.sources.length > 0) {
            console.log(`\n${c.dim}Best route: ${quote.sources.map(s => s.name).join(' + ')}${c.reset}`);
        }
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Quote failed: ${e.message}\n`);
    }
}
// Show global volume stats
function showGlobalStats() {
    const globalStats = stats_1.stats.load();
    const today = new Date().toISOString().split('T')[0];
    const todayVolume = globalStats.dailyVolume[today] || '0';
    console.log(`
${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}
${c.cyan}│${c.reset}     🦞 ${c.bright}PAY LOBSTER GLOBAL STATS${c.reset}              ${c.cyan}│${c.reset}
${c.cyan}└─────────────────────────────────────────────────┘${c.reset}

${c.bright}💰 Total Volume:${c.reset}         ${c.green}$${formatNumber(globalStats.totalVolume)} USDC${c.reset}
${c.bright}📊 Transactions:${c.reset}         ${globalStats.totalTransactions.toLocaleString()}
${c.bright}🔒 Escrow Volume:${c.reset}        ${c.green}$${formatNumber(globalStats.totalEscrowVolume)} USDC${c.reset}
${c.bright}📝 Escrows Created:${c.reset}      ${globalStats.totalEscrowsCreated}

${c.dim}────────────────────────────────────────${c.reset}

${c.bright}📈 Today's Volume:${c.reset}       ${c.green}$${formatNumber(todayVolume)} USDC${c.reset}
${c.bright}👥 Tracked Wallets:${c.reset}      ${globalStats.trackedWallets.length}

${c.dim}Last Updated: ${new Date(globalStats.lastUpdated).toLocaleString()}${c.reset}
${c.dim}Stats stored at: ~/.paylobster/stats.json${c.reset}
`);
}
// Show leaderboard of top wallets
function showLeaderboard() {
    const leaderboard = stats_1.stats.getLeaderboard(10);
    console.log(`
${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}
${c.cyan}│${c.reset}     🏆 ${c.bright}PAY LOBSTER LEADERBOARD${c.reset}               ${c.cyan}│${c.reset}
${c.cyan}└─────────────────────────────────────────────────┘${c.reset}
`);
    if (leaderboard.length === 0) {
        console.log(`${c.dim}  No transactions recorded yet.${c.reset}`);
        console.log(`${c.dim}  Start sending USDC to appear here!${c.reset}\n`);
        return;
    }
    console.log(`${c.dim}  Rank  Address                Volume         Txs${c.reset}`);
    console.log(`${c.dim}  ────  ──────────────────────  ─────────────  ───${c.reset}`);
    for (const entry of leaderboard) {
        const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
        const addr = entry.address.slice(0, 6) + '...' + entry.address.slice(-4);
        const vol = ('$' + formatNumber(entry.totalVolume)).padStart(12);
        console.log(`  ${medal} #${entry.rank}   ${addr}       ${c.green}${vol}${c.reset}     ${entry.transactions}`);
    }
    console.log();
}
function formatNumber(num) {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1000000)
        return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000)
        return (n / 1000).toFixed(2) + 'K';
    return n.toFixed(2);
}
// Handle fund/onramp command: paylobster fund 100
async function handleFund(args) {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    const address = getAddress(config.privateKey);
    const amount = args[0] ? parseFloat(args[0]) : 0;
    if (!amount || amount < 5) {
        console.log(`
${c.bright}Fund Your Wallet${c.reset} - Add USDC with a card via Coinbase Pay

${c.bright}USAGE${c.reset}
  paylobster fund <amount>

${c.bright}EXAMPLES${c.reset}
  ${c.cyan}paylobster fund 100${c.reset}     ${c.dim}Fund wallet with $100 USD${c.reset}
  ${c.cyan}paylobster fund 50${c.reset}      ${c.dim}Fund wallet with $50 USD${c.reset}

${c.bright}PAYMENT METHODS${c.reset}
  • Debit/Credit card
  • Apple Pay (US)
  • Bank transfer
  • Existing Coinbase balance

${c.bright}NOTE${c.reset}
  Minimum amount: ${c.yellow}$5 USD${c.reset}
  Fees: ~1.5% via Coinbase Onramp
`);
        return;
    }
    console.log(`\n${c.dim}🦞 Generating Coinbase Onramp URL...${c.reset}\n`);
    try {
        // Use simple URL (no CDP credentials needed)
        const url = onramp_1.onramp.getSimpleUrl({
            address,
            amount,
            asset: 'USDC'
        });
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}     💳 ${c.bright}FUND YOUR WALLET${c.reset}                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Amount: ${c.green}$${amount} USD → USDC${c.reset}                    ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  To:     ${c.dim}${address.slice(0, 10)}...${address.slice(-6)}${c.reset}          ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}Open this URL to complete purchase:${c.reset}          ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}`);
        console.log();
        console.log(`${c.green}${url}${c.reset}`);
        console.log();
        console.log(`${c.dim}Accepts: Cards, Apple Pay, Bank Transfer, Coinbase balance${c.reset}`);
        console.log(`${c.dim}Fees: ~1.5% via Coinbase Onramp${c.reset}\n`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Failed to generate URL: ${e.message}\n`);
    }
}
// ═══════════════════════════════════════════════════════════
// V3 COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════
// Handle score command: paylobster score [address]
async function handleScore(args) {
    const config = loadConfig();
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const creditContract = new ethers_1.ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
        let address;
        if (args.length > 0) {
            address = args[0];
            console.log(`\n${c.dim}Checking credit score for ${address}...${c.reset}\n`);
        }
        else {
            if (!config.privateKey) {
                console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
                return;
            }
            address = getAddress(config.privateKey);
            console.log(`\n${c.dim}Checking your credit score...${c.reset}\n`);
        }
        const [score, tier] = await creditContract.getCreditScore(address);
        const scoreNum = Number(score);
        // Calculate stars
        const stars = scoreNum >= 850 ? 5 : scoreNum >= 750 ? 4 : scoreNum >= 650 ? 3 : scoreNum >= 550 ? 2 : 1;
        const starStr = '⭐'.repeat(stars);
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🎯 LOBSTER Credit Score${c.reset}          ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Score: ${c.green}${scoreNum} / 850${c.reset} ${starStr}         ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Tier:  ${c.bright}${tier}${c.reset}${''.padStart(24 - tier.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        if (args.length === 0) {
            console.log(`\n${c.dim}Use ${c.cyan}paylobster credit${c.reset}${c.dim} to see your credit limit${c.reset}\n`);
        }
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle credit command: paylobster credit
async function handleCredit() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const creditContract = new ethers_1.ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
        const address = getAddress(config.privateKey);
        console.log(`\n${c.dim}Fetching credit status...${c.reset}\n`);
        const [limit, available, inUse] = await creditContract.getCreditStatus(address);
        const [score, tier] = await creditContract.getCreditScore(address);
        const limitNum = Number(ethers_1.ethers.formatUnits(limit, 6));
        const availableNum = Number(ethers_1.ethers.formatUnits(available, 6));
        const inUseNum = Number(ethers_1.ethers.formatUnits(inUse, 6));
        const utilization = limitNum > 0 ? ((inUseNum / limitNum) * 100).toFixed(1) : '0.0';
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💳 Your Credit Status${c.reset}            ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Tier:          ${c.bright}${tier}${c.reset}${''.padStart(17 - String(tier).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Credit Limit:  ${c.green}$${limitNum.toFixed(2).padStart(10)}${c.reset}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Available:     ${c.green}$${availableNum.toFixed(2).padStart(10)}${c.reset}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  In Use:        ${c.yellow}$${inUseNum.toFixed(2).padStart(10)}${c.reset}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Utilization:   ${utilization}%${''.padStart(14 - String(utilization).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle tier command: paylobster tier
async function handleTier() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const creditContract = new ethers_1.ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
        const address = getAddress(config.privateKey);
        console.log(`\n${c.dim}Fetching tier status...${c.reset}\n`);
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
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🏆 Credit Tier Status${c.reset}            ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Current: ${c.bright}${tier}${c.reset} ${starStr}${''.padStart(15 - tier.length - starStr.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Score:   ${c.green}${scoreNum} / 850${c.reset}${''.padStart(15 - String(scoreNum).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        if (nextTier) {
            const needed = nextTier.min - scoreNum;
            const progress = ((scoreNum - currentTier.min) / (nextTier.min - currentTier.min)) * 100;
            const bars = Math.floor(progress / 5);
            const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
            console.log(`\n${c.dim}Progress to ${nextTier.name}:${c.reset}`);
            console.log(`[${c.green}${progressBar}${c.reset}] ${scoreNum}/${nextTier.min} (${progress.toFixed(0)}%)`);
            console.log(`${c.dim}Need: +${needed} points${c.reset}\n`);
        }
        else {
            console.log(`\n${c.green}✓${c.reset} ${c.bright}You've reached the highest tier!${c.reset}\n`);
        }
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle credit-history command: paylobster credit-history
async function handleCreditHistory() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const creditContract = new ethers_1.ethers.Contract(V3_CONTRACTS.credit, V3_ABIS.credit, provider);
        const address = getAddress(config.privateKey);
        console.log(`\n${c.dim}Fetching credit history...${c.reset}\n`);
        const history = await creditContract.getCreditHistory(address);
        const borrowed = Number(ethers_1.ethers.formatUnits(history.borrowed, 6));
        const repaid = Number(ethers_1.ethers.formatUnits(history.repaid, 6));
        const active = Number(ethers_1.ethers.formatUnits(history.active, 6));
        const repaymentRate = Number(history.repaymentRate) / 100;
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}📊 Credit History${c.reset}                ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Total Borrowed:  $${borrowed.toFixed(2).padStart(10)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Total Repaid:    $${repaid.toFixed(2).padStart(10)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Active Loans:    $${active.toFixed(2).padStart(10)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Repayment Rate:  ${c.green}${repaymentRate.toFixed(1)}%${c.reset} ⭐${''.padStart(8 - String(repaymentRate.toFixed(1)).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle repay command: paylobster repay <loanId>
async function handleRepay(args) {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    if (args.length === 0) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster repay <loanId>\n`);
        console.log(`${c.dim}Example:${c.reset} ${c.cyan}paylobster repay 47${c.reset}\n`);
        return;
    }
    const loanId = args[0];
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const signer = new ethers_1.ethers.Wallet(config.privateKey, provider);
        const escrowContract = new ethers_1.ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, signer);
        console.log(`\n${c.dim}Fetching loan details...${c.reset}\n`);
        const loan = await escrowContract.getLoanDetails(loanId);
        const remaining = Number(ethers_1.ethers.formatUnits(loan.remaining, 6));
        if (remaining === 0) {
            console.log(`${c.green}✓${c.reset} Loan #${loanId} is already fully repaid!\n`);
            return;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💳 Repaying Loan #${loanId}${c.reset}${''.padStart(16 - String(loanId).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Amount Due:  $${remaining.toFixed(2).padStart(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        console.log();
        console.log(`${c.dim}Sending repayment transaction...${c.reset}`);
        const tx = await escrowContract.repayLoan(loanId, {
            value: ethers_1.ethers.parseUnits(remaining.toString(), 6)
        });
        console.log(`${c.dim}Waiting for confirmation...${c.reset}`);
        await tx.wait();
        console.log(`\n${c.green}✓ Loan Repaid!${c.reset}`);
        console.log(`  ${c.dim}TX:${c.reset} ${c.cyan}${tx.hash}${c.reset}`);
        console.log(`  ${c.dim}Amount:${c.reset} $${remaining.toFixed(2)}`);
        console.log(`\n  ${c.dim}View: https://basescan.org/tx/${tx.hash}${c.reset}\n`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Repayment failed: ${e.message}\n`);
    }
}
// Handle loans command: paylobster loans
async function handleLoans() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const escrowContract = new ethers_1.ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, provider);
        const address = getAddress(config.privateKey);
        console.log(`\n${c.dim}Fetching active loans...${c.reset}\n`);
        const loans = await escrowContract.getActiveLoans(address);
        if (loans.length === 0) {
            console.log(`${c.dim}No active loans found.${c.reset}`);
            console.log(`${c.dim}Create a credit-backed escrow to borrow against your reputation!${c.reset}\n`);
            return;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💳 Active Credit Loans${c.reset}                      ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
        console.log(`${c.dim}  ID      Amount        Due Date       Status${c.reset}`);
        console.log(`${c.dim}  ──────  ────────────  ─────────────  ───────${c.reset}`);
        let totalDue = 0;
        const now = Math.floor(Date.now() / 1000);
        for (const loan of loans) {
            const id = Number(loan.id);
            const remaining = Number(ethers_1.ethers.formatUnits(loan.remaining, 6));
            const dueDate = Number(loan.dueDate);
            const daysUntil = Math.floor((dueDate - now) / 86400);
            totalDue += remaining;
            let status = '✓ On Track';
            let statusColor = c.green;
            if (daysUntil < 0) {
                status = '✗ Overdue';
                statusColor = c.red;
            }
            else if (daysUntil < 3) {
                status = '⚠ Due Soon';
                statusColor = c.yellow;
            }
            console.log(`  #${id.toString().padEnd(6)}$${remaining.toFixed(2).padStart(10)}    ${daysUntil} days      ${statusColor}${status}${c.reset}`);
        }
        console.log(`${c.dim}  ──────────────────────────────────────────────${c.reset}`);
        console.log(`  ${c.bright}Total: $${totalDue.toFixed(2)}${c.reset}\n`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle loan details command: paylobster loan <loanId>
async function handleLoanDetails(args) {
    const config = loadConfig();
    if (args.length === 0) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster loan <loanId>\n`);
        console.log(`${c.dim}Example:${c.reset} ${c.cyan}paylobster loan 47${c.reset}\n`);
        return;
    }
    const loanId = args[0];
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const escrowContract = new ethers_1.ethers.Contract(V3_CONTRACTS.escrow, V3_ABIS.escrow, provider);
        console.log(`\n${c.dim}Fetching loan details...${c.reset}\n`);
        const loan = await escrowContract.getLoanDetails(loanId);
        const original = Number(ethers_1.ethers.formatUnits(loan.original, 6));
        const remaining = Number(ethers_1.ethers.formatUnits(loan.remaining, 6));
        const paid = Number(ethers_1.ethers.formatUnits(loan.paid, 6));
        const dueDate = new Date(Number(loan.dueDate) * 1000);
        const now = new Date();
        const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / 86400000);
        let status = '✓ On Track';
        let statusColor = c.green;
        if (remaining === 0) {
            status = '✓ Paid in Full';
            statusColor = c.green;
        }
        else if (daysUntil < 0) {
            status = '✗ Overdue';
            statusColor = c.red;
        }
        else if (daysUntil < 3) {
            status = '⚠ Payment Due Soon';
            statusColor = c.yellow;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}💳 Loan Details #${loanId}${c.reset}${''.padStart(14 - String(loanId).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Original:   $${original.toFixed(2).padStart(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Remaining:  $${remaining.toFixed(2).padStart(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Paid:       $${paid.toFixed(2).padStart(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Due:        ${dueDate.toLocaleDateString().padEnd(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Days Until: ${daysUntil.toString().padEnd(12)}     ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Seller:     ${loan.seller.slice(0, 10)}... ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Status: ${statusColor}${status}${c.reset}${''.padStart(20 - status.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────┘${c.reset}`);
        console.log();
        if (remaining > 0) {
            console.log(`${c.dim}To repay: ${c.cyan}paylobster repay ${loanId}${c.reset}\n`);
        }
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle reputation command: paylobster reputation [address]
async function handleReputation(args) {
    const config = loadConfig();
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const reputationContract = new ethers_1.ethers.Contract(V3_CONTRACTS.reputation, V3_ABIS.reputation, provider);
        let address;
        if (args.length > 0) {
            address = args[0];
            console.log(`\n${c.dim}Checking reputation for ${address}...${c.reset}\n`);
        }
        else {
            if (!config.privateKey) {
                console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
                return;
            }
            address = getAddress(config.privateKey);
            console.log(`\n${c.dim}Fetching your reputation...${c.reset}\n`);
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
        const makeBar = (val) => {
            const bars = Math.floor(val / 5);
            return '█'.repeat(bars) + '░'.repeat(20 - bars);
        };
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🏆 Reputation Profile${c.reset}                       ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Overall: ${c.green}${overall}/100${c.reset} ${starStr}${''.padStart(30 - String(overall).length - starStr.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Delivery:       ${delivery}/100 [${c.green}${makeBar(delivery)}${c.reset}]  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Communication:  ${communication}/100 [${c.green}${makeBar(communication)}${c.reset}]  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Quality:        ${quality}/100 [${c.green}${makeBar(quality)}${c.reset}]  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Reliability:    ${reliability}/100 [${c.green}${makeBar(reliability)}${c.reset}]  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Total Ratings: ${totalRatings}${''.padStart(30 - String(totalRatings).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}`);
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle trust-history command: paylobster trust-history
async function handleTrustHistory() {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const reputationContract = new ethers_1.ethers.Contract(V3_CONTRACTS.reputation, V3_ABIS.reputation, provider);
        const address = getAddress(config.privateKey);
        console.log(`\n${c.dim}Fetching trust history (last 90 days)...${c.reset}\n`);
        const history = await reputationContract.getTrustHistory(address, 90);
        if (history.length === 0) {
            console.log(`${c.dim}No trust history found.${c.reset}`);
            console.log(`${c.dim}Complete transactions to build your reputation!${c.reset}\n`);
            return;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}📈 Trust History (Last 90 Days)${c.reset}             ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
        console.log(`${c.dim}  Date           Score   Event${c.reset}`);
        console.log(`${c.dim}  ─────────────  ──────  ──────────────────${c.reset}`);
        for (const entry of history.slice(0, 10)) {
            const date = new Date(Number(entry.timestamp) * 1000).toLocaleDateString();
            const score = Number(entry.score);
            const event = entry.event;
            console.log(`  ${date.padEnd(13)}  ${score.toString().padStart(3)}/100  ${c.dim}${event}${c.reset}`);
        }
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle identity command: paylobster identity [address]
async function handleIdentity(args) {
    const config = loadConfig();
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const identityContract = new ethers_1.ethers.Contract(V3_CONTRACTS.identity, V3_ABIS.identity, provider);
        let address;
        if (args.length > 0) {
            address = args[0];
            console.log(`\n${c.dim}Fetching identity for ${address}...${c.reset}\n`);
        }
        else {
            if (!config.privateKey) {
                console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
                return;
            }
            address = getAddress(config.privateKey);
            console.log(`\n${c.dim}Fetching your identity...${c.reset}\n`);
        }
        const identity = await identityContract.getIdentity(address);
        const tokenId = Number(identity.tokenId);
        const name = identity.name;
        const registered = new Date(Number(identity.registered) * 1000);
        const capabilities = identity.capabilities;
        const daysAgo = Math.floor((Date.now() - registered.getTime()) / 86400000);
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🆔 Agent Identity${c.reset}                           ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Token ID:   #${tokenId}${''.padStart(35 - String(tokenId).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Name:       ${c.bright}${name}${c.reset}${''.padStart(35 - name.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Address:    ${address.slice(0, 10)}...${''.padStart(20)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Registered: ${daysAgo} days ago${''.padStart(26 - String(daysAgo).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Capabilities:${''.padStart(34)}${c.cyan}│${c.reset}`);
        for (const cap of capabilities) {
            console.log(`${c.cyan}│${c.reset}    • ${c.green}${cap}${c.reset}${''.padStart(41 - cap.length)}${c.cyan}│${c.reset}`);
        }
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}`);
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle agents command: paylobster agents
async function handleAgents(args) {
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider('https://mainnet.base.org');
        const identityContract = new ethers_1.ethers.Contract(V3_CONTRACTS.identity, V3_ABIS.identity, provider);
        console.log(`\n${c.dim}Fetching registered agents...${c.reset}\n`);
        const agents = await identityContract.getAllAgents(0, 10);
        if (agents.length === 0) {
            console.log(`${c.dim}No agents registered yet.${c.reset}`);
            console.log(`${c.dim}Be the first: ${c.cyan}paylobster register${c.reset}\n`);
            return;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🤖 Registered Agents${c.reset}                        ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
        console.log(`${c.dim}  Name                    Score    Address${c.reset}`);
        console.log(`${c.dim}  ──────────────────────  ───────  ──────────────${c.reset}`);
        for (const agent of agents) {
            const name = agent.name.padEnd(22);
            const score = `${agent.score}/100`.padEnd(7);
            const addr = agent.agent.slice(0, 6) + '...' + agent.agent.slice(-4);
            console.log(`  ${name}  ${c.green}${score}${c.reset}  ${c.dim}${addr}${c.reset}`);
        }
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Error: ${e.message}\n`);
    }
}
// Handle trust-gate status command
async function handleTrustGateStatus() {
    const config = (0, autonomous_1.loadConfig)();
    const tg = config.trustGate;
    console.log(`\n${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  ${c.bright}🛡️  Trust Gate Configuration${c.reset}                ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  Enabled:       ${tg.enabled ? c.green + '✓ Yes' : c.red + '✗ No'}${c.reset}${''.padStart(29 - (tg.enabled ? 5 : 4))}${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  Min Score:     ${tg.minScore}${''.padStart(33 - String(tg.minScore).length)}${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  Min Tier:      ${tg.minTier}${''.padStart(33 - tg.minTier.length)}${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  Allow Unscored: ${tg.allowUnscored ? c.yellow + 'Yes' : 'No'}${c.reset}${''.padStart(32 - (tg.allowUnscored ? 3 : 2))}${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  ${c.bright}Exceptions (${tg.exceptions.length}):${c.reset}${''.padStart(30 - String(tg.exceptions.length).length)}${c.cyan}│${c.reset}`);
    if (tg.exceptions.length === 0) {
        console.log(`${c.cyan}│${c.reset}    ${c.dim}(none)${c.reset}${''.padStart(40)}${c.cyan}│${c.reset}`);
    }
    else {
        for (const addr of tg.exceptions.slice(0, 5)) {
            const short = addr.slice(0, 10) + '...' + addr.slice(-8);
            console.log(`${c.cyan}│${c.reset}    • ${short}${''.padStart(40 - short.length)}${c.cyan}│${c.reset}`);
        }
        if (tg.exceptions.length > 5) {
            console.log(`${c.cyan}│${c.reset}    ${c.dim}...and ${tg.exceptions.length - 5} more${c.reset}${''.padStart(30 - String(tg.exceptions.length - 5).length)}${c.cyan}│${c.reset}`);
        }
    }
    console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
    if (!tg.enabled) {
        console.log(`${c.dim}To enable: ${c.cyan}paylobster trust-gate set --enable${c.reset}\n`);
    }
}
// Handle trust-gate set command
async function handleTrustGateSet(args) {
    const config = (0, autonomous_1.loadConfig)();
    const tg = config.trustGate;
    let changed = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--enable') {
            tg.enabled = true;
            changed = true;
            console.log(`${c.green}✓${c.reset} Trust gate enabled`);
        }
        else if (arg === '--disable') {
            tg.enabled = false;
            changed = true;
            console.log(`${c.green}✓${c.reset} Trust gate disabled`);
        }
        else if (arg === '--min-score') {
            const score = parseInt(args[++i]);
            if (isNaN(score) || score < 0 || score > 1000) {
                console.log(`${c.red}✗${c.reset} Invalid score (must be 0-1000)`);
                continue;
            }
            tg.minScore = score;
            changed = true;
            console.log(`${c.green}✓${c.reset} Minimum score set to ${score}`);
        }
        else if (arg === '--min-tier') {
            const tier = args[++i]?.toUpperCase();
            if (!['STANDARD', 'BUILDING', 'GOOD', 'EXCELLENT', 'ELITE'].includes(tier)) {
                console.log(`${c.red}✗${c.reset} Invalid tier (must be STANDARD, BUILDING, GOOD, EXCELLENT, or ELITE)`);
                continue;
            }
            tg.minTier = tier;
            changed = true;
            console.log(`${c.green}✓${c.reset} Minimum tier set to ${tier}`);
        }
        else if (arg === '--allow-unscored') {
            tg.allowUnscored = true;
            changed = true;
            console.log(`${c.green}✓${c.reset} Allowing unscored agents`);
        }
        else if (arg === '--disallow-unscored') {
            tg.allowUnscored = false;
            changed = true;
            console.log(`${c.green}✓${c.reset} Disallowing unscored agents`);
        }
    }
    if (changed) {
        (0, autonomous_1.saveConfig)(config);
        console.log(`\n${c.green}✓${c.reset} Configuration saved\n`);
    }
    else {
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
async function handleTrustGateAddException(args) {
    if (args.length === 0) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster trust-gate add-exception <address>\n`);
        return;
    }
    const address = args[0];
    if (!ethers_1.ethers.isAddress(address)) {
        console.log(`\n${c.red}✗${c.reset} Invalid Ethereum address\n`);
        return;
    }
    const config = (0, autonomous_1.loadConfig)();
    const addressLower = address.toLowerCase();
    if (config.trustGate.exceptions.some(a => a.toLowerCase() === addressLower)) {
        console.log(`\n${c.yellow}⚠${c.reset}  Address already in exceptions list\n`);
        return;
    }
    config.trustGate.exceptions.push(address);
    (0, autonomous_1.saveConfig)(config);
    console.log(`\n${c.green}✓${c.reset} Added ${address} to exceptions list\n`);
}
// Handle trust-gate remove-exception command
async function handleTrustGateRemoveException(args) {
    if (args.length === 0) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster trust-gate remove-exception <address>\n`);
        return;
    }
    const address = args[0];
    const config = (0, autonomous_1.loadConfig)();
    const addressLower = address.toLowerCase();
    const index = config.trustGate.exceptions.findIndex(a => a.toLowerCase() === addressLower);
    if (index === -1) {
        console.log(`\n${c.yellow}⚠${c.reset}  Address not found in exceptions list\n`);
        return;
    }
    config.trustGate.exceptions.splice(index, 1);
    (0, autonomous_1.saveConfig)(config);
    console.log(`\n${c.green}✓${c.reset} Removed ${address} from exceptions list\n`);
}
// Handle limits status command
async function handleLimitsStatus() {
    const config = (0, autonomous_1.loadConfig)();
    const sp = config.spending;
    console.log(`\n${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  ${c.bright}💰 Spending Limits Configuration${c.reset}            ${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.cyan}│${c.reset}  Enabled:  ${sp.enabled ? c.green + '✓ Yes' : c.red + '✗ No'}${c.reset}${''.padStart(34 - (sp.enabled ? 5 : 4))}${c.cyan}│${c.reset}`);
    console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
    if (sp.globalLimits) {
        const gl = sp.globalLimits;
        console.log(`${c.cyan}│${c.reset}  ${c.bright}Global Limits:${c.reset}${''.padStart(32)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Max Transaction: $${ethers_1.ethers.formatUnits(gl.maxTransaction, 6).padStart(12)} USDC ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Daily Limit:     $${ethers_1.ethers.formatUnits(gl.dailyLimit, 6).padStart(12)} USDC ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Weekly Limit:    $${ethers_1.ethers.formatUnits(gl.weeklyLimit, 6).padStart(12)} USDC ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Monthly Limit:   $${ethers_1.ethers.formatUnits(gl.monthlyLimit, 6).padStart(12)} USDC ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        // Show current usage
        const summary = (0, autonomous_1.getSpendingSummary)();
        const dailyPct = gl.dailyLimit > 0n ? Number((summary.daily * 100n) / gl.dailyLimit) : 0;
        const weeklyPct = gl.weeklyLimit > 0n ? Number((summary.weekly * 100n) / gl.weeklyLimit) : 0;
        const monthlyPct = gl.monthlyLimit > 0n ? Number((summary.monthly * 100n) / gl.monthlyLimit) : 0;
        console.log(`${c.cyan}│${c.reset}  ${c.bright}Current Usage:${c.reset}${''.padStart(32)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Daily:   $${ethers_1.ethers.formatUnits(summary.daily, 6).padStart(8)} (${dailyPct.toFixed(0)}%)${''.padStart(20 - dailyPct.toFixed(0).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Weekly:  $${ethers_1.ethers.formatUnits(summary.weekly, 6).padStart(8)} (${weeklyPct.toFixed(0)}%)${''.padStart(20 - weeklyPct.toFixed(0).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}    Monthly: $${ethers_1.ethers.formatUnits(summary.monthly, 6).padStart(8)} (${monthlyPct.toFixed(0)}%)${''.padStart(20 - monthlyPct.toFixed(0).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
    }
    const perAgentCount = Object.keys(sp.perAgent).length;
    console.log(`${c.cyan}│${c.reset}  ${c.bright}Per-Agent Limits (${perAgentCount}):${c.reset}${''.padStart(24 - String(perAgentCount).length)}${c.cyan}│${c.reset}`);
    if (perAgentCount === 0) {
        console.log(`${c.cyan}│${c.reset}    ${c.dim}(none)${c.reset}${''.padStart(40)}${c.cyan}│${c.reset}`);
    }
    else {
        const agents = Object.entries(sp.perAgent).slice(0, 5);
        for (const [addr, limit] of agents) {
            const short = addr.slice(0, 6) + '...' + addr.slice(-4);
            const max = ethers_1.ethers.formatUnits(limit.maxAmount, 6);
            console.log(`${c.cyan}│${c.reset}    ${short}: $${max}${''.padStart(33 - short.length - max.length)}${c.cyan}│${c.reset}`);
        }
        if (perAgentCount > 5) {
            console.log(`${c.cyan}│${c.reset}    ${c.dim}...and ${perAgentCount - 5} more${c.reset}${''.padStart(32 - String(perAgentCount - 5).length)}${c.cyan}│${c.reset}`);
        }
    }
    console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
    if (!sp.enabled) {
        console.log(`${c.dim}To enable: ${c.cyan}paylobster limits set-global --enable${c.reset}\n`);
    }
}
// Handle limits set-global command
async function handleLimitsSetGlobal(args) {
    const config = (0, autonomous_1.loadConfig)();
    const sp = config.spending;
    if (!sp.globalLimits) {
        sp.globalLimits = {
            maxTransaction: ethers_1.ethers.parseUnits('1000', 6),
            dailyLimit: ethers_1.ethers.parseUnits('5000', 6),
            weeklyLimit: ethers_1.ethers.parseUnits('20000', 6),
            monthlyLimit: ethers_1.ethers.parseUnits('50000', 6),
        };
    }
    let changed = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--enable') {
            sp.enabled = true;
            changed = true;
            console.log(`${c.green}✓${c.reset} Spending limits enabled`);
        }
        else if (arg === '--disable') {
            sp.enabled = false;
            changed = true;
            console.log(`${c.green}✓${c.reset} Spending limits disabled`);
        }
        else if (arg === '--max-tx') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            sp.globalLimits.maxTransaction = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Max transaction set to $${amount} USDC`);
        }
        else if (arg === '--daily') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            sp.globalLimits.dailyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Daily limit set to $${amount} USDC`);
        }
        else if (arg === '--weekly') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            sp.globalLimits.weeklyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Weekly limit set to $${amount} USDC`);
        }
        else if (arg === '--monthly') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            sp.globalLimits.monthlyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Monthly limit set to $${amount} USDC`);
        }
    }
    if (changed) {
        (0, autonomous_1.saveConfig)(config);
        console.log(`\n${c.green}✓${c.reset} Configuration saved\n`);
    }
    else {
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
async function handleLimitsSet(args) {
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
    if (!ethers_1.ethers.isAddress(address)) {
        console.log(`\n${c.red}✗${c.reset} Invalid Ethereum address\n`);
        return;
    }
    const config = (0, autonomous_1.loadConfig)();
    const addressLower = address.toLowerCase();
    if (!config.spending.perAgent[addressLower]) {
        config.spending.perAgent[addressLower] = {
            address: addressLower,
            maxAmount: ethers_1.ethers.parseUnits('1000', 6),
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
            limit.maxAmount = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Max transaction set to $${amount} USDC`);
        }
        else if (arg === '--daily') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            limit.dailyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Daily limit set to $${amount} USDC`);
        }
        else if (arg === '--weekly') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            limit.weeklyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Weekly limit set to $${amount} USDC`);
        }
        else if (arg === '--monthly') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            limit.monthlyLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Monthly limit set to $${amount} USDC`);
        }
        else if (arg === '--total') {
            const amount = parseFloat(args[++i]);
            if (isNaN(amount) || amount <= 0) {
                console.log(`${c.red}✗${c.reset} Invalid amount`);
                continue;
            }
            limit.totalLimit = ethers_1.ethers.parseUnits(amount.toString(), 6);
            changed = true;
            console.log(`${c.green}✓${c.reset} Lifetime limit set to $${amount} USDC`);
        }
    }
    if (changed) {
        (0, autonomous_1.saveConfig)(config);
        console.log(`\n${c.green}✓${c.reset} Configuration saved for ${address}\n`);
    }
    else {
        console.log(`\n${c.yellow}⚠${c.reset}  No changes made\n`);
    }
}
// Handle limits remove command
async function handleLimitsRemove(args) {
    if (args.length === 0) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster limits remove <address>\n`);
        return;
    }
    const address = args[0];
    const config = (0, autonomous_1.loadConfig)();
    const addressLower = address.toLowerCase();
    if (!config.spending.perAgent[addressLower]) {
        console.log(`\n${c.yellow}⚠${c.reset}  No limits configured for this address\n`);
        return;
    }
    delete config.spending.perAgent[addressLower];
    (0, autonomous_1.saveConfig)(config);
    console.log(`\n${c.green}✓${c.reset} Removed limits for ${address}\n`);
}
// Handle limits history command
async function handleLimitsHistory(args) {
    const limit = args[0] ? parseInt(args[0]) : 20;
    const history = (0, autonomous_1.getSpendingHistory)(limit);
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
    const byRecipient = {};
    for (const record of history) {
        const date = new Date(record.timestamp).toLocaleString();
        const short = record.recipient.slice(0, 6) + '...' + record.recipient.slice(-4);
        const amount = ethers_1.ethers.formatUnits(record.amount, 6);
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
        const amount = ethers_1.ethers.formatUnits(total, 6);
        console.log(`  ${short.padEnd(25)} $${amount.padStart(10)} USDC`);
    }
    console.log();
}
// ═══════════════════════════════════════════════════════════
// PAYMENT & AGENT COMMANDS
// ═══════════════════════════════════════════════════════════
// Handle send command: paylobster send <address> <amount>
async function handleSend(args) {
    const config = loadConfig();
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    if (args.length < 2) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster send <address> <amount>\n`);
        console.log(`${c.dim}Examples:${c.reset}`);
        console.log(`  ${c.cyan}paylobster send 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb 25.50${c.reset}`);
        console.log(`  ${c.cyan}paylobster send agent:DataBot 100${c.reset}`);
        console.log(`  ${c.cyan}paylobster send @username 50${c.reset}\n`);
        return;
    }
    const [address, amount] = args;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        console.log(`${c.red}✗${c.reset} Invalid amount: ${amount}\n`);
        return;
    }
    // Confirmation prompt (this is real money!)
    const rl = createRL();
    console.log(`\n${c.yellow}⚠️  You are about to send REAL money!${c.reset}\n`);
    console.log(`  ${c.dim}To:${c.reset}     ${address}`);
    console.log(`  ${c.dim}Amount:${c.reset} ${c.green}$${amountNum.toFixed(2)} USDC${c.reset}`);
    console.log(`  ${c.dim}Network:${c.reset} ${config.network}\n`);
    const confirm = await prompt(rl, `${c.yellow}Type 'yes' to confirm:${c.reset} `);
    rl.close();
    if (confirm.toLowerCase() !== 'yes') {
        console.log(`\n${c.dim}Transfer cancelled.${c.reset}\n`);
        return;
    }
    try {
        const agent = new agent_1.LobsterAgent({
            privateKey: config.privateKey,
            network: config.network,
            rpcUrl: config.rpcUrl
        });
        await agent.initialize();
        console.log(`\n${c.dim}🦞 Sending ${amount} USDC...${c.reset}`);
        const transfer = await agent.transfer({ to: address, amount });
        console.log(`\n${c.green}✓ Transfer Complete!${c.reset}\n`);
        console.log(`  ${c.dim}TX:${c.reset} ${c.cyan}${transfer.hash}${c.reset}`);
        console.log(`  ${c.dim}To:${c.reset} ${transfer.toName || transfer.to}`);
        console.log(`  ${c.dim}Amount:${c.reset} ${c.green}$${transfer.amount} USDC${c.reset}`);
        console.log(`\n  ${c.dim}View: https://basescan.org/tx/${transfer.hash}${c.reset}\n`);
        // Record in global stats
        stats_1.stats.recordTransfer(transfer.from, transfer.to, transfer.amount, transfer.hash || transfer.id);
    }
    catch (e) {
        console.log(`\n${c.red}✗${c.reset} Transfer failed: ${e.message}\n`);
    }
}
// Handle escrow command: paylobster escrow <subcommand>
async function handleEscrow(args) {
    const config = loadConfig();
    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster escrow <command>\n`);
        console.log(`${c.dim}Commands:${c.reset}`);
        console.log(`  ${c.cyan}create <address> <amount> <description>${c.reset}  Create new escrow`);
        console.log(`  ${c.cyan}list${c.reset}                                    List your escrows`);
        console.log(`  ${c.cyan}release <escrowId>${c.reset}                      Release escrow funds`);
        console.log(`  ${c.cyan}refund <escrowId>${c.reset}                       Refund escrow\n`);
        console.log(`${c.dim}Examples:${c.reset}`);
        console.log(`  ${c.cyan}paylobster escrow create 0x... 500 "Website development"${c.reset}`);
        console.log(`  ${c.cyan}paylobster escrow release 42${c.reset}\n`);
        return;
    }
    if (!config.privateKey) {
        console.log(`${c.red}✗${c.reset} No wallet configured. Run ${c.cyan}paylobster setup${c.reset} first.`);
        return;
    }
    const agent = new agent_1.LobsterAgent({
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
    }
    catch (e) {
        console.log(`\n${c.red}✗${c.reset} Escrow operation failed: ${e.message}\n`);
    }
}
// Handle register command: paylobster register <name> [capabilities]
async function handleRegister(args) {
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
        const agent = new agent_1.LobsterAgent({
            privateKey: config.privateKey,
            network: config.network,
            rpcUrl: config.rpcUrl
        });
        await agent.initialize();
        await agent.registerAgent({ name, capabilities: caps });
        console.log(`\n${c.green}✓ Agent Registered!${c.reset}\n`);
        console.log(`  ${c.dim}Your agent is now discoverable on-chain.${c.reset}`);
        console.log(`  ${c.dim}Others can find you with: ${c.cyan}paylobster discover${c.reset}\n`);
    }
    catch (e) {
        console.log(`\n${c.red}✗${c.reset} Registration failed: ${e.message}\n`);
    }
}
// Handle discover command: paylobster discover [search]
async function handleDiscover(args) {
    const config = loadConfig();
    const searchTerm = args[0]?.toLowerCase();
    console.log(`\n${c.dim}🦞 Discovering agents on-chain...${c.reset}\n`);
    try {
        const agent = new agent_1.LobsterAgent({
            network: config.network || 'base',
            rpcUrl: config.rpcUrl
        });
        await agent.initialize();
        const agents = await agent.discoverAgents({ limit: 20 });
        if (agents.length === 0) {
            console.log(`${c.dim}No agents found.${c.reset}`);
            console.log(`${c.dim}Be the first: ${c.cyan}paylobster register <name>${c.reset}\n`);
            return;
        }
        // Filter by search term if provided
        const filtered = searchTerm
            ? agents.filter(a => a.name.toLowerCase().includes(searchTerm) ||
                a.capabilities.some(c => c.toLowerCase().includes(searchTerm)))
            : agents;
        if (filtered.length === 0) {
            console.log(`${c.dim}No agents found matching "${searchTerm}".${c.reset}\n`);
            return;
        }
        console.log(`${c.cyan}┌─────────────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🤖 Discovered Agents${c.reset}                                 ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────────────┘${c.reset}\n`);
        console.log(`${c.dim}  Name                      Trust    Address${c.reset}`);
        console.log(`${c.dim}  ────────────────────────  ───────  ──────────────${c.reset}`);
        for (const ag of filtered.slice(0, 10)) {
            const name = ag.name.padEnd(24);
            const trust = ag.trustScore
                ? `${ag.trustScore.score}/100`.padEnd(7)
                : 'N/A'.padEnd(7);
            const addr = ag.address.slice(0, 6) + '...' + ag.address.slice(-4);
            const trustColor = (ag.trustScore?.score || 0) >= 80 ? c.green :
                (ag.trustScore?.score || 0) >= 60 ? c.cyan : c.dim;
            console.log(`  ${name}  ${trustColor}${trust}${c.reset}  ${c.dim}${addr}${c.reset}`);
        }
        if (filtered.length > 10) {
            console.log(`\n${c.dim}  ...and ${filtered.length - 10} more${c.reset}`);
        }
        console.log();
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Discovery failed: ${e.message}\n`);
    }
}
// Handle trust command: paylobster trust <address>
async function handleTrust(args) {
    const config = loadConfig();
    if (args.length < 1) {
        console.log(`\n${c.bright}Usage:${c.reset} paylobster trust <address>\n`);
        console.log(`${c.dim}Examples:${c.reset}`);
        console.log(`  ${c.cyan}paylobster trust 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb${c.reset}`);
        console.log(`  ${c.cyan}paylobster trust agent:DataBot${c.reset}\n`);
        return;
    }
    const address = args[0];
    console.log(`\n${c.dim}🦞 Checking trust score...${c.reset}\n`);
    try {
        const agent = new agent_1.LobsterAgent({
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
        console.log(`${c.cyan}┌─────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  ${c.bright}🏆 Trust Score${c.reset}                             ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Address: ${address.slice(0, 20)}...${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}├─────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Score:       ${c.green}${trustScore.score}/100${c.reset} ${starStr}${''.padStart(20 - starStr.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Level:       ${levelEmoji} ${c.bright}${trustScore.level.toUpperCase()}${c.reset}${''.padStart(31 - trustScore.level.length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Transactions: ${trustScore.totalTransactions}${''.padStart(31 - String(trustScore.totalTransactions).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset}  Success Rate: ${trustScore.successRate}%${''.padStart(30 - String(trustScore.successRate).length)}${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}└─────────────────────────────────────────────────┘${c.reset}\n`);
        if (trustScore.level === 'verified') {
            console.log(`${c.green}✓${c.reset} This agent is highly trusted! Safe to transact.\n`);
        }
        else if (trustScore.level === 'trusted') {
            console.log(`${c.cyan}✓${c.reset} This agent has a good reputation.\n`);
        }
        else if (trustScore.level === 'new') {
            console.log(`${c.yellow}⚠${c.reset}  This agent is new. Proceed with caution.\n`);
        }
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Trust check failed: ${e.message}\n`);
    }
}
// Main CLI entry point
async function main() {
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
        console.log(`\n${c.yellow}⚠${c.reset}  Pay Lobster is not configured yet.\n`);
        console.log(`Run ${c.cyan}paylobster setup${c.reset} to get started.\n`);
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
                    console.log(`\n${c.bright}Usage:${c.reset} paylobster trust-gate <command>\n`);
                    console.log(`${c.dim}Commands:${c.reset}`);
                    console.log(`  status              Show current trust-gate configuration`);
                    console.log(`  set [options]       Configure trust-gate settings`);
                    console.log(`  add-exception <address>     Whitelist an address`);
                    console.log(`  remove-exception <address>  Remove from whitelist\n`);
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
                    console.log(`\n${c.bright}Usage:${c.reset} paylobster limits <command>\n`);
                    console.log(`${c.dim}Commands:${c.reset}`);
                    console.log(`  status              Show current spending limits`);
                    console.log(`  set-global [opts]   Configure global limits`);
                    console.log(`  set <addr> [opts]   Set per-agent limits`);
                    console.log(`  remove <address>    Remove per-agent limits`);
                    console.log(`  history [count]     Show spending history\n`);
            }
            break;
        default:
            console.log(`\n${c.red}✗${c.reset} Unknown command: ${command}`);
            console.log(`Run ${c.cyan}paylobster help${c.reset} to see available commands.\n`);
    }
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map