import { NextRequest, NextResponse } from 'next/server';
import { 
  getDueSubscriptions, 
  processSubscriptionCharge,
  markSubscriptionPastDue 
} from '@/lib/subscriptions';
import { RESTRICTED_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// POST - Process due subscription charges
// This endpoint should be called by a cron job or internal service
export async function POST(req: NextRequest) {
  try {
    // Verify internal service token
    const authHeader = req.headers.get('Authorization');
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - internal service only' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Get all subscriptions due for charging
    const dueSubscriptions = await getDueSubscriptions();

    if (dueSubscriptions.length === 0) {
      return NextResponse.json(
        { 
          message: 'No subscriptions due for charging',
          processed: 0,
        },
        { headers: RESTRICTED_CORS_HEADERS }
      );
    }

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ subscriptionId: string; error: string }>,
    };

    // Process each subscription
    for (const subscription of dueSubscriptions) {
      results.processed++;

      try {
        // Here you would:
        // 1. Use a backend wallet service to execute the USDC transfer
        // 2. The service would call USDC.transferFrom(customerWallet, merchantWallet, amount)
        // 3. This requires the customer to have approved spending via ERC-20 approve
        
        // For this implementation, we'll simulate the blockchain interaction
        // In production, integrate with a wallet service like:
        // - Coinbase Commerce API
        // - Circle Payments API
        // - Custom backend service with private keys (secure!)

        const mockTransactionHash = await simulateBlockchainCharge(subscription);

        // Record the charge
        const result = await processSubscriptionCharge(
          subscription.id,
          mockTransactionHash
        );

        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription.id,
            error: result.error || 'Unknown error',
          });

          // Mark as past due
          await markSubscriptionPastDue(
            subscription.id,
            result.error || 'Charge failed'
          );
        }

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.errors.push({
          subscriptionId: subscription.id,
          error: errorMessage,
        });

        // Mark as past due
        try {
          await markSubscriptionPastDue(subscription.id, errorMessage);
        } catch (markError) {
          console.error('Error marking subscription past due:', markError);
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Subscription charges processed',
        ...results,
      },
      { headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error processing subscription charges:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription charges' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}

/**
 * Simulate blockchain charge
 * In production, replace this with actual blockchain transaction
 */
async function simulateBlockchainCharge(subscription: any): Promise<string> {
  // TODO: Replace with actual blockchain integration
  // Options:
  // 1. Coinbase Commerce API
  // 2. Circle Payments API
  // 3. Custom service with ethers.js/viem
  
  // For now, return a mock transaction hash
  return '0x' + Array(64).fill(0).map(() => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// GET - Get charging status (for monitoring)
export async function GET(req: NextRequest) {
  try {
    // Verify internal service token
    const authHeader = req.headers.get('Authorization');
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - internal service only' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Get due subscriptions count
    const dueSubscriptions = await getDueSubscriptions();

    return NextResponse.json(
      {
        due_subscriptions: dueSubscriptions.length,
        subscriptions: dueSubscriptions.map(sub => ({
          id: sub.id,
          merchant_id: sub.merchantId,
          amount: sub.amount,
          next_charge_at: sub.nextChargeAt?.toISOString(),
        })),
      },
      { headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error fetching charging status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charging status' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}
