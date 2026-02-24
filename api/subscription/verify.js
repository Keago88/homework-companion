/**
 * Verify Paygate payment and grant Pro.
 * Called when user returns from Paygate payment page.
 *
 * Env vars: PAYGATE_CLIENT_ID, PAYGATE_CLIENT_SECRET, PAYGATE_APP_ID,
 *           SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const PAYGATE_API = process.env.PAYGATE_API_URL || 'https://api.paygate.africa';

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
  if (!res.ok) throw new Error('Paygate auth failed');
  const data = await res.json();
  return data.connect_token;
}

async function getTransactionStatus(token, transactionId) {
  const res = await fetch(`${PAYGATE_API}/transactions/${transactionId}/payment`, {
    headers: {
      Authorization: token,
      app_id: process.env.PAYGATE_APP_ID,
    },
  });
  if (!res.ok) throw new Error('Failed to get transaction status');
  return res.json();
}

async function getUserIdFromPending(transactionId) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  const res = await fetch(
    `${url}/rest/v1/pending_subscriptions?transaction_id=eq.${transactionId}&select=user_id`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.user_id || null;
}

async function grantPro(userId) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return;
  await fetch(`${base}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'resolution=merge-duplicates,on_conflict=user_id',
    },
    body: JSON.stringify({
      user_id: userId,
      plan: 'pro',
      updated_at: new Date().toISOString(),
    }),
  });
}

async function deletePending(transactionId) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return;
  await fetch(
    `${base}/rest/v1/pending_subscriptions?transaction_id=eq.${transactionId}`,
    { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { transactionId, userId: bodyUserId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId required' });
    }

    let userId = bodyUserId;
    if (!userId) {
      userId = await getUserIdFromPending(transactionId);
    }
    if (!userId) {
      return res.status(400).json({ error: 'Could not find user for this transaction' });
    }

    const token = await getPaygateToken();
    const txn = await getTransactionStatus(token, transactionId);
    const status = txn?.payment?.status;

    if (status === 'SUCCESS' || status === 'COMPLETED') {
      await grantPro(userId);
      await deletePending(transactionId);
      return res.status(200).json({ ok: true, plan: 'pro' });
    }

    return res.status(400).json({
      error: 'Payment not completed',
      status: status || 'PENDING',
    });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed' });
  }
}
