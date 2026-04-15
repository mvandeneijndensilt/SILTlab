alter table if exists public.lab_projects
  add column if not exists planning_priority text not null default 'Standaard'
    check (planning_priority in ('Standaard', 'Spoed'));

alter table if exists public.lab_projects
  add column if not exists deadline date;

create index if not exists idx_lab_projects_priority_deadline
  on public.lab_projects (planning_priority, deadline);
