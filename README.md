# Kiruna Archive Chat MVP

Minimal Railway-ready version of the Kiruna Archive with a real chat backend.

## What it does

- Serves the archive frontend from `public/index.html`
- Adds `POST /api/chat`
- Retrieves local archive context from the main page, timeline, and shared Outside data
- Uses Volcengine Ark Responses API for live web-backed answers
- Falls back to local archive-only answers when `ARK_API_KEY` or the Ark model setting is missing

## Frontend files

- `public/index.html` contains the main page markup and intro scripts.
- `public/timeline.html` and `public/outside-map.html` contain the timeline and Outside views.
- `public/css/` and `public/js/` contain each page's styles and scripts. Main-page CSS is loaded in cascade order: base, archive, responsive, report, discourse, compare, app mode, and adaptive overrides.
- The gallery card grid is a small Vue island in `public/index.html` and `public/js/gallery.js`; its pinned runtime and license are in `public/vendor/`. The gallery lightbox and year rail remain in `gallery.js`.
- `public/js/outside-data.js` supplies the same document data to the main search and Outside view.

## Adding archive events

- Add Inside Map events to `public/js/archive-data.js`: use `CORE_EVENTS` for historical events and `DOCS` for archive documents. Give each new record a unique numeric `id`; never change an existing ID. Documents need `issuance_date` and `coordinates: {type: "Point", coordinates: [longitude, latitude]}` so the map can place them. The map, time view, gallery, client chat search, and server chat index read this file.
- Add Outside Map documents to `public/js/outside-data.js`. Each row ends with a unique, permanent numeric ID. Image files, when present, use `public/images/outside/outside-<ID padded to three digits>.jpg`. Inside images use `public/images/inside/inside-<ID padded to three digits>.jpg`.
- Run `npm test`, then deploy both the static frontend and the API. The API builds its search index when it starts, so it needs a restart or redeploy to read changed records.

## Local run

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Put your Ark config in `.env`:

```bash
ARK_API_KEY=your_key_here
ARK_MODEL=your_model_or_endpoint_here
# Optional:
# ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
# ARK_ENDPOINT_ID=ep-xxxxxxxxxxxxxxxx
```

4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Railway deployment

1. Push this folder to GitHub.
2. In Railway, create a new project from that repo.
3. If this app lives in a subfolder, set Railway's Root Directory to that folder.
4. Add environment variables:
   - `ARK_API_KEY`
   - `ARK_MODEL` or `ARK_ENDPOINT_ID`
   - `ARK_BASE_URL` only if you need a non-default base URL
5. Deploy. Railway can use the existing `npm start` script directly.

## Netlify deployment for the static frontend

This repo now includes a Netlify config that publishes `public/` and generates a proxy `_redirects` file during the Netlify build.

1. Deploy the API to Railway first and copy its public origin, for example:

```text
https://your-api.up.railway.app
```

2. In Netlify, connect the same GitHub repo.
3. Netlify will read `netlify.toml` and run the redirect preparation command during the build.
4. In Netlify environment variables, add:
   - `NETLIFY_RAILWAY_API_ORIGIN`
     Example: `https://your-api.up.railway.app`
5. Trigger a deploy.

After deploy, requests to `/api/*` on the Netlify site will be proxied to the Railway API, and all other routes will rewrite to `/index.html`.

## Split hosting summary

- Netlify serves the static archive UI from `public/`
- Railway serves the Express API from `server.js`
- Netlify proxies `/api/chat`, `/api/weak-web-search`, and `/api/health` to Railway

## Useful endpoints

- `GET /api/health`
- `POST /api/chat`

Example:

```bash
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is the Kiruna relocation project?","history":[]}'
```

## Notes

- The frontend chat history is intentionally temporary and clears on refresh while the feature is being tested.
- Without `ARK_API_KEY` or a configured Ark model, the chat still works in archive-only fallback mode.
- The live web-backed path depends on your Ark account having access to the configured model or endpoint and its web search capability.
- Netlify deployment requires `NETLIFY_RAILWAY_API_ORIGIN` so the generated proxy rules know where the Railway API lives.
