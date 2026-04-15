insert into public.lab_projects (
  source_nummer,
  source_type,
  title,
  company_name,
  offer_assignment,
  component,
  group_name,
  contract,
  preferred_employee_name,
  status,
  source_description,
  source_quantity,
  source_unit,
  source_start_date,
  source_end_date,
  source_end_time,
  source_planned_at,
  source_company_offer_assignment,
  raw_payload
)
select
  r.nummer,
  coalesce(r.type, 'Lab'),
  coalesce(r.taak, concat('Lab-project ', r.nummer)),
  r.bedrijf,
  r.offerte_opdracht,
  r.onderdeel,
  r.groep,
  r.contract,
  r.voorkeursmedewerker,
  r.fase,
  r.omschrijving,
  r.aantal,
  r.eenheid,
  r.begindatum,
  r.einddatum,
  r.eindtijd,
  r.gepland_bij,
  r.bedrijf_offerte_opdracht,
  coalesce(r.raw_payload, to_jsonb(r))
from public.source_lab_rows r
on conflict (source_nummer) do update
set
  source_type = excluded.source_type,
  title = excluded.title,
  company_name = excluded.company_name,
  offer_assignment = excluded.offer_assignment,
  component = excluded.component,
  group_name = excluded.group_name,
  contract = excluded.contract,
  preferred_employee_name = excluded.preferred_employee_name,
  status = excluded.status,
  source_description = excluded.source_description,
  source_quantity = excluded.source_quantity,
  source_unit = excluded.source_unit,
  source_start_date = excluded.source_start_date,
  source_end_date = excluded.source_end_date,
  source_end_time = excluded.source_end_time,
  source_planned_at = excluded.source_planned_at,
  source_company_offer_assignment = excluded.source_company_offer_assignment,
  raw_payload = excluded.raw_payload,
  updated_at = timezone('utc', now());

-- Aanbevolen vervolgstap:
-- voeg daarna per project regels toe aan lab_request_tests op basis van een
-- expliciete LABSPEC-notatie in source_description, bijvoorbeeld:
--
-- LABSPEC: VGW=8; KVD=4; SDP=2
