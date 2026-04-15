alter table if exists public.lab_projects
  add column if not exists project_notes text;
