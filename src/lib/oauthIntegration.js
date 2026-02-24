/**
 * OAuth helpers for Google and Microsoft sign-in.
 * Used for: (1) Auth screen "Sign in with Google/Microsoft", (2) Google Classroom import.
 *
 * Firebase handles provider sign-in; this module provides:
 * - getGoogleClassroomToken(): One-time OAuth for Classroom API (works even without Firebase)
 */

const GSI_URL = 'https://accounts.google.com/gsi/client';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Get a Google OAuth token with Classroom scopes for one-time API use.
 * Requires VITE_GOOGLE_CLIENT_ID in .env (from Google Cloud Console).
 * @returns {Promise<string|null>} Access token or null if user cancelled or config missing
 */
export async function getGoogleClassroomToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID not set. Add to .env for Google Classroom import.');
    return null;
  }
  try {
    await loadScript(GSI_URL);
  } catch (e) {
    console.warn('Google Identity Services script failed to load:', e?.message);
    return null;
  }
  if (!window.google?.accounts?.oauth2) {
    console.warn('Google Identity Services failed to load');
    return null;
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 60000);
    const done = (token) => {
      clearTimeout(timeout);
      resolve(token);
    };
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.coursework.students.readonly',
      callback: (response) => {
        if (response?.error) done(null);
        else done(response?.access_token || null);
      },
      error_callback: () => done(null),
    });
    try {
      client.requestAccessToken();
    } catch (e) {
      done(null);
    }
  });
}
