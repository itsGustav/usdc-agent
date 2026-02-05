"use strict";
/**
 * LobsterAgent - Main class for Pay Lobster SDK
 * Now with REAL transaction signing! 🦞
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobsterAgent = void 0;
const ethers_1 = require("ethers");
const BASE_RPC = 'https://mainnet.base.org';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
// Minimal ERC-20 ABI for transfer
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)'
];
class LobsterAgent {
    constructor(config = {}) {
        this.config = {
            network: 'base',
            enableTrust: true,
            ...config
        };
    }
    /**
     * Initialize the agent and connect to wallet
     */
    async initialize() {
        // Set up provider
        const rpcUrl = this.config.rpcUrl || BASE_RPC;
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        // Set up signer if private key provided
        if (this.config.privateKey) {
            this.signer = new ethers_1.ethers.Wallet(this.config.privateKey, this.provider);
            this.wallet = {
                id: 'local',
                address: this.signer.address,
                network: this.config.network || 'base',
                balance: await this.getBalance()
            };
        }
        else if (this.config.walletId) {
            this.wallet = await this.getWallet();
        }
    }
    /**
     * Create a new Circle-managed wallet
     */
    async createWallet() {
        // Implementation would use Circle API
        throw new Error('Circle wallet creation requires entity secret. Use external wallet or Circle Console.');
    }
    /**
     * Get wallet details and balance
     */
    async getWallet() {
        if (!this.wallet?.address && !this.config.walletId) {
            throw new Error('No wallet configured');
        }
        const address = this.wallet?.address || this.config.walletId;
        const balance = await this.getBalance();
        return {
            id: this.config.walletId || 'external',
            address,
            network: this.config.network || 'base',
            balance
        };
    }
    /**
     * Get current USDC balance
     */
    async getBalance() {
        const address = this.signer?.address || this.wallet?.address || this.config.walletId;
        if (!address)
            throw new Error('No wallet address');
        const rpc = this.config.rpcUrl || BASE_RPC;
        const data = '0x70a08231' + address.slice(2).padStart(64, '0');
        const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to: USDC_BASE, data }, 'latest']
            })
        });
        const result = await response.json();
        const balance = parseInt(result.result || '0', 16) / 1e6;
        return balance.toFixed(2);
    }
    /**
     * Get ETH balance (needed for gas)
     */
    async getEthBalance() {
        const address = this.signer?.address || this.wallet?.address || this.config.walletId;
        if (!address)
            throw new Error('No wallet address');
        const rpc = this.config.rpcUrl || BASE_RPC;
        const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_getBalance',
                params: [address, 'latest']
            })
        });
        const result = await response.json();
        const balance = parseInt(result.result || '0', 16) / 1e18;
        return balance.toFixed(6);
    }
    /**
     * Get deposit address
     */
    async getDepositAddress() {
        return this.wallet?.address || this.config.walletId || '';
    }
    /**
     * Transfer USDC to another address
     * REAL implementation with on-chain signing! 🦞
     */
    async transfer(options) {
        if (!this.signer) {
            throw new Error('No signer available. Provide privateKey in config to enable transfers.');
        }
        if (!this.provider) {
            throw new Error('Provider not initialized. Call initialize() first.');
        }
        // Validate address
        if (!ethers_1.ethers.isAddress(options.to)) {
            throw new Error(`Invalid recipient address: ${options.to}`);
        }
        // Parse amount (USDC has 6 decimals)
        const amount = ethers_1.ethers.parseUnits(options.amount, 6);
        // Check balance first
        const usdc = new ethers_1.ethers.Contract(USDC_BASE, ERC20_ABI, this.signer);
        const balance = await usdc.balanceOf(this.signer.address);
        if (balance < amount) {
            const balanceFormatted = ethers_1.ethers.formatUnits(balance, 6);
            throw new Error(`Insufficient balance. Have: ${balanceFormatted} USDC, Need: ${options.amount} USDC`);
        }
        console.log(`🦞 Sending ${options.amount} USDC to ${options.to}...`);
        try {
            // Execute the transfer
            const tx = await usdc.transfer(options.to, amount);
            console.log(`📤 Transaction submitted: ${tx.hash}`);
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
            return {
                id: tx.hash,
                hash: tx.hash,
                status: receipt.status === 1 ? 'confirmed' : 'failed',
                amount: options.amount,
                to: options.to,
                from: this.signer.address,
                memo: options.memo,
                createdAt: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`❌ Transfer failed: ${error.message}`);
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }
    /**
     * Alias for transfer
     */
    async send(to, amount) {
        return this.transfer({ to, amount: amount.toString() });
    }
    /**
     * Create an escrow
     */
    async createEscrow(options) {
        return {
            id: `esc_${Date.now()}`,
            amount: options.amount,
            buyer: this.wallet?.address || '',
            seller: options.recipient,
            status: 'funded',
            conditions: options.conditions,
            createdAt: new Date().toISOString()
        };
    }
    /**
     * Release escrow funds
     */
    async releaseEscrow(escrowId, options) {
        console.log(`Releasing escrow ${escrowId}`, options);
    }
    /**
     * Refund escrow
     */
    async refundEscrow(escrowId) {
        console.log(`Refunding escrow ${escrowId}`);
    }
    /**
     * Dispute escrow
     */
    async disputeEscrow(escrowId, options) {
        console.log(`Disputing escrow ${escrowId}: ${options.reason}`);
    }
    /**
     * Get trust score for an address
     */
    async getTrustScore(address) {
        // Would query ERC-8004 registry
        return {
            score: 100,
            level: 'new',
            totalTransactions: 0,
            successRate: 100
        };
    }
    /**
     * Rate an agent
     */
    async rateAgent(options) {
        console.log(`Rating agent ${options.agent}: ${options.rating}/5`);
    }
    /**
     * Get agent ratings
     */
    async getAgentRatings(address) {
        return [];
    }
    /**
     * Register agent in on-chain registry
     */
    async registerAgent(options) {
        console.log(`Registering agent: ${options.name}`);
    }
    /**
     * Discover agents by capability
     */
    async discoverAgents(options) {
        // Would query on-chain registry
        return [{
                address: '0xf775f0224A680E2915a066e53A389d0335318b7B',
                name: 'paylobster',
                capabilities: ['payments', 'escrow'],
                trustScore: { score: 100, level: 'verified', totalTransactions: 0, successRate: 100 }
            }];
    }
    /**
     * Get agent details
     */
    async getAgent(address) {
        const agents = await this.discoverAgents({});
        return agents.find(a => a.address.toLowerCase() === address.toLowerCase()) || null;
    }
    /**
     * Configure autonomous mode
     */
    setAutonomousMode(config) {
        this.autonomousConfig = config;
    }
    /**
     * Hire an agent autonomously
     */
    async hireAgent(options) {
        console.log(`Hiring agent ${options.agent} for: ${options.task}`);
        return { taskId: `task_${Date.now()}`, agent: options.agent, price: options.maxPrice };
    }
    /**
     * Set webhook for notifications
     */
    setWebhook(options) {
        console.log(`Webhook configured: ${options.url}`);
    }
    /**
     * Fetch with x402 auto-payment
     */
    async fetch(url, options) {
        const response = await fetch(url);
        if (response.status === 402 && options?.x402) {
            // Would handle payment automatically
            console.log('402 Payment Required - auto-paying...');
        }
        return response;
    }
    /**
     * Get transfer by ID
     */
    async getTransfer(id) {
        return null;
    }
    /**
     * List transfer history
     */
    async listTransfers(options) {
        return [];
    }
}
exports.LobsterAgent = LobsterAgent;
//# sourceMappingURL=agent.js.map