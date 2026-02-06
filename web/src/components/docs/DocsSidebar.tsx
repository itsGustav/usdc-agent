'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  title: string;
  href: string;
  icon?: string;
}

const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Quick Start', href: '#quick-start', icon: '⚡' },
      { title: 'Installation', href: '#installation', icon: '📦' },
      { title: 'Your First Payment', href: '#first-payment', icon: '💰' },
    ],
  },
  {
    title: 'For Agents',
    items: [
      { title: 'Accept Payments', href: '#accept-payments', icon: '🤖' },
      { title: 'Tips & Donations', href: '#tips-donations', icon: '💝' },
      { title: 'Escrow Services', href: '#escrow', icon: '🔒' },
      { title: 'Building Reputation', href: '#reputation', icon: '⭐' },
    ],
  },
  {
    title: 'For Platforms',
    items: [
      { title: 'Merchant API', href: '#merchant-api', icon: '🏢' },
      { title: 'Payment Links', href: '#payment-links', icon: '🔗' },
      { title: 'Checkout Widget', href: '#checkout-widget', icon: '🛒' },
      { title: 'Subscriptions', href: '#subscriptions', icon: '🔄' },
      { title: 'Webhooks', href: '#webhooks', icon: '🪝' },
    ],
  },
  {
    title: 'Smart Contracts',
    items: [
      { title: 'Architecture', href: '#architecture', icon: '🏗️' },
      { title: 'Identity Registry', href: '#identity', icon: '🆔' },
      { title: 'Reputation Registry', href: '#trust-score', icon: '📊' },
      { title: 'Credit System', href: '#credit-score', icon: '💳' },
      { title: 'Escrow Contract', href: '#escrow-contract', icon: '⚖️' },
    ],
  },
  {
    title: 'SDK Reference',
    items: [
      { title: 'JavaScript SDK', href: '#javascript-sdk', icon: '📚' },
      { title: 'CLI Reference', href: '#cli', icon: '⌨️' },
      { title: 'REST API', href: '#rest-api', icon: '🌐' },
    ],
  },
];

export function DocsSidebar() {
  const [activeSection, setActiveSection] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sections = navigation.flatMap(section => section.items);
      const current = sections.find(item => {
        const element = document.querySelector(item.href);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) {
        setActiveSection(current.href);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const top = element.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-all"
      >
        {isMobileOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-gray-950 border-r border-gray-800 overflow-y-auto transition-transform duration-300",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center text-2xl">
              🦞
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-50">Pay Lobster</h2>
              <p className="text-xs text-gray-500">Documentation</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-6">
            {navigation.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.href);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                          activeSection === item.href
                            ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-600"
                            : "text-gray-400 hover:text-gray-300 hover:bg-gray-900"
                        )}
                      >
                        {item.icon && <span className="text-base">{item.icon}</span>}
                        <span>{item.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer Links */}
          <div className="pt-6 border-t border-gray-800 space-y-2">
            <a
              href="https://github.com/itsGustav/Pay-Lobster"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-900 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
            <a
              href="https://basescan.org/address/0xA174ee274F870631B3c330a85EBCad74120BE662"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-900 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Contracts
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
