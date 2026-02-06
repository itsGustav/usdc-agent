import { NextRequest, NextResponse } from 'next/server';
import { 
  createSubscription, 
  getMerchantSubscriptions,
  validateSubscriptionParams,
  type CreateSubscriptionParams 
} from '@/lib/subscriptions';
import { RESTRICTED_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// POST - Create subscription
export async function POST(req: NextRequest) {
  // Apply CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: RESTRICTED_CORS_HEADERS });
  }

  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    const apiKey = authHeader.replace('Bearer ', '');
    
    // Validate API key format
    if (!apiKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // TODO: Validate API key against database and get merchantId
    // For now, extract merchantId from key (demo purposes)
    const merchantId = apiKey.replace('sk_live_', '').replace('sk_test_', '');

    // Parse request body
    const body = await req.json();
    const params: CreateSubscriptionParams = {
      merchantId,
      planName: body.plan_name,
      amount: parseFloat(body.amount),
      interval: body.interval,
      customerWallet: body.customer_wallet,
      customerEmail: body.customer_email,
    };

    // Validate parameters
    const validationError = validateSubscriptionParams(params);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400, headers: RESTRICTED_CORS_HEADERS }
      );
    }

    // Create subscription
    const subscription = await createSubscription(params);

    // Generate approval URL
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://paylobster.com'}/subscribe/${subscription.id}`;

    return NextResponse.json(
      {
        subscription_id: subscription.id,
        approval_url: approvalUrl,
        status: subscription.status,
        plan_name: subscription.planName,
        amount: subscription.amount,
        interval: subscription.interval,
        customer_wallet: subscription.customerWallet,
        customer_email: subscription.customerEmail,
        created_at: subscription.createdAt.toISOString(),
      },
      { status: 201, headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}

// GET - List merchant subscriptions
export async function GET(req: NextRequest) {
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

    // Get status filter from query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as any;

    // Fetch subscriptions
    const subscriptions = await getMerchantSubscriptions(merchantId, statusFilter);

    return NextResponse.json(
      {
        subscriptions: subscriptions.map(sub => ({
          subscription_id: sub.id,
          plan_name: sub.planName,
          amount: sub.amount,
          interval: sub.interval,
          customer_wallet: sub.customerWallet,
          customer_email: sub.customerEmail,
          status: sub.status,
          charge_count: sub.chargeCount,
          next_charge_at: sub.nextChargeAt?.toISOString() || null,
          last_charged_at: sub.lastChargedAt?.toISOString() || null,
          created_at: sub.createdAt.toISOString(),
          cancelled_at: sub.cancelledAt?.toISOString() || null,
        })),
      },
      { headers: RESTRICTED_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500, headers: RESTRICTED_CORS_HEADERS }
    );
  }
}
