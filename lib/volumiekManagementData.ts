import "server-only";

import {
  projectTests as mockProjectTests,
  projects as mockProjects,
} from "@/lib/mockData";
import {
  createSupabaseServerClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase/server";
import {
  applyVolumiekSampleRequests,
  countFilledVolumiekRows,
  createDefaultVolumiekState,
  normalizeVolumiekState,
  volumiekToolKey,
  type VolumiekExportRecord,
  type VolumiekManagementData,
  type VolumiekProjectRecord,
  type VolumiekSampleRequest,
} from "@/lib/volumiek";
import type { ProjectPlanningPriority } from "@/lib/types";

interface DatabaseProjectRow {
  id: string;
  source_nummer: number | string | null;
  title: string;
  company_name: string | null;
  planning_priority: ProjectPlanningPriority | null;
  deadline: string | null;
  raw_payload: Record<string, unknown> | null;
}

interface DatabaseRequestTestRow {
  project_id: string;
  test_code: string;
  quantity: number | string | null;
}

interface DatabaseVolumiekFormRow {
  id: string;
  project_id: string | null;
  project_nummer: number | string;
  project_title: string | null;
  payload: Record<string, unknown> | null;
  requested_quantity: number | string | null;
  row_count: number | string | null;
  updated_at: string | null;
  updated_by: string | null;
  last_editor_source: string | null;
}

interface DatabaseSampleRequestRow {
  id: string;
  project_id: string | null;
  project_nummer: number | string;
  project_title: string | null;
  tool_key: string;
  boring: string;
  monster: string;
  diepte_van_cm: number | string | null;
  diepte_tot_cm: number | string | null;
  notes: string | null;
  updated_at: string | null;
  updated_by: string | null;
  last_editor_source: string | null;
}

interface DatabaseExportRow {
  id: string;
  project_nummer: number | string;
  output_filename: string;
  exported_at: string | null;
  exported_by: string | null;
  cleanup_status: string | null;
  cleanup_by: string | null;
  cleanup_at: string | null;
  meta: Record<string, unknown> | null;
  last_editor_source: string | null;
}

function toDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function normalizeProjectPriority(
  value: ProjectPlanningPriority | string | null | undefined,
): ProjectPlanningPriority {
  return value === "Spoed" ? "Spoed" : "Standaard";
}

function readEstimatedHours(rawPayload: Record<string, unknown> | null | undefined) {
  if (!rawPayload) {
    return null;
  }

  return toNullableNumber(rawPayload.Gepland as number | string | null | undefined);
}

function toDepthText(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value).trim();
}

function mapSampleRequestRow(row: DatabaseSampleRequestRow): VolumiekSampleRequest {
  return {
    id: row.id,
    boring: row.boring,
    monster: row.monster,
    diepteVanCm: toDepthText(row.diepte_van_cm),
    diepteTotCm: toDepthText(row.diepte_tot_cm),
    notes: row.notes,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    lastEditorSource: row.last_editor_source,
  };
}


function mapExportRow(row: DatabaseExportRow): VolumiekExportRecord {
  const cleanupStatus =
    row.cleanup_status === "bewaren" || row.cleanup_status === "verwijderen"
      ? row.cleanup_status
      : "open";

  return {
    id: row.id,
    outputFilename: row.output_filename,
    exportedAt: row.exported_at,
    exportedBy: row.exported_by,
    cleanupStatus,
    cleanupBy: row.cleanup_by,
    cleanupAt: row.cleanup_at,
    meta: row.meta,
    lastEditorSource: row.last_editor_source,
  };
}

function compareRecords(a: VolumiekProjectRecord, b: VolumiekProjectRecord) {
  if (a.planningPriority !== b.planningPriority) {
    return a.planningPriority === "Spoed" ? -1 : 1;
  }

  const aNummer = Number(a.projectNummer);
  const bNummer = Number(b.projectNummer);

  if (
    Number.isFinite(aNummer) &&
    Number.isFinite(bNummer) &&
    aNummer !== bNummer
  ) {
    return aNummer - bNummer;
  }

  return a.title.localeCompare(b.title, "nl-NL");
}

function buildMockVolumiekData(): VolumiekManagementData {
  const vgProjects = mockProjects
    .map((project): VolumiekProjectRecord | null => {
      const requestedQuantity = mockProjectTests
        .filter((test) => test.projectId === project.id && test.testCode === "VGW")
        .reduce((total, test) => total + test.quantity, 0);

      if (requestedQuantity <= 0 || !project.sourceNummer) {
        return null;
      }

      const state = createDefaultVolumiekState(
        project.title,
        project.sourceNummer,
        requestedQuantity,
      );

      return {
        projectNummer: project.sourceNummer,
        projectId: project.id,
        title: project.title,
        companyName: project.companyName,
        planningPriority: project.planningPriority,
        deadline: project.deadline,
        sourceEstimatedHours: project.sourceEstimatedHours ?? null,
        requestedQuantity,
        sampleRequests: [],
        exports: [],
        state,
        formId: null,
        updatedAt: null,
        updatedBy: null,
        lastEditorSource: null,
        rowCount: state.rows.length,
        filledRowCount: countFilledVolumiekRows(state),
      } satisfies VolumiekProjectRecord;
    })
    .filter((project): project is VolumiekProjectRecord => project !== null)
    .sort(compareRecords);

  return {
    projects: vgProjects,
    source: "mock",
    warning:
      "Supabase-omgeving ontbreekt of het lab-schema is nog niet ingericht, daarom wordt mockdata gebruikt.",
  };
}

export async function getVolumiekManagementData(): Promise<VolumiekManagementData> {
  if (!hasSupabaseEnvironment()) {
    return buildMockVolumiekData();
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return buildMockVolumiekData();
  }

  try {
    const [projectsResponse, testsResponse, formsResponse] = await Promise.all([
      supabase
        .from("lab_projects")
        .select(
          "id, source_nummer, title, company_name, planning_priority, deadline, raw_payload",
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("lab_request_tests")
        .select("project_id, test_code, quantity")
        .eq("test_code", "VGW"),
      supabase
        .schema("lab")
        .from("project_tool_forms")
        .select(
          "id, project_id, project_nummer, project_title, payload, requested_quantity, row_count, updated_at, updated_by, last_editor_source",
        )
        .eq("tool_key", volumiekToolKey),
    ]);

    if (projectsResponse.error || testsResponse.error || formsResponse.error) {
      throw new Error(
        [
          projectsResponse.error?.message,
          testsResponse.error?.message,
          formsResponse.error?.message,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const requestsByProjectId = new Map<string, number>();

    for (const row of testsResponse.data ?? []) {
      const typedRow = row as DatabaseRequestTestRow;
      const currentValue = requestsByProjectId.get(typedRow.project_id) ?? 0;
      requestsByProjectId.set(
        typedRow.project_id,
        currentValue + Math.max(1, Math.round(toNumber(typedRow.quantity, 1))),
      );
    }

    const formsByProjectNummer = new Map<string, DatabaseVolumiekFormRow>();

    for (const row of formsResponse.data ?? []) {
      const typedRow = row as DatabaseVolumiekFormRow;
      formsByProjectNummer.set(String(typedRow.project_nummer), typedRow);
    }

    const projectRowsByNummer = new Map<string, DatabaseProjectRow>();

    for (const row of projectsResponse.data ?? []) {
      const typedRow = row as DatabaseProjectRow;

      if (typedRow.source_nummer === null || typedRow.source_nummer === undefined) {
        continue;
      }

      projectRowsByNummer.set(String(typedRow.source_nummer), typedRow);
    }

    const candidateProjectNummers = new Set<string>([
      ...formsByProjectNummer.keys(),
      ...[...projectRowsByNummer.values()]
        .filter((row) => (requestsByProjectId.get(row.id) ?? 0) > 0)
        .map((row) => String(row.source_nummer)),
    ]);

    const candidateProjectNummerValues = [...candidateProjectNummers]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const sampleRequestsByProjectNummer = new Map<string, VolumiekSampleRequest[]>();

    if (candidateProjectNummerValues.length > 0) {
      const sampleRequestsResponse = await supabase
        .schema("lab")
        .from("project_tool_sample_requests")
        .select(
          "id, project_id, project_nummer, project_title, tool_key, boring, monster, diepte_van_cm, diepte_tot_cm, notes, updated_at, updated_by, last_editor_source",
        )
        .eq("tool_key", volumiekToolKey)
        .in("project_nummer", candidateProjectNummerValues);

      if (sampleRequestsResponse.error) {
        throw new Error(sampleRequestsResponse.error.message);
      }

      for (const row of sampleRequestsResponse.data ?? []) {
        const typedRow = row as DatabaseSampleRequestRow;
        const projectNummer = String(typedRow.project_nummer);
        const existing = sampleRequestsByProjectNummer.get(projectNummer) ?? [];
        existing.push(mapSampleRequestRow(typedRow));
        sampleRequestsByProjectNummer.set(projectNummer, existing);
      }

      for (const [projectNummer, rows] of sampleRequestsByProjectNummer) {
        rows.sort(
          (left, right) =>
            left.boring.localeCompare(right.boring, "nl-NL") ||
            left.monster.localeCompare(right.monster, "nl-NL"),
        );
        sampleRequestsByProjectNummer.set(projectNummer, rows);
      }
    }

    const exportsByProjectNummer = new Map<string, VolumiekExportRecord[]>();

    if (candidateProjectNummerValues.length > 0) {
      const exportsResponse = await supabase
        .schema("lab")
        .from("project_tool_exports")
        .select(
          "id, project_nummer, output_filename, exported_at, exported_by, cleanup_status, cleanup_by, cleanup_at, meta, last_editor_source",
        )
        .eq("tool_key", volumiekToolKey)
        .in("project_nummer", candidateProjectNummerValues)
        .order("exported_at", { ascending: false });

      if (exportsResponse.error) {
        throw new Error(exportsResponse.error.message);
      }

      for (const row of exportsResponse.data ?? []) {
        const typedRow = row as DatabaseExportRow;
        const projectNummer = String(typedRow.project_nummer);
        const existing = exportsByProjectNummer.get(projectNummer) ?? [];
        existing.push(mapExportRow(typedRow));
        exportsByProjectNummer.set(projectNummer, existing);
      }
    }

    const projects: VolumiekProjectRecord[] = [];

    for (const projectNummer of candidateProjectNummers) {
      const projectRow = projectRowsByNummer.get(projectNummer);
      const formRow = formsByProjectNummer.get(projectNummer);
      const sampleRequests = sampleRequestsByProjectNummer.get(projectNummer) ?? [];
      const exports = exportsByProjectNummer.get(projectNummer) ?? [];
      const requestedFromProject = projectRow
        ? requestsByProjectId.get(projectRow.id) ?? 0
        : 0;

      const requestedQuantity = Math.max(
        sampleRequests.length,
        requestedFromProject,
        Math.max(1, Math.round(toNumber(formRow?.requested_quantity, 0))),
      );

      const title =
        projectRow?.title ??
        formRow?.project_title ??
        `Volumiek project ${projectNummer}`;

      const normalizedState = normalizeVolumiekState(formRow?.payload, {
        projectName: title,
        projectNummer,
        requestedQuantity,
      });
      const state = applyVolumiekSampleRequests(normalizedState, sampleRequests);

      projects.push({
        projectNummer,
        projectId: projectRow?.id ?? formRow?.project_id ?? null,
        title,
        companyName: projectRow?.company_name ?? null,
        planningPriority: normalizeProjectPriority(projectRow?.planning_priority),
        deadline: toDateKey(projectRow?.deadline),
        sourceEstimatedHours: readEstimatedHours(projectRow?.raw_payload),
        requestedQuantity,
        sampleRequests,
        exports,
        state,
        formId: formRow?.id ?? null,
        updatedAt: formRow?.updated_at ?? null,
        updatedBy: formRow?.updated_by ?? null,
        lastEditorSource: formRow?.last_editor_source ?? null,
        rowCount: state.rows.length,
        filledRowCount: countFilledVolumiekRows(state),
      });
    }

    return {
      projects: projects.sort(compareRecords),
      source: "supabase",
      warning:
        projects.length === 0
          ? "Er zijn nog geen volumiek-aanvragen gevonden. Zodra een project een VGW-proef heeft, verschijnt het hier."
          : undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende Supabase-fout";
    const extra =
      message.includes("project_tool_forms") ||
      message.includes("project_tool_sample_requests") ||
      message.includes("project_tool_exports") ||
      message.includes('schema "lab"')
        ? " Run eerst `supabase/lab_tooling_bootstrap.sql` in Supabase."
        : "";

    return {
      ...buildMockVolumiekData(),
      warning: `Volumiek-data kon niet worden geladen (${message}).${extra}`,
    };
  }
}
