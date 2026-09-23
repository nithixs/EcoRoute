# EcoRoute AI

A responsive React + Express driving-route planner. The production server serves both the web app and API from one origin; no MongoDB or Python process is needed.

## Features
- City search with explicit result selection, current location, and endpoint swapping.
- Actual OSRM driving routes, available alternatives, map fitting, and turn-by-turn directions.
- Petrol/diesel/EV energy and CO₂ estimates, per-traveller breakdowns, and lowest-emissions route ranking.
- Current destination weather from Open-Meteo. Weather outages do not prevent routing.
- Local saved trips (up to 12), re-planning, deletion, and plain-text directions export.
- Optional OpenAI Responses API trip assistant in English or Tamil, grounded in server-calculated trip context. API keys stay on the server. Without credentials, a clearly labelled deterministic summary is available.
- Input validation, upstream timeouts, bounded one-hour trip cache, request limits, and a per-process daily AI cap.

## Run
Requires Node.js 22 or newer.

```sh
npm --prefix client ci
npm --prefix server ci
npm --prefix client run build
npm start
```

Open http://localhost:5000. For development run `npm --prefix server run dev` and, in a second terminal, `npm --prefix client start`; the React development proxy forwards `/api` to port 5000.

Copy `.env.example` to `.env` at the repository root for local configuration. Optional AI requires both `OPENAI_API_KEY` and `OPENAI_MODEL` (an available Responses API model in your account). Never place secrets in a `REACT_APP_` variable or source files. Model access and API billing must be configured in your own provider account.

```sh
npm --prefix server test
npm --prefix client test -- --watchAll=false
npm --prefix client run build
```

## Deploy to Railway
1. Push this entire folder to your GitHub repository; exclude `.env`, build output and node_modules using the included `.gitignore`.
2. Connect that repository to a Railway service. `railway.toml` selects the multi-stage Dockerfile and `/api/health` healthcheck.
3. Add optional AI environment variables in Railway. Railway supplies `PORT`; the app listens on `0.0.0.0`.
4. Deploy and generate a Railway HTTPS domain. Verify `/api/health`, city search, a real route, saved trips and assistant status.

Alternative without GitHub: authenticate with `npx @railway/cli login`, then upload this folder with `npx @railway/cli up`. The `.railwayignore` excludes secrets, local dependencies and unrelated workspace files. The connected Railway API tool requires a confirmed GitHub repository, while the CLI can deploy local source directly. Deployment status is reported separately after verification.

## Estimates and limits
The values below are explicit illustrative planning assumptions, not certified emission factors or live fuel prices:

| Vehicle | kg CO₂ / km | INR / km |
| --- | ---: | ---: |
| Petrol | 0.17 | 7.00 |
| Diesel | 0.16 | 5.50 |
| Electric | 0.07 | 1.50 |

EV figures assume an electricity footprint; they are not zero-emission claims. Per-traveller CO₂ divides vehicle emissions by occupancy. Costs exclude tolls, parking and other fees. Lowest CO₂ means lowest among returned routes, not a globally optimal green route. Duration comes from OSRM and **does not include live traffic**. There is no trained traffic-prediction model; the original random predictor is retired.

Open-Meteo city search is not street-address autocomplete. Alternatives are not guaranteed. The default OSRM public demo and Open-Meteo free services are suitable for evaluation, subject to their usage terms and availability; use your own OSRM endpoint via `OSRM_URL` and arrange appropriate provider plans before commercial or high-volume use. Map attribution remains visible.

This release uses device-local saved trips, not accounts or cloud sync. The old login/model files remain unmounted legacy scaffolding. Trip assistant sessions expire after an hour or a server restart. Saved journeys contain locations and remain in browser storage until removed. Routing sends coordinates to OSRM, weather sends destination coordinates to Open-Meteo, and an explicitly requested AI answer sends the trip summary/question to OpenAI (`store: false`).

Rate limiting is in-memory: 60 API requests/minute per socket IP and `AI_DAILY_LIMIT` (default 100) AI requests per UTC day per server process. On a reverse proxy the socket IP may be shared, intentionally conservative. For multi-instance/public scale, add shared limits, verified proxy configuration, durable quotas and authenticated AI access. Restarts reset the local AI counter; configure a provider-side spend limit as well.

## Security follow-up
The previous client contained an embedded weather credential. It has been removed; rotate/revoke that old credential in its provider dashboard. It is not needed by the new app.

## Provider documentation
- https://project-osrm.org/docs/v5.24.0/api/
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api
- https://developers.openai.com/api/docs/guides/text
