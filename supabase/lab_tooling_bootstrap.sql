create extension if not exists pgcrypto;

create schema if not exists lab;

grant usage on schema lab to anon, authenticated, service_role;

create or replace function lab.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Actuele toolformulieren (webapp + desktoptool)
create table if not exists lab.project_tool_forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.lab_projects(id) on delete set null,
  project_nummer bigint not null,
  project_title text,
  tool_key text not null,
  payload jsonb not null default '{}'::jsonb,
  requested_quantity integer not null default 0 check (requested_quantity >= 0),
  row_count integer not null default 0 check (row_count >= 0),
  filled_row_count integer not null default 0 check (filled_row_count >= 0),
  status text not null default 'concept' check (status in ('concept', 'bezig', 'gereed')),
  updated_by text,
  last_editor_source text not null default 'webapp' check (last_editor_source in ('webapp', 'desktop')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_nummer, tool_key)
);

-- Snapshots na elke insert/update op project_tool_forms
create table if not exists lab.project_tool_form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references lab.project_tool_forms(id) on delete cascade,
  project_id uuid references public.lab_projects(id) on delete set null,
  project_nummer bigint not null,
  project_title text,
  tool_key text not null,
  payload jsonb not null default '{}'::jsonb,
  requested_quantity integer not null default 0 check (requested_quantity >= 0),
  row_count integer not null default 0 check (row_count >= 0),
  filled_row_count integer not null default 0 check (filled_row_count >= 0),
  status text not null default 'concept' check (status in ('concept', 'bezig', 'gereed')),
  updated_by text,
  last_editor_source text not null default 'webapp' check (last_editor_source in ('webapp', 'desktop')),
  created_at timestamptz not null default timezone('utc', now())
);

-- Gevraagde monsters per project/boring/proef (start met volumiek)
create table if not exists lab.project_tool_sample_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.lab_projects(id) on delete set null,
  project_nummer bigint not null,
  project_title text,
  tool_key text not null,
  boring text not null,
  monster text not null,
  diepte_van_cm numeric(12,2),
  diepte_tot_cm numeric(12,2),
  notes text,
  updated_by text,
  last_editor_source text not null default 'desktop' check (last_editor_source in ('webapp', 'desktop')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_nummer, tool_key, boring, monster)
);

-- Registratie van exports (bijv. PDF) zodat Beheer kan beslissen of data opgeschoond mag worden.
create table if not exists lab.project_tool_exports (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references lab.project_tool_forms(id) on delete set null,
  project_id uuid references public.lab_projects(id) on delete set null,
  project_nummer bigint not null,
  project_title text,
  tool_key text not null,
  output_filename text not null,
  exported_at timestamptz not null default timezone('utc', now()),
  exported_by text,
  meta jsonb not null default '{}'::jsonb,
  cleanup_status text not null default 'open'
    check (cleanup_status in ('open', 'bewaren', 'verwijderen')),
  cleanup_by text,
  cleanup_at timestamptz,
  last_editor_source text not null default 'desktop'
    check (last_editor_source in ('desktop', 'webapp', 'beheer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_lab_project_tool_forms_project_id
  on lab.project_tool_forms (project_id);

create index if not exists idx_lab_project_tool_forms_updated_at
  on lab.project_tool_forms (updated_at desc);

create index if not exists idx_lab_project_tool_forms_tool_key
  on lab.project_tool_forms (tool_key, project_nummer);

create index if not exists idx_lab_project_tool_form_versions_form_id
  on lab.project_tool_form_versions (form_id, created_at desc);

create index if not exists idx_lab_sample_requests_lookup
  on lab.project_tool_sample_requests (project_nummer, tool_key);

create index if not exists idx_lab_sample_requests_updated_at
  on lab.project_tool_sample_requests (tool_key, updated_at desc);

create index if not exists idx_lab_tool_exports_tool_time
  on lab.project_tool_exports (tool_key, exported_at desc);

create index if not exists idx_lab_tool_exports_cleanup
  on lab.project_tool_exports (cleanup_status, exported_at desc);

create or replace function lab.record_project_tool_form_version()
returns trigger
language plpgsql
security definer
set search_path = public, lab
as $$
begin
  insert into lab.project_tool_form_versions (
    form_id,
    project_id,
    project_nummer,
    project_title,
    tool_key,
    payload,
    requested_quantity,
    row_count,
    filled_row_count,
    status,
    updated_by,
    last_editor_source
  )
  values (
    new.id,
    new.project_id,
    new.project_nummer,
    new.project_title,
    new.tool_key,
    new.payload,
    new.requested_quantity,
    new.row_count,
    new.filled_row_count,
    new.status,
    new.updated_by,
    new.last_editor_source
  );

  return new;
end;
$$;

drop trigger if exists project_tool_forms_set_updated_at on lab.project_tool_forms;
create trigger project_tool_forms_set_updated_at
before update on lab.project_tool_forms
for each row
execute function lab.set_updated_at();

drop trigger if exists project_tool_forms_record_version on lab.project_tool_forms;
create trigger project_tool_forms_record_version
after insert or update on lab.project_tool_forms
for each row
execute function lab.record_project_tool_form_version();

drop trigger if exists project_tool_sample_requests_set_updated_at on lab.project_tool_sample_requests;
create trigger project_tool_sample_requests_set_updated_at
before update on lab.project_tool_sample_requests
for each row
execute function lab.set_updated_at();

drop trigger if exists project_tool_exports_set_updated_at on lab.project_tool_exports;
create trigger project_tool_exports_set_updated_at
before update on lab.project_tool_exports
for each row
execute function lab.set_updated_at();

alter table lab.project_tool_forms enable row level security;
alter table lab.project_tool_form_versions enable row level security;
alter table lab.project_tool_sample_requests enable row level security;
alter table lab.project_tool_exports enable row level security;

-- project_tool_forms: open lezen/schrijven (anon/authenticated) zodat desktoptool en webapp kunnen syncen.
drop policy if exists "lab_forms_read_public" on lab.project_tool_forms;
create policy "lab_forms_read_public"
on lab.project_tool_forms
for select
to anon, authenticated
using (true);

drop policy if exists "lab_forms_insert_public" on lab.project_tool_forms;
create policy "lab_forms_insert_public"
on lab.project_tool_forms
for insert
to anon, authenticated
with check (true);

drop policy if exists "lab_forms_update_public" on lab.project_tool_forms;
create policy "lab_forms_update_public"
on lab.project_tool_forms
for update
to anon, authenticated
using (true)
with check (true);

-- versions: alleen service_role hoeft te kunnen lezen.
drop policy if exists "lab_form_versions_read_service_role" on lab.project_tool_form_versions;
create policy "lab_form_versions_read_service_role"
on lab.project_tool_form_versions
for select
to service_role
using (true);

-- sample requests: open lezen/schrijven; verwijderen via service_role (webapp route).
drop policy if exists "lab_sample_requests_read_public" on lab.project_tool_sample_requests;
create policy "lab_sample_requests_read_public"
on lab.project_tool_sample_requests
for select
to anon, authenticated
using (true);

drop policy if exists "lab_sample_requests_insert_public" on lab.project_tool_sample_requests;
create policy "lab_sample_requests_insert_public"
on lab.project_tool_sample_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "lab_sample_requests_update_public" on lab.project_tool_sample_requests;
create policy "lab_sample_requests_update_public"
on lab.project_tool_sample_requests
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "lab_sample_requests_delete_service_role" on lab.project_tool_sample_requests;
create policy "lab_sample_requests_delete_service_role"
on lab.project_tool_sample_requests
for delete
to service_role
using (true);

drop policy if exists "lab_sample_requests_delete_public" on lab.project_tool_sample_requests;
create policy "lab_sample_requests_delete_public"
on lab.project_tool_sample_requests
for delete
to anon, authenticated
using (true);

-- exports: open lezen/schrijven voor registratie + beheer; verwijderen via service_role.
drop policy if exists "lab_tool_exports_read_public" on lab.project_tool_exports;
create policy "lab_tool_exports_read_public"
on lab.project_tool_exports
for select
to anon, authenticated
using (true);

drop policy if exists "lab_tool_exports_insert_public" on lab.project_tool_exports;
create policy "lab_tool_exports_insert_public"
on lab.project_tool_exports
for insert
to anon, authenticated
with check (true);

drop policy if exists "lab_tool_exports_update_public" on lab.project_tool_exports;
create policy "lab_tool_exports_update_public"
on lab.project_tool_exports
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "lab_tool_exports_delete_service_role" on lab.project_tool_exports;
create policy "lab_tool_exports_delete_service_role"
on lab.project_tool_exports
for delete
to service_role
using (true);

-- Grants (na tabellen):
grant all on all tables in schema lab to service_role;
grant all on all sequences in schema lab to service_role;

grant select, insert, update on lab.project_tool_forms to anon, authenticated;
grant select on lab.project_tool_form_versions to service_role;

grant select, insert, update, delete on lab.project_tool_sample_requests to anon, authenticated;
grant select, insert, update on lab.project_tool_exports to anon, authenticated;

comment on schema lab is
'Gedeelde labtooling tussen de SILT Labplanning webapp en SILT Suite desktoptool.';

comment on table lab.project_tool_forms is
'Actuele uitwisseltabel voor webapp en desktoptool. Startend met volumiek-invoer.';

comment on table lab.project_tool_form_versions is
'Automatische snapshots van project_tool_forms na elke insert of update.';

comment on table lab.project_tool_sample_requests is
'Gevraagde monsters per project/boring/proef (tool_key). Wordt gebruikt om monsterselecties tussen planner en SILT Suite te delen.';

comment on table lab.project_tool_exports is
'Log van exports (bijv. PDF) zodat Beheer kan beslissen of tooldata opgeschoond mag worden.';

do $block$
begin
  alter role authenticator set pgrst.db_schemas = 'public,storage,graphql_public,lab';
exception
  when insufficient_privilege then
    raise notice 'Kon exposed schemas niet automatisch aanpassen. Voeg schema lab handmatig toe via Settings > API > Exposed schemas.';
end;
$block$;

notify pgrst, 'reload config';
