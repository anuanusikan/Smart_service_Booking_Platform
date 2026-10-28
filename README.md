# ServiceSync - Service Booking Platform

ServiceSync connects customers who post service jobs with providers who submit quotes and complete bookings. This repository is stored locally as Skilllink.

## Features

- Customer/provider registration, hashed passwords, JWT authentication, and role-based routes.
- Job CRUD: post, list, search by title, filter by category/location/budget, edit open jobs, and safely delete open jobs.
- Sorting by newest, oldest, and ascending/descending budget; providers default to skill/location match ranking.
- Provider quotes, customer acceptance/decline, booking completion, schedules, and booking history.
- Booking chat, reviews after completion, provider ratings, and earnings summaries.
- Booking/quote bell notifications and account-specific settings; chat alerts remain separate from the bell.
- Optional job/profile image uploads through Cloudinary.

## Technology and architecture

React 19, React Router, Vite, and Recharts form the client. Express 5 exposes REST endpoints. Mongoose stores users, jobs, quotes, bookings, reviews, messages, and notifications in MongoDB. Cloudinary stores uploaded images.

```text
client/src/pages        Page components
client/src/components   Shared navigation, layouts, job cards and fields
client/src/services     HTTP API client
client/src/utils        Validation, appointments and notification helpers
server/routes           REST handlers and access checks
server/models           Persistent MongoDB schemas
server/services         Booking, pricing, validation and notification logic
server/tests            Jest regression tests
server/scripts          Isolated live verification
```

## Setup

Use Node.js 22.12 or later and npm. Provide a MongoDB replica set or MongoDB Atlas deployment: quote acceptance uses transactions, which a standalone MongoDB server cannot support. Cloudinary credentials are needed for image uploads.

1. Clone https://github.com/anuanusikan/Smart_service_Booking_Platform.git and open the repository.
2. In `server`, run `npm ci` and copy `.env.example` to `.env`. Set `MONGO_URI`, `JWT_SECRET`, `PORT`, and your Cloudinary credentials. Use the same secret between server restarts so existing tokens remain valid.
3. Run `npm run dev` in `server`. The server starts only after MongoDB connects. The default API address is `http://localhost:5000/api`.
4. In another terminal, open `client`, run `npm ci`, and copy `.env.example` to `.env` if you need to change the API address.
5. Run `npm run dev` in `client`, then open the URL Vite prints (normally `http://localhost:5173`).
6. Register separate customer and provider accounts through the registration page. No default admin or demo credentials are installed.

Never commit `.env` files or real credentials. `.env.example` contains placeholders only. Vite environment variables are public client configuration.

## Build and checks

```powershell
cd server
npm test -- --runInBand
# Optional: connects to MongoDB and creates a dedicated synthetic-data database
npm run verify:live
cd ../client
npm test
npm run lint
npm run build
npm run preview
```

The live verifier overrides the configured database name with `skilllink_verification_<timestamp>`. It tests registration/login, job CRUD, provider filtering, quotes, transactional acceptance, messages, completion, reviews, and persistence after reconnecting. Synthetic records remain in that isolated database for inspection; the normal application database is not modified. The database user must have permission to create this database.

For deployment, host `client/dist` with SPA fallback to `index.html`, deploy the Express API separately, and set `VITE_API_BASE_URL` before building. Use HTTPS and a server-side secret store. This project does not process online payments: earnings summarize completed booking prices.

## Database and CRUD evidence

See [ERD and data dictionary](docs/database.md). Jobs are the main full-CRUD entity. `POST /api/jobs` creates, `GET /api/jobs` and `/api/jobs/mine` read, `PUT /api/jobs/:id` updates, and `DELETE /api/jobs/:id` soft-deletes. Only the owning customer may update/delete open jobs. Deleted jobs are excluded from normal listings and retain history references.

Supported browse query parameters: `title`, `category`, `location`, `minBudget`, `maxBudget`, and `sort` (`newest`, `oldest`, `budget_asc`, `budget_desc`). Provider `/api/jobs/matched` supports the same parameters and defaults to match ranking. Search is case insensitive and treats regex punctuation literally.

## Evaluation and submission

- [Report draft](docs/project-report.md): complete personal details and screenshots, then export and check the final report is at most 10 pages.
- [Demonstration and submission checklist](docs/demonstration.md): rehearse and record a camera-on video of at most 5 minutes.
- [Verification record](docs/verification.md): automated results and remaining manual checks.

Screenshots, personal details, video recording, and external submission must reflect the actual project and the student's own work. Follow the course academic-integrity requirements and disclose assistance as required by the institution.
