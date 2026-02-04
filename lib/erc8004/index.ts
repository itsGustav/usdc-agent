/**
 * ERC-8004 Trustless Agents - Main Export
 * 
 * Complete integration for agent identity, reputation, and discovery.
 * Designed for seamless integration with USDC payments and x402 protocol.
 */

export * from './constants';
export * from './identity';
export * from './reputation';
export * from './discovery';

import { ethers } from 'ethers';
import { 
  SupportedChain, 
  AgentRegistration,
  CHAIN_CONFIG,
} from './constants';
import { IdentityClient, createLobsterAgentRegistration, RegisteredAgent } from './identity';
import { ReputationClient, FeedbackTemplates, ReputationSummary } from './reputation';
import { DiscoveryService, DiscoveredAgent } from './discovery';

export interface ERC8004ClientConfig {
  chain: SupportedChain;
  privateKey?: string;
  paymentAddress?: string;
  x402Endpoint?: string;
}

/**
 * Unified ERC-8004 Client
 * 
 * Provides high-level API for agent registration, discovery, and trust management.
 */
export class ERC8004Client {
  readonly chain: SupportedChain;
  readonly identity: IdentityClient;
  readonly reputation: ReputationClient;
  readonly discovery: DiscoveryService;
  
  private config: ERC8004ClientConfig;
  private myAgentId?: number;

  constructor(config: ERC8004ClientConfig) {
    this.chain = config.chain;
    this.config = config;
    
    this.identity = new IdentityClient({
      chain: config.chain,
      privateKey: config.privateKey,
    });
    
    this.reputation = new ReputationClient({
      chain: config.chain,
      privateKey: config.privateKey,
    });
    
    this.discovery = new DiscoveryService({
      chain: config.chain,
      privateKey: config.privateKey,
    });
  }

  /**
   * Register this agent with the ERC-8004 Identity Registry
   */
  async registerAgent(options: {
    name: string;
    description: string;
    image?: string;
    capabilities: string[];
    mcpEndpoint?: string;
    a2aEndpoint?: string;
  }): Promise<number> {
    const registration = createLobsterAgentRegistration({
      name: options.name,
      description: options.description,
      image: options.image,
      chain: this.chain,
      capabilities: options.capabilities,
      paymentAddress: this.config.paymentAddress,
      x402Endpoint: this.config.x402Endpoint,
      escrowSupport: true,
      mcpEndpoint: options.mcpEndpoint,
      a2aEndpoint: options.a2aEndpoint,
    });

    this.myAgentId = await this.identity.register(registration);
    return this.myAgentId;
  }

  /**
   * Get my agent ID (if registered)
   */
  getMyAgentId(): number | undefined {
    return this.myAgentId;
  }

  /**
   * Set agent ID (if already registered)
   */
  setMyAgentId(agentId: number): void {
    this.myAgentId = agentId;
  }

  /**
   * Verify an agent before transacting
   */
  async verifyAgent(agentId: number) {
    return this.discovery.verifyAgent(agentId);
  }

  /**
   * Check if payment is safe for an agent
   */
  async isPaymentSafe(agentId: number, amountUsdc: number) {
    return this.discovery.checkPaymentSafety(agentId, amountUsdc);
  }

  /**
   * Post feedback after a transaction
   */
  async postFeedback(options: {
    agentId: number;
    score: number;
    context: string;
    txHash?: string;
  }) {
    return this.reputation.postFeedback({
      agentId: options.agentId,
      score: options.score,
      context: options.context,
      taskHash: options.txHash,
    });
  }

  /**
   * Post positive feedback after successful payment
   */
  async postPaymentSuccess(agentId: number, txHash: string, amount: string) {
    const { score, context } = FeedbackTemplates.paymentSuccessful(txHash, amount);
    return this.postFeedback({ agentId, score, context, txHash });
  }

  /**
   * Post negative feedback after failed payment
   */
  async postPaymentFailure(agentId: number, reason: string) {
    const { score, context } = FeedbackTemplates.paymentFailed(reason);
    return this.postFeedback({ agentId, score, context });
  }

  /**
   * Post feedback after escrow completion
   */
  async postEscrowFeedback(agentId: number, escrowId: string, outcome: 'released' | 'refunded' | 'disputed', reason?: string) {
    if (outcome === 'disputed') {
      const { score, context } = FeedbackTemplates.escrowDisputed(escrowId, reason || 'Unknown');
      return this.postFeedback({ agentId, score, context });
    }
    const { score, context } = FeedbackTemplates.escrowCompleted(escrowId, outcome);
    return this.postFeedback({ agentId, score, context });
  }

  /**
   * Find agents for payment
   */
  async findPaymentAgents(minTrustScore?: number) {
    return this.discovery.findPaymentAgents({ minTrustScore });
  }

  /**
   * Find agents with escrow capability
   */
  async findEscrowAgents(minTrustLevel?: ReputationSummary['trustLevel']) {
    return this.discovery.findEscrowAgents({ minTrustLevel });
  }

  /**
   * Get my reputation summary
   */
  async getMyReputation(): Promise<ReputationSummary | null> {
    if (!this.myAgentId) return null;
    return this.reputation.getReputationSummary(this.myAgentId);
  }

  /**
   * Get contract addresses for this chain
   */
  getContractAddresses() {
    return CHAIN_CONFIG[this.chain].contracts;
  }

  /**
   * Get the agent registry identifier
   */
  getAgentRegistry(): string {
    return this.identity.getAgentRegistry();
  }
}

/**
 * Integration helper: Wrap x402 payment with trust verification
 */
export async function createTrustedX402Payment(options: {
  erc8004: ERC8004Client;
  targetAgentId: number;
  amountUsdc: number;
  endpoint: string;
  paymentFn: () => Promise<{ success: boolean; txHash?: string; error?: string }>;
}): Promise<{
  success: boolean;
  txHash?: string;
  trustScore: number;
  feedbackPosted: boolean;
  error?: string;
}> {
  // Verify agent first
  const verification = await options.erc8004.verifyAgent(options.targetAgentId);
  
  if (!verification.verified) {
    return {
      success: false,
      trustScore: verification.trustScore,
      feedbackPosted: false,
      error: `Agent verification failed: ${verification.reasons.join(', ')}`,
    };
  }

  // Check payment safety
  const safety = await options.erc8004.isPaymentSafe(options.targetAgentId, options.amountUsdc);
  
  if (!safety.safe) {
    console.warn(`Payment exceeds recommended limit: ${safety.reason}`);
    // Continue anyway, but warn
  }

  // Execute payment
  const result = await options.paymentFn();
  
  // Post feedback
  let feedbackPosted = false;
  try {
    if (result.success && result.txHash) {
      await options.erc8004.postPaymentSuccess(
        options.targetAgentId,
        result.txHash,
        options.amountUsdc.toString()
      );
      feedbackPosted = true;
    } else if (!result.success) {
      await options.erc8004.postPaymentFailure(
        options.targetAgentId,
        result.error || 'Unknown error'
      );
      feedbackPosted = true;
    }
  } catch (e) {
    console.warn('Failed to post feedback:', e);
  }

  return {
    success: result.success,
    txHash: result.txHash,
    trustScore: verification.trustScore,
    feedbackPosted,
    error: result.error,
  };
}

/**
 * Quick setup helper
 */
export function createERC8004Client(
  chain: SupportedChain,
  privateKey?: string,
  options?: { paymentAddress?: string; x402Endpoint?: string }
): ERC8004Client {
  return new ERC8004Client({
    chain,
    privateKey,
    paymentAddress: options?.paymentAddress,
    x402Endpoint: options?.x402Endpoint,
  });
}
