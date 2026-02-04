/**
 * ERC-8004 Constants & Contract Addresses
 * 
 * Official registry deployments from https://github.com/erc-8004/erc-8004-contracts
 */

export const ERC8004_CONTRACTS = {
  // Testnets (same addresses across all testnets)
  testnet: {
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  // Mainnets (same addresses across all mainnets)
  mainnet: {
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  },
} as const;

export const CHAIN_CONFIG = {
  'ETH-SEPOLIA': {
    chainId: 11155111,
    namespace: 'eip155',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    contracts: ERC8004_CONTRACTS.testnet,
  },
  'BASE-SEPOLIA': {
    chainId: 84532,
    namespace: 'eip155',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    contracts: ERC8004_CONTRACTS.testnet,
  },
  'MATIC-AMOY': {
    chainId: 80002,
    namespace: 'eip155',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    contracts: ERC8004_CONTRACTS.testnet,
  },
  'ARB-SEPOLIA': {
    chainId: 421614,
    namespace: 'eip155',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    contracts: ERC8004_CONTRACTS.testnet,
  },
  // Mainnets
  'ETH-MAINNET': {
    chainId: 1,
    namespace: 'eip155',
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    contracts: ERC8004_CONTRACTS.mainnet,
  },
  'BASE-MAINNET': {
    chainId: 8453,
    namespace: 'eip155',
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    contracts: ERC8004_CONTRACTS.mainnet,
  },
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIG;

// Identity Registry ABI (ERC-721 + URIStorage extension)
export const IDENTITY_REGISTRY_ABI = [
  // ERC-721 standard
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  
  // ERC-8004 Identity Registry
  'function register(string uri) returns (uint256 agentId)',
  'function setAgentURI(uint256 agentId, string uri)',
  'function getAgentURI(uint256 agentId) view returns (string)',
  'function getAgentOwner(uint256 agentId) view returns (address)',
  'function getAgentsByOwner(address owner) view returns (uint256[])',
  
  // Events
  'event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri)',
  'event AgentURIUpdated(uint256 indexed agentId, string uri)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
] as const;

// Reputation Registry ABI
export const REPUTATION_REGISTRY_ABI = [
  // Post feedback
  'function postFeedback(uint256 agentId, int8 score, string context, bytes32 taskHash) returns (uint256 feedbackId)',
  'function postFeedbackWithProof(uint256 agentId, int8 score, string context, bytes32 taskHash, bytes proof) returns (uint256 feedbackId)',
  
  // Query feedback
  'function getFeedback(uint256 feedbackId) view returns (tuple(uint256 agentId, address author, int8 score, string context, bytes32 taskHash, uint256 timestamp))',
  'function getFeedbackCount(uint256 agentId) view returns (uint256)',
  'function getFeedbackByAgent(uint256 agentId, uint256 offset, uint256 limit) view returns (uint256[])',
  'function getAverageScore(uint256 agentId) view returns (int256 average, uint256 count)',
  
  // Authorization
  'function authorizeFeedback(uint256 agentId, address author)',
  'function revokeFeedbackAuthorization(uint256 agentId, address author)',
  'function isAuthorizedFeedbackAuthor(uint256 agentId, address author) view returns (bool)',
  
  // Events
  'event FeedbackPosted(uint256 indexed feedbackId, uint256 indexed agentId, address indexed author, int8 score)',
  'event FeedbackAuthorizationGranted(uint256 indexed agentId, address indexed author)',
  'event FeedbackAuthorizationRevoked(uint256 indexed agentId, address indexed author)',
] as const;

// Agent Registration File schema (per ERC-8004 spec)
export interface AgentRegistration {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image?: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
  registrations: {
    agentId: number;
    agentRegistry: string; // {namespace}:{chainId}:{identityRegistry}
  }[];
  supportedTrust: ('reputation' | 'crypto-economic' | 'tee-attestation' | 'zkml')[];
  
  // Lobster Pay specific extensions
  usdcAgent?: {
    version: string;
    capabilities: string[];
    supportedChains: string[];
    paymentAddress?: string;
    escrowSupport: boolean;
    x402Endpoint?: string;
  };
}

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

// Feedback types
export interface Feedback {
  feedbackId: number;
  agentId: number;
  author: string;
  score: number; // -100 to 100
  context: string;
  taskHash: string;
  timestamp: number;
}

export interface ReputationSummary {
  agentId: number;
  averageScore: number;
  totalFeedback: number;
  recentFeedback: Feedback[];
  trustLevel: 'untrusted' | 'new' | 'emerging' | 'established' | 'trusted' | 'verified';
}

// Trust level thresholds
export const TRUST_LEVELS = {
  untrusted: { minScore: -100, minFeedback: 0 },
  new: { minScore: 0, minFeedback: 1 },
  emerging: { minScore: 25, minFeedback: 5 },
  established: { minScore: 50, minFeedback: 20 },
  trusted: { minScore: 75, minFeedback: 50 },
  verified: { minScore: 90, minFeedback: 100 },
} as const;
