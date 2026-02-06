import { initAdmin } from './firebase';
import { triggerWebhooksForEvent } from './webhooks';
import { FieldValue } from 'firebase-admin/firestore';

export type SubscriptionInterval = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'pending_approval' | 'active' | 'cancelled' | 'past_due';

export interface Subscription {
  id: string;
  merchantId: string;
  planName: string;
  amount: number;
  interval: SubscriptionInterval;
  customerWallet: string;
  customerEmail: string;
  status: SubscriptionStatus;
  approvedAmount: number;
  nextChargeAt: Date | null;
  lastChargedAt: Date | null;
  chargeCount: number;
  createdAt: Date;
  cancelledAt: Date | null;
}

export interface CreateSubscriptionParams {
  merchantId: string;
  planName: string;
  amount: number;
  interval: SubscriptionInterval;
  customerWallet: string;
  customerEmail: string;
}

export interface ChargeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Subscription> {
  const db = initAdmin();
  
  const subscriptionData = {
    merchantId: params.merchantId,
    planName: params.planName,
    amount: params.amount,
    interval: params.interval,
    customerWallet: params.customerWallet.toLowerCase(),
    customerEmail: params.customerEmail,
    status: 'pending_approval' as SubscriptionStatus,
    approvedAmount: 0,
    nextChargeAt: null,
    lastChargedAt: null,
    chargeCount: 0,
    createdAt: new Date(),
    cancelledAt: null,
  };

  const docRef = await db.collection('subscriptions').add(subscriptionData);

  // Trigger webhook
  await triggerWebhooksForEvent('subscription_created', {
    subscriptionId: docRef.id,
    ...subscriptionData,
    createdAt: subscriptionData.createdAt.toISOString(),
  }, params.merchantId);

  return {
    id: docRef.id,
    ...subscriptionData,
  };
}

/**
 * Get subscription by ID
 */
export async function getSubscription(id: string): Promise<Subscription | null> {
  const db = initAdmin();
  const doc = await db.collection('subscriptions').doc(id).get();
  
  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data) return null;

  return {
    id: doc.id,
    merchantId: data.merchantId,
    planName: data.planName,
    amount: data.amount,
    interval: data.interval,
    customerWallet: data.customerWallet,
    customerEmail: data.customerEmail,
    status: data.status,
    approvedAmount: data.approvedAmount,
    nextChargeAt: data.nextChargeAt?.toDate() || null,
    lastChargedAt: data.lastChargedAt?.toDate() || null,
    chargeCount: data.chargeCount,
    createdAt: data.createdAt.toDate(),
    cancelledAt: data.cancelledAt?.toDate() || null,
  };
}

/**
 * Approve subscription (called after customer approves USDC spending)
 */
export async function approveSubscription(
  id: string,
  approvedAmount: number
): Promise<void> {
  const db = initAdmin();
  const subRef = db.collection('subscriptions').doc(id);
  const doc = await subRef.get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  const data = doc.data();
  if (data?.status !== 'pending_approval') {
    throw new Error('Subscription is not pending approval');
  }

  const nextChargeAt = calculateNextChargeDate(data.interval);

  await subRef.update({
    status: 'active',
    approvedAmount,
    nextChargeAt,
  });

  // Trigger webhook
  await triggerWebhooksForEvent('subscription_approved', {
    subscriptionId: id,
    approvedAmount,
    nextChargeAt: nextChargeAt.toISOString(),
  }, data.merchantId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(id: string): Promise<void> {
  const db = initAdmin();
  const subRef = db.collection('subscriptions').doc(id);
  const doc = await subRef.get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  const data = doc.data();

  await subRef.update({
    status: 'cancelled',
    cancelledAt: new Date(),
  });

  // Trigger webhook
  await triggerWebhooksForEvent('subscription_cancelled', {
    subscriptionId: id,
    cancelledAt: new Date().toISOString(),
  }, data?.merchantId);
}

/**
 * Get subscriptions for a merchant
 */
export async function getMerchantSubscriptions(
  merchantId: string,
  status?: SubscriptionStatus
): Promise<Subscription[]> {
  const db = initAdmin();
  let query = db.collection('subscriptions')
    .where('merchantId', '==', merchantId);

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchantId: data.merchantId,
      planName: data.planName,
      amount: data.amount,
      interval: data.interval,
      customerWallet: data.customerWallet,
      customerEmail: data.customerEmail,
      status: data.status,
      approvedAmount: data.approvedAmount,
      nextChargeAt: data.nextChargeAt?.toDate() || null,
      lastChargedAt: data.lastChargedAt?.toDate() || null,
      chargeCount: data.chargeCount,
      createdAt: data.createdAt.toDate(),
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  });
}

/**
 * Get subscriptions due for charging
 */
export async function getDueSubscriptions(): Promise<Subscription[]> {
  const db = initAdmin();
  const now = new Date();

  const snapshot = await db.collection('subscriptions')
    .where('status', '==', 'active')
    .where('nextChargeAt', '<=', now)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      merchantId: data.merchantId,
      planName: data.planName,
      amount: data.amount,
      interval: data.interval,
      customerWallet: data.customerWallet,
      customerEmail: data.customerEmail,
      status: data.status,
      approvedAmount: data.approvedAmount,
      nextChargeAt: data.nextChargeAt?.toDate() || null,
      lastChargedAt: data.lastChargedAt?.toDate() || null,
      chargeCount: data.chargeCount,
      createdAt: data.createdAt.toDate(),
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  });
}

/**
 * Process a subscription charge
 * Note: This records the charge intent. Actual blockchain transaction
 * must be executed by a backend service with wallet access.
 */
export async function processSubscriptionCharge(
  id: string,
  transactionHash: string
): Promise<ChargeResult> {
  const db = initAdmin();
  const subRef = db.collection('subscriptions').doc(id);
  const doc = await subRef.get();

  if (!doc.exists) {
    return { success: false, error: 'Subscription not found' };
  }

  const data = doc.data();
  if (data?.status !== 'active') {
    return { success: false, error: 'Subscription is not active' };
  }

  const nextChargeAt = calculateNextChargeDate(data.interval);

  // Update subscription
  await subRef.update({
    lastChargedAt: new Date(),
    nextChargeAt,
    chargeCount: FieldValue.increment(1),
  });

  // Record charge in charges collection
  await db.collection('charges').add({
    subscriptionId: id,
    merchantId: data.merchantId,
    amount: data.amount,
    customerWallet: data.customerWallet,
    transactionHash,
    status: 'completed',
    createdAt: new Date(),
  });

  // Trigger webhook
  await triggerWebhooksForEvent('subscription_charged', {
    subscriptionId: id,
    amount: data.amount,
    transactionHash,
    chargeCount: data.chargeCount + 1,
    nextChargeAt: nextChargeAt.toISOString(),
  }, data.merchantId);

  return {
    success: true,
    transactionHash,
  };
}

/**
 * Mark subscription as past due
 */
export async function markSubscriptionPastDue(
  id: string,
  error: string
): Promise<void> {
  const db = initAdmin();
  const subRef = db.collection('subscriptions').doc(id);
  const doc = await subRef.get();

  if (!doc.exists) {
    throw new Error('Subscription not found');
  }

  const data = doc.data();

  await subRef.update({
    status: 'past_due',
  });

  // Trigger webhook
  await triggerWebhooksForEvent('subscription_past_due', {
    subscriptionId: id,
    error,
  }, data?.merchantId);
}

/**
 * Calculate next charge date based on interval
 */
function calculateNextChargeDate(interval: SubscriptionInterval): Date {
  const now = new Date();
  
  switch (interval) {
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const monthly = new Date(now);
      monthly.setMonth(monthly.getMonth() + 1);
      return monthly;
    case 'yearly':
      const yearly = new Date(now);
      yearly.setFullYear(yearly.getFullYear() + 1);
      return yearly;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }
}

/**
 * Validate subscription parameters
 */
export function validateSubscriptionParams(params: CreateSubscriptionParams): string | null {
  if (!params.planName || params.planName.trim().length === 0) {
    return 'Plan name is required';
  }

  if (params.amount <= 0) {
    return 'Amount must be greater than 0';
  }

  if (!['weekly', 'monthly', 'yearly'].includes(params.interval)) {
    return 'Invalid interval';
  }

  if (!params.customerWallet || !params.customerWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
    return 'Invalid customer wallet address';
  }

  if (!params.customerEmail || !params.customerEmail.includes('@')) {
    return 'Invalid customer email';
  }

  return null;
}
