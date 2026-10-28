# ServiceSync client

React/Vite frontend for the ServiceSync service booking platform.

See the [project README](../README.md) for full setup, environment configuration, database requirements, features, and submission documentation.

```powershell
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Set `VITE_API_BASE_URL` in `.env` to change the API address; it defaults to `http://localhost:5000/api`. Production hosting must redirect application routes to `index.html`.
