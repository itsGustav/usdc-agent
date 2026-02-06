import { NextRequest, NextResponse } from 'next/server';
import { getPaymentLink } from '@/lib/payment-links';
import { getMerchantById } from '@/lib/merchant';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    
    const paymentLink = await getPaymentLink(linkId);
    
    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }
    
    // Get merchant info
    const merchant = await getMerchantById(paymentLink.merchantId);
    
    // Return public data only
    const response = NextResponse.json({
      link_id: paymentLink.id,
      amount: paymentLink.amount,
      description: paymentLink.description,
      status: paymentLink.status,
      paid_at: paymentLink.paidAt?.toDate().toISOString() || null,
      tx_hash: paymentLink.txHash,
      created_at: paymentLink.createdAt.toDate().toISOString(),
      expires_at: paymentLink.expiresAt.toDate().toISOString(),
      redirect_url: paymentLink.redirectUrl,
      merchant: merchant ? {
        name: merchant.name,
        website: merchant.website,
        wallet_address: merchant.walletAddress,
      } : null,
    });
    
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching payment link:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
