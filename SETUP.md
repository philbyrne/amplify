# Amplify — Setup Guide

Employee advocacy platform for Intercom. Employees browse content packages, generate AI-tailored social copy, and share it to LinkedIn or X.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project
- An [Anthropic](https://console.anthropic.com) API key

---

## Step 1: Install dependencies

```bash
cd /Users/philbyrne/claude_code/amplify
npm install
```

---

## Step 2: Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In your project, go to **SQL Editor** and run the entire contents of `supabase/schema.sql`.
3. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3: Google Cloud — OAuth (for login)

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project (or use existing).
3. Enable **Google+ API** / **Google Identity**.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
5. Application type: **Web application**.
6. Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google` (add your production URL too).
7. In **OAuth consent screen**, restrict to `@intercom.io` domain (Workspace domain restriction).
8. Copy **Client ID** → `GOOGLE_CLIENT_ID` and **Client Secret** → `GOOGLE_CLIENT_SECRET`.

---

## Step 4: Google Cloud — Drive API (for asset listing)

1. In the same Google Cloud project, enable **Google Drive API**.
2. Go to **APIs & Services → Credentials → Create Credentials → Service Account**.
3. Give it a name (e.g. `amplify-drive-reader`).
4. Download the JSON key file.
5. Base64 encode it: `base64 -i service-account.json | tr -d '\n'`
6. Paste the result into `GOOGLE_SERVICE_ACCOUNT_JSON`.
7. When creating Drive content packages, share the Google Drive folder with the service account email (found in the JSON as `client_email`).

---

## Step 5: Anthropic

1. Go to [console.anthropic.com](https://console.anthropic.com).
2. Generate an API key.
3. Copy it → `ANTHROPIC_API_KEY`.

---

## Step 6: Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=   # generate: openssl rand -base64 32

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_SERVICE_ACCOUNT_JSON=base64-encoded-service-account-json

ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_DOMAIN=intercom.io

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Step 7: Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Step 8: Make yourself an admin

After your first login with your `@intercom.io` Google account:

1. Go to your Supabase project → **Table Editor → users**.
2. Find your row.
3. Change the `role` column from `employee` to `admin`.
4. Reload the app — you'll now see the Admin panel in the sidebar.

---

## Step 9: Create your first package

1. Click **Packages** in the sidebar.
2. Click **New Package**.
3. Fill in the title, brief, and platform targets.
4. Optionally paste a Google Drive folder URL (share it with the service account email first).
5. Add example copy starters to guide the AI.
6. Set active and save.
7. Employees will see it in their feed immediately.

---

## Step 10: Set up Slack notifications (optional)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App → From scratch**.
2. Add **Incoming Webhooks** feature.
3. Create a webhook for your `#amplify` channel.
4. Copy the URL → `SLACK_WEBHOOK_URL`.

New packages will now ping Slack when published.

---

## Production deployment

For Vercel:

1. `vercel --prod`
2. Add all environment variables in Vercel dashboard.
3. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL.
4. Add the production URL to Google OAuth redirect URIs.
5. Update `NEXT_PUBLIC_ALLOWED_DOMAIN` if needed.

---

## Architecture overview

```
app/
  (app)/           — Authenticated routes (feed, leaderboard, profile, admin)
  api/             — API routes
  login/           — Public login page
components/
  feed/            — PackageCard, PackageFeed, ShareModal (hero component)
  admin/           — PackageForm, UsersTable
  leaderboard/     — LeaderboardTable
  profile/         — VoiceSetup
  layout/          — AppShell (sidebar)
lib/
  auth.ts          — NextAuth config
  claude.ts        — AI copy generation
  google-drive.ts  — Drive file listing
  utm.ts           — UTM code generation
  slack.ts         — Slack notifications
  supabase/        — Browser + server Supabase clients
supabase/
  schema.sql       — Full database schema with RLS
```

---

## LinkedIn voice scraping note

LinkedIn aggressively blocks server-side scraping. The `/api/voice/scrape` endpoint attempts a best-effort fetch but will fall back to sample posts when blocked (which is most of the time in production).

For real voice personalisation, integrate with:
- **[Proxycurl](https://nubela.co/proxycurl/)** — LinkedIn profile API, ~$0.01/call
- **[RapidAPI LinkedIn](https://rapidapi.com/search/linkedin)** — Various LinkedIn data APIs

The AI copy generation still works well with sample posts as baseline voice examples.
