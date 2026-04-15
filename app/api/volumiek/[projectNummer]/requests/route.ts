import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { volumiekToolKey, type VolumiekSampleRequest } from "@/lib/volumiek";
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

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeDepth(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const parsedValue = Number(text.replace(",", "."));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeRequests(value: unknown): VolumiekSampleRequest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "object" && item ? (item as VolumiekSampleRequest) : null))
    .filter((item): item is VolumiekSampleRequest => Boolean(item));
}

function sampleKey(boring: string, monster: string) {
  const boringToken = boring.trim().toUpperCase();
  const monsterToken = monster.trim();

  if (!boringToken || !monsterToken) {
    return "";
  }

  return `${boringToken}|${monsterToken}`;
}

export async function PATCH(request: Request, context: RouteContext) {
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
      requests?: unknown;
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
    const requests = normalizeRequests(body.requests);

    const keepKeys = new Set<string>();
    const payload = requests
      .map((item) => {
        const boring = normalizeText(item.boring).toUpperCase();
        const monster = normalizeText(item.monster);
        const key = sampleKey(boring, monster);

        if (!key) {
          return null;
        }

        keepKeys.add(key);

        return {
          project_id: projectId,
          project_nummer: projectNummerValue,
          project_title: title,
          tool_key: volumiekToolKey,
          boring,
          monster,
          diepte_van_cm: normalizeDepth(item.diepteVanCm),
          diepte_tot_cm: normalizeDepth(item.diepteTotCm),
          notes: normalizeText(item.notes) || null,
          updated_by: "webapp",
          last_editor_source: "webapp",
        };
      })
      .filter(Boolean);

    const supabase = createSupabaseAdminClient();

    const existingResponse = await supabase
      .schema("lab")
      .from("project_tool_sample_requests")
      .select("id, boring, monster")
      .eq("project_nummer", projectNummerValue)
      .eq("tool_key", volumiekToolKey);

    if (existingResponse.error) {
      throw new Error(existingResponse.error.message);
    }

    if (payload.length > 0) {
      const upsertResponse = await supabase
        .schema("lab")
        .from("project_tool_sample_requests")
        .upsert(payload, {
          onConflict: "project_nummer,tool_key,boring,monster",
        });

      if (upsertResponse.error) {
        throw new Error(upsertResponse.error.message);
      }
    }

    const idsToDelete: string[] = [];

    for (const row of existingResponse.data ?? []) {
      const typedRow = row as { id: string; boring: string; monster: string };
      const key = sampleKey(typedRow.boring, typedRow.monster);

      if (!keepKeys.has(key)) {
        idsToDelete.push(typedRow.id);
      }
    }

    if (idsToDelete.length > 0) {
      const deleteResponse = await supabase
        .schema("lab")
        .from("project_tool_sample_requests")
        .delete()
        .in("id", idsToDelete);

      if (deleteResponse.error) {
        throw new Error(deleteResponse.error.message);
      }
    }

    revalidatePath("/volumiek");

    return NextResponse.json({
      message: "Monsterselectie opgeslagen.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
