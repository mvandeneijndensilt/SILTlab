delete from public.lab_request_tests a
using public.lab_request_tests b
where a.project_id = b.project_id
  and a.test_code = b.test_code
  and a.id > b.id;

create unique index if not exists idx_lab_request_tests_project_code
  on public.lab_request_tests (project_id, test_code);

alter table if exists public.planner_tasks
  add column if not exists request_test_id uuid references public.lab_request_tests(id) on delete cascade;

create unique index if not exists idx_planner_tasks_request_test
  on public.planner_tasks (request_test_id)
  where request_test_id is not null;
