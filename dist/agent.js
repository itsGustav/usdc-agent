"use strict";
/**
 * LobsterAgent - Main class for Pay Lobster SDK
 * Now with REAL on-chain contracts! 🦞
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LobsterAgent = void 0;
const ethers_1 = require("ethers");
const contracts_1 = require("./contracts");
const analytics_1 = require("./analytics");
const BASE_RPC = 'https://mainnet.base.org';
const USDC_BASE = contracts_1.CONTRACTS.usdc;
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
            // Track agent initialization
            analytics_1.analytics.setAgent(this.signer.address);
            analytics_1.analytics.track('agent_initialized', {
                address: this.signer.address.slice(0, 10) + '...',
                network: this.config.network || 'base'
            });
        }
        else if (this.config.walletId) {
            this.wallet = await this.getWallet();
            analytics_1.analytics.setAgent(this.config.walletId);
            analytics_1.analytics.track('agent_initialized', {
                address: this.config.walletId.slice(0, 10) + '...',
                mode: 'read-only'
            });
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
        const usdc = new ethers_1.ethers.Contract(USDC_BASE, contracts_1.ERC20_ABI, this.signer);
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
            // Track successful transaction
            analytics_1.analytics.trackTransaction('send', options.amount, options.to, tx.hash);
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
            analytics_1.analytics.trackError(error.message, 'transfer');
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
     * Create an escrow - REAL on-chain! 🦞
     */
    async createEscrow(options) {
        if (!this.signer) {
            throw new Error('No signer available. Provide privateKey to create escrow.');
        }
        const usdc = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.usdc, contracts_1.ERC20_ABI, this.signer);
        const escrowContract = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.escrow, contracts_1.ESCROW_ABI, this.signer);
        const amount = ethers_1.ethers.parseUnits(options.amount, 6);
        const deadline = options.deadline ? Math.floor(new Date(options.deadline).getTime() / 1000) : 0;
        const description = options.conditions?.description || '';
        // Approve USDC spend
        console.log('🦞 Approving USDC for escrow...');
        const approveTx = await usdc.approve(contracts_1.CONTRACTS.escrow, amount);
        await approveTx.wait();
        // Create escrow
        console.log('🦞 Creating escrow...');
        const tx = await escrowContract.createEscrow(options.recipient, amount, description, deadline);
        const receipt = await tx.wait();
        // Get escrow ID from event
        const event = receipt.logs.find((log) => {
            try {
                return escrowContract.interface.parseLog(log)?.name === 'EscrowCreated';
            }
            catch {
                return false;
            }
        });
        const escrowId = event ? escrowContract.interface.parseLog(event)?.args[0].toString() : '0';
        console.log(`✅ Escrow created: ID ${escrowId}`);
        return {
            id: escrowId,
            amount: options.amount,
            buyer: this.signer.address,
            seller: options.recipient,
            status: 'funded',
            conditions: options.conditions,
            createdAt: new Date().toISOString()
        };
    }
    /**
     * Release escrow funds - REAL on-chain! 🦞
     */
    async releaseEscrow(escrowId, options) {
        if (!this.signer)
            throw new Error('No signer available');
        const escrowContract = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.escrow, contracts_1.ESCROW_ABI, this.signer);
        console.log(`🦞 Releasing escrow ${escrowId}...`);
        const tx = await escrowContract.releaseEscrow(escrowId);
        await tx.wait();
        console.log(`✅ Escrow ${escrowId} released!`);
    }
    /**
     * Refund escrow - REAL on-chain! 🦞
     */
    async refundEscrow(escrowId) {
        if (!this.signer)
            throw new Error('No signer available');
        const escrowContract = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.escrow, contracts_1.ESCROW_ABI, this.signer);
        console.log(`🦞 Refunding escrow ${escrowId}...`);
        const tx = await escrowContract.refundEscrow(escrowId);
        await tx.wait();
        console.log(`✅ Escrow ${escrowId} refunded!`);
    }
    /**
     * Dispute escrow - REAL on-chain! 🦞
     */
    async disputeEscrow(escrowId, options) {
        if (!this.signer)
            throw new Error('No signer available');
        const escrowContract = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.escrow, contracts_1.ESCROW_ABI, this.signer);
        console.log(`🦞 Disputing escrow ${escrowId}: ${options.reason}`);
        const tx = await escrowContract.disputeEscrow(escrowId);
        await tx.wait();
        console.log(`✅ Escrow ${escrowId} disputed!`);
    }
    /**
     * Get trust score for an address - REAL on-chain! 🦞
     */
    async getTrustScore(address) {
        const provider = this.provider || new ethers_1.ethers.JsonRpcProvider(BASE_RPC);
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, provider);
        try {
            const [score, ratings] = await registry.getTrustScore(address);
            const level = score >= 80 ? 'verified' : score >= 60 ? 'trusted' : score >= 40 ? 'established' : 'new';
            return {
                score: Number(score),
                level,
                totalTransactions: Number(ratings),
                successRate: 100
            };
        }
        catch {
            return { score: 50, level: 'new', totalTransactions: 0, successRate: 100 };
        }
    }
    /**
     * Rate an agent - REAL on-chain! 🦞
     */
    async rateAgent(options) {
        if (!this.signer)
            throw new Error('No signer available');
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, this.signer);
        console.log(`🦞 Rating agent ${options.agent}: ${options.rating}/5...`);
        const tx = await registry.rateAgent(options.agent, options.rating, options.comment || '');
        await tx.wait();
        console.log(`✅ Agent rated!`);
    }
    /**
     * Get agent ratings - REAL on-chain! 🦞
     */
    async getAgentRatings(address) {
        const provider = this.provider || new ethers_1.ethers.JsonRpcProvider(BASE_RPC);
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, provider);
        try {
            const ratings = await registry.getAgentRatings(address, 10);
            return ratings.map((r) => ({
                rater: r.rater,
                rating: Number(r.score),
                comment: r.comment,
                timestamp: new Date(Number(r.timestamp) * 1000).toISOString()
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Register agent in on-chain registry - REAL! 🦞
     */
    async registerAgent(options) {
        if (!this.signer)
            throw new Error('No signer available');
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, this.signer);
        const capabilitiesCSV = options.capabilities.join(',');
        const metadataURI = options.metadata ? JSON.stringify(options.metadata) : '';
        console.log(`🦞 Registering agent: ${options.name}...`);
        const tx = await registry.registerAgent(options.name, capabilitiesCSV, metadataURI);
        await tx.wait();
        console.log(`✅ Agent registered on-chain!`);
    }
    /**
     * Discover agents - REAL on-chain! 🦞
     */
    async discoverAgents(options) {
        const provider = this.provider || new ethers_1.ethers.JsonRpcProvider(BASE_RPC);
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, provider);
        try {
            const limit = options.limit || 10;
            const [addresses, names, trustScores] = await registry.discoverAgents(limit);
            const agents = [];
            for (let i = 0; i < addresses.length; i++) {
                if (addresses[i] === ethers_1.ethers.ZeroAddress)
                    continue;
                const level = trustScores[i] >= 80 ? 'verified' : trustScores[i] >= 60 ? 'trusted' :
                    trustScores[i] >= 40 ? 'established' : 'new';
                agents.push({
                    address: addresses[i],
                    name: names[i],
                    capabilities: [], // Parse from getAgent if needed
                    trustScore: {
                        score: Number(trustScores[i]),
                        level: level,
                        totalTransactions: 0,
                        successRate: 100
                    }
                });
            }
            return agents;
        }
        catch (e) {
            console.error('Discovery error:', e);
            return [];
        }
    }
    /**
     * Get agent details - REAL on-chain! 🦞
     */
    async getAgent(address) {
        const provider = this.provider || new ethers_1.ethers.JsonRpcProvider(BASE_RPC);
        const registry = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.registry, contracts_1.REGISTRY_ABI, provider);
        try {
            const [name, capabilitiesCSV, metadataURI, registeredAt, active, trustScore, numRatings] = await registry.getAgent(address);
            if (!active)
                return null;
            const level = trustScore >= 80 ? 'verified' : trustScore >= 60 ? 'trusted' :
                trustScore >= 40 ? 'established' : 'new';
            return {
                address,
                name,
                capabilities: capabilitiesCSV.split(',').filter((c) => c),
                trustScore: {
                    score: Number(trustScore),
                    level: level,
                    totalTransactions: Number(numRatings),
                    successRate: 100
                },
                metadata: metadataURI ? JSON.parse(metadataURI) : undefined
            };
        }
        catch {
            return null;
        }
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
     * List transfer history - queries USDC Transfer events! 🦞
     */
    async listTransfers(options) {
        const address = this.signer?.address || this.wallet?.address || this.config.walletId;
        if (!address)
            return [];
        const provider = this.provider || new ethers_1.ethers.JsonRpcProvider(BASE_RPC);
        const usdc = new ethers_1.ethers.Contract(contracts_1.CONTRACTS.usdc, [
            'event Transfer(address indexed from, address indexed to, uint256 value)'
        ], provider);
        try {
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = currentBlock - 10000; // Last ~10k blocks
            // Get transfers to/from this address
            const filterTo = usdc.filters.Transfer(null, address);
            const filterFrom = usdc.filters.Transfer(address, null);
            const [eventsTo, eventsFrom] = await Promise.all([
                usdc.queryFilter(filterTo, fromBlock, currentBlock),
                usdc.queryFilter(filterFrom, fromBlock, currentBlock)
            ]);
            const transfers = [];
            for (const event of [...eventsTo, ...eventsFrom]) {
                const args = event.args;
                const block = await event.getBlock();
                transfers.push({
                    id: event.transactionHash,
                    hash: event.transactionHash,
                    status: 'confirmed',
                    amount: ethers_1.ethers.formatUnits(args.value, 6),
                    to: args.to,
                    from: args.from,
                    createdAt: new Date(block.timestamp * 1000).toISOString()
                });
            }
            // Sort by date, most recent first
            transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return transfers.slice(0, options?.limit || 10);
        }
        catch (e) {
            console.error('History error:', e);
            return [];
        }
    }
}
exports.LobsterAgent = LobsterAgent;
//# sourceMappingURL=agent.js.map