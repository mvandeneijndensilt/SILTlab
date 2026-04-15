# SILT Labplanning

Een Next.js App Router planner voor labwerk met sleepbare taakblokken, dag/week/maandweergaven en een voorbereid Supabase-datamodel.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- @dnd-kit/core
- @supabase/supabase-js

## Pagina's

- `/dashboard`
- `/employees`
- `/projects`
- `/volumiek`

## Lokaal starten

Gebruik in PowerShell bij voorkeur `npm.cmd`, omdat `npm.ps1` op sommige systemen wordt geblokkeerd door de execution policy.

```bash
npm.cmd install
npm.cmd run dev
```

Open daarna `http://localhost:3000`.

## Supabase

- De app leest uit Supabase zodra `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` zijn gezet.
- Voor uploads en updates vanuit de webapp is ook `SUPABASE_SERVICE_ROLE_KEY` nodig in `.env.local`.
- Zolang Supabase nog niet klaar staat, valt de app automatisch terug op mockdata.
- De SQL-bestanden staan in [supabase/schema.sql](supabase/schema.sql), [supabase/seed.sql](supabase/seed.sql), [supabase/import_lab_rows.sql](supabase/import_lab_rows.sql) en [supabase/lab_tooling_bootstrap.sql](supabase/lab_tooling_bootstrap.sql).
- Voor de nieuwe volumiek-uitwisseling tussen webapp en SILT Suite run je eenmalig `supabase/lab_tooling_bootstrap.sql` in Supabase.
