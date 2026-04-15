alter table if exists public.lab_test_catalog
  alter column default_duration_hours type numeric(10,2);

alter table if exists public.lab_request_tests
  alter column duration_hours_per_item type numeric(10,2);

alter table if exists public.planner_tasks
  alter column duration_hours type numeric(10,2);
