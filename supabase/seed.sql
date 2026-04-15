insert into public.employees (
  slug,
  name,
  role,
  specialties,
  capacity_hours,
  lab_availability
)
values
  (
    'jan',
    'Jan',
    'Geotechnisch analist',
    array['Oedometer', 'Monsteropbouw'],
    7.5,
    '{
      "monday": {"available": true, "startHour": 8, "endHour": 17},
      "tuesday": {"available": true, "startHour": 8, "endHour": 17},
      "wednesday": {"available": false, "startHour": 8, "endHour": 17},
      "thursday": {"available": true, "startHour": 8, "endHour": 17},
      "friday": {"available": true, "startHour": 8, "endHour": 17}
    }'::jsonb
  ),
  (
    'piet',
    'Piet',
    'Specialist bodemclassificatie',
    array['Atterberg', 'Vochtbepaling'],
    7.5,
    '{
      "monday": {"available": false, "startHour": 8, "endHour": 17},
      "tuesday": {"available": true, "startHour": 8, "endHour": 17},
      "wednesday": {"available": true, "startHour": 8, "endHour": 17},
      "thursday": {"available": true, "startHour": 8, "endHour": 17},
      "friday": {"available": true, "startHour": 8, "endHour": 13}
    }'::jsonb
  ),
  (
    'klaas',
    'Klaas',
    'Triaxiaal medewerker',
    array['Triaxiaal', 'Instrumentatie'],
    7.5,
    '{
      "monday": {"available": true, "startHour": 8, "endHour": 17},
      "tuesday": {"available": true, "startHour": 10, "endHour": 17},
      "wednesday": {"available": true, "startHour": 8, "endHour": 17},
      "thursday": {"available": false, "startHour": 8, "endHour": 17},
      "friday": {"available": true, "startHour": 8, "endHour": 17}
    }'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  role = excluded.role,
  specialties = excluded.specialties,
  capacity_hours = excluded.capacity_hours,
  lab_availability = excluded.lab_availability;

insert into public.lab_test_catalog (
  code,
  name,
  default_duration_hours,
  default_priority,
  description
)
values
  ('VGW', 'Volumiek gewicht', 0.50, 'Middel', 'Standaard volumiek gewicht / watergehalte'),
  ('KVD', 'Korrelverdeling', 0.75, 'Middel', 'Korrelverdeling of korrelgrootte'),
  ('SDP', 'Samendrukkingsproef', 2.50, 'Hoog', 'Samendrukkingsproef / samendrukking'),
  ('OED', 'Oedometerproef', 2.50, 'Hoog', 'Oedometer of samendrukking'),
  ('ATB', 'Atterberg-grenzen', 1.50, 'Middel', 'Vloeigrens en uitrolgrens'),
  ('TRIAX', 'Triaxiaal', 3.00, 'Hoog', 'Triaxiaal opbouwen of beproeven'),
  ('TV', 'Torvane', 0.25, 'Laag', 'Torvane-bepaling'),
  ('ZKF', 'Zeefkromme', 0.75, 'Middel', 'Zeefkromme')
on conflict (code) do update
set
  name = excluded.name,
  default_duration_hours = excluded.default_duration_hours,
  default_priority = excluded.default_priority,
  description = excluded.description;

insert into public.lab_projects (
  source_nummer,
  source_type,
  title,
  company_name,
  offer_assignment,
  component,
  status,
  source_description,
  source_quantity
)
values
  (
    2503090,
    'Lab',
    'Polderzettingsreeks',
    'Adcim B.V.',
    'Ontwikkeling Nieuwbouw (2503090)',
    'Voorbereiding door projectleider',
    'Nog doen',
    'LABSPEC: OED=1; VGW=2',
    3
  ),
  (
    2503010,
    'Lab',
    'Classificatie-intake',
    'Adcim B.V.',
    'Ophoogprogramma (2503010)',
    'Veldwerker',
    'Nog doen',
    'LABSPEC: ATB=1',
    1
  ),
  (
    2503215,
    'Lab',
    'Stabiliteitsscreening',
    'Adcim B.V.',
    'Optiflor terrein (2503215)',
    'Samendrukkingsproef',
    'Nog doen',
    'LABSPEC: TRIAX=1',
    1
  )
on conflict (source_nummer) do update
set
  title = excluded.title,
  company_name = excluded.company_name,
  offer_assignment = excluded.offer_assignment,
  component = excluded.component,
  status = excluded.status,
  source_description = excluded.source_description,
  source_quantity = excluded.source_quantity;

insert into public.lab_request_tests (
  project_id,
  test_code,
  test_name,
  quantity,
  duration_hours_per_item,
  source_fragment,
  notes
)
select
  p.id,
  'OED',
  'Oedometerproef',
  1,
  2.50,
  p.source_description,
  'Automatisch uit voorbeeld-LABSPEC geladen'
from public.lab_projects p
where p.source_nummer = 2503090
on conflict (project_id, test_code) do update
set
  quantity = excluded.quantity,
  duration_hours_per_item = excluded.duration_hours_per_item,
  source_fragment = excluded.source_fragment,
  notes = excluded.notes;

insert into public.lab_request_tests (
  project_id,
  test_code,
  test_name,
  quantity,
  duration_hours_per_item,
  source_fragment,
  notes
)
select
  p.id,
  'VGW',
  'Volumiek gewicht',
  2,
  0.50,
  p.source_description,
  'Automatisch uit voorbeeld-LABSPEC geladen'
from public.lab_projects p
where p.source_nummer = 2503090
on conflict (project_id, test_code) do update
set
  quantity = excluded.quantity,
  duration_hours_per_item = excluded.duration_hours_per_item,
  source_fragment = excluded.source_fragment,
  notes = excluded.notes;

insert into public.lab_request_tests (
  project_id,
  test_code,
  test_name,
  quantity,
  duration_hours_per_item,
  source_fragment,
  notes
)
select
  p.id,
  'ATB',
  'Atterberg-grenzen',
  1,
  1.50,
  p.source_description,
  'Automatisch uit voorbeeld-LABSPEC geladen'
from public.lab_projects p
where p.source_nummer = 2503010
on conflict (project_id, test_code) do update
set
  quantity = excluded.quantity,
  duration_hours_per_item = excluded.duration_hours_per_item,
  source_fragment = excluded.source_fragment,
  notes = excluded.notes;

insert into public.lab_request_tests (
  project_id,
  test_code,
  test_name,
  quantity,
  duration_hours_per_item,
  source_fragment,
  notes
)
select
  p.id,
  'TRIAX',
  'Triaxiaal',
  1,
  3.00,
  p.source_description,
  'Automatisch uit voorbeeld-LABSPEC geladen'
from public.lab_projects p
where p.source_nummer = 2503215
on conflict (project_id, test_code) do update
set
  quantity = excluded.quantity,
  duration_hours_per_item = excluded.duration_hours_per_item,
  source_fragment = excluded.source_fragment,
  notes = excluded.notes;

insert into public.planner_tasks (
  project_id,
  source_nummer,
  title,
  project_name,
  description,
  priority,
  duration_hours,
  quantity,
  source_omschrijving
)
select
  p.id,
  p.source_nummer,
  'Oedometerproef',
  p.title,
  'Automatisch uit het voorbeeldproject geladen',
  'Hoog',
  2.50,
  1,
  p.source_description
from public.lab_projects p
where p.source_nummer = 2503090
  and not exists (
    select 1
    from public.planner_tasks t
    where t.source_nummer = p.source_nummer
      and t.title = 'Oedometerproef'
  );

insert into public.planner_tasks (
  project_id,
  source_nummer,
  title,
  project_name,
  description,
  priority,
  duration_hours,
  quantity,
  source_omschrijving,
  source_type
)
select
  p.id,
  p.source_nummer,
  'Volumiek gewicht',
  p.title,
  'Automatisch uit het voorbeeldproject geladen',
  'Middel',
  1.00,
  2,
  p.source_description,
  'LabProef'
from public.lab_projects p
where p.source_nummer = 2503090
  and not exists (
    select 1
    from public.planner_tasks t
    where t.source_nummer = p.source_nummer
      and t.title = 'Volumiek gewicht'
  );

insert into public.planner_tasks (
  project_id,
  source_nummer,
  title,
  project_name,
  description,
  priority,
  duration_hours,
  quantity,
  source_omschrijving
)
select
  p.id,
  p.source_nummer,
  'Atterberg-grenzen',
  p.title,
  'Automatisch uit het voorbeeldproject geladen',
  'Middel',
  1.50,
  1,
  p.source_description
from public.lab_projects p
where p.source_nummer = 2503010
  and not exists (
    select 1
    from public.planner_tasks t
    where t.source_nummer = p.source_nummer
      and t.title = 'Atterberg-grenzen'
  );

insert into public.planner_tasks (
  project_id,
  source_nummer,
  title,
  project_name,
  description,
  priority,
  duration_hours,
  quantity,
  source_omschrijving
)
select
  p.id,
  p.source_nummer,
  'Triaxiaal opbouwen',
  p.title,
  'Automatisch uit het voorbeeldproject geladen',
  'Hoog',
  1.00,
  1,
  p.source_description
from public.lab_projects p
where p.source_nummer = 2503215
  and not exists (
    select 1
    from public.planner_tasks t
    where t.source_nummer = p.source_nummer
      and t.title = 'Triaxiaal opbouwen'
  );
