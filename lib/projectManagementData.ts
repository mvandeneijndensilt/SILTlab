import "server-only";

import {
  labTestCatalog as mockCatalog,
  projectTests as mockProjectTests,
  projects as mockProjects,
} from "@/lib/mockData";
import {
  createSupabaseServerClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase/server";
import type {
  LabProject,
  LabProjectTest,
  LabTestCatalogItem,
  PlannerDataSource,
  ProjectPlanningPriority,
  Task,
} from "@/lib/types";

interface DatabaseProjectRow {
  id: string;
  source_nummer: number | string | null;
  title: string;
  company_name: string | null;
  offer_assignment: string | null;
  status: string | null;
  planning_priority: ProjectPlanningPriority | null;
  deadline: string | null;
  source_description: string | null;
  project_notes: string | null;
  raw_payload: Record<string, unknown> | null;
}

interface DatabaseProjectTestRow {
  id: string;
  project_id: string;
  test_code: string;
  test_name: string;
  quantity: number | string;
  duration_hours_per_item: number | string;
  source_fragment: string | null;
  notes: string | null;
}

interface DatabaseCatalogRow {
  code: string;
  name: string;
  default_duration_hours: number | string;
  default_priority: Task["priority"];
  description: string | null;
}

export interface ProjectManagementData {
  projects: LabProject[];
  catalog: LabTestCatalogItem[];
  source: PlannerDataSource;
  warning?: string;
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

function toDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 10);
}

function normalizeProjectPriority(
  value: ProjectPlanningPriority | string | null | undefined,
): ProjectPlanningPriority {
  return value === "Spoed" ? "Spoed" : "Standaard";
}

function readEstimatedHoursFromRawPayload(
  rawPayload: Record<string, unknown> | null | undefined,
) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  return toNullableNumber(rawPayload.Gepland as number | string | null | undefined);
}

function mapCatalogRow(row: DatabaseCatalogRow): LabTestCatalogItem {
  return {
    code: row.code,
    name: row.name,
    defaultDurationHours: toNumber(row.default_duration_hours, 1),
    defaultPriority: row.default_priority,
    description: row.description,
  };
}

function mapTestRow(row: DatabaseProjectTestRow): LabProjectTest {
  const quantity = Math.max(1, Math.round(toNumber(row.quantity, 1)));
  const durationHoursPerItem = Math.max(
    0.25,
    toNumber(row.duration_hours_per_item, 1),
  );

  return {
    id: row.id,
    projectId: row.project_id,
    testCode: row.test_code,
    testName: row.test_name,
    quantity,
    durationHoursPerItem,
    totalDurationHours: quantity * durationHoursPerItem,
    sourceFragment: row.source_fragment,
    notes: row.notes,
  };
}

function compareProjects(a: LabProject, b: LabProject) {
  if (a.planningPriority !== b.planningPriority) {
    return a.planningPriority === "Spoed" ? -1 : 1;
  }

  if (a.deadline && b.deadline && a.deadline !== b.deadline) {
    return a.deadline.localeCompare(b.deadline);
  }

  if (a.deadline && !b.deadline) {
    return -1;
  }

  if (!a.deadline && b.deadline) {
    return 1;
  }

  return a.title.localeCompare(b.title, "nl-NL");
}

function withDerivedProjectFields(
  row: DatabaseProjectRow,
  tests: LabProjectTest[],
): LabProject {
  return {
    id: row.id,
    sourceNummer:
      row.source_nummer === null ? null : String(row.source_nummer),
    title: row.title,
    companyName: row.company_name,
    offerAssignment: row.offer_assignment,
    status: row.status,
    planningPriority: normalizeProjectPriority(row.planning_priority),
    deadline: toDateKey(row.deadline),
    sourceDescription: row.source_description,
    projectNotes: row.project_notes,
    sourceEstimatedHours: readEstimatedHoursFromRawPayload(row.raw_payload),
    taskCount: tests.length,
    queuedHours: tests.reduce(
      (total, test) => total + test.totalDurationHours,
      0,
    ),
    tests,
  };
}

export async function getProjectManagementData(): Promise<ProjectManagementData> {
  if (!hasSupabaseEnvironment()) {
    return {
      projects: mockProjects.map((project) => ({
        ...project,
        tests: mockProjectTests.filter((test) => test.projectId === project.id),
      })),
      catalog: mockCatalog,
      source: "mock",
      warning:
        "Supabase-omgeving ontbreekt, daarom wordt mockdata gebruikt.",
    };
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      projects: mockProjects.map((project) => ({
        ...project,
        tests: mockProjectTests.filter((test) => test.projectId === project.id),
      })),
      catalog: mockCatalog,
      source: "mock",
      warning:
        "Supabase-client kon niet worden aangemaakt, daarom wordt mockdata gebruikt.",
    };
  }

  try {
    const [projectsResponse, testsResponse, catalogResponse] = await Promise.all([
      supabase
        .from("lab_projects")
        .select(
          "id, source_nummer, title, company_name, offer_assignment, status, planning_priority, deadline, source_description, project_notes, raw_payload",
        )
        .order("updated_at", { ascending: false }),
      supabase
        .from("lab_request_tests")
        .select(
          "id, project_id, test_code, test_name, quantity, duration_hours_per_item, source_fragment, notes",
        )
        .order("test_name", { ascending: true }),
      supabase
        .from("lab_test_catalog")
        .select("code, name, default_duration_hours, default_priority, description")
        .eq("active", true)
        .order("name", { ascending: true }),
    ]);

    if (projectsResponse.error || testsResponse.error || catalogResponse.error) {
      throw new Error(
        [
          projectsResponse.error?.message,
          testsResponse.error?.message,
          catalogResponse.error?.message,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const testsByProject = new Map<string, LabProjectTest[]>();

    for (const row of testsResponse.data ?? []) {
      const test = mapTestRow(row as DatabaseProjectTestRow);
      const existing = testsByProject.get(test.projectId) ?? [];
      existing.push(test);
      testsByProject.set(test.projectId, existing);
    }

    const projects = (projectsResponse.data ?? [])
      .map((row) =>
        withDerivedProjectFields(
          row as DatabaseProjectRow,
          testsByProject.get((row as DatabaseProjectRow).id) ?? [],
        ),
      )
      .sort(compareProjects);

    return {
      projects,
      catalog: (catalogResponse.data ?? []).map((row) =>
        mapCatalogRow(row as DatabaseCatalogRow),
      ),
      source: "supabase",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende Supabase-fout";

    return {
      projects: mockProjects.map((project) => ({
        ...project,
        tests: mockProjectTests.filter((test) => test.projectId === project.id),
      })),
      catalog: mockCatalog,
      source: "mock",
      warning: `Supabase-data kon niet worden geladen (${message}). Mockdata wordt gebruikt.`,
    };
  }
}
