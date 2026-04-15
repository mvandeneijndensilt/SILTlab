create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text,
  specialties text[] not null default '{}',
  capacity_hours numeric(5,2) not null default 7.5 check (capacity_hours > 0),
  lab_availability jsonb not null default '{
    "monday": {"available": true, "startHour": 8, "endHour": 17},
    "tuesday": {"available": true, "startHour": 8, "endHour": 17},
    "wednesday": {"available": true, "startHour": 8, "endHour": 17},
    "thursday": {"available": true, "startHour": 8, "endHour": 17},
    "friday": {"available": true, "startHour": 8, "endHour": 17}
  }'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lab_projects (
  id uuid primary key default gen_random_uuid(),
  source_nummer bigint unique,
  source_type text not null default 'Lab',
  title text not null,
  company_name text,
  offer_assignment text,
  component text,
  group_name text,
  contract text,
  preferred_employee_name text,
  status text,
  planning_priority text not null default 'Standaard'
    check (planning_priority in ('Standaard', 'Spoed')),
  deadline date,
  source_description text,
  project_notes text,
  source_quantity numeric(12,2),
  source_unit text,
  source_start_date date,
  source_end_date date,
  source_end_time text,
  source_planned_at text,
  source_company_offer_assignment text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lab_test_catalog (
  code text primary key,
  name text not null,
  default_duration_hours numeric(10,2) not null check (default_duration_hours > 0),
  default_priority text not null default 'Middel'
    check (default_priority in ('Hoog', 'Middel', 'Laag')),
  active boolean not null default true,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lab_request_tests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.lab_projects(id) on delete cascade,
  test_code text not null references public.lab_test_catalog(code),
  test_name text not null,
  quantity integer not null check (quantity > 0),
  duration_hours_per_item numeric(10,2) not null check (duration_hours_per_item > 0),
  source_fragment text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, test_code)
);

create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.lab_projects(id) on delete set null,
  request_test_id uuid references public.lab_request_tests(id) on delete cascade,
  source_nummer bigint,
  title text not null,
  project_name text not null,
  description text,
  priority text not null default 'Middel'
    check (priority in ('Hoog', 'Middel', 'Laag')),
  duration_hours numeric(10,2) not null check (duration_hours > 0),
  quantity integer not null default 1 check (quantity > 0),
  employee_id uuid references public.employees(id) on delete set null,
  scheduled_date date,
  start_hour numeric(4,2),
  status text not null default 'nieuw',
  source_omschrijving text,
  source_type text not null default 'Lab',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint planner_tasks_start_hour_check
    check (start_hour is null or (start_hour >= 0 and start_hour < 24))
);

create table if not exists public.source_import_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  source_system text not null default 'excel_export',
  note text,
  imported_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_export_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.source_import_batches(id) on delete cascade,
  source_row_number integer not null,
  type text,
  taak text,
  nummer bigint,
  fase text,
  afgerond_op timestamptz,
  omschrijving text,
  aantal numeric(12,2),
  eenheid text,
  tijdschrijven text,
  werkelijk numeric(12,2),
  gepland numeric(12,2),
  begindatum date,
  einddatum date,
  eindtijd text,
  bedrijf text,
  offerte_opdracht text,
  onderdeel text,
  tonen_als_taak_is_afgerond text,
  tonen_als_offerte_of_opdracht_is_afgerond text,
  parentonderdeel text,
  voorkeursmedewerker text,
  groep text,
  bedrijf_offerte_opdracht text,
  gepland_bij text,
  contract text,
  row_hash text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (batch_id, source_row_number)
);

create index if not exists idx_lab_projects_source_nummer
  on public.lab_projects (source_nummer);

create index if not exists idx_lab_projects_priority_deadline
  on public.lab_projects (planning_priority, deadline);

create index if not exists idx_planner_tasks_employee_date
  on public.planner_tasks (employee_id, scheduled_date, start_hour);

create index if not exists idx_planner_tasks_project
  on public.planner_tasks (project_id);

create unique index if not exists idx_planner_tasks_request_test
  on public.planner_tasks (request_test_id)
  where request_test_id is not null;

create index if not exists idx_source_export_rows_type
  on public.source_export_rows (type);

create index if not exists idx_source_export_rows_nummer
  on public.source_export_rows (nummer);

create index if not exists idx_lab_request_tests_project
  on public.lab_request_tests (project_id);

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists lab_projects_set_updated_at on public.lab_projects;
create trigger lab_projects_set_updated_at
before update on public.lab_projects
for each row
execute function public.set_updated_at();

drop trigger if exists lab_test_catalog_set_updated_at on public.lab_test_catalog;
create trigger lab_test_catalog_set_updated_at
before update on public.lab_test_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists planner_tasks_set_updated_at on public.planner_tasks;
create trigger planner_tasks_set_updated_at
before update on public.planner_tasks
for each row
execute function public.set_updated_at();

create or replace view public.source_lab_rows as
select *
from public.source_export_rows
where type = 'Lab';

alter table public.employees enable row level security;
alter table public.lab_projects enable row level security;
alter table public.lab_test_catalog enable row level security;
alter table public.lab_request_tests enable row level security;
alter table public.planner_tasks enable row level security;
alter table public.source_import_batches enable row level security;
alter table public.source_export_rows enable row level security;

drop policy if exists "anon_read_employees" on public.employees;
create policy "anon_read_employees"
on public.employees
for select
to anon
using (true);

drop policy if exists "anon_read_lab_projects" on public.lab_projects;
create policy "anon_read_lab_projects"
on public.lab_projects
for select
to anon
using (true);

drop policy if exists "anon_read_lab_test_catalog" on public.lab_test_catalog;
create policy "anon_read_lab_test_catalog"
on public.lab_test_catalog
for select
to anon
using (true);

drop policy if exists "anon_read_lab_request_tests" on public.lab_request_tests;
create policy "anon_read_lab_request_tests"
on public.lab_request_tests
for select
to anon
using (true);

drop policy if exists "anon_read_planner_tasks" on public.planner_tasks;
create policy "anon_read_planner_tasks"
on public.planner_tasks
for select
to anon
using (true);

comment on table public.source_export_rows is
'Ruwe import van de Excel-export met alle bronkolommen. Hou deze tabel bij voorkeur admin-only.';

comment on view public.source_lab_rows is
'Gefilterde view op bronregels waar Type = Lab.';
