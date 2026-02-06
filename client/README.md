# workspace.baeun Vue 3 migration skeleton

This folder contains a minimal Vue 3 + Vite JavaScript project scaffold created to follow the migration plan.

Quick start:

```bash
cd client/vue3-app
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Notes:
- Uses Vue Router and Pinia.
- API wrapper at `src/lib/axios.js` points to `/` base; adapt `baseURL` as needed.
- App layout implements fixed GNB, LNB column, and content-area scrolling.
- Pages are skeletons to start porting functionality from the Solid app.
