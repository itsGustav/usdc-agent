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
    version: '1.1.2',
};
// ASCII Art Banner
function showBanner() {
    console.log(`
${c.cyan}  ██████╗  █████╗ ██╗   ██╗    ██╗      ██████╗ ██████╗ ███████╗████████╗███████╗██████╗ 
  ██╔══██╗██╔══██╗╚██╗ ██╔╝    ██║     ██╔═══██╗██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗
  ██████╔╝███████║ ╚████╔╝     ██║     ██║   ██║██████╔╝███████╗   ██║   █████╗  ██████╔╝
  ██╔═══╝ ██╔══██║  ╚██╔╝      ██║     ██║   ██║██╔══██╗╚════██║   ██║   ██╔══╝  ██╔══██╗
  ██║     ██║  ██║   ██║       ███████╗╚██████╔╝██████╔╝███████║   ██║   ███████╗██║  ██║
  ╚═╝     ╚═╝  ╚═╝   ╚═╝       ╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝${c.reset}

  ${c.dim}🦞 Payment Infrastructure for AI Agents${c.reset}
  ${c.dim}   Built on Base • Powered by USDC${c.reset}
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
    console.log(`\n${c.bright}${c.cyan}═══════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.bright}              🦞 Pay Lobster Setup Wizard${c.reset}`);
    console.log(`${c.bright}${c.cyan}═══════════════════════════════════════════════════════════${c.reset}\n`);
    console.log(`${c.dim}This wizard will help you configure Pay Lobster for your AI agent.${c.reset}`);
    console.log(`${c.dim}Your configuration will be stored securely at: ${CONFIG_FILE}${c.reset}\n`);
    // Step 1: Agent Name
    console.log(`${c.yellow}Step 1/4:${c.reset} ${c.bright}Agent Name${c.reset}`);
    console.log(`${c.dim}Give your agent a name for the registry.${c.reset}\n`);
    const agentName = await prompt(rl, `${c.green}❯${c.reset} Agent name: `);
    config.agentName = agentName || 'MyAgent';
    console.log(`${c.green}✓${c.reset} Agent: ${c.bright}${config.agentName}${c.reset}\n`);
    // Step 2: Network Selection
    console.log(`${c.yellow}Step 2/4:${c.reset} ${c.bright}Network${c.reset}`);
    console.log(`${c.dim}Choose your network. Use testnet for development.${c.reset}\n`);
    console.log(`  ${c.cyan}1)${c.reset} Base Mainnet ${c.dim}(production, real USDC)${c.reset}`);
    console.log(`  ${c.cyan}2)${c.reset} Base Sepolia ${c.dim}(testnet, free test USDC)${c.reset}\n`);
    const networkChoice = await prompt(rl, `${c.green}❯${c.reset} Select network [1/2]: `);
    if (networkChoice === '2') {
        config.network = 'base-sepolia';
        config.rpcUrl = 'https://sepolia.base.org';
        console.log(`${c.green}✓${c.reset} Network: ${c.yellow}Base Sepolia (Testnet)${c.reset}\n`);
    }
    else {
        config.network = 'base';
        config.rpcUrl = 'https://mainnet.base.org';
        console.log(`${c.green}✓${c.reset} Network: ${c.bright}Base Mainnet${c.reset}\n`);
    }
    // Step 3: Wallet Setup
    console.log(`${c.yellow}Step 3/4:${c.reset} ${c.bright}Wallet Setup${c.reset}`);
    console.log(`${c.dim}You need a wallet to send and receive USDC.${c.reset}\n`);
    console.log(`  ${c.cyan}1)${c.reset} Generate new wallet ${c.dim}(recommended for new users)${c.reset}`);
    console.log(`  ${c.cyan}2)${c.reset} Import existing private key ${c.dim}(for existing wallets)${c.reset}`);
    console.log(`  ${c.cyan}3)${c.reset} Skip for now ${c.dim}(read-only mode)${c.reset}\n`);
    const walletChoice = await prompt(rl, `${c.green}❯${c.reset} Select option [1/2/3]: `);
    if (walletChoice === '1') {
        // Generate new wallet
        const wallet = ethers_1.ethers.Wallet.createRandom();
        config.privateKey = wallet.privateKey;
        console.log(`\n${c.green}✓${c.reset} New wallet generated!\n`);
        console.log(`${c.bright}${c.cyan}┌─────────────────────────────────────────────────────────────┐${c.reset}`);
        console.log(`${c.bright}${c.cyan}│${c.reset} ${c.bright}⚠️  SAVE THIS INFORMATION SECURELY!${c.reset}                        ${c.cyan}│${c.reset}`);
        console.log(`${c.bright}${c.cyan}├─────────────────────────────────────────────────────────────┤${c.reset}`);
        console.log(`${c.cyan}│${c.reset} Address:     ${c.green}${wallet.address}${c.reset}  ${c.cyan}│${c.reset}`);
        console.log(`${c.cyan}│${c.reset} Private Key: ${c.yellow}${wallet.privateKey.slice(0, 20)}...${c.reset}            ${c.cyan}│${c.reset}`);
        console.log(`${c.bright}${c.cyan}└─────────────────────────────────────────────────────────────┘${c.reset}`);
        console.log(`\n${c.red}${c.bright}IMPORTANT:${c.reset} ${c.dim}Write down your private key and store it safely.${c.reset}`);
        console.log(`${c.dim}If you lose it, you lose access to your funds forever.${c.reset}\n`);
        await prompt(rl, `${c.yellow}Press Enter when you've saved your key...${c.reset}`);
        console.log();
    }
    else if (walletChoice === '2') {
        // Import existing
        console.log(`\n${c.dim}Enter your private key (input is hidden):${c.reset}\n`);
        let validKey = false;
        while (!validKey) {
            const privateKey = await promptSecret(rl, `${c.green}❯${c.reset} Private key: `);
            if (isValidPrivateKey(privateKey)) {
                config.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
                const address = getAddress(config.privateKey);
                console.log(`${c.green}✓${c.reset} Wallet imported: ${c.bright}${address}${c.reset}\n`);
                validKey = true;
            }
            else {
                console.log(`${c.red}✗${c.reset} Invalid private key. Please try again.\n`);
            }
        }
    }
    else {
        console.log(`${c.yellow}⚠${c.reset} Skipping wallet setup. You'll only be able to read data.\n`);
    }
    // Step 4: Verify & Complete
    console.log(`${c.yellow}Step 4/4:${c.reset} ${c.bright}Verification${c.reset}\n`);
    // Test RPC connection
    process.stdout.write(`${c.dim}Testing connection to ${config.network}...${c.reset} `);
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        const blockNumber = await provider.getBlockNumber();
        console.log(`${c.green}✓${c.reset} Connected (block #${blockNumber})`);
    }
    catch (e) {
        console.log(`${c.red}✗${c.reset} Failed to connect`);
    }
    // Check balance if wallet configured
    if (config.privateKey) {
        process.stdout.write(`${c.dim}Checking USDC balance...${c.reset} `);
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
            console.log(`${c.green}✓${c.reset} ${formatted} USDC`);
        }
        catch (e) {
            console.log(`${c.yellow}⚠${c.reset} Could not fetch balance`);
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
  ${c.cyan}escrow create${c.reset}         Create new escrow
  ${c.cyan}escrow list${c.reset}           List your escrows
  ${c.cyan}escrow release <id>${c.reset}   Release escrow funds
  ${c.cyan}trust <agent>${c.reset}         Check agent trust score
  ${c.cyan}discover${c.reset}              Find agents by capability
  ${c.cyan}register${c.reset}              Register your agent
  ${c.cyan}config${c.reset}                Show current configuration
  ${c.cyan}help${c.reset}                  Show this help message

${c.bright}EXAMPLES${c.reset}
  ${c.dim}# Send 25 USDC to another agent${c.reset}
  paylobster send 25.00 agent:DataAnalyzer

  ${c.dim}# Create escrow for a job${c.reset}
  paylobster escrow create 500 agent:WebDevBot --milestone "Landing page"

  ${c.dim}# Check an agent's reputation${c.reset}
  paylobster trust agent:WebDevBot

${c.bright}CONTRACTS (Base Mainnet)${c.reset}
  Escrow:   ${c.dim}0xa091fC821c85Dfd2b2B3EF9e22c5f4c8B8A24525${c.reset}
  Registry: ${c.dim}0x10BCa62Ce136A70F914c56D97e491a85d1e050E7${c.reset}

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
    // Check if setup needed
    if (!config.setupComplete && command !== 'help') {
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
        case 'send':
            console.log(`\n${c.yellow}⚠${c.reset}  Send command coming soon!`);
            console.log(`${c.dim}For now, use the library directly:${c.reset}\n`);
            console.log(`  ${c.cyan}import { LobsterAgent } from 'pay-lobster';${c.reset}`);
            console.log(`  ${c.cyan}const agent = new LobsterAgent({ privateKey });${c.reset}`);
            console.log(`  ${c.cyan}await agent.transfer(recipientAddress, 25.00);${c.reset}\n`);
            break;
        case 'escrow':
            console.log(`\n${c.yellow}⚠${c.reset}  Escrow commands coming soon!`);
            console.log(`${c.dim}For now, use the library directly. See docs.${c.reset}\n`);
            break;
        case 'trust':
            console.log(`\n${c.yellow}⚠${c.reset}  Trust command coming soon!`);
            console.log(`${c.dim}Registry: 0x10BCa62Ce136A70F914c56D97e491a85d1e050E7${c.reset}\n`);
            break;
        case 'discover':
            console.log(`\n${c.yellow}⚠${c.reset}  Discover command coming soon!`);
            console.log(`${c.dim}Registry: 0x10BCa62Ce136A70F914c56D97e491a85d1e050E7${c.reset}\n`);
            break;
        case 'register':
            console.log(`\n${c.yellow}⚠${c.reset}  Register command coming soon!`);
            console.log(`${c.dim}For now, register directly via the contract.${c.reset}\n`);
            break;
        default:
            console.log(`\n${c.red}✗${c.reset} Unknown command: ${command}`);
            console.log(`Run ${c.cyan}paylobster help${c.reset} to see available commands.\n`);
    }
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map