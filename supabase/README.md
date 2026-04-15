# Supabase setup

## Bestanden

- `bootstrap.sql`
  zet een lege Supabase in één keer klaar inclusief tabellen, functies, policies en startdata
- `schema.sql`
  maakt alleen de structuur aan: tabellen, indexes, triggers en lees-policies
- `seed.sql`
  vult alleen de startdata voor medewerkers, proefcodes en voorbeeldtaken
- `import_lab_rows.sql`
  zet ruwe bronregels met `Type = Lab` om naar genormaliseerde projecten
- `fix_numeric_overflow.sql`
  repareert bestaande databases waar `duration_hours` nog te klein was gedefinieerd
- `add_project_planning_fields.sql`
  voegt projectprioriteit en deadline toe aan een bestaande database
- `add_project_test_sync.sql`
  voegt de koppeling toe tussen projectproeven en planner-taken
- `add_project_notes.sql`
  voegt een apart opmerkingenveld toe aan projecten
- `add_employee_lab_availability.sql`
  voegt weekbeschikbaarheid voor labwerk toe aan medewerkers

## Aanbevolen volgorde

1. Open de SQL Editor in Supabase.
2. Bij een volledig lege database: run alleen `bootstrap.sql`.
3. Alleen als je bewust modulair wilt werken: eerst `schema.sql`, daarna `seed.sql`.
4. Als je database al bestond voordat de overflow-fix is toegevoegd: run daarna ook `fix_numeric_overflow.sql`.
5. Als je bestaande projecten wilt kunnen markeren als `Standaard` of `Spoed` en een deadline wilt opslaan: run ook `add_project_planning_fields.sql`.
6. Als je projecten als losse proeven wilt laten syncen naar planner-taken: run ook `add_project_test_sync.sql`.
7. Als je projectopmerkingen apart wilt opslaan: run ook `add_project_notes.sql`.
8. Als je weekbeschikbaarheid voor medewerkers wilt gebruiken: run ook `add_employee_lab_availability.sql`.
9. Start daarna de app opnieuw met `npm.cmd run dev`.

Belangrijk:

- `seed.sql` en `import_lab_rows.sql` zijn niet bedoeld als eerste script op een lege database.
- Als je `seed.sql` direct runt zonder `schema.sql`, krijg je fouten zoals `relation "public.lab_projects" does not exist`.
- Voor uploads vanuit de webapp heb je naast de publieke variabelen ook `SUPABASE_SERVICE_ROLE_KEY` nodig in `.env.local`.

## Excel bronstructuur

De gecontroleerde export bevat deze vaste kolommen:

- `Type`
- `Taak`
- `Nummer`
- `Fase`
- `Afgerond op`
- `Omschrijving`
- `Aantal`
- `Eenheid`
- `Tijschrijven`
- `Werkelijk`
- `Gepland`
- `Begindatum`
- `Einddatum`
- `eindtijd`
- `Bedrijf`
- `Offerte / opdracht`
- `Onderdeel`
- `Tonen als taak is afgerond`
- `Tonen als offerte of opdracht is afgerond`
- `Parentonderdeel`
- `Voorkeursmedewerker`
- `Groep`
- `Bedrijf - offerte / opdracht`
- `Gepland bij`
- `Contract`

Alleen regels waar `Type = Lab` hoeven in de planner terecht te komen.

## Advies voor Omschrijving

De huidige export gebruikt vrije tekst zoals:

- `8 x volumegewichten conform labopgave`
- `5 x samendrukkingsproef en 9 x VGW`
- `11 x volumiek + 7 x korrelgrootte + 4 x Torvane`

Dat is lastig 100% betrouwbaar te parseren. Daarom is dit de aanbevolen
machine-leesbare afspraak:

```text
LABSPEC: VGW=8; KVD=4; SDP=2
```

Of uitgebreider:

```text
LABSPEC: VGW=11; KVD=7; TV=4
```

## Aanbevolen proefcodes

- `VGW` = Volumiek gewicht
- `KVD` = Korrelverdeling
- `SDP` = Samendrukkingsproef
- `OED` = Oedometerproef
- `ATB` = Atterberg-grenzen
- `TRIAX` = Triaxiaal
- `TV` = Torvane
- `ZKF` = Zeefkromme

## Belangrijke noot over schrijven

De app leest nu veilig met de `anon` key uit Supabase. Voor het daadwerkelijk
opslaan van sleepacties in productie raad ik aan om daarna ofwel:

1. Supabase Auth toe te voegen en schrijfrechten aan ingelogde gebruikers te geven.
2. Of server-side writes via een Next.js route met de service-role key te doen.

Met alleen open `anon` schrijfrechten zou iedereen met de publieke sleutel de
planning kunnen aanpassen.

## Upload via de webapp

De dashboardpagina bevat nu een uploadknop voor `.xlsx` bestanden.

Werking:

1. gebruiker uploadt het exportbestand in de webapp
2. de server leest het Excel-bestand uit
3. alle bronregels gaan naar `source_export_rows`
4. alleen regels met `Type = Lab` worden doorgezet naar `lab_projects`
5. planner-taken worden toegevoegd of bijgewerkt in `planner_tasks`

Als `Omschrijving` een expliciete `LABSPEC:` notatie bevat, dan worden daar
direct afzonderlijke planner-taken en regels in `lab_request_tests` van
gemaakt. Zonder `LABSPEC:` wordt voorlopig één generieke labtaak per bronregel
aangemaakt.

Bij generieke regels zonder `LABSPEC:` wordt een groot bron-aantal zoals `1829`
niet meer als planduur opgeslagen. De importer zet dan bewust een conservatieve
planduur van `1` uur en bewaart het werkelijke bron-aantal apart als hoeveelheid.
