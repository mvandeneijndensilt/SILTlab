import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    employeeId: string;
  }>;
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeSpecialties(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeCapacityHours(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Number(parsedValue.toFixed(2));
}

function revalidateEmployeePages() {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { employeeId } = await context.params;
    const body = (await request.json()) as {
      role?: unknown;
      specialties?: unknown;
      capacityHours?: unknown;
    };

    if (!employeeId) {
      return NextResponse.json(
        { error: "Medewerker-id ontbreekt." },
        { status: 400 },
      );
    }

    const role = normalizeRole(body.role);
    const specialties = normalizeSpecialties(body.specialties);
    const capacityHours = normalizeCapacityHours(body.capacityHours);

    if (!role) {
      return NextResponse.json(
        { error: "Geef een rol op voor deze medewerker." },
        { status: 400 },
      );
    }

    if (!capacityHours) {
      return NextResponse.json(
        { error: "Geef geldige standaard beschikbare uren op." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const updateResponse = await supabase
      .from("employees")
      .update({
        role,
        specialties,
        capacity_hours: capacityHours,
      })
      .eq("id", employeeId)
      .select("id")
      .single();

    if (updateResponse.error) {
      throw new Error(updateResponse.error.message);
    }

    if (!updateResponse.data) {
      return NextResponse.json(
        { error: "Medewerker niet gevonden." },
        { status: 404 },
      );
    }

    revalidateEmployeePages();

    return NextResponse.json({
      message: "Rol en skills opgeslagen.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
