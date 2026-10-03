#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const lguConfig = require('../config/lgu.config.json');

async function main() {
  console.log('Creating test transaction...');

  // Find or create a test user
  let user = await prisma.user.findFirst({ where: { email: lguConfig.seedAccounts.residentEmail } });
  if (!user) {
    user = await prisma.user.create({ data: { name: 'Webhook Tester', email: `webhook-tester+${Date.now()}@example.com`, isEmailVerified: true } });
    console.log('Created test user', user.id);
  }

  // Find or create a transaction type
  let type = await prisma.transactionType.findFirst();
  if (!type) {
    type = await prisma.transactionType.create({
      data: {
        code: `TEST_TYPE_${Date.now()}`,
        name: 'Test Type',
        description: 'Auto-generated for webhook test',
        level: 1,
        category: 'Treasurer',
        baseFee: 10.0,
        deliveryFee: 0.0,
        isFixed: true,
        requiredDocs: JSON.stringify([]),
        formSchema: JSON.stringify({}),
        slaDays: 1,
        processorRole: 'TREASURY_STAFF'
      }
    });
    console.log('Created test transaction type', type.id);
  }

  // Create transaction
  const totalAmount = 123.45;
  const tx = await prisma.transaction.create({
    data: {
      userId: user.id,
      typeId: type.id,
      residentSnapshot: {},
      additionalData: {},
      totalAmount: totalAmount,
      status: 'UNPAID'
    }
  });

  console.log('Created transaction', tx.id, 'amount', totalAmount);

  // Prepare simulated payment payload
  const payload = {
    data: {
      id: `pay_sim_${Date.now()}`,
      type: 'payment',
      attributes: {
        status: 'paid',
        amount: Math.round(totalAmount * 100),
        source: { id: `src_sim_${Date.now()}`, metadata: { transactionId: tx.id } }
      }
    }
  };

  console.log('Sending simulated payment webhook to http://localhost:3000/api/webhooks/paymongo');

  // Use global fetch if available
  const fetchFn = global.fetch || (async (...args) => {
    const nodeFetch = await import('node-fetch').then(m => m.default || m);
    return nodeFetch(...args);
  });

  try {
    const payloadStr = JSON.stringify(payload);
    // compute HMAC signature to mimic PayMongo webhook
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET || '';
    const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
    const ts = Math.floor(Date.now() / 1000);
    const sigHeader = `t=${ts},te=${sig}`;

    const res = await fetchFn('http://localhost:3000/api/webhooks/paymongo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'paymongo-signature': sigHeader },
      body: payloadStr,
    });

    console.log('Webhook POST status', res.status);
    const text = await res.text();
    console.log('Webhook response:', text.slice(0, 200));
  } catch (e) {
    console.error('Failed to POST webhook:', e);
  }

  // Wait a moment for processing
  await new Promise((r) => setTimeout(r, 1500));

  const refreshed = await prisma.transaction.findUnique({ where: { id: tx.id }, include: { payment: true } });
  console.log('Transaction after webhook:', { id: refreshed.id, status: refreshed.status, paymentReference: refreshed.paymentReference });
  console.log('Payment record:', refreshed.payment || null);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
