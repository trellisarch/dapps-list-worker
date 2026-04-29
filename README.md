# dapps-list-worker

Cloudflare Worker that powers the dapps list at `dapps-list.radix.dev`. It serves a JSON feed of dApps grouped by category and ships a minimal Basic-Auth–protected admin UI for managing entries, with state persisted in a Cloudflare KV namespace (`DAPPS_LIST_KV`).

## Endpoints

- `GET /list` — Public JSON feed: `{ highlighted, others }`.
- `GET /admin` — Admin HTML UI (list / add / edit form). Supports `?edit=<idx>`.
- `POST /admin` — Add a dapp (`name`, `address`, `tags`, `dAppCategory`, `category`).
- `POST /admin/edit` — Update dapp at `idx`.
- `POST /admin/remove` — Remove dapp at `idx`.

All `/admin*` routes require HTTP Basic Auth using `DAPPS_LIST_ADMIN_USER` / `DAPPS_LIST_ADMIN_PASSWORD`.

## Configuration

Set the following secrets/vars on the worker:

```sh
wrangler secret put DAPPS_LIST_ADMIN_USER
wrangler secret put DAPPS_LIST_ADMIN_PASSWORD
```

The KV namespace binding `DAPPS_LIST_KV` is configured in `wrangler.toml`.

## Development

```sh
npm install
npm run dev      # wrangler dev
npm run deploy   # wrangler deploy
```
