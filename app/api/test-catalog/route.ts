import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LabTestCatalogItem, Task } from "@/lib/types";

export const runtime = "nodejs";

interface IncomingCatalogItem {
  code?: unknown;
  name?: unknown;
  defaultDurationHours?: unknown;
  defaultPriority?: unknown;
  description?: unknown;
}

function normalizeCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeDescription(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDuration(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.max(0.25, Number(parsedValue.toFixed(2)));
}

function normalizePriority(value: unknown): Task["priority"] | null {
  if (value === "Hoog" || value === "Middel" || value === "Laag") {
    return value;
  }

  return null;
}

function revalidateCatalogPages() {
  revalidatePath("/projects");
  revalidatePath("/proeven");
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      catalog?: IncomingCatalogItem[];
    };

    const incomingCatalog = Array.isArray(body.catalog) ? body.catalog : [];

    if (incomingCatalog.length === 0) {
      return NextResponse.json(
        { error: "Geen proefregels ontvangen om op te slaan." },
        { status: 400 },
      );
    }

    const normalizedCatalog = incomingCatalog.map((item) => {
      const code = normalizeCode(item.code);
      const name = normalizeName(item.name);
      const defaultDurationHours = normalizeDuration(item.defaultDurationHours);
      const defaultPriority = normalizePriority(item.defaultPriority);
      const description = normalizeDescription(item.description);

      return {
        code,
        name,
        defaultDurationHours,
        defaultPriority,
        description,
      };
    });

    const duplicateCodes = normalizedCatalog
      .map((item) => item.code)
      .filter((code, index, array) => code && array.indexOf(code) !== index);

    if (duplicateCodes.length > 0) {
      return NextResponse.json(
        {
          error: `Elke proefcode mag maar één keer voorkomen. Dubbel gevonden: ${[
            ...new Set(duplicateCodes),
          ].join(", ")}.`,
        },
        { status: 400 },
      );
    }

    for (const item of normalizedCatalog) {
      if (!item.code) {
        return NextResponse.json(
          { error: "Elke proefregel moet een proefcode hebben." },
          { status: 400 },
        );
      }

      if (!item.name) {
        return NextResponse.json(
          { error: `Geef een naam op voor ${item.code}.` },
          { status: 400 },
        );
      }

      if (!item.defaultDurationHours) {
        return NextResponse.json(
          { error: `Geef een geldige standaardduur op voor ${item.code}.` },
          { status: 400 },
        );
      }

      if (!item.defaultPriority) {
        return NextResponse.json(
          { error: `Kies een geldige prioriteit voor ${item.code}.` },
          { status: 400 },
        );
      }
    }

    const payload: Array<{
      code: LabTestCatalogItem["code"];
      name: LabTestCatalogItem["name"];
      default_duration_hours: number;
      default_priority: Task["priority"];
      description: string | null;
    }> = normalizedCatalog.map((item) => ({
      code: item.code,
      name: item.name,
      default_duration_hours: item.defaultDurationHours ?? 1,
      default_priority: item.defaultPriority ?? "Middel",
      description: item.description,
    }));

    const supabase = createSupabaseAdminClient();
    const upsertResponse = await supabase
      .from("lab_test_catalog")
      .upsert(payload, { onConflict: "code" });

    if (upsertResponse.error) {
      throw new Error(upsertResponse.error.message);
    }

    revalidateCatalogPages();

    return NextResponse.json({
      message: "Proevencatalogus opgeslagen.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout bij catalogusopslag";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

