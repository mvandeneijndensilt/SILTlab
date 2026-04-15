import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProjectPlanningPriority } from "@/lib/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

function normalizePriority(value: unknown): ProjectPlanningPriority | null {
  if (value === "Standaard" || value === "Spoed") {
    return value;
  }

  return null;
}

function normalizeDeadline(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const matchesDatePattern = /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (!matchesDatePattern) {
    return undefined;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? undefined : value;
}

function normalizeProjectNotes(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function buildProjectIdErrorResponse() {
  return NextResponse.json(
    { error: "Project-id ontbreekt." },
    { status: 400 },
  );
}

function revalidateProjectPages() {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/projects");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json()) as {
      planningPriority?: unknown;
      deadline?: unknown;
      projectNotes?: unknown;
    };

    if (!projectId) {
      return buildProjectIdErrorResponse();
    }

    const planningPriority = normalizePriority(body.planningPriority);
    const deadline = normalizeDeadline(body.deadline);
    const projectNotes = normalizeProjectNotes(body.projectNotes);

    if (!planningPriority) {
      return NextResponse.json(
        { error: "Gebruik een geldige projectprioriteit." },
        { status: 400 },
      );
    }

    if (deadline === undefined) {
      return NextResponse.json(
        { error: "Gebruik een geldige deadline in formaat JJJJ-MM-DD." },
        { status: 400 },
      );
    }

    if (projectNotes === undefined) {
      return NextResponse.json(
        { error: "Gebruik geldige projectopmerkingen." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const updateResponse = await supabase
      .from("lab_projects")
      .update({
        planning_priority: planningPriority,
        deadline,
        project_notes: projectNotes,
      })
      .eq("id", projectId)
      .select("id")
      .single();

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message);
    }

    if (!updateResponse.data) {
      return NextResponse.json(
        { error: "Project niet gevonden." },
        { status: 404 },
      );
    }

    revalidateProjectPages();

    return NextResponse.json({
      message: "Projectinstellingen opgeslagen.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return buildProjectIdErrorResponse();
    }

    const supabase = createSupabaseAdminClient();
    const projectResponse = await supabase
      .from("lab_projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectResponse.error) {
      throw new Error(projectResponse.error.message);
    }

    if (!projectResponse.data) {
      return NextResponse.json(
        { error: "Project niet gevonden." },
        { status: 404 },
      );
    }

    const deleteTasksResponse = await supabase
      .from("planner_tasks")
      .delete()
      .eq("project_id", projectId);

    if (deleteTasksResponse.error) {
      throw new Error(deleteTasksResponse.error.message);
    }

    const deleteProjectResponse = await supabase
      .from("lab_projects")
      .delete()
      .eq("id", projectId);

    if (deleteProjectResponse.error) {
      throw new Error(deleteProjectResponse.error.message);
    }

    revalidateProjectPages();

    return NextResponse.json({
      message: "Project en gekoppelde planner-taken verwijderd.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende verwijderfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
