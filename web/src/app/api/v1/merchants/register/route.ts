import { NextRequest, NextResponse } from 'next/server';
import { registerMerchant } from '@/lib/merchant';
import { applySecurityHeaders } from '@/lib/security-headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { name, website, webhook_url, wallet_address } = body;
    
    if (!name || !website || !webhook_url || !wallet_address) {
      return NextResponse.json(
        { error: 'Missing required fields: name, website, webhook_url, wallet_address' },
        { status: 400 }
      );
    }
    
    // Validate wallet address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    // Validate URL formats
    try {
      new URL(website);
      new URL(webhook_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format for website or webhook_url' },
        { status: 400 }
      );
    }
    
    // Register merchant
    const result = await registerMerchant({
      name,
      website,
      webhookUrl: webhook_url,
      walletAddress: wallet_address,
    });
    
    const response = NextResponse.json(result, { status: 201 });
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Error registering merchant:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
