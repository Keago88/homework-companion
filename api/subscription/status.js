/**
 * Get subscription status for a user.
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!base || !key) {
      return res.status(200).json({ plan: 'free' });
    }

    const url = `${base}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=plan`;
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!r.ok) {
      return res.status(200).json({ plan: 'free' });
    }

    const rows = await r.json();
    const plan = rows[0]?.plan === 'pro' ? 'pro' : 'free';
    return res.status(200).json({ plan });
  } catch (err) {
    console.error('Status error:', err);
    return res.status(200).json({ plan: 'free' });
  }
}
