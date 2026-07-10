# Travel Planner

A personal trip-itinerary companion, installable on iPhone as a home-screen app (PWA). Built for a UK & Scotland trip, but the data layer is source-agnostic so it can be repointed at a different trip later.

## Features

- **Day-by-day schedule** — swipe/tap through each day of the trip to see what's planned and when.
- **Live status** — on the current day, a banner shows whether you're on track, in free time before the next item, or should leave now to make the next commitment. Anchored to the trip's own time zone (see below), so it stays correct even before you've landed.
- **Maps** — every item with a location opens directly in Google Maps for transit planning.
- **Uber** — every item with a location can also launch the Uber app with the dropoff pre-filled.
- **Walk/drive estimate** — each card shows a rough travel time to the next item ("~12m walk to next"), from geocoded straight-line distance — a quick gauge of whether it's a walk or a ride, not turn-by-turn routing.
- **Weather** — a per-day forecast chip for the day's city, when both the city and the date (within ~15 days out) are known.
- **Destination-local time** — item and status times are always shown in the trip's own time zone; when your device is on a different zone (e.g. checking the plan before departure), the device-local equivalent is shown alongside it.
- **Jump to today** — a "Today" button appears in the day nav whenever you've browsed away from the current day. The day view itself opens on today whenever today has itinerary items scheduled, and otherwise always on the trip's first day (never the last, even once the trip is over) — both on first load and whenever "Back to day" is used from the trip overview.
- **Trip overview** — a read-only travel-blog-style summary of the whole trip, not a navigation menu: an opening line ("3 days across London and Edinburgh, from Jul 9 to Jul 11"), then one chapter per city with a hero photo, and a day-by-day entry underneath for each day spent there — that day's weather, a plain-English sentence naming every place visited ("Visiting Heathrow Airport, Dishoom Covent Garden, and the British Museum."), and a small photo strip for those places. A city with no `City` column filled in on some days inherits it from the nearest day that does have one, so entries read as "London" rather than a placeholder. The only way out is the header's "Back to day" toggle.
- **Tap-to-expand detail** — notes, a precise address, and a booking confirmation number (with a copy button) stay tucked under the card until tapped, so the compact view doesn't get crowded.
- **Thumbnail** — a small photo of the destination, when Wikipedia has one for it. Works well for named landmarks, museums, stations, and cities; a restaurant, hotel, or plain street address usually won't have a match, so most day-to-day items simply won't show one — that's expected, not a bug.
- **Installable** — add it to your iPhone home screen and it runs full-screen, offline-capable, no App Store needed.

Weather, travel estimates, and thumbnails call three free, no-API-key services directly from the client: [Open-Meteo](https://open-meteo.com) for forecasts, [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) to geocode place names, and the [Wikipedia API](https://en.wikipedia.org/w/api.php) for thumbnails. Geocoding results are cached indefinitely in `localStorage` (a venue's coordinates never change) and requests are serialized rather than fired in parallel, out of courtesy to Nominatim's shared public instance.

## Live site

Deployed on Cloudflare Pages: https://travel-planner-uk.pages.dev

## Install on iPhone

1. Open https://travel-planner-uk.pages.dev in Safari on your iPhone.
2. Tap the Share icon → **Add to Home Screen**.
3. Launch it from the home screen icon — it opens full-screen like a native app.

## Deploying updates

The repo isn't connected to Cloudflare's auto-deploy-on-push; it's deployed manually from the CLI:

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

Each itinerary item needs a date, start/end time, activity, and either a `locationName` or a precise `address` (used for the Maps/Uber links). `city` (for weather and Maps/Uber disambiguation) and `confirmationNumber` (shown with a copy button in the card's expanded detail) are optional.

### Getting the right destination in Maps/Uber

A bare venue name like "Waterloo Station" or "The Ivy" isn't unique — Maps/Uber can resolve it to a same-named place in a different city or country. To keep links anchored to the right place:

- Prefer a precise `address` when you have one; it's used as-is, with no disambiguation applied.
- Otherwise, set `Trip.region` (e.g. `"United Kingdom"`) once for the whole trip, and optionally `city` per item (e.g. `"Edinburgh"`, via a `City` column in the Google Sheet) for venues whose name alone isn't unique even within the country. Both are appended to the `locationName` query, skipped if already implied by the name, so results stay anchored without duplicating text like "Edinburgh Castle, Edinburgh, Edinburgh".
- If `Location` is a generic placeholder — "Hotel", "Restaurant", "Taxi", "Airport", or the row's own `Category` — and `Notes` holds the actual venue instead, `Notes` is used for the Maps/Uber query in its place. This only ever fires when `Location` looks like a placeholder; a specific `Location` value is never overridden.

## Live Google Sheet integration

The itinerary is fetched from a Google Sheet the trip owner edits directly. The sheet is **never shared publicly** — a Cloudflare Pages Function (`functions/api/itinerary.ts`) holds a Google service-account credential, authenticates to the Sheets API server-side, and serves the data as JSON to the client, gated by a shared-secret token.

Column headers the sheet must have: `Date`, `Start Time`, `End Time`, `Activity`, `Location`, `Category`, `Notes`. Two optional columns are also recognized: `City` feeds `item.city` (see above, and used for the weather chip), and `Confirmation` feeds `item.confirmationNumber`. Any other columns, e.g. cost tracking, are ignored.

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

# the spreadsheet ID from the sheet's URL (https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit)
npx wrangler pages secret put SHEET_ID --project-name travel-planner-uk
```

The same `ITINERARY_PROXY_TOKEN` value needs to be available to the client build too. Add it to a local `.env.local` (already gitignored via `*.local`):

```
VITE_ITINERARY_PROXY_TOKEN=<same token as above>
```

### Local development

`npm run dev` (plain Vite) doesn't run Cloudflare Functions, so `/api/itinerary` 404s locally and the app falls back to the bundled JSON snapshot — that's expected. To test the live proxy locally, put the same secrets in a gitignored `.dev.vars` file at the repo root and run `npx wrangler pages dev dist --project-name travel-planner-uk` against a built `dist/` instead.
