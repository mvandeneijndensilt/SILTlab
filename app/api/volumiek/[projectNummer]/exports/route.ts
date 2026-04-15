import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { volumiekToolKey } from "@/lib/volumiek";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    projectNummer: string;
  }>;
}

function normalizeProjectNummer(value: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
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

function normalizeFilename(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectNummer } = await context.params;
    const projectNummerValue = normalizeProjectNummer(projectNummer);

    if (!projectNummerValue) {
      return NextResponse.json(
        { error: "Gebruik een geldig projectnummer in de URL." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      projectId?: unknown;
      title?: unknown;
      outputFilename?: unknown;
    };

    const projectId = normalizeProjectId(body.projectId);

    if (projectId === undefined) {
      return NextResponse.json(
        { error: "Gebruik een geldige project-id of laat dit veld leeg." },
        { status: 400 },
      );
    }

    const fallbackTitle = `Project ${projectNummerValue}`;
    const title = normalizeTitle(body.title, fallbackTitle);
    const outputFilename = normalizeFilename(body.outputFilename);

    if (!outputFilename) {
      return NextResponse.json(
        { error: "Vul een geldige bestandsnaam in." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const insertResponse = await supabase
      .schema("lab")
      .from("project_tool_exports")
      .insert({
        project_id: projectId,
        project_nummer: projectNummerValue,
        project_title: title,
        tool_key: volumiekToolKey,
        output_filename: outputFilename,
        exported_by: "webapp",
        meta: {},
        cleanup_status: "open",
        last_editor_source: "webapp",
      })
      .select("id")
      .single();

    if (insertResponse.error) {
      throw new Error(insertResponse.error.message);
    }

    revalidatePath("/volumiek");

    return NextResponse.json({
      message: "Export opgeslagen.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
