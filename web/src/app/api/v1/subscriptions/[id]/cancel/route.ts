import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, cancelSubscription } from '@/lib/subscriptions';
import { PUBLIC_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// POST - Cancel subscription (customer action)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await req.json();
    const { wallet_address } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Get subscription
    const subscription = await getSubscription(id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Verify wallet address matches
    if (subscription.customerWallet.toLowerCase() !== wallet_address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Wallet address mismatch' },
        { status: 403, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Verify subscription can be cancelled
    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Cancel subscription
    await cancelSubscription(id);

    // Fetch updated subscription
    const updatedSub = await getSubscription(id);

    return NextResponse.json(
      {
        subscription_id: updatedSub!.id,
        plan_name: updatedSub!.planName,
        amount: updatedSub!.amount,
        interval: updatedSub!.interval,
        customer_wallet: updatedSub!.customerWallet,
        customer_email: updatedSub!.customerEmail,
        status: updatedSub!.status,
        charge_count: updatedSub!.chargeCount,
        next_charge_at: updatedSub!.nextChargeAt?.toISOString() || null,
        created_at: updatedSub!.createdAt.toISOString(),
      },
      { headers: PUBLIC_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
