import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { volumiekToolKey, type ToolExportCleanupStatus } from "@/lib/volumiek";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    projectNummer: string;
    exportId: string;
  }>;
}

function normalizeProjectNummer(value: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function normalizeCleanupStatus(value: unknown): ToolExportCleanupStatus | null {
  if (value === "open" || value === "bewaren" || value === "verwijderen") {
    return value;
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectNummer, exportId } = await context.params;
    const projectNummerValue = normalizeProjectNummer(projectNummer);
    const cleanExportId = String(exportId ?? "").trim();

    if (!projectNummerValue) {
      return NextResponse.json(
        { error: "Gebruik een geldig projectnummer in de URL." },
        { status: 400 },
      );
    }

    if (!cleanExportId) {
      return NextResponse.json(
        { error: "Export-id ontbreekt." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      cleanupStatus?: unknown;
    };

    const cleanupStatus = normalizeCleanupStatus(body.cleanupStatus);

    if (!cleanupStatus) {
      return NextResponse.json(
        { error: "Gebruik een geldige opschoonstatus." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const updateResponse = await supabase
      .schema("lab")
      .from("project_tool_exports")
      .update({
        cleanup_status: cleanupStatus,
        cleanup_by: "webapp",
        cleanup_at: new Date().toISOString(),
        last_editor_source: "beheer",
      })
      .eq("id", cleanExportId)
      .eq("project_nummer", projectNummerValue)
      .eq("tool_key", volumiekToolKey)
      .select("id")
      .maybeSingle();

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message);
    }

    if (!updateResponse.data) {
      return NextResponse.json(
        { error: "Export niet gevonden." },
        { status: 404 },
      );
    }

    revalidatePath("/volumiek");

    return NextResponse.json({
      message: "Status bijgewerkt.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
