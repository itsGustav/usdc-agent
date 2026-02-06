'use client';

import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { CountUp } from '@/components/ui/CountUp';
import { ScoreHistory } from '@/components/ScoreHistory';
import { PeerComparison } from '@/components/PeerComparison';
import { Milestones } from '@/components/Milestones';
import { WalletPrompt } from '@/components/WalletPrompt';
import { 
  Skeleton, 
  BalanceSkeleton, 
  TransactionSkeleton, 
  ScoreSkeleton 
} from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CONTRACTS, CREDIT_ABI, CHAIN_ID } from '@/lib/contracts';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useUserIdentity } from '@/hooks/useUserIdentity';
import { formatUnits } from 'viem';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { user, loading } = useAuth();

  // Fetch user data
  const {
    balance,
    formattedBalance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useUserBalance(address);

  const {
    transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useUserTransactions(address, 5);

  const {
    name: agentName,
    isRegistered,
    isLoading: isLoadingIdentity,
  } = useUserIdentity(address);

  // Get user's credit score
  const { 
    data: creditScore, 
    isLoading: isLoadingScore 
  } = useReadContract({
    address: CONTRACTS.CREDIT,
    abi: CREDIT_ABI,
    functionName: 'getCreditScore',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
  });

  // Get user's credit status
  const { 
    data: creditStatus,
    isLoading: isLoadingCreditStatus,
  } = useReadContract({
    address: CONTRACTS.CREDIT,
    abi: CREDIT_ABI,
    functionName: 'getCreditStatus',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
  });

  const score = Number(creditScore || 0);
  const creditLimit = creditStatus 
    ? Number(formatUnits(creditStatus[0], 6)) 
    : 0;
  const creditAvailable = creditStatus 
    ? Number(formatUnits(creditStatus[1], 6)) 
    : 0;

  // Check if user is authenticated via email but hasn't connected wallet
  const isEmailOnly = user && !isConnected;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="animate-pulse text-center">
          <div className="text-5xl mb-4">🦞</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth required
  if (!isConnected && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center space-y-4 p-8">
          <div className="text-5xl">🦞</div>
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-gray-400">
            Sign in with email or connect your wallet to access your dashboard
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/login" className="block">
              <Button size="lg" className="w-full bg-orange-600 hover:bg-orange-500">
                Sign In
              </Button>
            </Link>
            <Link href="/signup" className="block">
              <Button variant="outline" size="lg" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() / 1000) - timestamp);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">
            {isLoadingIdentity ? (
              <Skeleton className="h-10 w-64" />
            ) : isRegistered && agentName ? (
              `Welcome Back, ${agentName}`
            ) : user?.email ? (
              `Welcome, ${user.email.split('@')[0]}`
            ) : (
              'Welcome Back'
            )}
          </h1>
          <p className="text-base text-gray-400">
            {address ? (
              `${address.slice(0, 6)}...${address.slice(-4)}`
            ) : user?.email ? (
              user.email
            ) : (
              'Loading...'
            )}
          </p>
        </div>

        {/* Wallet Connection Prompt for Email Users */}
        {isEmailOnly && (
          <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <WalletPrompt dismissible={true} />
          </div>
        )}

        {/* Top Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Balance Card */}
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            {isLoadingBalance ? (
              <BalanceSkeleton />
            ) : balanceError ? (
              <ErrorState error={balanceError} onRetry={refetchBalance} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base text-gray-400">Total Balance</span>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="text-4xl md:text-5xl font-bold">
                  <CountUp 
                    end={balance} 
                    decimals={2} 
                    prefix="$" 
                    duration={1200}
                  />
                </div>
                <p className="text-sm text-gray-400">USDC on Base</p>
              </div>
            )}
          </Card>

          {/* LOBSTER Score Card */}
          <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            {isLoadingScore || isLoadingCreditStatus ? (
              <ScoreSkeleton />
            ) : (
              <div className="space-y-4">
                <span className="text-base text-gray-400">LOBSTER Score</span>
                <ScoreGauge score={score} />
                <p className="text-sm text-gray-400">
                  {score >= 600 
                    ? creditLimit > 0 
                      ? `Credit limit: $${creditLimit.toLocaleString()}` 
                      : `Credit limit: $${score}`
                    : 'Build to 600+ for credit'
                  }
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/send" className="block">
              <Card hover className="text-center space-y-3 cursor-pointer transition-transform hover:scale-105">
                <div className="text-3xl">💸</div>
                <div className="font-medium">Send</div>
              </Card>
            </Link>
            <Link href="/escrow/new" className="block">
              <Card hover className="text-center space-y-3 cursor-pointer transition-transform hover:scale-105">
                <div className="text-3xl">🔐</div>
                <div className="font-medium">Escrow</div>
              </Card>
            </Link>
            <Link href="/dashboard/history" className="block">
              <Card hover className="text-center space-y-3 cursor-pointer transition-transform hover:scale-105">
                <div className="text-3xl">📜</div>
                <div className="font-medium">History</div>
              </Card>
            </Link>
            <Link href="/register" className="block">
              <Card hover className="text-center space-y-3 cursor-pointer transition-transform hover:scale-105">
                <div className="text-3xl">🤖</div>
                <div className="font-medium">Register</div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Score Analytics Section */}
        {address && score > 0 && (
          <>
            {/* Score History & Peer Comparison */}
            <div className="grid lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="lg:col-span-2">
                <ScoreHistory address={address} />
              </div>
              <div>
                <PeerComparison address={address} score={score} />
              </div>
            </div>

            {/* Milestones */}
            <div className="animate-slide-up" style={{ animationDelay: '500ms' }}>
              <Milestones address={address} />
            </div>
          </>
        )}

        {/* Recent Transactions */}
        <div className="animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Transactions</h2>
            <Link href="/dashboard/history">
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>
          
          {isLoadingTransactions ? (
            <Card className="p-0">
              <div className="divide-y divide-gray-800">
                {[...Array(3)].map((_, i) => (
                  <TransactionSkeleton key={i} />
                ))}
              </div>
            </Card>
          ) : transactionsError ? (
            <ErrorState error={transactionsError} onRetry={refetchTransactions} />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No transactions yet"
              description="Your transaction history will appear here once you start using Pay Lobster."
              action={{
                label: "Create Your First Escrow",
                href: "/escrow/new",
              }}
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="divide-y divide-gray-800">
                {transactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-900/30 transition-colors animate-fade-in"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {tx.type}
                        {tx.status && (
                          <Badge 
                            variant={
                              tx.status === 'Completed' 
                                ? 'success' 
                                : tx.status === 'Pending' 
                                ? 'warning' 
                                : 'default'
                            }
                          >
                            {tx.status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {tx.from && (
                          <span>
                            From {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </span>
                        )}
                        {tx.to && (
                          <span>
                            To {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                    <div 
                      className={`text-lg font-bold ${
                        tx.amount > 0 ? 'text-green-500' : 'text-gray-50'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {Math.abs(tx.amount).toFixed(2)} USDC
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
