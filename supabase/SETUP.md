# Supabase Setup

1. Create a free Supabase project.
2. Open the project settings and copy these values:
   - Project URL
   - anon public key
   - service_role key
3. Fill in `packages/orchestrator/.env` using `packages/orchestrator/.env.example` as the template.
   - Use the project URL without `/rest/v1`.
   - For ES256 projects, set `SUPABASE_JWKS_URL` to `<Project URL>/auth/v1/.well-known/jwks.json`.
   - `SUPABASE_JWT_SECRET` is only needed for legacy HS256 projects.
4. Open the Supabase SQL Editor and run these files in order:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
   - `supabase/seed.sql`

After that, the backend can read the Supabase configuration from the orchestrator environment and the app schema will be ready for auth-backed submissions.
