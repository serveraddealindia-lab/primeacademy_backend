# Prime Academy

Backend (Node.js + TypeScript + Express) and frontend (React) for Prime Academy CRM.

## Quick start (local)

### Backend

```bash
# From project root (where package.json and src/ are)
cp .env.example .env
# Edit .env: set DB (MySQL/Postgres), PORT=3001, FRONTEND_URL=http://localhost:5173

npm install
npm run build
npm run dev
```

Backend runs at **http://localhost:3001**. API base: **http://localhost:3001/api**.

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:3001  (no /api suffix; frontend adds it)

npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

### Database

- Run migrations: `npx sequelize-cli db:migrate` (or your migration command from project root).
- Optional setup SQL and nginx configs are in **docs/setup/** (see below).

---

## Live deployment

### 1. Environment

**Backend (.env on server)**

- `NODE_ENV=production`
- `PORT=3001` (or the port your process manager uses)
- `FRONTEND_URL=https://your-frontend-domain.com` (and `http://...` if you use both)
- Database URL and other existing vars

**Frontend (build-time)**

- Set `VITE_API_BASE_URL=https://your-api-domain.com` (no trailing `/api`).
- Build: `cd frontend && npm run build`. Serve the `frontend/dist` folder (e.g. with nginx).

### 2. CORS

Backend must allow your frontend origin. In `src/index.ts`, `corsOptions.origin` uses `process.env.FRONTEND_URL`. Set `FRONTEND_URL` to your live frontend URL (e.g. `https://crm.example.com`) so suggested students and all API calls work from the browser.

### 3. Suggested students (Create Batch) and payments on live

- **Suggested students**: Depends on `/api/batches` (create/delete) and `/api/batches/:id/candidates/suggest`. Ensure backend URL is correct (`VITE_API_BASE_URL`) and CORS includes your frontend origin. Run DB migrations so `student_profiles` has the expected columns (e.g. `softwareList`, `status`; optional: `pendingBatches`, `currentBatches`, `finishedBatches`).
- **Payments (blank / auto-correct)**: Payment list and auto-fill use `/api/payments` and `/api/enrollments` (and student details). Use the same API base URL and CORS as above. Ensure `payment_transactions` has `paidAmount` and migrations are applied.

### 4. Nginx and SQL

- Example nginx configs: **docs/setup/nginx-*.conf**
- Optional SQL scripts (schema/setup): **docs/setup/*.sql**
- Student Excel templates: **docs/setup/*.xlsx**

See **docs/setup/README.md** for details.

---

## Scripts (root)

| Command        | Description                |
|----------------|----------------------------|
| `npm run dev`  | Start backend (tsx)         |
| `npm run build`| Build backend (tsc)        |
| `npm start`    | Run built backend          |
| `npm run seed` | Seed users and demo data   |

Frontend: run scripts from `frontend/` (e.g. `npm run dev`, `npm run build`).
