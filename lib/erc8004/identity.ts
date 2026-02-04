/**
 * ERC-8004 Identity Registry Client
 * 
 * Register agents, manage identities, and resolve agent information.
 */

import { ethers } from 'ethers';
import {
  CHAIN_CONFIG,
  IDENTITY_REGISTRY_ABI,
  SupportedChain,
  AgentRegistration,
} from './constants';

export interface IdentityClientConfig {
  chain: SupportedChain;
  privateKey?: string;
  provider?: ethers.Provider;
}

export interface RegisteredAgent {
  agentId: number;
  owner: string;
  uri: string;
  registration?: AgentRegistration;
  agentRegistry: string; // Full registry identifier
}

export class IdentityClient {
  private chain: SupportedChain;
  private provider: ethers.Provider;
  private signer?: ethers.Wallet;
  private contract: ethers.Contract;
  private readOnlyContract: ethers.Contract;

  constructor(config: IdentityClientConfig) {
    this.chain = config.chain;
    const chainConfig = CHAIN_CONFIG[config.chain];
    
    this.provider = config.provider || new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
      this.contract = new ethers.Contract(
        chainConfig.contracts.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        this.signer
      );
    }
    
    this.readOnlyContract = new ethers.Contract(
      chainConfig.contracts.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      this.provider
    );
  }

  /**
   * Get the full agent registry identifier (namespace:chainId:address)
   */
  getAgentRegistry(): string {
    const chainConfig = CHAIN_CONFIG[this.chain];
    return `${chainConfig.namespace}:${chainConfig.chainId}:${chainConfig.contracts.identityRegistry}`;
  }

  /**
   * Register a new agent with the Identity Registry
   * 
   * @param registration Agent registration data
   * @returns The newly assigned agentId
   */
  async register(registration: AgentRegistration): Promise<number> {
    if (!this.contract || !this.signer) {
      throw new Error('Signer required for registration');
    }

    // Ensure registration includes this chain's registry
    const agentRegistry = this.getAgentRegistry();
    
    // Host registration file (could be IPFS, HTTPS, or data: URI)
    const uri = await this.hostRegistrationFile(registration);
    
    console.log(`Registering agent with URI: ${uri}`);
    
    const tx = await this.contract.register(uri);
    const receipt = await tx.wait();
    
    // Extract agentId from AgentRegistered event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'AgentRegistered';
      } catch {
        return false;
      }
    });
    
    if (!event) {
      throw new Error('AgentRegistered event not found in transaction');
    }
    
    const parsed = this.contract.interface.parseLog(event);
    const agentId = Number(parsed?.args?.agentId);
    
    console.log(`Agent registered with ID: ${agentId}`);
    
    return agentId;
  }

  /**
   * Update an agent's registration URI
   */
  async updateRegistration(agentId: number, registration: AgentRegistration): Promise<void> {
    if (!this.contract) {
      throw new Error('Signer required for update');
    }

    const uri = await this.hostRegistrationFile(registration);
    const tx = await this.contract.setAgentURI(agentId, uri);
    await tx.wait();
    
    console.log(`Agent ${agentId} registration updated`);
  }

  /**
   * Get agent information by ID
   */
  async getAgent(agentId: number): Promise<RegisteredAgent | null> {
    try {
      const [owner, uri] = await Promise.all([
        this.readOnlyContract.getAgentOwner(agentId),
        this.readOnlyContract.getAgentURI(agentId),
      ]);

      let registration: AgentRegistration | undefined;
      try {
        registration = await this.fetchRegistrationFile(uri);
      } catch (e) {
        console.warn(`Failed to fetch registration for agent ${agentId}:`, e);
      }

      return {
        agentId,
        owner,
        uri,
        registration,
        agentRegistry: this.getAgentRegistry(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get all agents owned by an address
   */
  async getAgentsByOwner(owner: string): Promise<RegisteredAgent[]> {
    const agentIds: bigint[] = await this.readOnlyContract.getAgentsByOwner(owner);
    
    const agents = await Promise.all(
      agentIds.map(id => this.getAgent(Number(id)))
    );
    
    return agents.filter((a): a is RegisteredAgent => a !== null);
  }

  /**
   * Get total number of registered agents
   */
  async getTotalAgents(): Promise<number> {
    const total = await this.readOnlyContract.totalSupply();
    return Number(total);
  }

  /**
   * Search for agents by capability (searches registration files)
   */
  async searchAgents(options: {
    capability?: string;
    service?: string;
    x402Support?: boolean;
    limit?: number;
  }): Promise<RegisteredAgent[]> {
    const total = await this.getTotalAgents();
    const limit = options.limit || 50;
    const results: RegisteredAgent[] = [];
    
    // Note: In production, you'd want an indexer for this
    // For demo purposes, we iterate through recent registrations
    for (let i = total; i > 0 && results.length < limit; i--) {
      try {
        const agent = await this.getAgent(i);
        if (!agent || !agent.registration) continue;
        
        const reg = agent.registration;
        
        // Filter by x402 support
        if (options.x402Support !== undefined && reg.x402Support !== options.x402Support) {
          continue;
        }
        
        // Filter by capability
        if (options.capability) {
          const hasCapability = reg.usdcAgent?.capabilities?.includes(options.capability);
          if (!hasCapability) continue;
        }
        
        // Filter by service type
        if (options.service) {
          const hasService = reg.services.some(s => s.name === options.service);
          if (!hasService) continue;
        }
        
        results.push(agent);
      } catch {
        continue;
      }
    }
    
    return results;
  }

  /**
   * Host a registration file and return its URI
   * 
   * For simplicity, we use data: URIs (fully on-chain)
   * In production, you might use IPFS or HTTPS
   */
  private async hostRegistrationFile(registration: AgentRegistration): Promise<string> {
    const json = JSON.stringify(registration);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }

  /**
   * Fetch and parse a registration file from its URI
   */
  private async fetchRegistrationFile(uri: string): Promise<AgentRegistration> {
    if (uri.startsWith('data:')) {
      // Parse data: URI
      const match = uri.match(/^data:application\/json;base64,(.+)$/);
      if (!match) throw new Error('Invalid data URI format');
      const json = Buffer.from(match[1], 'base64').toString('utf-8');
      return JSON.parse(json);
    } else if (uri.startsWith('ipfs://')) {
      // Fetch from IPFS gateway
      const cid = uri.replace('ipfs://', '');
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      return response.json();
    } else if (uri.startsWith('https://')) {
      // Fetch from HTTPS
      const response = await fetch(uri);
      return response.json();
    } else {
      throw new Error(`Unsupported URI scheme: ${uri}`);
    }
  }
}

/**
 * Create a standard Lobster Pay registration file
 */
export function createLobsterAgentRegistration(options: {
  name: string;
  description: string;
  image?: string;
  agentId?: number;
  chain: SupportedChain;
  capabilities: string[];
  paymentAddress?: string;
  x402Endpoint?: string;
  escrowSupport?: boolean;
  mcpEndpoint?: string;
  a2aEndpoint?: string;
}): AgentRegistration {
  const chainConfig = CHAIN_CONFIG[options.chain];
  const agentRegistry = `${chainConfig.namespace}:${chainConfig.chainId}:${chainConfig.contracts.identityRegistry}`;

  const services: AgentRegistration['services'] = [];
  
  if (options.mcpEndpoint) {
    services.push({
      name: 'MCP',
      endpoint: options.mcpEndpoint,
      version: '2025-06-18',
    });
  }
  
  if (options.a2aEndpoint) {
    services.push({
      name: 'A2A',
      endpoint: options.a2aEndpoint,
      version: '0.3.0',
    });
  }
  
  if (options.x402Endpoint) {
    services.push({
      name: 'x402',
      endpoint: options.x402Endpoint,
      version: '1.0',
    });
  }

  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: options.name,
    description: options.description,
    image: options.image,
    services,
    x402Support: !!options.x402Endpoint || !!options.paymentAddress,
    active: true,
    registrations: options.agentId !== undefined ? [{
      agentId: options.agentId,
      agentRegistry,
    }] : [],
    supportedTrust: ['reputation'],
    usdcAgent: {
      version: '1.0.0',
      capabilities: options.capabilities,
      supportedChains: [options.chain],
      paymentAddress: options.paymentAddress,
      escrowSupport: options.escrowSupport ?? true,
      x402Endpoint: options.x402Endpoint,
    },
  };
}
