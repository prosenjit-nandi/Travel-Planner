# Travel Planner

A personal trip-itinerary companion, installable on iPhone as a home-screen app (PWA). Built for a UK & Scotland trip, but the data layer is source-agnostic so it can be repointed at a different trip later.

## Features

- **Day-by-day schedule** — swipe/tap through each day of the trip to see what's planned and when.
- **Live status** — on the current day, a banner shows whether you're on track, in free time before the next item, or should leave now to make the next commitment.
- **Maps** — every item with a location opens directly in Google Maps for transit planning.
- **Uber** — every item with a location can also launch the Uber app with the dropoff pre-filled.
- **Installable** — add it to your iPhone home screen and it runs full-screen, offline-capable, no App Store needed.

## Live site

Deployed on Netlify: https://travel-planner-uk.netlify.app

## Install on iPhone

1. Open https://travel-planner-uk.netlify.app in Safari on your iPhone.
2. Tap the Share icon → **Add to Home Screen**.
3. Launch it from the home screen icon — it opens full-screen like a native app.

## Deploying updates

The repo isn't connected to Netlify's auto-deploy-on-push (it's a private repo, deployed manually from the CLI):

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

## Development

```bash
npm install
npm run dev      # local dev server
npm run build     # type-check + production build to dist/
npm run lint      # oxlint
```

## Changing the trip data

Itinerary data lives behind the `ItineraryDataSource` interface (`src/data/types.ts`), so the UI never depends on where the data comes from.

- **Static JSON (current setup):** add a new file under `src/data/trips/` matching the `Trip` shape, then point `src/data/activeTrip.ts` at it via `staticTripSource(...)`.
- **Live source (e.g. the Google Sheet, an API):** implement `ItineraryDataSource` (an object with an async `load(): Promise<Trip>`) in `src/data/source.ts` or a new file, and swap it into `activeDataSource` in `src/data/activeTrip.ts`. No UI code needs to change.

Each itinerary item needs a date, start/end time, activity, and either a `locationName` or a precise `address` (used for the Maps/Uber links).
