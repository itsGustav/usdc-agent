#!/usr/bin/env node
/**
 * Pay Lobster CLI 🦞
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

const WALLET = '0xf775f0224A680E2915a066e53A389d0335318b7B';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RPC = 'https://mainnet.base.org';

async function getBalance(address) {
  const addr = address || WALLET;
  const data = '0x70a08231' + addr.slice(2).padStart(64, '0');
  
  const response = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: USDC, data }, 'latest']
    })
  });
  
  const result = await response.json();
  const balance = parseInt(result.result || '0', 16) / 1e6;
  return balance.toFixed(2);
}

async function main() {
  console.log('🦞 Pay Lobster CLI\n');

  switch (command) {
    case 'balance':
      const address = args[1] || WALLET;
      console.log(`Checking balance for ${address}...`);
      const balance = await getBalance(address);
      console.log(`\n💰 USDC Balance: $${balance}`);
      console.log(`Network: Base Mainnet`);
      break;

    case 'update':
      console.log('Checking for updates...\n');
      try {
        const current = require('../package.json').version;
        console.log(`Current version: ${current}`);
        
        const latest = execSync('npm view pay-lobster version', { encoding: 'utf8' }).trim();
        console.log(`Latest version:  ${latest}`);
        
        if (current === latest) {
          console.log('\n✅ Already up to date!');
        } else {
          console.log('\n📦 Updating...');
          execSync('npm update pay-lobster -g', { stdio: 'inherit' });
          console.log('\n✅ Updated to v' + latest);
        }
      } catch (e) {
        console.error('Update check failed:', e.message);
      }
      break;

    case 'version':
    case '-v':
    case '--version':
      const pkg = require('../package.json');
      console.log(`v${pkg.version}`);
      break;

    case 'help':
    case '-h':
    case '--help':
    default:
      console.log('Usage: pay-lobster <command> [options]\n');
      console.log('Commands:');
      console.log('  balance [address]  Check USDC balance');
      console.log('  update             Update to latest version');
      console.log('  version            Show version');
      console.log('  help               Show this help');
      console.log('\nExamples:');
      console.log('  pay-lobster balance');
      console.log('  pay-lobster balance 0x1234...');
      console.log('  pay-lobster update');
      console.log('\nDocs: https://paylobster.com/docs');
      break;
  }
}

main().catch(console.error);
