import { NextRequest, NextResponse } from 'next/server';
import { getCharge, syncChargeWithPaymentLink } from '@/lib/payment-links';
import { authenticateMerchant } from '@/lib/merchant';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chargeId: string }> }
) {
  try {
    // Authenticate merchant
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiSecret = authHeader.replace('Bearer ', '');
    const merchant = await authenticateMerchant(apiSecret);
    
    if (!merchant) {
      return NextResponse.json(
        { error: 'Invalid API credentials' },
        { status: 401 }
      );
    }
    
    const { chargeId } = await params;
    
    // Sync charge status with payment link
    await syncChargeWithPaymentLink(chargeId);
    
    const charge = await getCharge(chargeId);
    
    if (!charge) {
      return NextResponse.json(
        { error: 'Charge not found' },
        { status: 404 }
      );
    }
    
    // Verify charge belongs to merchant
    if (charge.merchantId !== merchant.id) {
      return NextResponse.json(
        { error: 'Charge not found' },
        { status: 404 }
      );
    }
    
    // Return charge data
    const response = NextResponse.json({
      charge_id: charge.id,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency,
      description: charge.description,
      paid_at: charge.paidAt?.toDate().toISOString() || null,
      tx_hash: charge.txHash,
      created_at: charge.createdAt.toDate().toISOString(),
    });
    
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching charge:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
