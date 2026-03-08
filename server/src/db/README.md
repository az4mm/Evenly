# Database Migrations

Migrations run **automatically** when the server starts. No manual SQL execution needed.

## How it works

1. On server startup, `migrate.js` reads all `.sql` files from `migrations/` folder
2. Compares them against the `migrations` tracking table in the database
3. Runs only new (unexecuted) migrations in order, each inside a transaction
4. If a migration fails, it rolls back and the server does not start

## Migration files

| File | Description |
|------|-------------|
| `001_users.sql` | Users table + updated_at trigger function |

## Adding a new migration

1. Create a new `.sql` file in `migrations/` with the next number prefix (e.g., `002_groups.sql`)
2. Write your SQL (use `IF NOT EXISTS` where possible for safety)
3. Restart the server -- it will pick up and run the new migration automatically

## Setup for new developers

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Google OAuth under Authentication > Providers
3. Copy `.env.example` → `.env` in both `client/` and `server/`
4. Fill in your Supabase credentials (project URL, anon key, service_role key, database connection string)
5. Run `npm install` then `npm run dev` in `server/` -- tables are created automatically
