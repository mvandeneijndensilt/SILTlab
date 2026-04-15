import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { normalizeWeeklyAvailability } from "@/lib/availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    employeeId: string;
  }>;
}

function revalidateEmployeePages() {
  revalidatePath("/dashboard");
  revalidatePath("/employees");
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { employeeId } = await context.params;
    const body = (await request.json()) as {
      labAvailability?: unknown;
    };

    if (!employeeId) {
      return NextResponse.json(
        { error: "Medewerker-id ontbreekt." },
        { status: 400 },
      );
    }

    const labAvailability = normalizeWeeklyAvailability(body.labAvailability);
    const supabase = createSupabaseAdminClient();
    const updateResponse = await supabase
      .from("employees")
      .update({
        lab_availability: labAvailability,
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
      message: "Weekbeschikbaarheid opgeslagen.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende opslagfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
