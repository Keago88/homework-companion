# Pro Subscription Setup (Paygate + DB)

This guide walks you through setting up paid Pro subscriptions for Homework Companion.

## Overview

- **Payment**: Paygate.Africa (https://api.paygate.africa)
- **Database**: Supabase (free tier) – or swap to Firebase Firestore
- **Deployment**: Vercel (serverless API)

---

## 1. Paygate.Africa

1. **Create an account**: https://developers.paygate.africa/
2. **Create an application** in the Paygate dashboard
3. **Get credentials**:
   - `client_id` (from application keys)
   - `client_secret`
   - `app_id`

4. **Configure return URL** (in Paygate dashboard if available):  
   Your app URL with a query param, e.g.  
   `https://your-app.vercel.app/?tid={transaction_id}`  
   So Paygate appends the transaction ID when redirecting after payment.

---

## 2. Database (Supabase – free tier)

1. **Sign up**: https://supabase.com
2. **Create a project**
3. **Run this SQL** in the Supabase SQL editor:

```sql
-- Subscriptions (active plans)
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text not null unique,
  plan text not null default 'free',
  updated_at timestamptz default now()
);

-- Pending payments (links transaction_id → user_id until verified)
create table if not exists pending_subscriptions (
  id uuid default gen_random_uuid() primary key,
  transaction_id text not null,
  user_id text not null,
  created_at timestamptz default now()
);

create index idx_subscriptions_user_id on subscriptions(user_id);
create index idx_pending_transaction on pending_subscriptions(transaction_id);
```

4. **Get keys** (Settings → API):
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (keep secret!)

---

## 3. Deploy API to Vercel

1. **Install Vercel CLI** (optional): `npm i -g vercel`
2. **Deploy**:

```bash
cd /path/to/homework-companion
vercel
```

3. **Set environment variables** in Vercel project settings:

| Variable | Description |
|----------|-------------|
| `PAYGATE_CLIENT_ID` | From Paygate application |
| `PAYGATE_CLIENT_SECRET` | From Paygate application |
| `PAYGATE_APP_ID` | From Paygate application |
| `PAYGATE_API_URL` | `https://api.paygate.africa` (default) |
| `PAYGATE_CURRENCY` | `USD` or `XOF` etc. |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |

---

## 4. Frontend (Vite)

1. **Create `.env`** (or `.env.production`):

```
VITE_SUBSCRIPTION_API_URL=https://your-project.vercel.app/api
```

Use your Vercel deployment URL. The API routes are:
- `POST /api/subscription/checkout`
- `POST /api/subscription/verify`
- `GET /api/subscription/status`

2. **Rebuild** the app so `VITE_SUBSCRIPTION_API_URL` is picked up.

---

## 5. User ID

The app uses `profileData.email` (or `appUser.name`) as `userId` for subscriptions. For production:

- Use a stable ID (e.g. Firebase `user.uid`) and pass it to `getSubscriptionStatus` / `initiateProCheckout`
- Ensure the same ID is used for checkout and status checks

---

## Demo Mode (no setup)

If `VITE_SUBSCRIPTION_API_URL` is **not** set:

- Subscription status is stored in `localStorage`
- Clicking "Confirm Plan" for Pro activates Pro locally (no real payment)
- Use this to test the flow before connecting Paygate and Supabase

---

## Alternative: Firebase Firestore

Instead of Supabase, you can use Firestore:

1. Enable Firestore in the Firebase console
2. Create collections: `subscriptions`, `pending_subscriptions`
3. Add `firebase-admin` to the API and use the Admin SDK
4. Update the API handlers to read/write Firestore instead of Supabase REST

Schema idea:
- `subscriptions/{userId}` → `{ plan: 'pro', updatedAt }`
- `pending_subscriptions/{transactionId}` → `{ userId }`

---

## Flow Summary

1. User clicks "Confirm Plan" (Pro) → frontend calls `POST /api/subscription/checkout`
2. API creates Paygate transaction, saves `transaction_id → userId` in `pending_subscriptions`, returns `capture_url`
3. User is redirected to Paygate, pays
4. Paygate redirects to your app with `?tid=...`
5. App calls `POST /api/subscription/verify` with `transactionId`
6. API checks Paygate status, writes to `subscriptions`, returns `{ plan: 'pro' }`
7. App updates UI and clears URL params
