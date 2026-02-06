/**
 * Pay Lobster Checkout Widget
 * Embeddable payment widget for merchants
 * Version: 1.0.0
 */

(function() {
  'use strict';

  const API_BASE = 'https://paylobster.com';
  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const CHAIN_ID = 8453; // Base mainnet

  // Minimal ERC-20 ABI
  const USDC_ABI = [
    {
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      name: 'transfer',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];

  class PayLobsterCheckout {
    constructor() {
      this.initialized = false;
      this.widgets = [];
    }

    async init() {
      if (this.initialized) return;
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initWidgets());
      } else {
        this.initWidgets();
      }
      
      this.initialized = true;
    }

    initWidgets() {
      const containers = document.querySelectorAll('[id^="lobster-pay"]');
      containers.forEach(container => {
        this.createWidget(container);
      });
    }

    createWidget(container) {
      const merchant = container.getAttribute('data-merchant');
      const amount = parseFloat(container.getAttribute('data-amount'));
      const label = container.getAttribute('data-label') || 'Pay with USDC';
      const redirect = container.getAttribute('data-redirect');
      const recipientWallet = container.getAttribute('data-recipient');

      if (!merchant) {
        console.error('PayLobster: data-merchant attribute is required');
        return;
      }

      if (!amount || amount <= 0) {
        console.error('PayLobster: valid data-amount is required');
        return;
      }

      // Create button
      const button = document.createElement('button');
      button.className = 'paylobster-button';
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="9" fill="currentColor"/>
          <path d="M10 5v10M5 10h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>${label}</span>
      `;

      button.addEventListener('click', () => {
        this.openPaymentModal(merchant, amount, label, redirect, recipientWallet);
      });

      container.appendChild(button);
      this.injectStyles();
    }

    injectStyles() {
      if (document.getElementById('paylobster-styles')) return;

      const styles = document.createElement('style');
      styles.id = 'paylobster-styles';
      styles.textContent = `
        .paylobster-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 102, 255, 0.25);
        }

        .paylobster-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.35);
        }

        .paylobster-button:active {
          transform: translateY(0);
        }

        .paylobster-button svg {
          width: 20px;
          height: 20px;
        }

        .paylobster-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 999999;
          animation: fadeIn 0.2s ease;
        }

        .paylobster-modal.active {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .paylobster-modal-content {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .paylobster-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .paylobster-modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .paylobster-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .paylobster-modal-close:hover {
          background: #f0f0f0;
        }

        .paylobster-payment-details {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .paylobster-detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .paylobster-detail-row:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
          font-weight: 600;
        }

        .paylobster-detail-label {
          color: #666;
          font-size: 14px;
        }

        .paylobster-detail-value {
          color: #1a1a1a;
          font-weight: 600;
          font-size: 14px;
        }

        .paylobster-connect-btn, .paylobster-pay-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .paylobster-connect-btn:hover, .paylobster-pay-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.35);
        }

        .paylobster-connect-btn:disabled, .paylobster-pay-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .paylobster-error {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .paylobster-success {
          background: #efe;
          color: #3c3;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .paylobster-loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        .paylobster-spinner {
          border: 3px solid #f0f0f0;
          border-top: 3px solid #0066FF;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styles);
    }

    async openPaymentModal(merchant, amount, label, redirect, recipientWallet) {
      // Create modal
      const modal = document.createElement('div');
      modal.className = 'paylobster-modal';
      modal.innerHTML = `
        <div class="paylobster-modal-content">
          <div class="paylobster-modal-header">
            <h2 class="paylobster-modal-title">Pay with USDC</h2>
            <button class="paylobster-modal-close">&times;</button>
          </div>
          <div class="paylobster-payment-details">
            <div class="paylobster-detail-row">
              <span class="paylobster-detail-label">Item</span>
              <span class="paylobster-detail-value">${label}</span>
            </div>
            <div class="paylobster-detail-row">
              <span class="paylobster-detail-label">Amount</span>
              <span class="paylobster-detail-value">$${amount.toFixed(2)} USDC</span>
            </div>
          </div>
          <div id="paylobster-payment-content">
            <button class="paylobster-connect-btn">Connect Wallet</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('active'), 10);

      // Close button
      modal.querySelector('.paylobster-modal-close').addEventListener('click', () => {
        this.closeModal(modal);
      });

      // Click outside to close
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });

      // Connect wallet button
      const connectBtn = modal.querySelector('.paylobster-connect-btn');
      connectBtn.addEventListener('click', async () => {
        await this.handlePayment(modal, merchant, amount, label, redirect, recipientWallet);
      });
    }

    async handlePayment(modal, merchant, amount, label, redirect, recipientWallet) {
      const content = modal.querySelector('#paylobster-payment-content');

      try {
        // Check for Web3 provider
        if (!window.ethereum) {
          this.showError(content, 'No Web3 wallet detected. Please install MetaMask or Coinbase Wallet.');
          return;
        }

        this.showLoading(content, 'Connecting wallet...');

        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const userAddress = accounts[0];

        // Check network
        const chainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        if (parseInt(chainId, 16) !== CHAIN_ID) {
          this.showError(content, 'Please switch to Base network');
          return;
        }

        // Get merchant wallet from API
        this.showLoading(content, 'Loading payment details...');
        const merchantWallet = recipientWallet || await this.getMerchantWallet(merchant);

        if (!merchantWallet) {
          this.showError(content, 'Invalid merchant configuration');
          return;
        }

        // Check USDC balance
        this.showLoading(content, 'Checking balance...');
        const balance = await this.getUSDCBalance(userAddress);
        const amountWei = BigInt(Math.floor(amount * 1000000)); // USDC has 6 decimals

        if (balance < amountWei) {
          this.showError(content, `Insufficient USDC balance. You have $${(Number(balance) / 1000000).toFixed(2)} USDC`);
          return;
        }

        // Execute payment
        this.showLoading(content, 'Processing payment...');
        const txHash = await this.executeUSDCTransfer(userAddress, merchantWallet, amountWei);

        // Record charge
        await this.recordCharge(merchant, {
          amount,
          from: userAddress,
          to: merchantWallet,
          transactionHash: txHash,
          label,
        });

        // Show success
        this.showSuccess(content, 'Payment successful!');

        // Redirect after delay
        if (redirect) {
          setTimeout(() => {
            window.location.href = redirect;
          }, 2000);
        } else {
          setTimeout(() => {
            this.closeModal(modal);
          }, 3000);
        }

      } catch (error) {
        console.error('Payment error:', error);
        this.showError(content, error.message || 'Payment failed. Please try again.');
      }
    }

    async getMerchantWallet(merchantKey) {
      try {
        const response = await fetch(`${API_BASE}/api/v1/widget/merchant?key=${merchantKey}`);
        if (!response.ok) throw new Error('Failed to fetch merchant details');
        const data = await response.json();
        return data.wallet;
      } catch (error) {
        console.error('Error fetching merchant:', error);
        return null;
      }
    }

    async getUSDCBalance(address) {
      const data = this.encodeABI('balanceOf', ['address'], [address]);
      
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [{
          to: USDC_ADDRESS,
          data,
        }, 'latest'],
      });

      return BigInt(result);
    }

    async executeUSDCTransfer(from, to, amount) {
      const data = this.encodeABI('transfer', ['address', 'uint256'], [to, amount.toString()]);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: USDC_ADDRESS,
          data,
          value: '0x0',
        }],
      });

      return txHash;
    }

    async recordCharge(merchantKey, chargeData) {
      try {
        await fetch(`${API_BASE}/api/v1/widget/charge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchantKey,
            ...chargeData,
          }),
        });
      } catch (error) {
        console.error('Error recording charge:', error);
      }
    }

    encodeABI(functionName, types, values) {
      // Simple ABI encoding for common functions
      const signatures = {
        'balanceOf': '0x70a08231',
        'transfer': '0xa9059cbb',
      };

      const signature = signatures[functionName];
      if (!signature) throw new Error(`Unknown function: ${functionName}`);

      let params = '';
      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const value = values[i];

        if (type === 'address') {
          params += value.replace('0x', '').padStart(64, '0');
        } else if (type === 'uint256') {
          params += BigInt(value).toString(16).padStart(64, '0');
        }
      }

      return signature + params;
    }

    showLoading(container, message) {
      container.innerHTML = `
        <div class="paylobster-loading">
          <div class="paylobster-spinner"></div>
          <div>${message}</div>
        </div>
      `;
    }

    showError(container, message) {
      container.innerHTML = `
        <div class="paylobster-error">${message}</div>
        <button class="paylobster-connect-btn">Try Again</button>
      `;

      container.querySelector('.paylobster-connect-btn').addEventListener('click', () => {
        location.reload();
      });
    }

    showSuccess(container, message) {
      container.innerHTML = `
        <div class="paylobster-success">${message}</div>
      `;
    }

    closeModal(modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.remove();
      }, 200);
    }
  }

  // Initialize checkout
  const checkout = new PayLobsterCheckout();
  checkout.init();

  // Expose global API
  window.PayLobster = {
    refresh: () => checkout.initWidgets(),
  };
})();
