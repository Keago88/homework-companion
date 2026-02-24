/**
 * Subscription service – works with your backend API (Paygate + DB).
 * In demo mode (no API URL), uses localStorage for testing.
 */

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUBSCRIPTION_API_URL
  ? import.meta.env.VITE_SUBSCRIPTION_API_URL.replace(/\/$/, '')
  : null;

const DEMO_SUB_KEY = 'homework_companion_subscription';

export const isSubscriptionApiConfigured = () => !!API_BASE;

export async function getSubscriptionStatus(userId) {
  if (!userId) return { plan: 'free' };
  if (!API_BASE) {
    try {
      const raw = localStorage.getItem(DEMO_SUB_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return { plan: data?.plan === 'pro' ? 'pro' : 'free' };
    } catch {
      return { plan: 'free' };
    }
  }
  try {
    const res = await fetch(`${API_BASE}/subscription/status?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    return { plan: data.plan || 'free' };
  } catch (err) {
    console.warn('Subscription status fetch failed:', err);
    return { plan: 'free' };
  }
}

export async function initiateProCheckout(userId, email) {
  if (!API_BASE) {
    // Demo mode: grant Pro in localStorage
    try {
      localStorage.setItem(DEMO_SUB_KEY, JSON.stringify({ plan: 'pro' }));
      return { ok: true, demo: true };
    } catch {
      return { ok: false, error: 'Demo storage failed' };
    }
  }
  try {
    const res = await fetch(`${API_BASE}/subscription/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, plan: 'pro' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    return data;
  } catch (err) {
    console.error('Checkout failed:', err);
    return { ok: false, error: err.message };
  }
}

export async function verifyPayment(transactionId, userId) {
  if (!API_BASE) return { ok: true, plan: 'pro' };
  try {
    const res = await fetch(`${API_BASE}/subscription/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
  } catch (err) {
    console.error('Verify failed:', err);
    return { ok: false, error: err.message };
  }
}
