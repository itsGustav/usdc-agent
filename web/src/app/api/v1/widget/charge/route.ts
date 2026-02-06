import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase';
import { PUBLIC_CORS_HEADERS } from '@/lib/cors';
import { triggerWebhooksForEvent } from '@/lib/webhooks';

export const runtime = 'nodejs';

// POST - Record a charge from the widget
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      merchantKey, 
      amount, 
      from, 
      to, 
      transactionHash, 
      label 
    } = body;

    // Validate required fields
    if (!merchantKey || !amount || !from || !to || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Look up merchant
    const db = initAdmin();
    const merchantsRef = db.collection('merchants');
    const snapshot = await merchantsRef
      .where('publicKey', '==', merchantKey)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404, headers: PUBLIC_CORS_HEADERS }
      );
    }

    const merchantDoc = snapshot.docs[0];
    const merchantId = merchantDoc.id;

    // Record charge
    const chargeRef = await db.collection('charges').add({
      merchantId,
      amount: parseFloat(amount),
      fromAddress: from.toLowerCase(),
      toAddress: to.toLowerCase(),
      transactionHash,
      label: label || 'Widget Payment',
      source: 'widget',
      status: 'completed',
      createdAt: new Date(),
    });

    // Trigger webhook
    await triggerWebhooksForEvent('payment_completed', {
      chargeId: chargeRef.id,
      amount: parseFloat(amount),
      from,
      to,
      transactionHash,
      label,
    }, merchantId);

    return NextResponse.json(
      {
        success: true,
        charge_id: chargeRef.id,
      },
      { headers: PUBLIC_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error recording charge:', error);
    return NextResponse.json(
      { error: 'Failed to record charge' },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
