import { NextRequest, NextResponse } from 'next/server';
import { markPaymentLinkPaid } from '@/lib/payment-links';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const body = await request.json();
    
    const { paid_by, tx_hash } = body;
    
    if (!paid_by || !tx_hash) {
      return NextResponse.json(
        { error: 'Missing required fields: paid_by, tx_hash' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(paid_by)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }
    
    await markPaymentLinkPaid(linkId, paid_by, tx_hash);
    
    const response = NextResponse.json({ success: true });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error marking payment as complete:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
