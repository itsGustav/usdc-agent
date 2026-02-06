'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import dynamic from 'next/dynamic';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, USDC_ABI } from '@/lib/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => mod.ConnectButton),
  { ssr: false }
);

interface PaymentLinkData {
  link_id: string;
  amount: number;
  description: string;
  status: 'active' | 'paid' | 'expired';
  paid_at: string | null;
  tx_hash: string | null;
  created_at: string;
  expires_at: string;
  redirect_url: string;
  merchant?: {
    name: string;
    website: string;
    wallet_address: string;
  };
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params.linkId as string;
  
  const { address, isConnected } = useAccount();
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: hash, writeContract, isPending, isError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });
  
  // Fetch payment link data
  useEffect(() => {
    async function fetchPaymentLink() {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/payment-links/${linkId}`);
        
        if (!response.ok) {
          throw new Error('Payment link not found');
        }
        
        const data = await response.json();
        setPaymentLink(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment link');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPaymentLink();
  }, [linkId]);
  
  // Handle successful payment
  useEffect(() => {
    if (isConfirmed && hash) {
      // Update payment link status
      fetch(`/api/v1/payment-links/${linkId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_by: address,
          tx_hash: hash,
        }),
      }).catch(console.error);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        if (paymentLink?.redirect_url) {
          window.location.href = paymentLink.redirect_url;
        }
      }, 2000);
    }
  }, [isConfirmed, hash, linkId, address, paymentLink]);
  
  // Handle payment
  const handlePay = async () => {
    if (!paymentLink || !address) return;
    
    try {
      const amountInWei = parseUnits(paymentLink.amount.toString(), 6); // USDC has 6 decimals
      
      const recipientAddress = (paymentLink.merchant?.wallet_address || CONTRACTS.ESCROW) as `0x${string}`;
      
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [recipientAddress, amountInWei],
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to process payment');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment...</p>
        </div>
      </div>
    );
  }
  
  if (error || !paymentLink) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Payment Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'This payment link is invalid or has expired.'}</p>
          <Button onClick={() => router.push('/')}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }
  
  if (paymentLink.status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Payment Complete</h2>
          <p className="text-gray-400 mb-4">This payment link has already been paid.</p>
          {paymentLink.tx_hash && (
            <a
              href={`https://basescan.org/tx/${paymentLink.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-400 text-sm"
            >
              View transaction →
            </a>
          )}
        </Card>
      </div>
    );
  }
  
  if (paymentLink.status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-yellow-500 text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-gray-50 mb-2">Payment Expired</h2>
          <p className="text-gray-400 mb-6">This payment link has expired.</p>
          <Button onClick={() => router.push('/')}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Pay Lobster Branding */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🦞</div>
          <h1 className="text-2xl font-bold text-gray-50">Pay Lobster</h1>
          <p className="text-gray-400 text-sm">Secure crypto payments</p>
        </div>
        
        <Card className="p-8">
          {/* Merchant Info */}
          <div className="mb-6 pb-6 border-b border-gray-800">
            <p className="text-sm text-gray-400 mb-1">Payment to</p>
            <p className="text-xl font-semibold text-gray-50">
              {paymentLink.merchant?.name || 'Merchant'}
            </p>
          </div>
          
          {/* Payment Details */}
          <div className="mb-8">
            <p className="text-sm text-gray-400 mb-2">Description</p>
            <p className="text-gray-50 mb-6">{paymentLink.description}</p>
            
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">Amount</p>
              <p className="text-4xl font-bold text-gray-50">
                ${paymentLink.amount.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400 mt-1">USDC</p>
            </div>
          </div>
          
          {/* Payment Actions */}
          {!isConnected ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <ConnectButton />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Connect your wallet to continue
              </p>
            </div>
          ) : isConfirmed ? (
            <div className="text-center">
              <div className="text-green-500 text-4xl mb-3">✓</div>
              <h3 className="text-xl font-bold text-gray-50 mb-2">Payment Successful!</h3>
              <p className="text-gray-400 mb-4">Redirecting you back...</p>
              {hash && (
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 text-sm"
                >
                  View transaction →
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handlePay}
                isLoading={isPending || isConfirming}
                disabled={isPending || isConfirming}
                className="w-full"
                size="lg"
              >
                {isPending ? 'Confirm in Wallet...' : 
                 isConfirming ? 'Processing...' : 
                 `Pay $${paymentLink.amount.toFixed(2)} USDC`}
              </Button>
              
              {isError && (
                <p className="text-red-500 text-sm text-center">
                  Payment failed. Please try again.
                </p>
              )}
              
              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by Base network
              </p>
            </div>
          )}
        </Card>
        
        {/* Trust Indicators */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              🔒 Secure
            </span>
            <span className="flex items-center gap-1">
              ⚡ Instant
            </span>
            <span className="flex items-center gap-1">
              ✓ Verified
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Powered by <span className="text-blue-500">Pay Lobster</span>
          </p>
        </div>
      </div>
    </div>
  );
}
