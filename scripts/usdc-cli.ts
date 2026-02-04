#!/usr/bin/env npx ts-node
/**
 * Lobster Pay CLI
 * 
 * Command-line interface for USDC operations via Circle Programmable Wallets.
 * 
 * Usage:
 *   npx ts-node usdc-cli.ts balance
 *   npx ts-node usdc-cli.ts send 10 to 0x1234...
 *   npx ts-node usdc-cli.ts receive
 *   npx ts-node usdc-cli.ts bridge 25 from ETH to MATIC
 */

import { CircleClient, CHAIN_NAMES, USDC_TOKENS } from '../lib/circle-client';
import EscrowManager from '../lib/escrow';
import { listTemplates, listTemplatesByVertical, getVerticals, type EscrowVertical } from '../lib/escrow-templates';
import { ConditionBuilder } from '../lib/condition-builder';

// Load config from environment or Clawdbot config
function loadConfig(): { apiKey: string; entitySecret: string } {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error('❌ Missing Circle credentials.');
    console.error('Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET environment variables.');
    console.error('Get credentials at: https://console.circle.com');
    process.exit(1);
  }

  return { apiKey, entitySecret };
}

// Initialize client
function getClient(): CircleClient {
  const config = loadConfig();
  return new CircleClient(config);
}

// Commands
async function balance() {
  console.log('💰 Checking USDC balances...\n');
  
  const client = getClient();
  const balances = await client.getAllUSDCBalances();

  if (balances.length === 0) {
    console.log('No wallets found. Create one first with: usdc-cli setup');
    return;
  }

  let total = 0;
  for (const { wallet, balance, chain } of balances) {
    const amt = parseFloat(balance);
    total += amt;
    console.log(`  ${CHAIN_NAMES[chain] || chain}: ${CircleClient.formatUSDC(balance)}`);
    console.log(`    Address: ${wallet.address}`);
  }

  console.log(`\n📊 Total: ${CircleClient.formatUSDC(total.toString())}`);
}

async function send(args: string[]) {
  // Parse: send <amount> to <address> [on <chain>]
  const amountIdx = args.indexOf('send') + 1;
  const toIdx = args.indexOf('to');
  const onIdx = args.indexOf('on');

  if (toIdx === -1 || amountIdx >= args.length) {
    console.error('Usage: usdc-cli send <amount> to <address> [on <chain>]');
    process.exit(1);
  }

  const amount = args[amountIdx];
  const toAddress = args[toIdx + 1];
  const chain = onIdx !== -1 ? args[onIdx + 1]?.toUpperCase() : undefined;

  if (!CircleClient.isValidAddress(toAddress)) {
    console.error('❌ Invalid address format');
    process.exit(1);
  }

  console.log(`📤 Sending ${amount} USDC to ${toAddress}...`);

  const client = getClient();
  
  // Get first wallet (or filter by chain)
  const wallets = await client.listWallets();
  const wallet = chain 
    ? wallets.find(w => w.blockchain.includes(chain))
    : wallets[0];

  if (!wallet) {
    console.error('❌ No wallet found for the specified chain');
    process.exit(1);
  }

  const tx = await client.sendUSDC({
    fromWalletId: wallet.id,
    toAddress,
    amount,
  });

  console.log('\n✅ Transaction submitted!');
  console.log(`  Amount: ${CircleClient.formatUSDC(amount)}`);
  console.log(`  To: ${toAddress}`);
  console.log(`  Network: ${CHAIN_NAMES[wallet.blockchain] || wallet.blockchain}`);
  console.log(`  TX ID: ${tx.id}`);
  console.log(`  Status: ${tx.state}`);
  
  if (tx.txHash) {
    console.log(`  TX Hash: ${tx.txHash}`);
  }
}

async function receive() {
  console.log('📥 Your USDC receiving addresses:\n');

  const client = getClient();
  const wallets = await client.listWallets();

  if (wallets.length === 0) {
    console.log('No wallets found. Create one first with: usdc-cli setup');
    return;
  }

  for (const wallet of wallets) {
    const chainName = CHAIN_NAMES[wallet.blockchain] || wallet.blockchain;
    console.log(`  ${chainName}:`);
    console.log(`    ${wallet.address}`);
  }

  console.log('\n💡 Send USDC on any supported network to receive funds.');
}

async function bridge(args: string[]) {
  // Parse: bridge <amount> from <chain> to <chain>
  const amountIdx = args.indexOf('bridge') + 1;
  const fromIdx = args.indexOf('from');
  const toIdx = args.indexOf('to');

  if (fromIdx === -1 || toIdx === -1 || amountIdx >= args.length) {
    console.error('Usage: usdc-cli bridge <amount> from <chain> to <chain>');
    console.error('Example: usdc-cli bridge 25 from ETH to MATIC');
    process.exit(1);
  }

  const amount = args[amountIdx];
  const fromChain = normalizeChain(args[fromIdx + 1]);
  const toChain = normalizeChain(args[toIdx + 1]);

  console.log(`🌉 Bridging ${amount} USDC from ${CHAIN_NAMES[fromChain]} to ${CHAIN_NAMES[toChain]}...`);

  const client = getClient();
  const wallets = await client.listWallets();
  
  const sourceWallet = wallets.find(w => w.blockchain === fromChain);
  const destWallet = wallets.find(w => w.blockchain === toChain);

  if (!sourceWallet) {
    console.error(`❌ No wallet found for ${fromChain}`);
    process.exit(1);
  }

  const destAddress = destWallet?.address || sourceWallet.address;

  const tx = await client.bridgeUSDC({
    fromWalletId: sourceWallet.id,
    toAddress: destAddress,
    fromChain,
    toChain,
    amount,
  });

  console.log('\n✅ Bridge transfer initiated!');
  console.log(`  Amount: ${CircleClient.formatUSDC(amount)}`);
  console.log(`  From: ${CHAIN_NAMES[fromChain]}`);
  console.log(`  To: ${CHAIN_NAMES[toChain]}`);
  console.log(`  TX ID: ${tx.id}`);
  console.log(`  Est. time: ~15-20 minutes`);
}

async function history() {
  console.log('📜 Recent transactions:\n');

  const client = getClient();
  const transactions = await client.listTransactions();

  if (transactions.length === 0) {
    console.log('No transactions found.');
    return;
  }

  for (const tx of transactions.slice(0, 10)) {
    const direction = tx.amounts[0]?.startsWith('-') ? '📤' : '📥';
    console.log(`${direction} ${tx.amounts.join(', ')} USDC`);
    console.log(`   ${tx.sourceAddress} → ${tx.destinationAddress}`);
    console.log(`   Status: ${tx.state} | ${tx.createDate}`);
    if (tx.txHash) console.log(`   Hash: ${tx.txHash}`);
    console.log();
  }
}

async function setup() {
  console.log('🔧 Setting up USDC wallets...\n');

  const client = getClient();

  // Create wallet set
  console.log('Creating wallet set...');
  const walletSet = await client.createWalletSet('Clawdbot USDC Wallets');
  console.log(`  ✓ Wallet Set ID: ${walletSet.id}`);

  // Create wallets on multiple chains
  const chains = ['ETH-SEPOLIA', 'MATIC-AMOY', 'AVAX-FUJI'];
  console.log('\nCreating wallets...');
  
  const wallets = await client.createWallets(walletSet.id, chains, 1);
  
  for (const wallet of wallets) {
    console.log(`  ✓ ${CHAIN_NAMES[wallet.blockchain]}: ${wallet.address}`);
  }

  console.log('\n✅ Setup complete!');
  console.log('\n💡 Get testnet USDC from: https://console.circle.com/faucets');
}

async function wallets() {
  console.log('👛 Managed wallets:\n');

  const client = getClient();
  const walletList = await client.listWallets();

  if (walletList.length === 0) {
    console.log('No wallets found. Run: usdc-cli setup');
    return;
  }

  for (const wallet of walletList) {
    console.log(`  ${CHAIN_NAMES[wallet.blockchain] || wallet.blockchain}`);
    console.log(`    ID: ${wallet.id}`);
    console.log(`    Address: ${wallet.address}`);
    console.log(`    State: ${wallet.state}`);
    console.log();
  }
}

function normalizeChain(input: string): string {
  const map: Record<string, string> = {
    'eth': 'ETH-SEPOLIA',
    'ethereum': 'ETH-SEPOLIA',
    'matic': 'MATIC-AMOY',
    'polygon': 'MATIC-AMOY',
    'avax': 'AVAX-FUJI',
    'avalanche': 'AVAX-FUJI',
    'arb': 'ARB-SEPOLIA',
    'arbitrum': 'ARB-SEPOLIA',
  };
  return map[input.toLowerCase()] || input.toUpperCase();
}

async function x402Pay(args: string[]) {
  // x402 pay <url>
  const urlIdx = args.indexOf('pay') + 1;
  if (urlIdx >= args.length) {
    console.error('Usage: usdc-cli x402 pay <url>');
    process.exit(1);
  }

  const url = args[urlIdx];

  console.log(`💳 Fetching payment challenge from ${url}...`);

  try {
    // First request - get 402 challenge
    const response = await fetch(url);

    if (response.status !== 402) {
      console.log(`✅ No payment required (status: ${response.status})`);
      const data = await response.text();
      console.log(data);
      return;
    }

    const challenge = await response.json();
    const paymentInfo = challenge['x-payment-required'];

    if (!paymentInfo) {
      console.error('❌ Invalid 402 response: missing x-payment-required');
      process.exit(1);
    }

    console.log(`\n💳 Payment Required`);
    console.log(`   Amount: ${paymentInfo.amount} USDC`);
    console.log(`   Description: ${paymentInfo.description}`);
    console.log(`   Receiver: ${paymentInfo.receiver}`);
    console.log(`   Network: ${paymentInfo.network}`);

    console.log(`\nSending payment...`);

    const client = getClient();
    const wallets = await client.listWallets();
    const wallet = wallets.find(w => w.blockchain === paymentInfo.network);

    if (!wallet) {
      console.error(`❌ No wallet found for network ${paymentInfo.network}`);
      process.exit(1);
    }

    const tx = await client.sendUSDC({
      fromWalletId: wallet.id,
      toAddress: paymentInfo.receiver,
      amount: paymentInfo.amount,
    });

    console.log(`✅ Payment sent! TX: ${tx.txHash || tx.id}`);

    // Generate signature (simplified - production would use facilitator)
    const signature = `sig_${tx.txHash || tx.id}_${Date.now()}`;

    console.log(`\nRetrying request with payment signature...`);

    const retryResponse = await fetch(url, {
      headers: {
        'x-payment-signature': signature,
      },
    });

    if (retryResponse.ok) {
      console.log(`✅ Success! Response received.\n`);
      const data = await retryResponse.text();
      console.log(data);
    } else {
      console.error(`❌ Request failed: ${retryResponse.status} ${retryResponse.statusText}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function x402Auto(args: string[]) {
  // x402 auto <url-pattern>
  const urlIdx = args.indexOf('auto') + 1;
  if (urlIdx >= args.length) {
    console.error('Usage: usdc-cli x402 auto <url-pattern>');
    process.exit(1);
  }

  const urlPattern = args[urlIdx];

  console.log(`🤖 Auto-pay mode enabled for: ${urlPattern}`);
  console.log(`   Max amount: 1.00 USDC per request`);
  console.log(`   All future requests to this pattern will auto-pay.`);
  console.log(`\n   (This is a demo - auto-pay config would be persisted)`);
}

async function x402Receipts() {
  console.log('📄 Recent 402 Payments:\n');
  console.log('─'.repeat(60));

  // Load receipts from x402-client cache
  const { X402Client } = await import('../lib/x402-client');
  const client = new X402Client({
    wallet: getClient(),
  });

  const receipts = await client.getReceiptHistory();

  if (receipts.length === 0) {
    console.log('No payment receipts found.');
    return;
  }

  let totalAmount = 0;
  for (const receipt of receipts.slice(0, 10)) {
    const amount = parseFloat(receipt.challenge.amount);
    totalAmount += amount;

    console.log(`📄 ${receipt.challenge.amount} USDC → ${receipt.url}`);
    console.log(`   ${receipt.challenge.description}`);
    console.log(`   Paid: ${new Date(receipt.paidAt).toLocaleString()}`);
    console.log(`   TX: ${receipt.txHash}`);
    console.log();
  }

  console.log('─'.repeat(60));
  console.log(`Total: ${totalAmount.toFixed(2)} USDC in ${receipts.length} payments`);
}

async function x402Command(args: string[]) {
  const subcommand = args[1]?.toLowerCase();

  switch (subcommand) {
    case 'pay':
      await x402Pay(args);
      break;
    case 'auto':
      await x402Auto(args);
      break;
    case 'receipts':
      await x402Receipts();
      break;
    default:
      console.log(`
x402 Payment Commands:

  usdc-cli x402 pay <url>        Pay for a 402-protected resource
  usdc-cli x402 auto <pattern>   Enable auto-pay for URL pattern
  usdc-cli x402 receipts         Show payment history

Examples:
  usdc-cli x402 pay https://api.example.com/premium
  usdc-cli x402 auto https://api.example.com/*
  usdc-cli x402 receipts
      `);
  }
}

function showHelp() {
  console.log(`
Lobster Pay CLI - Manage USDC via Circle Programmable Wallets

Commands:
  balance              Check USDC balance across all wallets
  send <amt> to <addr> Send USDC to an address
  receive              Show your receiving addresses
  bridge <amt> from <chain> to <chain>
                       Cross-chain transfer via CCTP
  history              Recent transactions
  wallets              List managed wallets
  setup                Create initial wallet set

x402 Payment Commands:
  x402 pay <url>       Pay for a 402-protected resource
  x402 auto <pattern>  Enable auto-pay for URL pattern
  x402 receipts        Show payment history

Escrow Commands (EaaS):
  escrow templates [vertical]    List available escrow templates
  escrow create --template <name> --amount <amt>
                       Create escrow from template
  escrow create --custom --conditions <list>
                       Create custom escrow
  escrow list          List all escrows
  escrow show <id>     Show escrow details
  escrow fund <id>     Fund an escrow
  escrow approve <id>  Approve escrow release
  escrow release <id>  Release funds

Environment:
  CIRCLE_API_KEY       Your Circle API key
  CIRCLE_ENTITY_SECRET Your entity secret

Examples:
  usdc-cli balance
  usdc-cli send 10 to 0x1234...abcd
  usdc-cli bridge 25 from eth to matic
  usdc-cli receive
  usdc-cli x402 pay https://api.example.com/premium

Get credentials: https://console.circle.com
  `);
}

// ============ ESCROW COMMANDS ============

async function escrowCommand(args: string[]) {
  const subCommand = args[1]?.toLowerCase();

  switch (subCommand) {
    case 'templates':
      await escrowTemplates(args);
      break;
    case 'create':
      await escrowCreate(args);
      break;
    case 'list':
      await escrowList();
      break;
    case 'show':
      await escrowShow(args);
      break;
    case 'fund':
      await escrowFund(args);
      break;
    case 'approve':
      await escrowApprove(args);
      break;
    case 'release':
      await escrowRelease(args);
      break;
    default:
      console.log(`
Escrow Commands:

  usdc-cli escrow templates [vertical]   List available escrow templates
  usdc-cli escrow create --template <name> --amount <amt> [options]
                                          Create escrow from template
  usdc-cli escrow create --custom [options]
                                          Create custom escrow
  usdc-cli escrow list                   List all escrows
  usdc-cli escrow show <id>              Show escrow details
  usdc-cli escrow fund <id>              Fund an escrow
  usdc-cli escrow approve <id>           Approve escrow release
  usdc-cli escrow release <id>           Release funds

Examples:
  usdc-cli escrow templates freelance
  usdc-cli escrow create --template project_milestone --amount 1000
  usdc-cli escrow create --custom --conditions "Milestone 1:30%,Milestone 2:70%"
      `);
  }
}

async function escrowTemplates(args: string[]) {
  const vertical = args[2] as EscrowVertical | undefined;

  if (vertical && !getVerticals().includes(vertical)) {
    console.error(`❌ Invalid vertical. Choose from: ${getVerticals().join(', ')}`);
    return;
  }

  const templates = vertical 
    ? listTemplatesByVertical(vertical)
    : listTemplates();

  console.log(`\n📋 Escrow Templates${vertical ? ` (${vertical})` : ''}:\n`);
  
  for (const template of templates) {
    console.log(`  ${template.name}`);
    console.log(`  └─ ${template.description}`);
    console.log(`     Vertical: ${template.vertical}`);
    console.log(`     Parties: ${template.recommendedPartyRoles.join(', ')}`);
    console.log(`     Conditions: ${template.conditions.length}`);
    if (template.autoReleaseDays) {
      console.log(`     Auto-release: ${template.autoReleaseDays} days`);
    }
    console.log();
  }

  console.log(`Total: ${templates.length} templates`);
  console.log(`\nVerticals: ${getVerticals().join(', ')}`);
}

async function escrowCreate(args: string[]) {
  const templateIdx = args.indexOf('--template');
  const customIdx = args.indexOf('--custom');
  const amountIdx = args.indexOf('--amount');
  const chainIdx = args.indexOf('--chain');
  const conditionsIdx = args.indexOf('--conditions');

  if (amountIdx === -1 || amountIdx + 1 >= args.length) {
    console.error('❌ --amount is required');
    return;
  }

  const amount = args[amountIdx + 1];
  const chain = chainIdx !== -1 ? args[chainIdx + 1] : 'polygon';

  const escrowManager = new EscrowManager();

  if (templateIdx !== -1 && templateIdx + 1 < args.length) {
    // Create from template
    const templateName = args[templateIdx + 1];
    
    console.log(`📝 Creating escrow from template: ${templateName}...`);
    
    // For demo, create with placeholder parties
    const escrow = await escrowManager.create({
      template: templateName,
      amount,
      chain,
      parties: [
        { role: 'client', name: 'Client (You)' },
        { role: 'provider', name: 'Provider' },
      ],
    });

    console.log(`✅ Escrow created: ${escrow.id}\n`);
    console.log(escrowManager.formatEscrowSummary(escrow));
    
  } else if (customIdx !== -1) {
    // Create custom escrow
    if (conditionsIdx === -1) {
      console.error('❌ --conditions is required for custom escrows');
      console.error('Format: "Description 1:25%,Description 2:75%"');
      return;
    }

    const conditionsStr = args[conditionsIdx + 1];
    const conditionParts = conditionsStr.split(',');
    
    const conditions = conditionParts.map(part => {
      const [desc, percent] = part.split(':');
      if (percent) {
        return ConditionBuilder.milestone(desc.trim(), parseInt(percent.replace('%', '')));
      }
      return ConditionBuilder.custom(desc.trim());
    });

    console.log(`📝 Creating custom escrow...`);
    
    const escrow = await escrowManager.createCustom({
      amount,
      chain,
      parties: [
        { role: 'depositor', name: 'Depositor (You)' },
        { role: 'recipient', name: 'Recipient' },
      ],
      conditions,
      releaseRequires: 'condition_based',
    });

    console.log(`✅ Escrow created: ${escrow.id}\n`);
    console.log(escrowManager.formatEscrowSummary(escrow));
    
  } else {
    console.error('❌ Specify either --template or --custom');
    console.error('Examples:');
    console.error('  usdc-cli escrow create --template project_milestone --amount 1000');
    console.error('  usdc-cli escrow create --custom --amount 500 --conditions "Task 1:50%,Task 2:50%"');
  }
}

async function escrowList() {
  const escrowManager = new EscrowManager();
  const escrows = await escrowManager.list();

  if (escrows.length === 0) {
    console.log('No escrows found.');
    return;
  }

  console.log(`\n📋 Escrows (${escrows.length}):\n`);
  
  for (const escrow of escrows) {
    const statusEmoji = {
      created: '📝',
      funded: '💰',
      pending_release: '⏳',
      released: '✅',
      refunded: '↩️',
      disputed: '⚠️',
      cancelled: '❌',
    }[escrow.status] || '❓';

    console.log(`  ${statusEmoji} ${escrow.id} - ${escrow.type} - ${escrow.status}`);
    console.log(`     Amount: $${escrow.amount} USDC`);
    console.log(`     Parties: ${escrow.parties.map(p => `${p.role}:${p.name}`).join(', ')}`);
  }
}

async function escrowShow(args: string[]) {
  const escrowId = args[2];
  if (!escrowId) {
    console.error('Usage: usdc-cli escrow show <escrow-id>');
    return;
  }

  const escrowManager = new EscrowManager();
  const escrow = await escrowManager.get(escrowId);

  if (!escrow) {
    console.error(`❌ Escrow ${escrowId} not found`);
    return;
  }

  console.log();
  console.log(escrowManager.formatEscrowSummary(escrow));
}

async function escrowFund(args: string[]) {
  const escrowId = args[2];
  if (!escrowId) {
    console.error('Usage: usdc-cli escrow fund <escrow-id>');
    return;
  }

  console.log(`💰 Funding escrow ${escrowId}...`);
  
  const escrowManager = new EscrowManager();
  const escrow = await escrowManager.get(escrowId);

  if (!escrow) {
    console.error(`❌ Escrow ${escrowId} not found`);
    return;
  }

  // In real implementation, this would trigger USDC transfer
  console.log(`\n📤 Transfer ${escrow.amount} USDC to:`);
  console.log(`   ${escrow.escrowAddress}`);
  console.log(`   Chain: ${escrow.chain}`);
  console.log(`\n⚠️  Demo mode: Marking as funded without actual transfer`);

  await escrowManager.markFunded(escrowId, 'demo-tx-hash', escrow.escrowAddress);
  
  console.log(`✅ Escrow ${escrowId} funded`);
}

async function escrowApprove(args: string[]) {
  const escrowId = args[2];
  if (!escrowId) {
    console.error('Usage: usdc-cli escrow approve <escrow-id>');
    return;
  }

  const escrowManager = new EscrowManager();
  const escrow = await escrowManager.get(escrowId);

  if (!escrow) {
    console.error(`❌ Escrow ${escrowId} not found`);
    return;
  }

  // Demo: approve as first party
  const role = escrow.parties[0].role;
  await escrowManager.approve(escrowId, role);
  
  console.log(`✅ Approved release as ${role}`);
}

async function escrowRelease(args: string[]) {
  const escrowId = args[2];
  if (!escrowId) {
    console.error('Usage: usdc-cli escrow release <escrow-id>');
    return;
  }

  const escrowManager = new EscrowManager();
  const escrow = await escrowManager.get(escrowId);

  if (!escrow) {
    console.error(`❌ Escrow ${escrowId} not found`);
    return;
  }

  console.log(`💸 Releasing funds from escrow ${escrowId}...`);
  console.log(`⚠️  Demo mode: Marking as released without actual transfer`);

  const releaseTo = escrow.parties.find(p => p.role === 'recipient' || p.role === 'provider' || p.role === 'seller');
  if (!releaseTo) {
    console.error('❌ No recipient found');
    return;
  }

  await escrowManager.release(escrowId, releaseTo.walletAddress || '0x0000...demo', 'demo-release-tx', releaseTo.role);
  
  console.log(`✅ Funds released to ${releaseTo.name}`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  try {
    switch (command) {
      case 'balance':
        await balance();
        break;
      case 'send':
        await send(args);
        break;
      case 'receive':
        await receive();
        break;
      case 'bridge':
        await bridge(args);
        break;
      case 'history':
        await history();
        break;
      case 'wallets':
        await wallets();
        break;
      case 'setup':
        await setup();
        break;
      case 'x402':
        await x402Command(args);
        break;
      case 'escrow':
        await escrowCommand(args);
        break;
      case 'help':
      case '--help':
      case '-h':
      default:
        showHelp();
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
