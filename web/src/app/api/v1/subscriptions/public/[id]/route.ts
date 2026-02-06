import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '@/lib/subscriptions';
import { PUBLIC_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// GET - Public endpoint to fetch subscription details (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const subscription = await getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Return public subscription data
    return NextResponse.json(
      {
        subscription_id: subscription.id,
        plan_name: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        customer_wallet: subscription.customerWallet,
        customer_email: subscription.customerEmail,
        status: subscription.status,
        charge_count: subscription.chargeCount,
        next_charge_at: subscription.nextChargeAt?.toISOString() || null,
        created_at: subscription.createdAt.toISOString(),
      },
      { headers: PUBLIC_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
