# Fenmo Expense Tracker

Minimal full-stack expense tracker built with NestJS, TypeORM, PostgreSQL, and React.

**Features**
- Create expenses (amount, category, description, date)
- List expenses
- Filter by category
- Sort by date (newest first)
- Total of current list
- Idempotent POSTs for retries/reloads

## Tech Stack
- Backend: NestJS + TypeORM + PostgreSQL
- Frontend: React (Vite)
- Infra: Docker (Postgres)

## Quick Start
1. Start Postgres:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd server
   cp .env.example .env
   npm run start:dev
   ```
3. Frontend:
   ```bash
   cd web
   cp .env.example .env
   npm run dev
   ```

The API runs on `http://localhost:3000` and the UI on `http://localhost:5173`.

## Live UI (GitHub Pages)
UI URL:
```
https://omuppar.github.io/fenmo-money-expense/
```

If the UI shows the README instead of the app, ensure GitHub Pages is set to:
- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`

## API

### POST `/expenses`
Creates a new expense. Uses the `Idempotency-Key` header to deduplicate retries.

Body:
```json
{
  "amount": 12.50,
  "category": "Groceries",
  "description": "Weekly market trip",
  "date": "2026-02-05"
}
```

### GET `/expenses`
Query params:
- `category` (optional)
- `sort=date_desc` (optional)

## Design Decisions
- **Idempotency:** Uses `Idempotency-Key` header. The backend stores a request hash and returns the existing record for retries. If a key is reused with different payloads, it returns `409 Conflict`.
- **Money handling:** Amounts are stored as integer cents (`bigint`) to avoid floating-point rounding errors. The API returns amounts as decimal numbers for convenience.
- **Persistence:** PostgreSQL with TypeORM for a realistic, production-friendly stack.

## Trade-offs / Timebox Notes
- TypeORM `synchronize: true` is enabled for quick setup; migrations would be preferable for production.
- Authentication and authorization are out of scope.
- Automated tests were skipped to keep the scope tight.

## Not Implemented Intentionally
- Multi-user support
- Advanced reporting/export
- Expense editing/deletion

## GitHub Pages Build Notes
- The UI is built with Vite.
- `web/vite.config.js` sets the `base` to `/fenmo-money-expense/` for GitHub Pages.
