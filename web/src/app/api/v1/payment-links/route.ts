import { NextRequest, NextResponse } from 'next/server';
import { createPaymentLink } from '@/lib/payment-links';
import { authenticateMerchant } from '@/lib/merchant';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { amount, description, redirect_url, metadata } = body;
    
    // Validate required fields
    if (amount === undefined || !description || !redirect_url) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, redirect_url' },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }
    
    // Validate redirect URL
    try {
      new URL(redirect_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid redirect_url format' },
        { status: 400 }
      );
    }
    
    // Create payment link
    const result = await createPaymentLink({
      merchantId: merchant.id,
      amount,
      description,
      redirectUrl: redirect_url,
      metadata: metadata || {},
    });
    
    const response = NextResponse.json(result, { status: 201 });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error creating payment link:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
