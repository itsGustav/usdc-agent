'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useContractStats } from '@/hooks/useContractStats';
import Globe from '@/components/landing/Globe';
import BentoCards from '@/components/landing/BentoCards';
import ActivityFeed from '@/components/landing/ActivityFeed';

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => mod.ConnectButton),
  { ssr: false }
);

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function HomePage() {
  const { isConnected } = useAccount();
  const { totalVolume, registeredAgents, transactionCount, isLoading } = useContractStats();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6">
            THE PAYMENT LAYER
            <br />
            FOR AUTONOMOUS AGENTS
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Your OpenClaw bot accepts tips, donations, and payments — right in chat.
            <br />
            One skill install. Real USDC on Base. Sub-cent fees.
          </p>

          {isConnected ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Open Dashboard
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Learn More →
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              {/* Primary CTA - Get Started */}
              <Link href="/signup" className="block w-full">
                <Button size="lg" className="w-full">
                  Get Started Free
                </Button>
              </Link>

              {/* Secondary CTA */}
              <Link href="#how-it-works" className="block w-full">
                <Button variant="secondary" size="lg" className="w-full">
                  See How It Works ↓
                </Button>
              </Link>

              {/* Sign In Link */}
              <div className="text-center">
                <span className="text-gray-400 text-sm">Already have an account? </span>
                <Link href="/login" className="text-blue-500 hover:text-blue-400 text-sm font-medium">
                  Sign In
                </Link>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-500 text-sm">or connect wallet</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>

              <div className="flex justify-center">
                <ConnectButton />
              </div>

              {/* Learn More Link */}
              <div className="text-center pt-4">
                <Link href="/docs" className="text-gray-400 hover:text-gray-300 text-sm inline-flex items-center gap-1">
                  Learn more about Pay Lobster →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tagline Section */}
      <section className="py-12 md:py-16 px-4 md:px-8 bg-gradient-to-b from-blue-950/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for the Agentic Economy
          </h2>
          <p className="text-lg md:text-xl text-gray-400">
            Whether you're building agents, running them, or hiring them — Pay Lobster handles the money.
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 md:py-24 px-4 md:px-8 border-y border-gray-800">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-2">
            <div className="text-4xl md:text-5xl font-bold">
              {isLoading ? (
                <span className="animate-pulse">---</span>
              ) : (
                <>$<AnimatedCounter end={Math.round(totalVolume)} /></>
              )}
            </div>
            <div className="text-base text-gray-400">Total Volume</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl md:text-5xl font-bold">
              {isLoading ? (
                <span className="animate-pulse">--</span>
              ) : (
                <AnimatedCounter end={registeredAgents} />
              )}
            </div>
            <div className="text-base text-gray-400">Active Agents</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl md:text-5xl font-bold">
              {isLoading ? (
                <span className="animate-pulse">---</span>
              ) : (
                <AnimatedCounter end={transactionCount} />
              )}
            </div>
            <div className="text-base text-gray-400">Transactions</div>
          </div>
        </div>
      </section>

      {/* Globe Visualization - Command Center */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-full mb-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-blue-600">LIVE NETWORK</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Real-Time Transaction Flow
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Watch agent payments flow across the Base network
            </p>
          </div>
          <Globe />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Install the Pay Lobster skill',
                description: 'One command in your OpenClaw terminal',
                code: 'openclaw skills install pay-lobster',
              },
              {
                step: '2',
                title: 'Your agent accepts USDC payments in chat',
                description: 'Tips, donations, and service payments — all handled automatically',
                code: null,
              },
              {
                step: '3',
                title: 'Funds settle instantly on Base',
                description: 'Real USDC on Base L2. Sub-cent transaction fees.',
                code: null,
              },
            ].map((item) => (
              <div key={item.step} className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-base text-gray-400">{item.description}</p>
                {item.code && (
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-blue-400">
                    {item.code}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            Use Cases
          </h2>
          <p className="text-lg md:text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Power the agentic economy with trustless payments
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card hover>
              <div className="space-y-4">
                <div className="text-4xl">💰</div>
                <h3 className="text-xl font-bold">Tips & Donations</h3>
                <p className="text-base text-gray-400">
                  Let users tip your bot for great work. Simple, instant, and on-chain.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="text-4xl">🔒</div>
                <h3 className="text-xl font-bold">Escrow</h3>
                <p className="text-base text-gray-400">
                  Trustless payments for agent services. Funds held until work is complete.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="text-4xl">⭐</div>
                <h3 className="text-xl font-bold">Reputation</h3>
                <p className="text-base text-gray-400">
                  Build a LOBSTER score that follows you everywhere. Verifiable trust.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            Enterprise-Grade Infrastructure
          </h2>
          <p className="text-lg md:text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Everything autonomous agents need to transact with trust
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card hover>
              <div className="space-y-4">
                <div className="text-3xl">⭐</div>
                <h3 className="text-xl font-bold">Trust Scores</h3>
                <p className="text-base text-gray-400">
                  Multi-dimensional reputation from verified transactions.
                  No fake reviews.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="text-3xl">📊</div>
                <h3 className="text-xl font-bold">Credit System</h3>
                <p className="text-base text-gray-400">
                  300-850 LOBSTER score unlocks credit-backed escrows.
                  Build history, unlock trust.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="text-3xl">🔐</div>
                <h3 className="text-xl font-bold">USDC Escrow</h3>
                <p className="text-base text-gray-400">
                  Trustless payment holding with dispute resolution.
                  0.5% platform fee.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Access - Bento Cards */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Access <span className="text-blue-600">Everything</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Choose your interface and start managing your agent finance operations
            </p>
          </div>
          <BentoCards />
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gradient-to-b from-blue-950/10 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Built on Trust
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Security and transparency at every layer
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card hover>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <h3 className="text-xl font-bold">ERC-8004 Compliant</h3>
                </div>
                <p className="text-base text-gray-400">
                  Industry standard authored by MetaMask, Ethereum Foundation, Google, and Coinbase.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xl">💎</span>
                  </div>
                  <h3 className="text-xl font-bold">Real USDC on Base</h3>
                </div>
                <p className="text-base text-gray-400">
                  Not wrapped tokens. Real Circle USDC on Base L2 with instant settlement.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xl">📖</span>
                  </div>
                  <h3 className="text-xl font-bold">Open Source Smart Contracts</h3>
                </div>
                <p className="text-base text-gray-400">
                  Audited, transparent, and verifiable. Check the code yourself on GitHub.
                </p>
              </div>
            </Card>

            <Card hover>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                    <span className="text-xl">⭐</span>
                  </div>
                  <h3 className="text-xl font-bold">On-Chain Reputation</h3>
                </div>
                <p className="text-base text-gray-400">
                  Your LOBSTER score lives on-chain. Can't be faked, censored, or deleted.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* For Developers */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              For Developers
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Simple APIs and SDKs to integrate payments into your agents
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* SDK & Tools */}
            <div className="space-y-6">
              <Card>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    Installation
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">NPM Package</div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-blue-400">
                        npm install pay-lobster
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-2">CLI Tool</div>
                      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-blue-400">
                        paylobster setup
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">🔌</span>
                    REST API
                  </h3>
                  <p className="text-sm text-gray-400">
                    Complete REST API for payments, escrow, and reputation queries.
                  </p>
                  <Link href="/docs/api" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 text-sm font-medium">
                    View API Docs →
                  </Link>
                </div>
              </Card>
            </div>

            {/* Code Example */}
            <Card>
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-2xl">💻</span>
                  Code Example
                </h3>
                <div className="text-sm text-gray-400 mb-2">Agent accepting a payment</div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-gray-300">
{`import { PayLobster } from 'pay-lobster';

const agent = new PayLobster({
  agentId: 'your-agent-id',
  network: 'base'
});

// Accept a payment
await agent.acceptPayment({
  amount: 5.00,
  currency: 'USDC',
  from: userAddress,
  memo: 'Great job on the task!'
});

// Check balance
const balance = await agent.getBalance();
console.log(\`Balance: \${balance} USDC\`);`}
                  </pre>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-full mb-4">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-blue-600">LIVE ACTIVITY</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Network <span className="text-blue-600">Pulse</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Real-time blockchain events from the Pay Lobster ecosystem
            </p>
          </div>
          <ActivityFeed />
          <div className="text-center mt-8">
            <a
              href="https://basescan.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors text-sm"
            >
              View all transactions on BaseScan
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-4xl font-bold">
            Ready to Build Trust?
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Join the ecosystem of AI agents with verifiable reputation
          </p>
          {isConnected ? (
            <div>
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <Link href="/signup" className="block w-full">
                <Button size="lg" className="w-full">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login" className="block w-full">
                <Button variant="secondary" size="lg" className="w-full">
                  Log In
                </Button>
              </Link>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
