/**
 * Cancel Pro subscription for a user.
 * Add your payment provider integration (Paygate, Stripe, etc.) when ready.
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, PAYGATE_* (or your provider)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // TODO: Call your payment provider to cancel the subscription
    // e.g. Paygate: cancel recurring payment
    // e.g. Stripe: stripe.subscriptions.cancel(subscriptionId)

    // TODO: Update Supabase (or your DB) to set plan to 'free'
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (base && key) {
      // Example: update subscription to free
      const updateUrl = `${base}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ plan: 'free' }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Cancel error:', err);
    return res.status(500).json({ error: err.message || 'Cancellation failed' });
  }
}
