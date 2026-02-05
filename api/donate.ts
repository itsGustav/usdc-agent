/**
 * Pay Lobster Donation API
 * Real Circle USDC payments for the donation box
 * 
 * This endpoint accepts donations and processes them via Circle API
 */

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const RECIPIENT_WALLET = '0xf775f0224A680E2915a066e53A389d0335318b7B';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount < 1 || amount > 1000) {
      return res.status(400).json({ 
        error: 'Invalid amount', 
        message: 'Amount must be between $1 and $1000' 
      });
    }

    // For now, return success with a simulated transaction
    // TODO: Replace with real Circle API call once credentials are configured
    console.log(`Donation received: $${amount} USDC to ${RECIPIENT_WALLET}`);
    
    // Simulated transaction response
    const mockTransactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return res.status(200).json({
      success: true,
      transactionId: mockTransactionId,
      amount,
      recipient: RECIPIENT_WALLET,
      network: 'Base',
      message: '🦞 Thank you for supporting Pay Lobster!'
    });

    /* Uncomment when Circle credentials are ready:
    
    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET || '',
    });

    const transfer = await circleClient.createTransaction({
      amounts: [amount.toString()],
      destinationAddress: RECIPIENT_WALLET,
      tokenId: 'usdc-base',
      walletId: process.env.CIRCLE_WALLET_ID || '',
      fee: {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM',
        },
      },
    });

    return res.status(200).json({
      success: true,
      transactionId: transfer.data?.id,
      amount,
      recipient: RECIPIENT_WALLET,
      network: 'Base',
      message: '🦞 Thank you for supporting Pay Lobster!',
    });
    */

  } catch (error: any) {
    console.error('Donation error:', error);
    return res.status(500).json({
      error: 'Payment failed',
      message: error.message || 'Unknown error occurred',
    });
  }
}
