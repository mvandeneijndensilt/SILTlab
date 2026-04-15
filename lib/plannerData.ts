import "server-only";

import {
  employees as mockEmployees,
  initialTasks as mockTasks,
  projects as mockProjects,
} from "@/lib/mockData";
import {
  createSupabaseServerClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase/server";
import { normalizeWeeklyAvailability } from "@/lib/availability";
import type {
  Employee,
  LabProject,
  PlannerSeedData,
  ProjectPlanningPriority,
  Task,
} from "@/lib/types";

interface DatabaseEmployeeRow {
  id: string;
  name: string;
  role: string | null;
  specialties: string[] | null;
  capacity_hours: number | string | null;
  lab_availability: unknown;
  is_active: boolean | null;
}

interface DatabasePlannerTaskRow {
  id: string;
  project_id: string | null;
  title: string;
  project_name: string;
  description: string | null;
  duration_hours: number | string;
  quantity: number | null;
  priority: Task["priority"];
  employee_id: string | null;
  scheduled_date: string | null;
  start_hour: number | string | null;
  lab_projects:
    | {
        title: string | null;
        source_nummer: number | string | null;
      }
    | Array<{
        title: string | null;
        source_nummer: number | string | null;
      }>
    | null;
}

interface DatabaseLabProjectRow {
  id: string;
  source_nummer: number | string | null;
  title: string;
  company_name: string | null;
  offer_assignment: string | null;
  status: string | null;
  planning_priority: ProjectPlanningPriority | null;
  deadline: string | null;
}

interface ProjectTaskMeta {
  planningPriority: ProjectPlanningPriority;
  deadline: string | null;
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function toDateKey(value: string | null) {
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

function mapEmployee(row: DatabaseEmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "",
    specialties: row.specialties ?? [],
    capacityHours: toNumber(row.capacity_hours, 7.5),
    labAvailability: normalizeWeeklyAvailability(row.lab_availability),
  };
}

function mapTask(
  row: DatabasePlannerTaskRow,
  projectMeta: ProjectTaskMeta | undefined,
): Task {
  const relatedProject = Array.isArray(row.lab_projects)
    ? row.lab_projects[0] ?? null
    : row.lab_projects;

  return {
    id: row.id,
    projectId: row.project_id,
    sourceTaskName: relatedProject?.title ?? null,
    sourceNummer:
      relatedProject?.source_nummer === null ||
      relatedProject?.source_nummer === undefined
        ? null
        : String(relatedProject.source_nummer),
    title: row.title,
    projectName: row.project_name,
    description: row.description,
    durationHours: toNumber(row.duration_hours, 1),
    quantity: row.quantity ?? 1,
    priority: row.priority,
    projectPlanningPriority: projectMeta?.planningPriority ?? "Standaard",
    projectDeadline: projectMeta?.deadline ?? null,
    assignment: {
      employeeId: row.employee_id,
      dateKey: toDateKey(row.scheduled_date),
      startHour: row.start_hour === null ? null : toNumber(row.start_hour, 8),
    },
  };
}

function mapProject(row: DatabaseLabProjectRow, tasks: Task[]): LabProject {
  const relatedTasks = tasks.filter((task) => task.projectId === row.id);

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
    taskCount: relatedTasks.length,
    queuedHours: relatedTasks.reduce(
      (total, task) => total + task.durationHours,
      0,
    ),
  };
}

export async function getPlannerSeedData(): Promise<PlannerSeedData> {
  if (!hasSupabaseEnvironment()) {
    return {
      employees: mockEmployees,
      projects: mockProjects,
      tasks: mockTasks,
      source: "mock",
      warning:
        "Supabase-omgeving ontbreekt, daarom wordt mockdata gebruikt.",
    };
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      employees: mockEmployees,
      projects: mockProjects,
      tasks: mockTasks,
      source: "mock",
      warning:
        "Supabase-client kon niet worden aangemaakt, daarom wordt mockdata gebruikt.",
    };
  }

  try {
    const [employeesResponse, projectsResponse, tasksResponse] =
      await Promise.all([
        supabase
          .from("employees")
          .select(
            "id, name, role, specialties, capacity_hours, lab_availability, is_active",
          )
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("lab_projects")
          .select(
            "id, source_nummer, title, company_name, offer_assignment, status, planning_priority, deadline",
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("planner_tasks")
          .select(
            "id, project_id, title, project_name, description, duration_hours, quantity, priority, employee_id, scheduled_date, start_hour, lab_projects(title, source_nummer)",
          )
          .order("scheduled_date", { ascending: true, nullsFirst: true })
          .order("start_hour", { ascending: true, nullsFirst: true })
          .order("title", { ascending: true }),
      ]);

    if (employeesResponse.error || projectsResponse.error || tasksResponse.error) {
      throw new Error(
        [
          employeesResponse.error?.message,
          projectsResponse.error?.message,
          tasksResponse.error?.message,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const projectMetaMap = new Map<string, ProjectTaskMeta>(
      (projectsResponse.data ?? []).map((row: DatabaseLabProjectRow) => [
        row.id,
        {
          planningPriority: normalizeProjectPriority(row.planning_priority),
          deadline: toDateKey(row.deadline),
        },
      ]),
    );

    const tasks = (tasksResponse.data ?? []).map((row: DatabasePlannerTaskRow) =>
      mapTask(
        row,
        row.project_id ? projectMetaMap.get(row.project_id) : undefined,
      ),
    );

    const projects = (projectsResponse.data ?? [])
      .map((row: DatabaseLabProjectRow) => mapProject(row, tasks))
      .sort(compareProjects);

    return {
      employees: (employeesResponse.data ?? []).map(mapEmployee),
      projects,
      tasks,
      source: "supabase",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende Supabase-fout";

    return {
      employees: mockEmployees,
      projects: mockProjects,
      tasks: mockTasks,
      source: "mock",
      warning: `Supabase-data kon niet worden geladen (${message}). Mockdata wordt gebruikt.`,
    };
  }
}
