import { initAdmin } from './firebase';
import * as crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';

export interface Merchant {
  id: string;
  name: string;
  website: string;
  walletAddress: string;
  webhookUrl: string;
  apiKey: string;
  apiSecret: string;
  createdAt: Timestamp;
  active: boolean;
  totalVolume: number;
  totalTransactions: number;
}

export interface CreateMerchantData {
  name: string;
  website: string;
  webhookUrl: string;
  walletAddress: string;
}

/**
 * Generate API key with prefix
 */
function generateApiKey(prefix: 'pk_live_' | 'sk_live_', length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(length);
  let result = prefix;
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Hash API secret for storage
 */
function hashApiSecret(secret: string): string {
  return crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');
}

/**
 * Verify API secret
 */
export function verifyApiSecret(secret: string, hash: string): boolean {
  const secretHash = hashApiSecret(secret);
  return crypto.timingSafeEqual(
    Buffer.from(secretHash),
    Buffer.from(hash)
  );
}

/**
 * Register a new merchant
 */
export async function registerMerchant(data: CreateMerchantData): Promise<{
  merchant_id: string;
  api_key: string;
  api_secret: string;
}> {
  const db = initAdmin();
  
  // Generate API keys
  const apiKey = generateApiKey('pk_live_', 24);
  const apiSecret = generateApiKey('sk_live_', 32);
  const apiSecretHash = hashApiSecret(apiSecret);
  
  // Create merchant document
  const merchantRef = db.collection('merchants').doc();
  
  const merchant: Omit<Merchant, 'id'> = {
    name: data.name,
    website: data.website,
    walletAddress: data.walletAddress,
    webhookUrl: data.webhookUrl,
    apiKey,
    apiSecret: apiSecretHash,
    createdAt: Timestamp.now(),
    active: true,
    totalVolume: 0,
    totalTransactions: 0,
  };
  
  await merchantRef.set(merchant);
  
  return {
    merchant_id: merchantRef.id,
    api_key: apiKey,
    api_secret: apiSecret, // Return unhashed secret once
  };
}

/**
 * Get merchant by API key
 */
export async function getMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
  const db = initAdmin();
  
  const snapshot = await db
    .collection('merchants')
    .where('apiKey', '==', apiKey)
    .where('active', '==', true)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data() as Omit<Merchant, 'id'>,
  };
}

/**
 * Authenticate merchant with API secret
 */
export async function authenticateMerchant(apiSecret: string): Promise<Merchant | null> {
  const db = initAdmin();
  
  // Get all active merchants
  const snapshot = await db
    .collection('merchants')
    .where('active', '==', true)
    .get();
  
  // Find merchant with matching secret
  for (const doc of snapshot.docs) {
    const merchant = doc.data() as Omit<Merchant, 'id'>;
    
    if (verifyApiSecret(apiSecret, merchant.apiSecret)) {
      return {
        id: doc.id,
        ...merchant,
      };
    }
  }
  
  return null;
}

/**
 * Get merchant by ID
 */
export async function getMerchantById(merchantId: string): Promise<Merchant | null> {
  const db = initAdmin();
  
  const doc = await db.collection('merchants').doc(merchantId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data() as Omit<Merchant, 'id'>,
  };
}

/**
 * Update merchant stats after payment
 */
export async function updateMerchantStats(
  merchantId: string,
  amount: number
): Promise<void> {
  const db = initAdmin();
  const merchantRef = db.collection('merchants').doc(merchantId);
  const { FieldValue } = await import('firebase-admin/firestore');
  
  await merchantRef.update({
    totalVolume: FieldValue.increment(amount),
    totalTransactions: FieldValue.increment(1),
  });
}

/**
 * Send webhook to merchant
 */
export async function sendMerchantWebhook(
  merchant: Merchant,
  event: string,
  data: any
): Promise<void> {
  try {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', merchant.apiSecret)
      .update(payloadString)
      .digest('hex');
    
    await fetch(merchant.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'User-Agent': 'PayLobster-Merchant/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error(`Failed to send webhook to merchant ${merchant.id}:`, error);
    // Don't throw - webhook failures shouldn't block payment processing
  }
}
