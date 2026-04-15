alter table if exists public.employees
  add column if not exists lab_availability jsonb not null default '{
    "monday": {"available": true, "startHour": 8, "endHour": 17},
    "tuesday": {"available": true, "startHour": 8, "endHour": 17},
    "wednesday": {"available": true, "startHour": 8, "endHour": 17},
    "thursday": {"available": true, "startHour": 8, "endHour": 17},
    "friday": {"available": true, "startHour": 8, "endHour": 17}
  }'::jsonb;
