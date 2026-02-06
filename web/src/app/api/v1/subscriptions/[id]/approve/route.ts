import { NextRequest, NextResponse } from 'next/server';
import { getSubscription, approveSubscription } from '@/lib/subscriptions';
import { PUBLIC_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// POST - Approve subscription after USDC approval transaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await req.json();
    const { transaction_hash, wallet_address } = body;

    if (!transaction_hash || !wallet_address) {
      return NextResponse.json(
        { error: 'Transaction hash and wallet address are required' },
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

    // Verify subscription is pending approval
    if (subscription.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Subscription is not pending approval' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Calculate approved amount (6 months worth)
    const chargesPerYear = subscription.interval === 'weekly' ? 52 : 
                          subscription.interval === 'monthly' ? 12 : 1;
    const approvedAmount = subscription.amount * Math.ceil(chargesPerYear / 2);

    // TODO: Verify the transaction on-chain to ensure approval was successful
    // For now, we trust the frontend

    // Update subscription status
    await approveSubscription(id, approvedAmount);

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
    console.error('Error approving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to approve subscription' },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
