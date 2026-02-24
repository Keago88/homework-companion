/**
 * Paygate checkout – creates a transaction and returns capture_url for payment.
 * Deploy to Vercel: this becomes POST /api/subscription/checkout
 *
 * Env vars: PAYGATE_CLIENT_ID, PAYGATE_CLIENT_SECRET, PAYGATE_APP_ID,
 *           SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const PAYGATE_API = process.env.PAYGATE_API_URL || 'https://api.paygate.africa';
const PRO_PRICE = 15;
const PRO_CURRENCY = process.env.PAYGATE_CURRENCY || 'USD';

async function getPaygateToken() {
  const auth = Buffer.from(
    `${process.env.PAYGATE_CLIENT_ID}:${process.env.PAYGATE_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch(`${PAYGATE_API}/auth/connect/application`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      app_id: process.env.PAYGATE_APP_ID,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paygate auth failed: ${text}`);
  }
  const data = await res.json();
  return data.connect_token;
}

async function createTransaction(token, userId, email) {
  const orderRef = `hwc-${userId}-${Date.now()}`;
  const res = await fetch(`${PAYGATE_API}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      app_id: process.env.PAYGATE_APP_ID,
    },
    body: JSON.stringify({
      amount: String(PRO_PRICE),
      currency: PRO_CURRENCY,
      payment_options: 'instant',
      order_ref: orderRef,
      items: 1,
      cart: [{
        product_name: 'Homework Companion Pro',
        product_code: 'HWC-PRO',
        quantity: 1,
        price: String(PRO_PRICE),
        total: String(PRO_PRICE),
        description: 'Pro subscription: Advanced Stats, 15 GB Storage, Priority Support',
      }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paygate transaction failed: ${text}`);
  }
  return res.json();
}

async function savePendingSubscription(transactionId, userId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/pending_subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      transaction_id: transactionId,
      user_id: userId,
      created_at: new Date().toISOString(),
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, plan } = req.body || {};
    if (!userId || plan !== 'pro') {
      return res.status(400).json({ error: 'userId and plan required' });
    }

    const clientId = process.env.PAYGATE_CLIENT_ID;
    const clientSecret = process.env.PAYGATE_CLIENT_SECRET;
    const appId = process.env.PAYGATE_APP_ID;

    if (!clientId || !clientSecret || !appId) {
      return res.status(500).json({
        error: 'Paygate not configured. Set PAYGATE_CLIENT_ID, PAYGATE_CLIENT_SECRET, PAYGATE_APP_ID',
      });
    }

    const token = await getPaygateToken();
    const txn = await createTransaction(token, userId, email);

    await savePendingSubscription(txn.transaction_id, userId);

    return res.status(200).json({
      ok: true,
      capture_url: txn.capture_url,
      transaction_id: txn.transaction_id,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
}
