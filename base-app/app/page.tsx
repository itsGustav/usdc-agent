"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { CONTRACTS, REPUTATION_ABI, USDC_ABI } from "@/lib/contracts";
import Link from "next/link";
import { Card, ScoreGauge, BottomNav, BalanceCardSkeleton, ScoreGaugeSkeleton, ActivityItemSkeleton, AnimatedNumber } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  // Fetch reputation score
  const { data: reputation, isLoading: isLoadingRep, refetch: refetchRep } = useReadContract({
    address: CONTRACTS.REPUTATION,
    abi: REPUTATION_ABI,
    functionName: "getReputation",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Fetch USDC balance
  const { data: usdcBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const lobsterScore = reputation ? Number(reputation[0]) : 0;
  const balance = usdcBalance ? formatUnits(usdcBalance, 6) : "0";
  const isLoading = isLoadingRep || isLoadingBalance;

  // Pull to refresh functionality
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        if (pullDistance > 100) {
          setIsRefreshing(true);
          refetchRep();
          refetchBalance();
          setTimeout(() => setIsRefreshing(false), 1000);
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [startY, isRefreshing, refetchRep, refetchBalance]);

  // Disconnected state - Beautiful landing
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated orange glow */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(234, 88, 12, 0.25) 0%, rgba(234, 88, 12, 0) 70%)",
            filter: "blur(60px)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <motion.div
          className="text-center max-w-md relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Big animated lobster */}
          <motion.div
            className="text-[120px] mb-6 filter drop-shadow-[0_0_40px_rgba(234,88,12,0.4)]"
            animate={{ 
              rotate: [0, -5, 5, 0],
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              repeatDelay: 2,
              ease: "easeInOut" 
            }}
          >
            🦞
          </motion.div>

          <motion.h1 
            className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white via-orange-100 to-orange-200 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Pay Lobster
          </motion.h1>

          <motion.p 
            className="text-xl text-neutral-400 mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Secure USDC payments with<br />
            <span className="text-orange-500 font-semibold">trust scores</span> on Base
          </motion.p>

          {/* Features pills */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            {["🔒 Escrow", "⭐ Trust Scores", "⚡ Instant"].map((feature, i) => (
              <span 
                key={feature}
                className="px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-300"
              >
                {feature}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="[&_button]:!bg-orange-600 [&_button]:!text-white [&_button]:!font-semibold [&_button]:!px-8 [&_button]:!py-4 [&_button]:!rounded-xl [&_button]:!text-lg [&_button]:hover:!bg-orange-500 [&_button]:!transition-all [&_button]:!shadow-lg [&_button]:!shadow-orange-600/30"
          >
            <ConnectWallet />
          </motion.div>

          <motion.p
            className="mt-6 text-sm text-neutral-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            Built on Base • Powered by USDC
          </motion.p>
        </motion.div>
      </main>
    );
  }

  // Connected state - Dashboard
  return (
    <main className="min-h-screen bg-neutral-950 pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦞</span>
            <h1 className="text-xl font-bold">Pay Lobster</h1>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-neutral-800 rounded-full px-4 py-2 text-sm text-neutral-300 flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                🦞
              </motion.span>
              Refreshing...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="max-w-2xl mx-auto px-6 py-8 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* USDC Balance - Big and Bold */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden">
            {isLoading ? (
              <BalanceCardSkeleton />
            ) : (
              <motion.div
                className="p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Gradient glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-orange-600/5 to-transparent -z-10" />
                
                <div className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">USDC Balance</div>
                <div className="text-7xl font-bold font-mono tabular-nums text-white mb-2">
                  $<AnimatedNumber value={parseFloat(balance)} decimals={2} />
                </div>
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm">on Base</span>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* LOBSTER Score Gauge */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden">
            {isLoading ? (
              <ScoreGaugeSkeleton />
            ) : (
              <div className="p-8">
                <ScoreGauge score={lobsterScore} maxScore={1000} label="LOBSTER Score" size="lg" />
              </div>
            )}
          </Card>
        </motion.div>

        {/* Two Big Action Buttons */}
        <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
          <Link href="/send" className="block">
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-8 hover:border-orange-600/50 transition-all cursor-pointer h-full shadow-xl hover:shadow-orange-600/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <motion.div
                    className="text-5xl"
                    whileHover={{ rotate: [-5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    💸
                  </motion.div>
                  <div className="font-bold text-xl">Send</div>
                  <div className="text-sm text-neutral-500">Transfer USDC</div>
                </div>
              </Card>
            </motion.div>
          </Link>

          <Link href="/escrow" className="block">
            <motion.div
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-8 hover:border-orange-600/50 transition-all cursor-pointer h-full shadow-xl hover:shadow-orange-600/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex flex-col items-center gap-4 relative z-10">
                  <motion.div
                    className="text-5xl"
                    whileHover={{ rotate: [5, -5, 0], scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    🔒
                  </motion.div>
                  <div className="font-bold text-xl">Escrow</div>
                  <div className="text-sm text-neutral-500">Secure deals</div>
                </div>
              </Card>
            </motion.div>
          </Link>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Recent Activity</h2>
            <Link href="/history" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
              View all →
            </Link>
          </div>
          <Card className="divide-y divide-neutral-800/50">
            {isLoading ? (
              <>
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
                <ActivityItemSkeleton />
              </>
            ) : (
              <>
                <motion.div
                  className="p-5 hover:bg-neutral-900/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">💸</div>
                      <div>
                        <div className="font-semibold">Sent USDC</div>
                        <div className="text-sm text-neutral-500">2 hours ago</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold text-red-400 text-lg">-$50.00</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-5 hover:bg-neutral-900/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🔒</div>
                      <div>
                        <div className="font-semibold">Escrow Created</div>
                        <div className="text-sm text-neutral-500">1 day ago</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold text-orange-400 text-lg">$100.00</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="p-5 hover:bg-neutral-900/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">✅</div>
                      <div>
                        <div className="font-semibold">Received USDC</div>
                        <div className="text-sm text-neutral-500">2 days ago</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums font-bold text-green-400 text-lg">+$25.00</div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </Card>
        </motion.div>
      </motion.div>

      <BottomNav />
    </main>
  );
}
