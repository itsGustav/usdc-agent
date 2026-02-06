'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'api-keys' | 'payment-links' | 'payments'>('overview');
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({
    amount: '',
    description: '',
    redirect_url: '',
  });
  
  // Registration form
  const [registerForm, setRegisterForm] = useState({
    name: '',
    website: '',
    webhook_url: '',
    wallet_address: '',
  });
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    
    try {
      const response = await fetch('/api/v1/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Registration failed');
        return;
      }
      
      const data = await response.json();
      setMerchantData(data);
      alert('Merchant registered successfully! Save your API secret - it will only be shown once.');
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register merchant');
    } finally {
      setIsRegistering(false);
    }
  };
  
  const handleCreatePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantData?.api_secret) {
      alert('Please register as a merchant first');
      return;
    }
    
    try {
      const response = await fetch('/api/v1/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantData.api_secret}`,
        },
        body: JSON.stringify({
          amount: parseFloat(newLinkForm.amount),
          description: newLinkForm.description,
          redirect_url: newLinkForm.redirect_url,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create payment link');
        return;
      }
      
      const data = await response.json();
      alert(`Payment link created!\n\nURL: ${data.url}\n\nShare this link with your customers.`);
      
      // Reset form
      setNewLinkForm({
        amount: '',
        description: '',
        redirect_url: '',
      });
    } catch (error) {
      console.error('Create link error:', error);
      alert('Failed to create payment link');
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };
  
  // If not registered, show registration form
  if (!merchantData) {
    return (
      <div className="min-h-screen bg-gray-950 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-50 mb-2">Merchant Dashboard</h1>
            <p className="text-gray-400">Accept USDC payments with Pay Lobster</p>
          </div>
          
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-50 mb-6">Register as Merchant</h2>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={registerForm.website}
                  onChange={(e) => setRegisterForm({ ...registerForm, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={registerForm.webhook_url}
                  onChange={(e) => setRegisterForm({ ...registerForm, webhook_url: e.target.value })}
                  placeholder="https://example.com/webhooks/paylobster"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll send payment notifications to this URL
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Settlement Wallet Address
                </label>
                <input
                  type="text"
                  value={registerForm.wallet_address}
                  onChange={(e) => setRegisterForm({ ...registerForm, wallet_address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  USDC payments will be sent directly to this address
                </p>
              </div>
              
              <Button
                type="submit"
                isLoading={isRegistering}
                className="w-full"
                size="lg"
              >
                Register Merchant Account
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }
  
  // Merchant dashboard
  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-50 mb-2">Merchant Dashboard</h1>
          <p className="text-gray-400">Manage your Pay Lobster integration</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {(['overview', 'api-keys', 'payment-links', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-gray-400 text-sm mb-2">Total Volume</p>
              <p className="text-3xl font-bold text-gray-50">$0.00</p>
              <p className="text-gray-500 text-sm mt-1">USDC</p>
            </Card>
            
            <Card className="p-6">
              <p className="text-gray-400 text-sm mb-2">Total Payments</p>
              <p className="text-3xl font-bold text-gray-50">0</p>
              <p className="text-gray-500 text-sm mt-1">All time</p>
            </Card>
            
            <Card className="p-6">
              <p className="text-gray-400 text-sm mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-gray-50">100%</p>
              <p className="text-gray-500 text-sm mt-1">Last 30 days</p>
            </Card>
          </div>
        )}
        
        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-50 mb-6">API Keys</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Merchant ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={merchantData.merchant_id}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => copyToClipboard(merchantData.merchant_id)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Public Key (pk_live_...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={merchantData.api_key}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => copyToClipboard(merchantData.api_key)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Safe to use in client-side code
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Secret Key (sk_live_...)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiSecret ? 'text' : 'password'}
                    value={merchantData.api_secret}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => copyToClipboard(merchantData.api_secret)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ Keep this secret! Never expose in client-side code.
                </p>
              </div>
            </div>
            
            {/* Integration code examples */}
            <div className="mt-8 pt-8 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-gray-50 mb-4">Quick Start</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Create a payment link (Node.js):</p>
                  <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
                    <code className="text-gray-300">{`const response = await fetch('https://paylobster.com/api/v1/payment-links', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${merchantData.api_secret}'
  },
  body: JSON.stringify({
    amount: 10.00,
    description: 'Premium Subscription',
    redirect_url: 'https://yoursite.com/success'
  })
});

const { url } = await response.json();
console.log('Payment URL:', url);`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Payment Links Tab */}
        {activeTab === 'payment-links' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-50 mb-6">Create Payment Link</h2>
              
              <form onSubmit={handleCreatePaymentLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newLinkForm.amount}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, amount: e.target.value })}
                    placeholder="10.00"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newLinkForm.description}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, description: e.target.value })}
                    placeholder="What is this payment for?"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Redirect URL (after payment)
                  </label>
                  <input
                    type="url"
                    value={newLinkForm.redirect_url}
                    onChange={(e) => setNewLinkForm({ ...newLinkForm, redirect_url: e.target.value })}
                    placeholder="https://yoursite.com/success"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-50 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" size="lg">
                  Create Payment Link
                </Button>
              </form>
            </Card>
            
            <Card className="p-8">
              <h3 className="text-xl font-bold text-gray-50 mb-4">Recent Payment Links</h3>
              <p className="text-gray-400 text-center py-8">No payment links yet. Create one above!</p>
            </Card>
          </div>
        )}
        
        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-50 mb-6">Recent Payments</h2>
            <p className="text-gray-400 text-center py-8">No payments yet. Share your payment links to start receiving payments!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
