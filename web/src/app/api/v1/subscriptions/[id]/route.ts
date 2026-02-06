import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, cancelSubscription } from '@/lib/subscriptions';
import { RESTRICTED_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// GET - Get subscription details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Apply CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: RESTRICTED_CORS_HEADERS });
  }

  try {
    // Extract API key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const merchantId = apiKey.replace('sk_live_', '').replace('sk_test_', '');

    // Get subscription
    const subscription = await getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Verify merchant owns this subscription
    if (subscription.merchantId !== merchantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        subscription_id: subscription.id,
        plan_name: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        customer_wallet: subscription.customerWallet,
        customer_email: subscription.customerEmail,
        status: subscription.status,
        approved_amount: subscription.approvedAmount,
        charge_count: subscription.chargeCount,
        next_charge_at: subscription.nextChargeAt?.toISOString() || null,
        last_charged_at: subscription.lastChargedAt?.toISOString() || null,
        created_at: subscription.createdAt.toISOString(),
        cancelled_at: subscription.cancelledAt?.toISOString() || null,
      },
      { headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}

// DELETE - Cancel subscription
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Apply CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: RESTRICTED_CORS_HEADERS });
  }

  try {
    // Extract API key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    const merchantId = apiKey.replace('sk_live_', '').replace('sk_test_', '');

    // Get subscription to verify ownership
    const subscription = await getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Verify merchant owns this subscription
    if (subscription.merchantId !== merchantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Cancel subscription
    await cancelSubscription(id);

    return NextResponse.json(
      { 
        success: true,
        subscription_id: id,
        status: 'cancelled',
      },
      { headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}
