#!/usr/bin/env node
/**
 * Test script for Pay Lobster Merchant API
 * 
 * Usage:
 *   node scripts/test-merchant-api.js
 * 
 * Set BASE_URL environment variable to test against different environments:
 *   BASE_URL=http://localhost:3000 node scripts/test-merchant-api.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🦞 Pay Lobster Merchant API Test\n');
console.log(`Testing against: ${BASE_URL}\n`);

let merchantData = null;

async function test(name, fn) {
  try {
    console.log(`\n🧪 ${name}`);
    await fn();
    console.log('   ✅ PASSED');
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    if (error.response) {
      console.log(`   Response: ${JSON.stringify(error.response, null, 2)}`);
    }
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.response = data;
    throw error;
  }
  
  return data;
}

async function main() {
  // Test 1: Register Merchant
  await test('Register Merchant', async () => {
    merchantData = await request('/api/v1/merchants/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Merchant',
        website: 'https://test-merchant.com',
        webhook_url: 'https://webhook.site/test',
        wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      }),
    });
    
    console.log(`   Merchant ID: ${merchantData.merchant_id}`);
    console.log(`   API Key: ${merchantData.api_key}`);
    console.log(`   API Secret: ${merchantData.api_secret.slice(0, 20)}...`);
    
    if (!merchantData.merchant_id || !merchantData.api_key || !merchantData.api_secret) {
      throw new Error('Invalid merchant data');
    }
    
    if (!merchantData.api_key.startsWith('pk_live_')) {
      throw new Error('Invalid API key format');
    }
    
    if (!merchantData.api_secret.startsWith('sk_live_')) {
      throw new Error('Invalid API secret format');
    }
  });
  
  // Test 2: Create Payment Link
  let paymentLink = null;
  await test('Create Payment Link', async () => {
    if (!merchantData) throw new Error('No merchant data');
    
    paymentLink = await request('/api/v1/payment-links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantData.api_secret}`,
      },
      body: JSON.stringify({
        amount: 10.50,
        description: 'Test Payment',
        redirect_url: 'https://example.com/success',
        metadata: {
          test: true,
          order_id: '12345',
        },
      }),
    });
    
    console.log(`   Link ID: ${paymentLink.link_id}`);
    console.log(`   URL: ${paymentLink.url}`);
    
    if (!paymentLink.link_id || !paymentLink.url) {
      throw new Error('Invalid payment link data');
    }
    
    if (!paymentLink.url.includes(paymentLink.link_id)) {
      throw new Error('Payment URL does not contain link ID');
    }
  });
  
  // Test 3: Get Payment Link
  await test('Get Payment Link', async () => {
    if (!paymentLink) throw new Error('No payment link');
    
    const link = await request(`/api/v1/payment-links/${paymentLink.link_id}`);
    
    console.log(`   Status: ${link.status}`);
    console.log(`   Amount: $${link.amount}`);
    console.log(`   Description: ${link.description}`);
    
    if (link.status !== 'active') {
      throw new Error('Payment link should be active');
    }
    
    if (link.amount !== 10.50) {
      throw new Error('Amount mismatch');
    }
  });
  
  // Test 4: Create Charge
  let charge = null;
  await test('Create Charge', async () => {
    if (!merchantData) throw new Error('No merchant data');
    
    charge = await request('/api/v1/charges', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${merchantData.api_secret}`,
      },
      body: JSON.stringify({
        amount: 5.00,
        currency: 'USDC',
        description: 'Test Charge',
        customer_email: 'test@example.com',
        redirect_url: 'https://example.com/success',
      }),
    });
    
    console.log(`   Charge ID: ${charge.charge_id}`);
    console.log(`   Payment URL: ${charge.payment_url}`);
    console.log(`   Status: ${charge.status}`);
    
    if (!charge.charge_id || !charge.payment_url) {
      throw new Error('Invalid charge data');
    }
    
    if (charge.status !== 'pending') {
      throw new Error('Charge should be pending');
    }
  });
  
  // Test 5: Get Charge
  await test('Get Charge', async () => {
    if (!charge || !merchantData) throw new Error('No charge or merchant data');
    
    const chargeData = await request(`/api/v1/charges/${charge.charge_id}`, {
      headers: {
        Authorization: `Bearer ${merchantData.api_secret}`,
      },
    });
    
    console.log(`   Status: ${chargeData.status}`);
    console.log(`   Amount: $${chargeData.amount}`);
    console.log(`   Currency: ${chargeData.currency}`);
    
    if (chargeData.status !== 'pending') {
      throw new Error('Charge should be pending');
    }
    
    if (chargeData.amount !== 5.00) {
      throw new Error('Amount mismatch');
    }
  });
  
  // Test 6: Invalid Authentication
  await test('Invalid Authentication (should fail)', async () => {
    try {
      await request('/api/v1/payment-links', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk_live_invalid_key',
        },
        body: JSON.stringify({
          amount: 1.00,
          description: 'Test',
          redirect_url: 'https://example.com',
        }),
      });
      throw new Error('Should have failed with invalid auth');
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Invalid')) {
        // Expected error
        console.log('   (Expected failure: Invalid credentials)');
      } else {
        throw error;
      }
    }
  });
  
  // Test 7: Invalid Amount
  await test('Invalid Amount (should fail)', async () => {
    if (!merchantData) throw new Error('No merchant data');
    
    try {
      await request('/api/v1/payment-links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${merchantData.api_secret}`,
        },
        body: JSON.stringify({
          amount: -10.00,
          description: 'Test',
          redirect_url: 'https://example.com',
        }),
      });
      throw new Error('Should have failed with negative amount');
    } catch (error) {
      if (error.message.includes('400') || error.message.includes('positive')) {
        console.log('   (Expected failure: Negative amount)');
      } else {
        throw error;
      }
    }
  });
  
  console.log('\n\n✨ All tests completed!\n');
  console.log('📋 Summary:');
  console.log(`   Merchant ID: ${merchantData?.merchant_id || 'N/A'}`);
  console.log(`   API Key: ${merchantData?.api_key || 'N/A'}`);
  console.log(`   Payment Link: ${paymentLink?.url || 'N/A'}`);
  console.log(`   Charge ID: ${charge?.charge_id || 'N/A'}`);
  console.log('\n💡 Tip: Visit the payment link in a browser to test the payment page UI');
}

main().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
