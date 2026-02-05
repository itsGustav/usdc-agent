/**
 * LobsterAgent - Main class for Pay Lobster SDK
 * Now with REAL transaction signing! 🦞
 */
import type { LobsterConfig, Wallet, Transfer, Escrow, TrustScore, Agent, TransferOptions, EscrowOptions, DiscoverOptions, AutonomousConfig } from './types';
export declare class LobsterAgent {
    private config;
    private wallet?;
    private signer?;
    private provider?;
    private autonomousConfig?;
    constructor(config?: LobsterConfig);
    /**
     * Initialize the agent and connect to wallet
     */
    initialize(): Promise<void>;
    /**
     * Create a new Circle-managed wallet
     */
    createWallet(): Promise<Wallet>;
    /**
     * Get wallet details and balance
     */
    getWallet(): Promise<Wallet>;
    /**
     * Get current USDC balance
     */
    getBalance(): Promise<string>;
    /**
     * Get ETH balance (needed for gas)
     */
    getEthBalance(): Promise<string>;
    /**
     * Get deposit address
     */
    getDepositAddress(): Promise<string>;
    /**
     * Transfer USDC to another address
     * REAL implementation with on-chain signing! 🦞
     */
    transfer(options: TransferOptions): Promise<Transfer>;
    /**
     * Alias for transfer
     */
    send(to: string, amount: number | string): Promise<Transfer>;
    /**
     * Create an escrow
     */
    createEscrow(options: EscrowOptions): Promise<Escrow>;
    /**
     * Release escrow funds
     */
    releaseEscrow(escrowId: string, options?: {
        amount?: string;
    }): Promise<void>;
    /**
     * Refund escrow
     */
    refundEscrow(escrowId: string): Promise<void>;
    /**
     * Dispute escrow
     */
    disputeEscrow(escrowId: string, options: {
        reason: string;
    }): Promise<void>;
    /**
     * Get trust score for an address
     */
    getTrustScore(address: string): Promise<TrustScore>;
    /**
     * Rate an agent
     */
    rateAgent(options: {
        agent: string;
        rating: number;
        comment?: string;
        transactionId?: string;
    }): Promise<void>;
    /**
     * Get agent ratings
     */
    getAgentRatings(address: string): Promise<any[]>;
    /**
     * Register agent in on-chain registry
     */
    registerAgent(options: {
        name: string;
        capabilities: string[];
        pricing?: Record<string, string>;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Discover agents by capability
     */
    discoverAgents(options: DiscoverOptions): Promise<Agent[]>;
    /**
     * Get agent details
     */
    getAgent(address: string): Promise<Agent | null>;
    /**
     * Configure autonomous mode
     */
    setAutonomousMode(config: AutonomousConfig): void;
    /**
     * Hire an agent autonomously
     */
    hireAgent(options: {
        agent: string;
        task: string;
        maxPrice: string;
    }): Promise<any>;
    /**
     * Set webhook for notifications
     */
    setWebhook(options: {
        url: string;
        secret: string;
        events: string[];
    }): void;
    /**
     * Fetch with x402 auto-payment
     */
    fetch(url: string, options?: {
        x402?: boolean;
        maxPayment?: string;
    }): Promise<Response>;
    /**
     * Get transfer by ID
     */
    getTransfer(id: string): Promise<Transfer | null>;
    /**
     * List transfer history
     */
    listTransfers(options?: {
        limit?: number;
        direction?: string;
        since?: string;
    }): Promise<Transfer[]>;
}
//# sourceMappingURL=agent.d.ts.map