#!/usr/bin/env node
/**
 * Test script for Webhook Speaker
 *
 * Usage:
 *   node test/test-webhook.js                    # Test with default URL
 *   node test/test-webhook.js https://your-url   # Test with custom URL
 *   WEBHOOK_URL=https://... node test/test-webhook.js
 */

const https = require('https');
const http = require('http');

const WEBHOOK_URL = process.env.WEBHOOK_URL || process.argv[2] || 'http://localhost:8888/.netlify/functions/webhook';

const testCases = [
  {
    name: 'Sale Notification',
    payload: {
      event_type: 'sale',
      amount: 4999,
      customer_name: 'John Doe'
    }
  },
  {
    name: 'New Lead',
    payload: {
      event_type: 'new_lead',
      message: 'New lead from Facebook Ads!'
    }
  },
  {
    name: 'Stripe Payment',
    payload: {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          amount: 12500,
          customer_name: 'Jane Smith'
        }
      }
    }
  },
  {
    name: 'Custom Alert',
    payload: {
      event_type: 'custom',
      message: 'Wake up! The kids just snuck out!',
      sound: 'alarm.mp3'
    }
  },
  {
    name: 'Shopify Order',
    payload: {
      topic: 'shopify.orders.create',
      total_price: '149.99',
      customer: {
        first_name: 'Bob'
      }
    }
  }
];

async function sendWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function pollNotifications(url, key = 'test-key') {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: `${parsedUrl.pathname}?key=${key}`,
      method: 'GET'
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🔊 Webhook Speaker Test Suite');
  console.log('='.repeat(50));
  console.log(`Target: ${WEBHOOK_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    process.stdout.write(`Testing: ${test.name}... `);

    try {
      const result = await sendWebhook(WEBHOOK_URL, test.payload);

      if (result.status === 200 && result.data.success) {
        console.log('✅ PASSED');
        console.log(`   Response: ${JSON.stringify(result.data)}\n`);
        passed++;
      } else {
        console.log('❌ FAILED');
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.data)}\n`);
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`   ${error.message}\n`);
      failed++;
    }
  }

  // Test polling
  console.log('\nTesting notification polling...');
  try {
    const pollResult = await pollNotifications(WEBHOOK_URL, 'test-key');
    console.log(`✅ Poll returned ${pollResult.data.count || 0} notifications`);
    if (pollResult.data.notifications?.length > 0) {
      console.log('   Notifications:', JSON.stringify(pollResult.data.notifications, null, 2));
    }
    passed++;
  } catch (error) {
    console.log('❌ Poll failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
