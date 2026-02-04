/**
 * Universal Escrow Module (Escrow as a Service - EaaS)
 * 
 * Smart contract-style escrow for multiple verticals:
 * - Real estate (earnest money, security deposits, closing)
 * - Freelance/Services (milestones, deliverables)
 * - Commerce (purchases, trades, swaps)
 * - P2P (OTC trades, loans)
 * - Digital (licenses, subscriptions, content)
 * - Custom (user-defined)
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { EscrowTemplate, EscrowVertical } from './escrow-templates';
import { getTemplate } from './escrow-templates';
import type { BuiltCondition } from './condition-builder';

export type EscrowType = 
  // Real Estate
  | 'earnest_money' 
  | 'security_deposit' 
  | 'closing_funds'
  // Freelance / Services  
  | 'milestone'
  | 'freelance'
  // Commerce
  | 'purchase'
  | 'trade'
  // Custom
  | 'general';

export type EscrowStatus = 
  | 'created'
  | 'funded'
  | 'pending_release'
  | 'released'
  | 'refunded'
  | 'disputed'
  | 'cancelled';

/**
 * Standard roles across verticals
 */
export type StandardRole = 
  | 'depositor' | 'recipient'           // Universal
  | 'buyer' | 'seller'                  // Commerce
  | 'client' | 'provider'               // Services
  | 'landlord' | 'tenant'               // Real estate
  | 'agent' | 'title_company'           // Real estate agents
  | 'arbiter' | 'witness'               // Dispute resolution
  | 'lender' | 'borrower'               // P2P lending
  | 'party_a' | 'party_b'               // Generic parties
  | 'marketplace' | 'platform'          // Third parties
  | 'consultant' | 'contractor' | 'inspector' | 'vendor' | 'subscriber' | 'creator'; // Specific roles

export interface EscrowParty {
  role: StandardRole | string;  // Standard or custom role
  name: string;
  email?: string;
  phone?: string;
  walletAddress?: string;
  sessionId?: string;  // For Clawdbot agent approval
}

export interface EscrowCondition {
  id: string;
  description: string;
  type: 
    // Real Estate
    | 'inspection' | 'financing' | 'appraisal' | 'title' | 'closing' | 'move_out'
    // Freelance/Milestones
    | 'milestone' | 'delivery' | 'approval' | 'revision'
    // Commerce
    | 'shipping' | 'receipt' | 'verification'
    // Document/Time-based
    | 'document' | 'deadline'
    // Custom
    | 'custom';
  status: 'pending' | 'satisfied' | 'waived' | 'failed';
  deadline?: string;
  satisfiedAt?: string;
  satisfiedBy?: string;
  evidence?: string;  // URL or description of proof
  
  // For milestone escrows - partial release
  releaseAmount?: string;  // Amount to release when this condition is met
  releasePercentage?: string;  // Or percentage of total
  
  // Additional metadata
  metadata?: Record<string, any>;
}

export interface Escrow {
  id: string;
  type: EscrowType;
  status: EscrowStatus;
  
  // Property/transaction info
  property?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    mlsNumber?: string;
  };
  
  // Parties
  parties: EscrowParty[];
  
  // Funds
  amount: string;
  chain: string;
  escrowAddress: string;  // Smart contract or custody address
  fundingTxHash?: string;
  fundedAt?: string;
  
  // Conditions for release
  conditions: EscrowCondition[];
  releaseRequires: 'all_conditions' | 'majority_approval' | 'any_party';
  
  // Approvals for release
  approvals: {
    partyRole: string;
    approved: boolean;
    timestamp: string;
    note?: string;
  }[];
  requiredApprovals: string[];  // Roles that must approve
  
  // Release/refund
  releaseTo?: string;  // Address
  releaseToRole?: string;
  releaseTxHash?: string;
  releasedAt?: string;
  
  // Dispute
  dispute?: {
    raisedBy: string;
    reason: string;
    raisedAt: string;
    resolution?: string;
    resolvedAt?: string;
  };
  
  // Deadlines
  fundingDeadline?: string;
  closingDate?: string;
  leaseEndDate?: string;
  
  // Metadata
  notes?: string;
  documents: { name: string; url: string; uploadedAt: string }[];
  
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = process.env.USDC_DATA_DIR || './data';

/**
 * Escrow Manager
 */
export class EscrowManager {
  private dataPath: string;

  constructor(dataDir = DATA_DIR) {
    this.dataPath = path.join(dataDir, 'escrows.json');
  }

  private async loadEscrows(): Promise<Escrow[]> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveEscrows(escrows: Escrow[]): Promise<void> {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(escrows, null, 2));
  }

  // ============ Escrow Creation ============

  /**
   * Create earnest money escrow
   */
  async createEarnestMoney(params: {
    property: Escrow['property'];
    amount: string;
    chain: string;
    buyer: Omit<EscrowParty, 'role'>;
    seller: Omit<EscrowParty, 'role'>;
    agent?: Omit<EscrowParty, 'role'>;
    closingDate?: string;
    conditions?: Omit<EscrowCondition, 'id' | 'status'>[];
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();

    const parties: EscrowParty[] = [
      { ...params.buyer, role: 'buyer' },
      { ...params.seller, role: 'seller' },
    ];
    if (params.agent) {
      parties.push({ ...params.agent, role: 'agent' });
    }

    // Default conditions for earnest money
    const defaultConditions: EscrowCondition[] = [
      {
        id: crypto.randomUUID(),
        description: 'Home inspection satisfactory',
        type: 'inspection',
        status: 'pending',
        deadline: this.addDays(new Date(), 10).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        description: 'Financing approved',
        type: 'financing',
        status: 'pending',
        deadline: this.addDays(new Date(), 21).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        description: 'Title clear',
        type: 'title',
        status: 'pending',
      },
    ];

    const customConditions = (params.conditions || []).map(c => ({
      ...c,
      id: crypto.randomUUID(),
      status: 'pending' as const,
    }));

    const escrow: Escrow = {
      id: `EM-${Date.now().toString(36).toUpperCase()}`,
      type: 'earnest_money',
      status: 'created',
      property: params.property,
      parties,
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions: [...defaultConditions, ...customConditions],
      releaseRequires: 'all_conditions',
      approvals: [],
      requiredApprovals: ['buyer', 'seller'],
      closingDate: params.closingDate,
      fundingDeadline: this.addDays(new Date(), 3).toISOString(),
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Create rental security deposit escrow
   */
  async createSecurityDeposit(params: {
    property: Escrow['property'];
    amount: string;
    chain: string;
    landlord: Omit<EscrowParty, 'role'>;
    tenant: Omit<EscrowParty, 'role'>;
    leaseEndDate: string;
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();

    const escrow: Escrow = {
      id: `SD-${Date.now().toString(36).toUpperCase()}`,
      type: 'security_deposit',
      status: 'created',
      property: params.property,
      parties: [
        { ...params.landlord, role: 'landlord' },
        { ...params.tenant, role: 'tenant' },
      ],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions: [
        {
          id: crypto.randomUUID(),
          description: 'Lease term completed',
          type: 'move_out',
          status: 'pending',
          deadline: params.leaseEndDate,
        },
        {
          id: crypto.randomUUID(),
          description: 'Move-out inspection passed',
          type: 'inspection',
          status: 'pending',
        },
      ],
      releaseRequires: 'majority_approval',
      approvals: [],
      requiredApprovals: ['landlord'],  // Landlord approval releases to tenant
      leaseEndDate: params.leaseEndDate,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Create general escrow
   */
  async createGeneral(params: {
    amount: string;
    chain: string;
    depositor: Omit<EscrowParty, 'role'>;
    recipient: Omit<EscrowParty, 'role'>;
    conditions?: Omit<EscrowCondition, 'id' | 'status'>[];
    description?: string;
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();

    const escrow: Escrow = {
      id: `GE-${Date.now().toString(36).toUpperCase()}`,
      type: 'general',
      status: 'created',
      parties: [
        { ...params.depositor, role: 'depositor' },
        { ...params.recipient, role: 'recipient' },
      ],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions: (params.conditions || []).map(c => ({
        ...c,
        id: crypto.randomUUID(),
        status: 'pending' as const,
      })),
      releaseRequires: 'all_conditions',
      approvals: [],
      requiredApprovals: ['depositor'],
      notes: params.description,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Create milestone escrow for freelance/service work
   */
  async createMilestone(params: {
    amount: string;
    chain: string;
    client: Omit<EscrowParty, 'role'>;
    freelancer: Omit<EscrowParty, 'role'>;
    projectName: string;
    milestones: {
      description: string;
      amount?: string;      // Fixed amount for this milestone
      percentage?: string;  // Or percentage of total
      deadline?: string;
    }[];
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();
    const totalAmount = parseFloat(params.amount);

    // Convert milestones to conditions with release amounts
    const conditions: EscrowCondition[] = params.milestones.map((m, i) => ({
      id: crypto.randomUUID(),
      description: m.description,
      type: 'milestone' as const,
      status: 'pending' as const,
      deadline: m.deadline,
      releaseAmount: m.amount,
      releasePercentage: m.percentage,
    }));

    // Validate amounts/percentages add up
    let totalAllocated = 0;
    for (const cond of conditions) {
      if (cond.releaseAmount) {
        totalAllocated += parseFloat(cond.releaseAmount);
      } else if (cond.releasePercentage) {
        totalAllocated += totalAmount * (parseFloat(cond.releasePercentage) / 100);
      }
    }

    if (Math.abs(totalAllocated - totalAmount) > 0.01) {
      throw new Error(`Milestone amounts ($${totalAllocated.toFixed(2)}) don't match total ($${params.amount})`);
    }

    const escrow: Escrow = {
      id: `MS-${Date.now().toString(36).toUpperCase()}`,
      type: 'milestone',
      status: 'created',
      parties: [
        { ...params.client, role: 'depositor' },
        { ...params.freelancer, role: 'recipient' },
      ],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions,
      releaseRequires: 'any_party',  // Each milestone releases independently
      approvals: [],
      requiredApprovals: ['depositor'],  // Client approves each milestone
      notes: `Project: ${params.projectName}`,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Create purchase escrow (buyer/seller goods transaction)
   */
  async createPurchase(params: {
    amount: string;
    chain: string;
    buyer: Omit<EscrowParty, 'role'>;
    seller: Omit<EscrowParty, 'role'>;
    itemDescription: string;
    requiresShipping?: boolean;
    inspectionPeriodDays?: number;
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();

    const conditions: EscrowCondition[] = [];

    if (params.requiresShipping) {
      conditions.push({
        id: crypto.randomUUID(),
        description: 'Item shipped by seller',
        type: 'shipping',
        status: 'pending',
      });
      conditions.push({
        id: crypto.randomUUID(),
        description: 'Item received by buyer',
        type: 'receipt',
        status: 'pending',
      });
    }

    if (params.inspectionPeriodDays) {
      conditions.push({
        id: crypto.randomUUID(),
        description: `Inspection period (${params.inspectionPeriodDays} days)`,
        type: 'inspection',
        status: 'pending',
        deadline: this.addDays(new Date(), params.inspectionPeriodDays).toISOString(),
      });
    }

    // Always require buyer approval
    conditions.push({
      id: crypto.randomUUID(),
      description: 'Buyer approves release',
      type: 'approval',
      status: 'pending',
    });

    const escrow: Escrow = {
      id: `PU-${Date.now().toString(36).toUpperCase()}`,
      type: 'purchase',
      status: 'created',
      parties: [
        { ...params.buyer, role: 'buyer' },
        { ...params.seller, role: 'seller' },
      ],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions,
      releaseRequires: 'all_conditions',
      approvals: [],
      requiredApprovals: ['buyer'],
      notes: params.itemDescription,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Release partial amount (for milestone escrows)
   */
  async releasePartial(
    escrowId: string, 
    conditionId: string, 
    toAddress: string, 
    txHash: string
  ): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (!escrow) return null;
    
    const condition = escrow.conditions.find(c => c.id === conditionId);
    if (!condition || condition.status !== 'satisfied') {
      throw new Error('Condition must be satisfied before partial release');
    }

    // Calculate release amount
    let releaseAmount: string;
    if (condition.releaseAmount) {
      releaseAmount = condition.releaseAmount;
    } else if (condition.releasePercentage) {
      const total = parseFloat(escrow.amount);
      releaseAmount = (total * parseFloat(condition.releasePercentage) / 100).toFixed(2);
    } else {
      throw new Error('Condition has no release amount defined');
    }

    // Record the partial release
    if (!escrow.releaseTo) {
      escrow.releaseTo = toAddress;
      escrow.releaseTxHash = txHash;
    }

    // Check if all milestones released
    const allReleased = escrow.conditions
      .filter(c => c.type === 'milestone')
      .every(c => c.status === 'satisfied');

    if (allReleased) {
      escrow.status = 'released';
      escrow.releasedAt = new Date().toISOString();
    }

    escrow.updatedAt = new Date().toISOString();
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  // ============ Escrow Operations ============

  /**
   * Get escrow by ID
   */
  async get(id: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    return escrows.find(e => e.id === id) || null;
  }

  /**
   * List escrows with filters
   */
  async list(filters?: {
    type?: EscrowType;
    status?: EscrowStatus;
    partyAddress?: string;
    propertyAddress?: string;
  }): Promise<Escrow[]> {
    let escrows = await this.loadEscrows();
    
    if (filters?.type) {
      escrows = escrows.filter(e => e.type === filters.type);
    }
    if (filters?.status) {
      escrows = escrows.filter(e => e.status === filters.status);
    }
    if (filters?.partyAddress) {
      escrows = escrows.filter(e => 
        e.parties.some(p => p.walletAddress?.toLowerCase() === filters.partyAddress!.toLowerCase())
      );
    }
    if (filters?.propertyAddress) {
      escrows = escrows.filter(e => 
        e.property?.address.toLowerCase().includes(filters.propertyAddress!.toLowerCase())
      );
    }
    
    return escrows.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Mark escrow as funded
   */
  async markFunded(id: string, txHash: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === id);
    
    if (escrow && escrow.status === 'created') {
      escrow.status = 'funded';
      escrow.fundingTxHash = txHash;
      escrow.fundedAt = new Date().toISOString();
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  /**
   * Satisfy a condition
   */
  async satisfyCondition(
    escrowId: string, 
    conditionId: string, 
    satisfiedBy: string,
    evidence?: string
  ): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (!escrow) return null;
    
    const condition = escrow.conditions.find(c => c.id === conditionId);
    if (condition && condition.status === 'pending') {
      condition.status = 'satisfied';
      condition.satisfiedAt = new Date().toISOString();
      condition.satisfiedBy = satisfiedBy;
      condition.evidence = evidence;
      escrow.updatedAt = new Date().toISOString();
      
      // Check if all conditions satisfied
      const allSatisfied = escrow.conditions.every(c => 
        c.status === 'satisfied' || c.status === 'waived'
      );
      if (allSatisfied && escrow.status === 'funded') {
        escrow.status = 'pending_release';
      }
      
      await this.saveEscrows(escrows);
    }
    
    return escrow;
  }

  /**
   * Waive a condition
   */
  async waiveCondition(escrowId: string, conditionId: string, waivedBy: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (!escrow) return null;
    
    const condition = escrow.conditions.find(c => c.id === conditionId);
    if (condition && condition.status === 'pending') {
      condition.status = 'waived';
      condition.satisfiedAt = new Date().toISOString();
      condition.satisfiedBy = waivedBy;
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow;
  }

  /**
   * Fail a condition (triggers refund flow)
   */
  async failCondition(escrowId: string, conditionId: string, reason: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (!escrow) return null;
    
    const condition = escrow.conditions.find(c => c.id === conditionId);
    if (condition && condition.status === 'pending') {
      condition.status = 'failed';
      condition.evidence = reason;
      escrow.updatedAt = new Date().toISOString();
      
      // Initiate refund process for earnest money
      if (escrow.type === 'earnest_money') {
        escrow.status = 'pending_release';
        escrow.releaseToRole = 'buyer';  // Failed conditions = refund to buyer
      }
      
      await this.saveEscrows(escrows);
    }
    
    return escrow;
  }

  /**
   * Submit approval for release
   */
  async approve(escrowId: string, partyRole: string, note?: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (!escrow) return null;
    
    // Check if party is authorized
    if (!escrow.requiredApprovals.includes(partyRole)) {
      throw new Error(`Party role "${partyRole}" is not required for approval`);
    }
    
    // Check if already approved
    if (escrow.approvals.some(a => a.partyRole === partyRole)) {
      throw new Error('Already approved');
    }
    
    escrow.approvals.push({
      partyRole,
      approved: true,
      timestamp: new Date().toISOString(),
      note,
    });
    escrow.updatedAt = new Date().toISOString();
    
    // Check if all required approvals received
    const allApproved = escrow.requiredApprovals.every(role =>
      escrow.approvals.some(a => a.partyRole === role && a.approved)
    );
    
    if (allApproved && (escrow.status === 'funded' || escrow.status === 'pending_release')) {
      escrow.status = 'pending_release';
    }
    
    await this.saveEscrows(escrows);
    return escrow;
  }

  /**
   * Execute release
   */
  async release(escrowId: string, toAddress: string, txHash: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (escrow && escrow.status === 'pending_release') {
      escrow.status = 'released';
      escrow.releaseTo = toAddress;
      escrow.releaseTxHash = txHash;
      escrow.releasedAt = new Date().toISOString();
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  /**
   * Execute refund
   */
  async refund(escrowId: string, txHash: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (escrow && (escrow.status === 'funded' || escrow.status === 'pending_release')) {
      // Find buyer/depositor address
      const refundParty = escrow.parties.find(p => 
        p.role === 'buyer' || p.role === 'tenant' || p.role === 'depositor'
      );
      
      escrow.status = 'refunded';
      escrow.releaseTo = refundParty?.walletAddress;
      escrow.releaseTxHash = txHash;
      escrow.releasedAt = new Date().toISOString();
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  /**
   * Raise dispute
   */
  async raiseDispute(escrowId: string, raisedBy: string, reason: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (escrow && escrow.status === 'funded') {
      escrow.status = 'disputed';
      escrow.dispute = {
        raisedBy,
        reason,
        raisedAt: new Date().toISOString(),
      };
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  /**
   * Cancel escrow (before funding)
   */
  async cancel(escrowId: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (escrow && escrow.status === 'created') {
      escrow.status = 'cancelled';
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  /**
   * Add document to escrow
   */
  async addDocument(escrowId: string, name: string, url: string): Promise<Escrow | null> {
    const escrows = await this.loadEscrows();
    const escrow = escrows.find(e => e.id === escrowId);
    
    if (escrow) {
      escrow.documents.push({
        name,
        url,
        uploadedAt: new Date().toISOString(),
      });
      escrow.updatedAt = new Date().toISOString();
      await this.saveEscrows(escrows);
    }
    
    return escrow || null;
  }

  // ============ UNIVERSAL ESCROW API (EaaS) ============

  /**
   * Create escrow from template
   * 
   * @example
   * await escrowManager.create({
   *   template: 'project_milestone',
   *   amount: '1000',
   *   chain: 'polygon',
   *   parties: [
   *     { role: 'client', name: 'Alice' },
   *     { role: 'provider', name: 'Bob' }
   *   ]
   * })
   */
  async create(params: {
    template: string;
    amount: string;
    chain: string;
    parties: Omit<EscrowParty, 'role'> & { role: string }[];
    customConditions?: Omit<EscrowCondition, 'id' | 'status'>[];
    metadata?: Record<string, any>;
    autoReleaseDays?: number;
  }): Promise<Escrow> {
    const template = getTemplate(params.template);
    if (!template) {
      throw new Error(`Template '${params.template}' not found`);
    }

    const escrows = await this.loadEscrows();

    // Convert template conditions to EscrowCondition format
    const conditions: EscrowCondition[] = template.conditions.map(c => ({
      id: crypto.randomUUID(),
      description: c.description,
      type: c.type,
      status: 'pending',
      ...(c.deadline && { deadline: c.deadline }),
      ...(c.releaseAmount && { releaseAmount: c.releaseAmount }),
      ...(c.releasePercentage && { releasePercentage: c.releasePercentage }),
      ...(c.metadata && { metadata: c.metadata }),
    }));

    // Add custom conditions if provided
    const customConditions = (params.customConditions || []).map(c => ({
      ...c,
      id: crypto.randomUUID(),
      status: 'pending' as const,
    }));

    const escrow: Escrow = {
      id: `${template.vertical.toUpperCase().slice(0, 2)}-${Date.now().toString(36).toUpperCase()}`,
      type: this.mapVerticalToType(template.vertical),
      status: 'created',
      parties: params.parties as EscrowParty[],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions: [...conditions, ...customConditions],
      releaseRequires: template.releaseRequires,
      approvals: [],
      requiredApprovals: template.recommendedPartyRoles,
      documents: [],
      notes: `Created from template: ${template.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fundingDeadline: this.addDays(new Date(), 3).toISOString(),
    };

    // Add auto-release if specified
    if (params.autoReleaseDays || template.autoReleaseDays) {
      const days = params.autoReleaseDays || template.autoReleaseDays!;
      conditions.push({
        id: crypto.randomUUID(),
        description: `Auto-release after ${days} days if no disputes`,
        type: 'deadline',
        status: 'pending',
        deadline: this.addDays(new Date(), days).toISOString(),
      });
    }

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Create custom escrow with builder conditions
   * 
   * @example
   * import { ConditionBuilder } from './condition-builder';
   * 
   * await escrowManager.createCustom({
   *   amount: '5000',
   *   chain: 'ethereum',
   *   parties: [
   *     { role: 'buyer', name: 'Alice' },
   *     { role: 'seller', name: 'Bob' }
   *   ],
   *   conditions: [
   *     ConditionBuilder.milestone('Phase 1', 30),
   *     ConditionBuilder.milestone('Phase 2', 70),
   *   ],
   *   releaseRequires: 'condition_based'
   * })
   */
  async createCustom(params: {
    amount: string;
    chain: string;
    parties: Omit<EscrowParty, 'role'> & { role: string }[];
    conditions: BuiltCondition[];
    releaseRequires?: 'all_conditions' | 'majority_approval' | 'condition_based' | 'any_party';
    requiredApprovals?: string[];
    metadata?: Record<string, any>;
    autoReleaseDays?: number;
  }): Promise<Escrow> {
    const escrows = await this.loadEscrows();

    const conditions: EscrowCondition[] = params.conditions.map(c => ({
      ...c,
      status: 'pending',
    }));

    // Add auto-release if specified
    if (params.autoReleaseDays) {
      conditions.push({
        id: crypto.randomUUID(),
        description: `Auto-release after ${params.autoReleaseDays} days if no disputes`,
        type: 'deadline',
        status: 'pending',
        deadline: this.addDays(new Date(), params.autoReleaseDays).toISOString(),
      });
    }

    const escrow: Escrow = {
      id: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
      type: 'general',
      status: 'created',
      parties: params.parties as EscrowParty[],
      amount: params.amount,
      chain: params.chain,
      escrowAddress: this.generateEscrowAddress(),
      conditions,
      releaseRequires: params.releaseRequires || 'all_conditions',
      approvals: [],
      requiredApprovals: params.requiredApprovals || params.parties.map(p => p.role),
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fundingDeadline: this.addDays(new Date(), 3).toISOString(),
    };

    escrows.push(escrow);
    await this.saveEscrows(escrows);
    
    return escrow;
  }

  /**
   * Map vertical to legacy EscrowType
   */
  private mapVerticalToType(vertical: EscrowVertical): EscrowType {
    switch (vertical) {
      case 'real_estate': return 'earnest_money';
      case 'freelance': return 'milestone';
      case 'commerce': return 'purchase';
      case 'p2p': return 'trade';
      case 'digital': return 'purchase';
      case 'services': return 'freelance';
      default: return 'general';
    }
  }

  // ============ Formatting ============

  /**
   * Format escrow summary for display
   */
  formatEscrowSummary(escrow: Escrow): string {
    const statusEmoji = {
      created: '📝',
      funded: '💰',
      pending_release: '⏳',
      released: '✅',
      refunded: '↩️',
      disputed: '⚠️',
      cancelled: '❌',
    }[escrow.status];

    const typeLabel = {
      earnest_money: 'Earnest Money',
      security_deposit: 'Security Deposit',
      closing_funds: 'Closing Funds',
      general: 'Escrow',
    }[escrow.type];

    let summary = `${statusEmoji} **${typeLabel} ${escrow.id}**\n\n`;
    
    if (escrow.property) {
      summary += `📍 ${escrow.property.address}, ${escrow.property.city}, ${escrow.property.state}\n`;
    }
    
    summary += `💵 **$${escrow.amount} USDC** (${escrow.chain})\n`;
    summary += `Status: ${escrow.status.replace('_', ' ').toUpperCase()}\n\n`;
    
    // Parties
    summary += `**Parties:**\n`;
    for (const party of escrow.parties) {
      summary += `• ${party.role}: ${party.name}\n`;
    }
    summary += '\n';
    
    // Conditions
    if (escrow.conditions.length > 0) {
      summary += `**Conditions:**\n`;
      for (const cond of escrow.conditions) {
        const condEmoji = {
          pending: '⏳',
          satisfied: '✅',
          waived: '⏭️',
          failed: '❌',
        }[cond.status];
        summary += `${condEmoji} ${cond.description}\n`;
      }
      summary += '\n';
    }
    
    // Approvals
    if (escrow.requiredApprovals.length > 0) {
      summary += `**Approvals:** `;
      const approved = escrow.approvals.filter(a => a.approved).map(a => a.partyRole);
      summary += `${approved.length}/${escrow.requiredApprovals.length} `;
      summary += `(${escrow.requiredApprovals.map(r => approved.includes(r) ? '✓' : '○').join('')})\n`;
    }
    
    return summary;
  }

  // ============ Helpers ============

  private generateEscrowAddress(): string {
    // In production, this would deploy/derive a smart contract address
    // For now, generate a deterministic address
    return '0x' + crypto.randomBytes(20).toString('hex');
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}

/**
 * x402 Premium Escrow Features
 * 
 * Gate premium escrow operations behind x402 payments
 */
export interface PremiumEscrowFeatures {
  yieldOptimization?: boolean;    // Route funds through yield-bearing protocols
  insurance?: boolean;             // Add escrow insurance coverage
  prioritySupport?: boolean;       // Priority dispute resolution
  analytics?: boolean;             // Advanced analytics and reporting
}

export interface X402EscrowEndpoints {
  optimize: string;      // Yield optimization endpoint
  insure: string;        // Insurance coverage endpoint
  analytics: string;     // Analytics endpoint
  support: string;       // Priority support endpoint
}

// Premium feature pricing (in USDC)
export const PREMIUM_ESCROW_PRICING = {
  yieldOptimization: '0.25',  // Enable yield-bearing escrow
  insurance: '0.50',          // Add insurance coverage
  prioritySupport: '1.00',    // Priority support package
  analytics: '0.10',          // Advanced analytics
};

/**
 * Generate x402 premium feature URLs for escrow
 */
export function generateX402EscrowUrls(
  escrowId: string,
  baseUrl?: string
): X402EscrowEndpoints {
  const base = baseUrl || process.env.X402_BASE_URL || 'https://api.lobster-pay.com';
  
  return {
    optimize: `${base}/escrow/${escrowId}/optimize`,
    insure: `${base}/escrow/${escrowId}/insure`,
    analytics: `${base}/escrow/${escrowId}/analytics`,
    support: `${base}/escrow/${escrowId}/support`,
  };
}

/**
 * Example: Enable premium features on escrow
 */
export async function enablePremiumFeatures(
  escrow: Escrow,
  features: PremiumEscrowFeatures,
  x402Fetch: (url: string) => Promise<Response>
): Promise<{ enabled: string[]; failed: string[] }> {
  const urls = generateX402EscrowUrls(escrow.id);
  const enabled: string[] = [];
  const failed: string[] = [];

  if (features.yieldOptimization) {
    try {
      const response = await x402Fetch(urls.optimize);
      if (response.ok) {
        enabled.push('yieldOptimization');
      } else {
        failed.push('yieldOptimization');
      }
    } catch {
      failed.push('yieldOptimization');
    }
  }

  if (features.insurance) {
    try {
      const response = await x402Fetch(urls.insure);
      if (response.ok) {
        enabled.push('insurance');
      } else {
        failed.push('insurance');
      }
    } catch {
      failed.push('insurance');
    }
  }

  if (features.analytics) {
    try {
      const response = await x402Fetch(urls.analytics);
      if (response.ok) {
        enabled.push('analytics');
      } else {
        failed.push('analytics');
      }
    } catch {
      failed.push('analytics');
    }
  }

  if (features.prioritySupport) {
    try {
      const response = await x402Fetch(urls.support);
      if (response.ok) {
        enabled.push('prioritySupport');
      } else {
        failed.push('prioritySupport');
      }
    } catch {
      failed.push('prioritySupport');
    }
  }

  return { enabled, failed };
}

export default EscrowManager;
