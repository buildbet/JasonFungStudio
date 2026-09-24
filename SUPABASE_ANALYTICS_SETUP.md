# First-party traffic analytics setup

The repository now contains an anonymous first-party traffic tracker, a private
dashboard, a Supabase database migration, and a Supabase Edge Function. The
tracker remains inactive until the public Supabase browser configuration is
added.

## What is measured

- Sessions and page views
- Referral host, UTM source/medium/campaign/content/term, `gclid`, and `fbclid`
- Source + channel reporting (for example Google organic search, Google paid,
  Instagram paid/social, Facebook paid/social, referrals, and direct visits)
- Mobile, tablet, or desktop; browser; operating system; language; and timezone
- Approximate country, region, and city when IPinfo is configured
- Session duration, active time, maximum scroll depth, and page dimensions

Names, email addresses, phone numbers, form contents, and raw IP addresses are
not stored. The tracker also stops when the visitor enables Do Not Track.

## 1. Create and link a Supabase project

Create a Supabase project, then install or run the Supabase CLI on Windows. The
CLI can be run without a global installation:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Do not commit a database password, service-role key, access token, or IPinfo
token to this repository.

## 2. Deploy the database and ingestion function

From the repository root:

```powershell
npx supabase db push
npx supabase functions deploy track-visit --no-verify-jwt
npx supabase secrets set ANALYTICS_ALLOWED_ORIGINS=https://jasonfung.studio,https://www.jasonfung.studio
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge
Function automatically. The service-role key must never appear in a browser
file.

For approximate city and region, create an IPinfo token and set it only as an
Edge Function secret:

```powershell
npx supabase secrets set IPINFO_TOKEN=YOUR_PRIVATE_IPINFO_TOKEN
```

Without this optional token, tracking still works; location may be limited to a
country code when the hosting network supplies one.

## 3. Add the public browser configuration

In the Supabase dashboard, open **Project Settings → API** and copy the project
URL and public publishable key (the legacy anon key also works). Put only those public values in
`traffic-analytics-config.js`:

```js
window.JFS_TRAFFIC_ANALYTICS = Object.freeze({
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY",
  endpoint: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/track-visit",
  adminEmail: "jasonfungstudio@gmail.com"
});
```

## 4. Configure private dashboard sign-in

In **Authentication → Users**, create one user with:

- Email: `jasonfungstudio@gmail.com`
- A unique, strong password that is not stored in this repository

The dashboard fixes the email behind the scenes and asks only for the password.
The database function permits analytics reads only when the signed-in JWT email
is `jasonfungstudio@gmail.com`. The page itself is marked `noindex`, but the real
protection is Supabase Auth plus row-level security.

## 5. Verify

1. Open the published website in a private window with Do Not Track disabled.
2. Visit two pages, scroll, and leave the tab open for at least 20 seconds.
3. Open `https://jasonfung.studio/traffic-dashboard.html`.
4. Sign in using `jasonfungstudio@gmail.com` and apply a date range containing
   today.
5. Confirm sessions, page views, source, device, engagement, and scroll values.

UTM test example:

```text
https://jasonfung.studio/growth-operator-funnel.html?utm_source=instagram&utm_medium=paid&utm_campaign=growth_operator
```

## Files

- `traffic-analytics-config.js` — public project configuration
- `traffic-analytics.js` — anonymous browser tracker
- `traffic-dashboard.html`, `.css`, `.js` — private dashboard
- `supabase/migrations/202609230001_traffic_analytics.sql` — schema, RLS, and dashboard RPC
- `supabase/functions/track-visit/index.ts` — validated, origin-restricted ingestion endpoint
