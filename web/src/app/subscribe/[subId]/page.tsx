'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, USDC_ABI } from '@/lib/contracts';
import { parseUnits } from 'viem';

interface Subscription {
  subscription_id: string;
  plan_name: string;
  amount: number;
  interval: string;
  customer_wallet: string;
  customer_email: string;
  status: string;
  charge_count: number;
  next_charge_at: string | null;
  created_at: string;
}

export default function SubscriptionPage() {
  const params = useParams();
  const subId = params.subId as string;
  
  const { address, isConnected } = useAccount();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch subscription details
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch(`/api/v1/subscriptions/public/${subId}`);
        if (!response.ok) {
          throw new Error('Subscription not found');
        }
        const data = await response.json();
        setSubscription(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    }

    if (subId) {
      fetchSubscription();
    }
  }, [subId]);

  // Handle approval confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      handleApprovalSuccess();
    }
  }, [isConfirmed, hash]);

  const handleApprove = async () => {
    if (!subscription || !address) return;

    try {
      setApproving(true);
      setError(null);

      // Calculate approval amount (6 months worth for safety)
      const chargesPerYear = subscription.interval === 'weekly' ? 52 : 
                            subscription.interval === 'monthly' ? 12 : 1;
      const approvalAmount = subscription.amount * Math.ceil(chargesPerYear / 2); // 6 months
      const amountWei = parseUnits(approvalAmount.toString(), 6); // USDC has 6 decimals

      // Approve USDC spending
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.ESCROW, amountWei], // Approve Pay Lobster escrow contract
      });

    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve subscription');
      setApproving(false);
    }
  };

  const handleApprovalSuccess = async () => {
    if (!subscription || !hash) return;

    try {
      // Notify backend of approval
      const response = await fetch(`/api/v1/subscriptions/${subId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_hash: hash,
          wallet_address: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm approval');
      }

      // Refresh subscription data
      const updatedSub = await response.json();
      setSubscription(updatedSub);
      setApproving(false);

    } catch (err) {
      console.error('Error confirming approval:', err);
      setError('Approval succeeded but failed to update status. Please refresh the page.');
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      setCancelling(true);
      setError(null);

      const response = await fetch(`/api/v1/subscriptions/${subId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: address,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const updatedSub = await response.json();
      setSubscription(updatedSub);

    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (error && !subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) return null;

  const intervalLabel = subscription.interval === 'weekly' ? 'week' :
                       subscription.interval === 'monthly' ? 'month' : 'year';

  const statusColors = {
    pending_approval: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    past_due: 'bg-red-100 text-red-800',
  };

  const statusColor = statusColors[subscription.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pay Lobster Subscription</h1>
          <p className="text-gray-600">Manage your recurring payment</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Plan Details */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-blue-100 text-sm mb-2">Plan</p>
                <h2 className="text-3xl font-bold">{subscription.plan_name}</h2>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor}`}>
                {subscription.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">${subscription.amount.toFixed(2)}</span>
              <span className="text-xl text-blue-100">USDC / {intervalLabel}</span>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="px-8 py-6 border-b">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="font-medium text-gray-900">{subscription.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Wallet</p>
                <p className="font-mono text-sm text-gray-900">
                  {subscription.customer_wallet.slice(0, 6)}...{subscription.customer_wallet.slice(-4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Charges</p>
                <p className="font-medium text-gray-900">{subscription.charge_count} payments</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Next Charge</p>
                <p className="font-medium text-gray-900">
                  {subscription.next_charge_at 
                    ? new Date(subscription.next_charge_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6">
            {!isConnected && (
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">Connect your wallet to manage this subscription</p>
                <ConnectButton />
              </div>
            )}

            {isConnected && address?.toLowerCase() !== subscription.customer_wallet.toLowerCase() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  ⚠️ This subscription belongs to a different wallet address
                </p>
              </div>
            )}

            {isConnected && address?.toLowerCase() === subscription.customer_wallet.toLowerCase() && (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {subscription.status === 'pending_approval' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-900 text-sm font-medium mb-2">
                        🔐 Approval Required
                      </p>
                      <p className="text-blue-700 text-sm">
                        You need to approve USDC spending for automatic recurring payments. 
                        This is a one-time blockchain transaction.
                      </p>
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={approving || isConfirming}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving || isConfirming ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {isConfirming ? 'Confirming...' : 'Approving...'}
                        </span>
                      ) : (
                        'Approve Subscription'
                      )}
                    </button>
                  </div>
                )}

                {subscription.status === 'active' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-900 text-sm font-medium mb-2">
                        ✅ Subscription Active
                      </p>
                      <p className="text-green-700 text-sm">
                        Your subscription is active and will automatically charge ${subscription.amount.toFixed(2)} USDC 
                        every {intervalLabel}.
                      </p>
                    </div>

                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelling ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                          Cancelling...
                        </span>
                      ) : (
                        'Cancel Subscription'
                      )}
                    </button>
                  </div>
                )}

                {subscription.status === 'cancelled' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 text-sm font-medium mb-2">
                      ⛔ Subscription Cancelled
                    </p>
                    <p className="text-gray-700 text-sm">
                      This subscription has been cancelled and will not charge again.
                    </p>
                  </div>
                )}

                {subscription.status === 'past_due' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-900 text-sm font-medium mb-2">
                      ⚠️ Payment Failed
                    </p>
                    <p className="text-red-700 text-sm">
                      The last payment attempt failed. Please ensure you have sufficient USDC balance 
                      and approved spending allowance.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-semibold">Pay Lobster</span> • Secure USDC payments on Base
          </p>
        </div>
      </div>
    </div>
  );
}
