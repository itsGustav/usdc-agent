import { initAdmin } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { sendMerchantWebhook, getMerchantById, updateMerchantStats } from './merchant';

export interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  description: string;
  redirectUrl: string;
  metadata: Record<string, any>;
  status: 'active' | 'paid' | 'expired';
  paidBy: string | null;
  paidAt: Timestamp | null;
  txHash: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface CreatePaymentLinkData {
  merchantId: string;
  amount: number;
  description: string;
  redirectUrl: string;
  metadata?: Record<string, any>;
}

export interface Charge {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  redirectUrl: string;
  paymentLinkId: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  paidBy: string | null;
  paidAt: Timestamp | null;
  txHash: string | null;
  createdAt: Timestamp;
}

/**
 * Create a payment link
 */
export async function createPaymentLink(
  data: CreatePaymentLinkData
): Promise<{ link_id: string; url: string }> {
  const db = initAdmin();
  
  // Create payment link document
  const linkRef = db.collection('payment_links').doc();
  
  const paymentLink: Omit<PaymentLink, 'id'> = {
    merchantId: data.merchantId,
    amount: data.amount,
    description: data.description,
    redirectUrl: data.redirectUrl,
    metadata: data.metadata || {},
    status: 'active',
    paidBy: null,
    paidAt: null,
    txHash: null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
  };
  
  await linkRef.set(paymentLink);
  
  // Determine base URL based on environment
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://paylobster.com';
  
  return {
    link_id: linkRef.id,
    url: `${baseUrl}/pay/${linkRef.id}`,
  };
}

/**
 * Get payment link by ID
 */
export async function getPaymentLink(linkId: string): Promise<PaymentLink | null> {
  const db = initAdmin();
  
  const doc = await db.collection('payment_links').doc(linkId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data() as Omit<PaymentLink, 'id'>,
  };
}

/**
 * Mark payment link as paid
 */
export async function markPaymentLinkPaid(
  linkId: string,
  paidBy: string,
  txHash: string
): Promise<void> {
  const db = initAdmin();
  const linkRef = db.collection('payment_links').doc(linkId);
  
  await linkRef.update({
    status: 'paid',
    paidBy,
    paidAt: Timestamp.now(),
    txHash,
  });
  
  // Get payment link and merchant to send webhook
  const link = await getPaymentLink(linkId);
  if (link) {
    const merchant = await getMerchantById(link.merchantId);
    if (merchant) {
      // Update merchant stats
      await updateMerchantStats(link.merchantId, link.amount);
      
      // Send webhook
      await sendMerchantWebhook(merchant, 'payment.completed', {
        payment_link_id: linkId,
        amount: link.amount,
        currency: 'USDC',
        from: paidBy,
        tx_hash: txHash,
        metadata: link.metadata,
      });
    }
  }
}

/**
 * Create a charge
 */
export async function createCharge(
  merchantId: string,
  amount: number,
  currency: string,
  description: string,
  redirectUrl: string,
  customerEmail?: string,
  metadata?: Record<string, any>
): Promise<{ charge_id: string; payment_url: string; status: string }> {
  const db = initAdmin();
  
  // Create payment link first
  const { link_id, url } = await createPaymentLink({
    merchantId,
    amount,
    description,
    redirectUrl,
    metadata: {
      ...metadata,
      customer_email: customerEmail,
    },
  });
  
  // Create charge document
  const chargeRef = db.collection('charges').doc();
  
  const charge: Omit<Charge, 'id'> = {
    merchantId,
    amount,
    currency,
    description,
    customerEmail,
    redirectUrl,
    paymentLinkId: link_id,
    status: 'pending',
    paidBy: null,
    paidAt: null,
    txHash: null,
    createdAt: Timestamp.now(),
  };
  
  await chargeRef.set(charge);
  
  return {
    charge_id: chargeRef.id,
    payment_url: url,
    status: 'pending',
  };
}

/**
 * Get charge by ID
 */
export async function getCharge(chargeId: string): Promise<Charge | null> {
  const db = initAdmin();
  
  const doc = await db.collection('charges').doc(chargeId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data() as Omit<Charge, 'id'>,
  };
}

/**
 * Update charge status based on payment link
 */
export async function syncChargeWithPaymentLink(chargeId: string): Promise<void> {
  const db = initAdmin();
  
  const charge = await getCharge(chargeId);
  if (!charge) return;
  
  const paymentLink = await getPaymentLink(charge.paymentLinkId);
  if (!paymentLink) return;
  
  if (paymentLink.status === 'paid' && charge.status !== 'completed') {
    await db.collection('charges').doc(chargeId).update({
      status: 'completed',
      paidBy: paymentLink.paidBy,
      paidAt: paymentLink.paidAt,
      txHash: paymentLink.txHash,
    });
    
    // Send webhook for charge completion
    const merchant = await getMerchantById(charge.merchantId);
    if (merchant) {
      await sendMerchantWebhook(merchant, 'payment.completed', {
        charge_id: chargeId,
        amount: charge.amount,
        currency: charge.currency,
        from: paymentLink.paidBy,
        tx_hash: paymentLink.txHash,
        metadata: paymentLink.metadata,
      });
    }
  }
}

/**
 * Get payment links for merchant
 */
export async function getMerchantPaymentLinks(
  merchantId: string,
  limit: number = 20
): Promise<PaymentLink[]> {
  const db = initAdmin();
  
  const snapshot = await db
    .collection('payment_links')
    .where('merchantId', '==', merchantId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as Omit<PaymentLink, 'id'>,
  }));
}

/**
 * Get charges for merchant
 */
export async function getMerchantCharges(
  merchantId: string,
  limit: number = 20
): Promise<Charge[]> {
  const db = initAdmin();
  
  const snapshot = await db
    .collection('charges')
    .where('merchantId', '==', merchantId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data() as Omit<Charge, 'id'>,
  }));
}
