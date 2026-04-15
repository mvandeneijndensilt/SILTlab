import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  countFilledVolumiekRows,
  normalizeVolumiekState,
  volumiekToolKey,
  type VolumiekState,
} from "@/lib/volumiek";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    projectNummer: string;
  }>;
}

function normalizeProjectId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeTitle(value: unknown, fallbackTitle: string) {
  if (typeof value !== "string") {
    return fallbackTitle;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallbackTitle;
}

function normalizeRequestedQuantity(value: unknown, fallbackValue: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }

  return Math.max(1, Math.round(parsedValue));
}

function deriveStatus(filledRowCount: number, requestedQuantity: number) {
  if (filledRowCount >= Math.max(1, requestedQuantity)) {
    return "gereed";
  }

  if (filledRowCount > 0) {
    return "bezig";
  }

  return "concept";
}

function buildHelpfulErrorMessage(message: string) {
  if (
    message.includes('schema "lab"') ||
    message.includes("project_tool_forms") ||
    message.includes("project_tool_form_versions")
  ) {
    return `${message}. Run eerst \`supabase/lab_tooling_bootstrap.sql\` in Supabase.`;
  }

  return message;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectNummer } = await context.params;
    const body = (await request.json()) as {
      projectId?: unknown;
      title?: unknown;
      requestedQuantity?: unknown;
      state?: Partial<VolumiekState> | null;
    };

    const projectNummerValue = Number(projectNummer);

    if (!Number.isInteger(projectNummerValue) || projectNummerValue <= 0) {
      return NextResponse.json(
        { error: "Gebruik een geldig projectnummer in de URL." },
        { status: 400 },
      );
    }

    const projectId = normalizeProjectId(body.projectId);

    if (projectId === undefined) {
      return NextResponse.json(
        { error: "Gebruik een geldige project-id of laat dit veld leeg." },
        { status: 400 },
      );
    }

    const fallbackTitle = `Volumiek project ${projectNummer}`;
    const title = normalizeTitle(body.title, fallbackTitle);
    const requestedQuantity = normalizeRequestedQuantity(body.requestedQuantity, 1);
    const normalizedState = normalizeVolumiekState(body.state ?? null, {
      projectName: title,
      projectNummer: String(projectNummerValue),
      requestedQuantity,
    });
    const filledRowCount = countFilledVolumiekRows(normalizedState);
    const rowCount = normalizedState.rows.length;
    const status = deriveStatus(filledRowCount, requestedQuantity);
    const updatedBy = normalizedState.uitgevoerd_door.trim() || "webapp";

    const supabase = createSupabaseAdminClient();
    const upsertResponse = await supabase
      .schema("lab")
      .from("project_tool_forms")
      .upsert(
        {
          project_id: projectId,
          project_nummer: projectNummerValue,
          project_title: title,
          tool_key: volumiekToolKey,
          payload: normalizedState,
          requested_quantity: requestedQuantity,
          row_count: rowCount,
          filled_row_count: filledRowCount,
          status,
          updated_by: updatedBy,
          last_editor_source: "webapp",
        },
        {
          onConflict: "project_nummer,tool_key",
        },
      )
      .select("id")
      .single();

    if (upsertResponse.error) {
      throw new Error(upsertResponse.error.message);
    }

    revalidatePath("/volumiek");

    return NextResponse.json({
      message: "Volumiek-invoer opgeslagen.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json(
      { error: buildHelpfulErrorMessage(message) },
      { status: 500 },
    );
  }
}
