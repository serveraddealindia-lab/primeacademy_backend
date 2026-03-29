# Setup and deployment assets

This folder contains optional SQL scripts, nginx config examples, and Excel templates. Use them for reference or manual setup; the app’s main flow uses migrations and env config.

## Contents

- **nginx-*.conf** – Example nginx configs for backend API and frontend (reverse proxy, static files).
- **\*.sql** – Optional schema/alter scripts (e.g. add columns, create tables). Prefer running migrations from the project root; use these only if you need to apply changes manually.
- **\*.xlsx** – Student enrollment / course templates for Excel import.

## Nginx

- Copy the relevant parts into your nginx site config.
- Replace `your-api-domain.com` / `your-frontend-domain.com` and paths with your values.
- Reload nginx after editing.

## SQL

- Run against the same DB your backend uses (see root `.env`).
- Run in an order that respects dependencies (e.g. tables before columns, columns before indexes).

## Live checklist

1. Backend: set `FRONTEND_URL` to your frontend origin (e.g. `https://crm.example.com`).
2. Frontend: set `VITE_API_BASE_URL` to your API origin (e.g. `https://api.example.com`), then build.
3. Run migrations so DB schema matches the app (especially `student_profiles`, `payment_transactions`, `batches`).
4. Deploy backend and frontend; ensure CORS and nginx/proxy allow the frontend to call the API.
