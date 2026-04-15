import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Task } from "@/lib/types";

interface SyncProjectRow {
  id: string;
  source_nummer: number | null;
  title: string;
  offer_assignment: string | null;
  source_company_offer_assignment: string | null;
  source_description: string | null;
}

interface SyncRequestTestRow {
  id: string;
  test_code: string;
  test_name: string;
  quantity: number;
  duration_hours_per_item: number;
  notes: string | null;
  source_fragment: string | null;
}

interface SyncCatalogRow {
  code: string;
  default_priority: Task["priority"];
}

interface SyncPlannerTaskRow {
  id: string;
  request_test_id: string | null;
  title: string;
  source_type: string;
}

function formatPlannerTaskSchemaError(message: string) {
  if (message.includes("planner_tasks.request_test_id does not exist")) {
    return "Supabase mist nog de kolom `planner_tasks.request_test_id`. Run eerst `supabase/add_project_test_sync.sql` in de SQL Editor en probeer daarna opnieuw.";
  }

  return message;
}

function buildTaskDescription(
  project: SyncProjectRow,
  requestTest: SyncRequestTestRow,
) {
  const parts = [
    project.source_description,
    `Proefcode: ${requestTest.test_code}`,
    `Aantal: ${requestTest.quantity}`,
    requestTest.notes,
  ].filter(Boolean);

  return parts.join("\n");
}

export async function syncProjectPlannerTasks(
  projectId: string,
  supabase: SupabaseClient = createSupabaseAdminClient(),
) {
  const [projectResponse, testsResponse, catalogResponse, tasksResponse] =
    await Promise.all([
      supabase
        .from("lab_projects")
        .select(
          "id, source_nummer, title, offer_assignment, source_company_offer_assignment, source_description",
        )
        .eq("id", projectId)
        .single(),
      supabase
        .from("lab_request_tests")
        .select(
          "id, test_code, test_name, quantity, duration_hours_per_item, notes, source_fragment",
        )
        .eq("project_id", projectId),
      supabase
        .from("lab_test_catalog")
        .select("code, default_priority"),
      supabase
        .from("planner_tasks")
        .select("id, request_test_id, title, source_type")
        .eq("project_id", projectId),
    ]);

  if (projectResponse.error || !projectResponse.data) {
    throw new Error(
      projectResponse.error?.message ?? "Kon project voor plansync niet laden.",
    );
  }

  if (testsResponse.error) {
    throw new Error(
      `Kon projectproeven niet laden: ${testsResponse.error.message}`,
    );
  }

  if (catalogResponse.error) {
    throw new Error(
      `Kon proefcatalogus niet laden: ${catalogResponse.error.message}`,
    );
  }

  if (tasksResponse.error) {
    throw new Error(
      `Kon bestaande planner taken niet laden: ${formatPlannerTaskSchemaError(tasksResponse.error.message)}`,
    );
  }

  const project = projectResponse.data as SyncProjectRow;
  const requestTests = (testsResponse.data ?? []) as SyncRequestTestRow[];
  const existingTasks = (tasksResponse.data ?? []) as SyncPlannerTaskRow[];
  const priorityByCode = new Map(
    ((catalogResponse.data ?? []) as SyncCatalogRow[]).map((row) => [
      row.code,
      row.default_priority,
    ]),
  );

  if (requestTests.length === 0) {
    const deleteDerivedTasksResponse = await supabase
      .from("planner_tasks")
      .delete()
      .eq("project_id", projectId)
      .eq("source_type", "LabProef");

    if (deleteDerivedTasksResponse.error) {
      throw new Error(
        `Kon verouderde proefplanner-taken niet verwijderen: ${deleteDerivedTasksResponse.error.message}`,
      );
    }

    return { hasRequestTests: false, syncedTaskCount: 0 };
  }

  const syncedTaskIds = new Set<string>();

  for (const requestTest of requestTests) {
    const existingTask =
      existingTasks.find((task) => task.request_test_id === requestTest.id) ??
      existingTasks.find(
        (task) =>
          task.request_test_id === null &&
          task.title.toLowerCase() === requestTest.test_name.toLowerCase(),
      );

    const plannerTaskPayload = {
      request_test_id: requestTest.id,
      source_nummer: project.source_nummer,
      title: requestTest.test_name,
      project_name:
        project.offer_assignment ??
        project.source_company_offer_assignment ??
        project.title,
      description: buildTaskDescription(project, requestTest),
      priority: priorityByCode.get(requestTest.test_code) ?? "Middel",
      duration_hours: Math.max(
        requestTest.quantity * requestTest.duration_hours_per_item,
        0.25,
      ),
      quantity: Math.max(1, Math.round(requestTest.quantity)),
      source_omschrijving: project.source_description,
      source_type: "LabProef",
    };

    if (existingTask) {
      const updateTaskResponse = await supabase
        .from("planner_tasks")
        .update(plannerTaskPayload)
        .eq("id", existingTask.id)
        .select("id")
        .single();

      if (updateTaskResponse.error || !updateTaskResponse.data) {
        throw new Error(
          `Kon planner taak ${requestTest.test_name} niet bijwerken: ${updateTaskResponse.error?.message ?? "onbekende fout"}`,
        );
      }

      syncedTaskIds.add(updateTaskResponse.data.id);
    } else {
      const insertTaskResponse = await supabase
        .from("planner_tasks")
        .insert({
          project_id: projectId,
          ...plannerTaskPayload,
        })
        .select("id")
        .single();

      if (insertTaskResponse.error || !insertTaskResponse.data) {
        throw new Error(
          `Kon planner taak ${requestTest.test_name} niet aanmaken: ${insertTaskResponse.error?.message ?? "onbekende fout"}`,
        );
      }

      syncedTaskIds.add(insertTaskResponse.data.id);
    }
  }

  const staleDerivedTaskIds = existingTasks
    .filter(
      (task) => task.source_type === "LabProef" && !syncedTaskIds.has(task.id),
    )
    .map((task) => task.id);

  if (staleDerivedTaskIds.length > 0) {
    const deleteStaleTasksResponse = await supabase
      .from("planner_tasks")
      .delete()
      .in("id", staleDerivedTaskIds);

    if (deleteStaleTasksResponse.error) {
      throw new Error(
        `Kon verouderde proefplanner-taken niet verwijderen: ${deleteStaleTasksResponse.error.message}`,
      );
    }
  }

  const genericPlaceholderTitles = [
    project.title,
    project.source_nummer !== null ? `Lab ${project.source_nummer}` : null,
  ].filter((value): value is string => Boolean(value));

  if (genericPlaceholderTitles.length > 0) {
    const deletePlaceholderResponse = await supabase
      .from("planner_tasks")
      .delete()
      .eq("project_id", projectId)
      .eq("source_type", "Lab")
      .in("title", genericPlaceholderTitles);

    if (deletePlaceholderResponse.error) {
      throw new Error(
        `Kon placeholder-planner-taak niet verwijderen: ${deletePlaceholderResponse.error.message}`,
      );
    }
  }

  return {
    hasRequestTests: true,
    syncedTaskCount: syncedTaskIds.size,
  };
}
