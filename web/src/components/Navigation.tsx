'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { useAuth } from '@/contexts/AuthContext';

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((mod) => mod.ConnectButton),
  { ssr: false, loading: () => <div className="h-10 w-32 bg-gray-800 rounded-lg animate-pulse" /> }
);

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/discover', label: 'Discover' },
  { href: '/escrow', label: 'Escrow' },
  { href: '/docs', label: 'Docs' },
];

export function Navigation() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { user, loading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/blue-lobster.svg" alt="Pay Lobster" className="w-8 h-8" />
            <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Pay Lobster
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Auth & Wallet */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {isConnected && (
                  <span className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Wallet Connected
                  </span>
                )}
                <ConnectButton 
                  showBalance={false}
                  chainStatus="icon"
                  accountStatus={{
                    smallScreen: 'avatar',
                    largeScreen: 'full',
                  }}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
