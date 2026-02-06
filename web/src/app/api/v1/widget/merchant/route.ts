import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase';
import { PUBLIC_CORS_HEADERS } from '@/lib/cors';

export const runtime = 'nodejs';

// GET - Fetch merchant wallet address by public key
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const merchantKey = searchParams.get('key');

    if (!merchantKey) {
      return NextResponse.json(
        { error: 'Merchant key is required' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Validate key format
    if (!merchantKey.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Invalid merchant key format' },
        { status: 400, headers: PUBLIC_CORS_HEADERS }
      );
    }

    // Look up merchant by public key
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

    const merchant = snapshot.docs[0].data();

    return NextResponse.json(
      {
        wallet: merchant.walletAddress,
        name: merchant.businessName || 'Merchant',
      },
      { headers: PUBLIC_CORS_HEADERS }
    );

  } catch (error) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merchant details' },
      { status: 500, headers: PUBLIC_CORS_HEADERS }
    );
  }
}
