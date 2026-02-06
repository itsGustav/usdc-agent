import { NextRequest, NextResponse } from 'next/server';
import { createCharge } from '@/lib/payment-links';
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
    const { amount, currency, description, customer_email, redirect_url, metadata } = body;
    
    // Validate required fields
    if (amount === undefined || !currency || !description || !redirect_url) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, currency, description, redirect_url' },
        { status: 400 }
      );
    }
    
    // Validate currency (only USDC supported)
    if (currency !== 'USDC') {
      return NextResponse.json(
        { error: 'Only USDC currency is supported' },
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
    
    // Create charge
    const result = await createCharge(
      merchant.id,
      amount,
      currency,
      description,
      redirect_url,
      customer_email,
      metadata
    );
    
    const response = NextResponse.json(result, { status: 201 });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error creating charge:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
