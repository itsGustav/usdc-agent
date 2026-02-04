/**
 * Invoice & Payment Request System
 * 
 * Generate, track, and manage USDC invoices and payment requests.
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'cancelled' | 'overdue';
  
  // Parties
  from: {
    name: string;
    email?: string;
    walletAddress: string;
  };
  to: {
    name: string;
    email?: string;
    walletAddress?: string;
  };
  
  // Amounts
  items: InvoiceItem[];
  subtotal: string;
  tax?: string;
  taxRate?: number;
  total: string;
  currency: 'USDC';
  
  // Payment
  paymentChain: string;
  paymentAddress: string;
  paymentLink?: string;
  x402PaymentUrl?: string;  // x402-enabled payment URL
  txHash?: string;
  paidAt?: string;
  paidAmount?: string;
  
  // Metadata
  memo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface PaymentRequest {
  id: string;
  type: 'one-time' | 'recurring';
  amount: string;
  description: string;
  fromName: string;
  toAddress: string;
  chain: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  expiresAt?: string;
  paymentLink: string;
  createdAt: string;
  paidAt?: string;
  txHash?: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  amount: string;
  toAddress: string;
  toName: string;
  chain: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextPaymentDate: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  walletId: string;
  payments: { date: string; txHash: string; amount: string }[];
  createdAt: string;
}

const DATA_DIR = process.env.USDC_DATA_DIR || './data';

/**
 * Invoice Manager
 */
export class InvoiceManager {
  private dataPath: string;

  constructor(dataDir = DATA_DIR) {
    this.dataPath = path.join(dataDir, 'invoices.json');
  }

  private async loadInvoices(): Promise<Invoice[]> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveInvoices(invoices: Invoice[]): Promise<void> {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(invoices, null, 2));
  }

  /**
   * Create a new invoice
   */
  async create(params: {
    from: Invoice['from'];
    to: Invoice['to'];
    items: { description: string; quantity: number; unitPrice: string }[];
    taxRate?: number;
    memo?: string;
    dueDate?: string;
    chain?: string;
  }): Promise<Invoice> {
    const invoices = await this.loadInvoices();
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    
    const items: InvoiceItem[] = params.items.map(item => ({
      ...item,
      total: (item.quantity * parseFloat(item.unitPrice)).toFixed(2),
    }));
    
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const tax = params.taxRate ? subtotal * (params.taxRate / 100) : 0;
    const total = subtotal + tax;

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      number: invoiceNumber,
      status: 'draft',
      from: params.from,
      to: params.to,
      items,
      subtotal: subtotal.toFixed(2),
      tax: tax > 0 ? tax.toFixed(2) : undefined,
      taxRate: params.taxRate,
      total: total.toFixed(2),
      currency: 'USDC',
      paymentChain: params.chain || 'ETH-SEPOLIA',
      paymentAddress: params.from.walletAddress,
      memo: params.memo,
      dueDate: params.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate payment link
    invoice.paymentLink = this.generatePaymentLink(invoice);
    
    // Generate x402 payment URL
    invoice.x402PaymentUrl = this.generateX402PaymentUrl(invoice);

    invoices.push(invoice);
    await this.saveInvoices(invoices);
    
    return invoice;
  }

  /**
   * Get invoice by ID or number
   */
  async get(idOrNumber: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    return invoices.find(inv => 
      inv.id === idOrNumber || inv.number === idOrNumber
    ) || null;
  }

  /**
   * List invoices with optional filters
   */
  async list(filters?: {
    status?: Invoice['status'];
    toName?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Invoice[]> {
    let invoices = await this.loadInvoices();
    
    if (filters?.status) {
      invoices = invoices.filter(inv => inv.status === filters.status);
    }
    if (filters?.toName) {
      invoices = invoices.filter(inv => 
        inv.to.name.toLowerCase().includes(filters.toName!.toLowerCase())
      );
    }
    if (filters?.fromDate) {
      invoices = invoices.filter(inv => inv.createdAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      invoices = invoices.filter(inv => inv.createdAt <= filters.toDate!);
    }
    
    return invoices.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Mark invoice as sent
   */
  async markSent(id: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    const invoice = invoices.find(inv => inv.id === id);
    
    if (invoice) {
      invoice.status = 'sent';
      invoice.sentAt = new Date().toISOString();
      invoice.updatedAt = new Date().toISOString();
      await this.saveInvoices(invoices);
    }
    
    return invoice || null;
  }

  /**
   * Mark invoice as paid
   */
  async markPaid(id: string, txHash: string, amount?: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    const invoice = invoices.find(inv => inv.id === id);
    
    if (invoice) {
      invoice.status = 'paid';
      invoice.txHash = txHash;
      invoice.paidAt = new Date().toISOString();
      invoice.paidAmount = amount || invoice.total;
      invoice.updatedAt = new Date().toISOString();
      await this.saveInvoices(invoices);
    }
    
    return invoice || null;
  }

  /**
   * Cancel invoice
   */
  async cancel(id: string): Promise<Invoice | null> {
    const invoices = await this.loadInvoices();
    const invoice = invoices.find(inv => inv.id === id);
    
    if (invoice && invoice.status !== 'paid') {
      invoice.status = 'cancelled';
      invoice.updatedAt = new Date().toISOString();
      await this.saveInvoices(invoices);
    }
    
    return invoice || null;
  }

  /**
   * Generate payment link for invoice
   */
  private generatePaymentLink(invoice: Invoice): string {
    // EIP-681 style payment request (simplified)
    const params = new URLSearchParams({
      to: invoice.paymentAddress,
      value: invoice.total,
      chain: invoice.paymentChain,
      ref: invoice.number,
    });
    return `usdc://pay?${params.toString()}`;
  }

  /**
   * Generate x402-enabled payment URL for invoice
   * Returns a URL that triggers 402 Payment Required
   */
  private generateX402PaymentUrl(invoice: Invoice): string {
    // This would point to your x402-enabled invoice payment endpoint
    const baseUrl = process.env.X402_BASE_URL || 'https://api.lobster-pay.com';
    return `${baseUrl}/invoices/${invoice.id}/pay`;
  }

  /**
   * Add x402 payment method to invoice
   * Creates a payment-gated endpoint for this invoice
   */
  async enableX402Payment(
    invoiceId: string,
    options?: {
      baseUrl?: string;
      expiryHours?: number;
    }
  ): Promise<string> {
    const invoice = await this.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const baseUrl = options?.baseUrl || process.env.X402_BASE_URL || 'https://api.lobster-pay.com';
    const x402Url = `${baseUrl}/invoices/${invoice.id}/pay`;

    invoice.x402PaymentUrl = x402Url;
    invoice.updatedAt = new Date().toISOString();

    const invoices = await this.loadInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1) {
      invoices[index] = invoice;
      await this.saveInvoices(invoices);
    }

    return x402Url;
  }

  /**
   * Format invoice as text for messaging
   */
  formatInvoiceText(invoice: Invoice): string {
    let text = `📄 **Invoice ${invoice.number}**\n\n`;
    text += `To: ${invoice.to.name}\n`;
    text += `Status: ${invoice.status.toUpperCase()}\n\n`;
    
    text += `**Items:**\n`;
    for (const item of invoice.items) {
      text += `• ${item.description} (x${item.quantity}) — $${item.total}\n`;
    }
    
    text += `\nSubtotal: $${invoice.subtotal} USDC\n`;
    if (invoice.tax) {
      text += `Tax (${invoice.taxRate}%): $${invoice.tax} USDC\n`;
    }
    text += `**Total: $${invoice.total} USDC**\n\n`;
    
    if (invoice.dueDate) {
      text += `Due: ${new Date(invoice.dueDate).toLocaleDateString()}\n`;
    }
    
    text += `\nPay to: \`${invoice.paymentAddress}\`\n`;
    text += `Chain: ${invoice.paymentChain}\n`;
    
    if (invoice.memo) {
      text += `\nMemo: ${invoice.memo}\n`;
    }
    
    return text;
  }

  /**
   * Check for overdue invoices
   */
  async checkOverdue(): Promise<Invoice[]> {
    const invoices = await this.loadInvoices();
    const now = new Date();
    const overdue: Invoice[] = [];
    
    for (const invoice of invoices) {
      if (
        invoice.status === 'sent' &&
        invoice.dueDate &&
        new Date(invoice.dueDate) < now
      ) {
        invoice.status = 'overdue';
        invoice.updatedAt = now.toISOString();
        overdue.push(invoice);
      }
    }
    
    if (overdue.length > 0) {
      await this.saveInvoices(invoices);
    }
    
    return overdue;
  }
}

/**
 * Recurring Payment Manager
 */
export class RecurringPaymentManager {
  private dataPath: string;

  constructor(dataDir = DATA_DIR) {
    this.dataPath = path.join(dataDir, 'recurring.json');
  }

  private async loadPayments(): Promise<RecurringPayment[]> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async savePayments(payments: RecurringPayment[]): Promise<void> {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    await fs.writeFile(this.dataPath, JSON.stringify(payments, null, 2));
  }

  /**
   * Schedule a recurring payment
   */
  async schedule(params: {
    name: string;
    amount: string;
    toAddress: string;
    toName: string;
    chain: string;
    frequency: RecurringPayment['frequency'];
    startDate?: string;
    endDate?: string;
    walletId: string;
  }): Promise<RecurringPayment> {
    const payments = await this.loadPayments();
    
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const nextPaymentDate = this.calculateNextDate(startDate, params.frequency);

    const payment: RecurringPayment = {
      id: crypto.randomUUID(),
      name: params.name,
      amount: params.amount,
      toAddress: params.toAddress,
      toName: params.toName,
      chain: params.chain,
      frequency: params.frequency,
      startDate,
      endDate: params.endDate,
      nextPaymentDate,
      status: 'active',
      walletId: params.walletId,
      payments: [],
      createdAt: new Date().toISOString(),
    };

    payments.push(payment);
    await this.savePayments(payments);
    
    return payment;
  }

  /**
   * Get all due payments
   */
  async getDuePayments(): Promise<RecurringPayment[]> {
    const payments = await this.loadPayments();
    const today = new Date().toISOString().split('T')[0];
    
    return payments.filter(p => 
      p.status === 'active' && 
      p.nextPaymentDate <= today &&
      (!p.endDate || p.endDate >= today)
    );
  }

  /**
   * Record a payment execution
   */
  async recordExecution(id: string, txHash: string): Promise<RecurringPayment | null> {
    const payments = await this.loadPayments();
    const payment = payments.find(p => p.id === id);
    
    if (payment) {
      payment.payments.push({
        date: new Date().toISOString(),
        txHash,
        amount: payment.amount,
      });
      
      // Calculate next payment date
      payment.nextPaymentDate = this.calculateNextDate(
        payment.nextPaymentDate, 
        payment.frequency
      );
      
      // Check if completed
      if (payment.endDate && payment.nextPaymentDate > payment.endDate) {
        payment.status = 'completed';
      }
      
      await this.savePayments(payments);
    }
    
    return payment || null;
  }

  /**
   * Pause recurring payment
   */
  async pause(id: string): Promise<RecurringPayment | null> {
    const payments = await this.loadPayments();
    const payment = payments.find(p => p.id === id);
    
    if (payment && payment.status === 'active') {
      payment.status = 'paused';
      await this.savePayments(payments);
    }
    
    return payment || null;
  }

  /**
   * Resume recurring payment
   */
  async resume(id: string): Promise<RecurringPayment | null> {
    const payments = await this.loadPayments();
    const payment = payments.find(p => p.id === id);
    
    if (payment && payment.status === 'paused') {
      payment.status = 'active';
      // Recalculate next payment from today
      payment.nextPaymentDate = this.calculateNextDate(
        new Date().toISOString().split('T')[0],
        payment.frequency
      );
      await this.savePayments(payments);
    }
    
    return payment || null;
  }

  /**
   * Cancel recurring payment
   */
  async cancel(id: string): Promise<RecurringPayment | null> {
    const payments = await this.loadPayments();
    const payment = payments.find(p => p.id === id);
    
    if (payment) {
      payment.status = 'cancelled';
      await this.savePayments(payments);
    }
    
    return payment || null;
  }

  /**
   * List all recurring payments
   */
  async list(status?: RecurringPayment['status']): Promise<RecurringPayment[]> {
    const payments = await this.loadPayments();
    return status 
      ? payments.filter(p => p.status === status)
      : payments;
  }

  /**
   * Calculate next payment date based on frequency
   */
  private calculateNextDate(fromDate: string, frequency: RecurringPayment['frequency']): string {
    const date = new Date(fromDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }
}

export default { InvoiceManager, RecurringPaymentManager };
