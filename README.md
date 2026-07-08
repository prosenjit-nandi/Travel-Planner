# Travel Planner

A personal trip-itinerary companion, installable on iPhone as a home-screen app (PWA). Built for a UK & Scotland trip, but the data layer is source-agnostic so it can be repointed at a different trip later.

## Features

- **Day-by-day schedule** — swipe/tap through each day of the trip to see what's planned and when.
- **Live status** — on the current day, a banner shows whether you're on track, in free time before the next item, or should leave now to make the next commitment.
- **Maps** — every item with a location opens directly in Google Maps for transit planning.
- **Uber** — every item with a location can also launch the Uber app with the dropoff pre-filled.
- **Installable** — add it to your iPhone home screen and it runs full-screen, offline-capable, no App Store needed.

## Live site

Deployed on Cloudflare Pages: https://travel-planner-uk.pages.dev

## Install on iPhone

1. Open https://travel-planner-uk.pages.dev in Safari on your iPhone.
2. Tap the Share icon → **Add to Home Screen**.
3. Launch it from the home screen icon — it opens full-screen like a native app.

## Deploying updates

The repo isn't connected to Cloudflare's auto-deploy-on-push (it's a private repo, deployed manually from the CLI):

```bash
npm run build
npx wrangler pages deploy dist --project-name travel-planner-uk --branch main
```

## Development

```bash
npm install
npm run dev            # local dev server
npm run build           # type-check + production build to dist/
npm run lint            # oxlint
npm run test            # vitest
npm run test:coverage   # vitest with a coverage report (100% line/branch/function/statement threshold)
```

## Changing the trip data

Itinerary data lives behind the `ItineraryDataSource` interface (`src/data/types.ts`), so the UI never depends on where the data comes from.

- **Static JSON:** add a new file under `src/data/trips/` matching the `Trip` shape, then point `src/data/activeTrip.ts` at it via `staticTripSource(...)`.
- **Live Google Sheet (current setup):** `src/data/activeTrip.ts` polls a private Google Sheet every 10 minutes (see below).

Each itinerary item needs a date, start/end time, activity, and either a `locationName` or a precise `address` (used for the Maps/Uber links).

## Live Google Sheet integration

The itinerary is fetched from a Google Sheet the trip owner edits directly. The sheet is **never shared publicly** — a Cloudflare Pages Function (`functions/api/itinerary.ts`) holds a Google service-account credential, authenticates to the Sheets API server-side, and serves the data as JSON to the client, gated by a shared-secret token.

Column headers the sheet must have: `Date`, `Start Time`, `End Time`, `Activity`, `Location`, `Category`, `Notes` (any other columns, e.g. cost tracking, are ignored).

### One-time Google Cloud setup

1. Go to https://console.cloud.google.com/ and create (or reuse) a project.
2. **APIs & Services → Library** → search "Google Sheets API" → Enable.
3. **APIs & Services → Credentials → Create Credentials → Service account.** Name it something like `travel-planner-reader`. No IAM roles or user access needed — skip those steps.
4. Open the new service account → **Keys → Add Key → Create new key → JSON.** This downloads a key file — treat it like a password. Save it somewhere outside this repo (it must never be committed).
5. In the Google Sheet: **Share** → make sure sharing is **Restricted** (not "Anyone with the link") → add the service account's email (the `client_email` field in the downloaded JSON, looks like `travel-planner-reader@<project-id>.iam.gserviceaccount.com`) as **Viewer**. Uncheck "Notify people."

### Cloudflare secrets

Set these once per environment via Wrangler (reads straight from your downloaded key file, so the key never has to be pasted into a chat or committed):

```bash
# from the downloaded service-account JSON file
node -e "console.log(require('/path/to/key.json').client_email)" | npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --project-name travel-planner-uk
node -e "process.stdout.write(require('/path/to/key.json').private_key)" | npx wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_KEY --project-name travel-planner-uk

# a random token only your own client sends; not a real secret since it ships in the JS bundle, just a deterrent against random crawlers hitting the endpoint
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
npx wrangler pages secret put ITINERARY_PROXY_TOKEN --project-name travel-planner-uk   # paste the value printed above
```

The same `ITINERARY_PROXY_TOKEN` value needs to be available to the client build too. Add it to a local `.env.local` (already gitignored via `*.local`):

```
VITE_ITINERARY_PROXY_TOKEN=<same token as above>
```

### Local development

`npm run dev` (plain Vite) doesn't run Cloudflare Functions, so `/api/itinerary` 404s locally and the app falls back to the bundled JSON snapshot — that's expected. To test the live proxy locally, put the same secrets in a gitignored `.dev.vars` file at the repo root and run `npx wrangler pages dev dist --project-name travel-planner-uk` against a built `dist/` instead.
