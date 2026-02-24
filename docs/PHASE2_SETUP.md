# Phase 2: Google & Microsoft Integration Setup

This guide explains how to configure Google and Microsoft sign-in and assignment import for schools using Google Workspace or Microsoft 365.

---

## 1. Google Sign-In & Classroom Import

### Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Sign-in method**
2. Enable **Google** provider
3. Add your app's domain to **Authorized domains**

### Google Cloud (for Classroom import)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project (can be the same as Firebase)
3. **APIs & Services** → **Library** → enable **Google Classroom API**
4. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: e.g. "Homework Companion"
   - Authorized JavaScript origins: `http://localhost:5173` (dev), your production URL
   - Authorized redirect URIs: (not needed for client-side GSI)
5. Copy the **Client ID** and add to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
   ```

### What works

- **Sign in with Google** (login screen) – uses Firebase; requires Firebase Google provider configured
- **Import from Google Classroom** (Settings) – uses GSI; requires `VITE_GOOGLE_CLIENT_ID` in `.env`

---

## 2. Microsoft Sign-In

### Firebase Configuration

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
   - Name: e.g. "Homework Companion"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: **Single-page application** → `https://your-firebase-app.firebaseapp.com/__/auth/handler` (and your custom domain if used)
2. After creation, note **Application (client) ID**
3. **Authentication** → add redirect URI for localhost: `http://localhost:5173` (or your dev URL)
4. **API permissions** → Add **Microsoft Graph** → **Delegated** → `User.Read`, `openid`, `email`, `profile`
5. Go to [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Sign-in method** → **Microsoft**
   - Enable Microsoft provider
   - Paste **Application (client) ID**
   - Add **Client secret** from Azure (Certificates & secrets)

### Tenant (optional)

For schools using Microsoft 365, you can restrict sign-in to their organization:

```
VITE_MICROSOFT_TENANT_ID=your-school-tenant-id
```

Use `common` (default) to allow any Microsoft account.

---

## 3. Microsoft 365 assignment import (future)

The `microsoftGraph.js` library is ready for Microsoft Education APIs. To add import from Teams/Assignments:

1. Add MSAL.js or similar for Microsoft OAuth in the browser
2. Request scopes: `User.Read`, `EduAssignment.ReadBasic`
3. Use `fetchAllAssignments(accessToken)` from `src/lib/microsoftGraph.js`

---

## Summary

| Feature                   | Requirement                                      |
|---------------------------|--------------------------------------------------|
| Sign in with Google       | Firebase Google provider configured              |
| Sign in with Microsoft    | Firebase Microsoft provider + Azure AD app       |
| Import from Google Classroom | `VITE_GOOGLE_CLIENT_ID` in `.env`            |
