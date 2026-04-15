import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProjectPlannerTasks } from "@/lib/projectTestSync";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

interface IncomingProjectTestPayload {
  testCode?: unknown;
  quantity?: unknown;
  durationHoursPerItem?: unknown;
}

function toPositiveInteger(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return Math.max(1, Math.round(parsedValue));
}

function toPositiveDuration(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return undefined;
  }

  return Math.max(0.25, Number(parsedValue.toFixed(2)));
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
      tests?: IncomingProjectTestPayload[];
      mode?: "manual" | "description";
    };

    if (!projectId) {
      return NextResponse.json(
        { error: "Project-id ontbreekt." },
        { status: 400 },
      );
    }

    const incomingTests = Array.isArray(body.tests) ? body.tests : [];
    const supabase = createSupabaseAdminClient();

    const [projectResponse, catalogResponse, existingTestsResponse] =
      await Promise.all([
        supabase
          .from("lab_projects")
          .select("id, source_description")
          .eq("id", projectId)
          .single(),
        supabase
          .from("lab_test_catalog")
          .select("code, name")
          .eq("active", true),
        supabase
          .from("lab_request_tests")
          .select("id, test_code")
          .eq("project_id", projectId),
      ]);

    if (projectResponse.error || !projectResponse.data) {
      return NextResponse.json(
        { error: "Project niet gevonden." },
        { status: 404 },
      );
    }

    if (catalogResponse.error) {
      throw new Error(catalogResponse.error.message);
    }

    if (existingTestsResponse.error) {
      throw new Error(existingTestsResponse.error.message);
    }

    const catalogByCode = new Map(
      (catalogResponse.data ?? []).map((item) => [item.code, item.name]),
    );

    const normalizedTests = incomingTests.map((test) => {
      const testCode =
        typeof test.testCode === "string" ? test.testCode.trim().toUpperCase() : "";
      const quantity = toPositiveInteger(test.quantity);
      const durationHoursPerItem = toPositiveDuration(test.durationHoursPerItem);

      return {
        testCode,
        quantity,
        durationHoursPerItem,
      };
    });

    const duplicateCodes = normalizedTests
      .map((test) => test.testCode)
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

    for (const test of normalizedTests) {
      if (!test.testCode || !catalogByCode.has(test.testCode)) {
        return NextResponse.json(
          { error: `Onbekende proefcode: ${test.testCode || "(leeg)"}.` },
          { status: 400 },
        );
      }

      if (!test.quantity || !test.durationHoursPerItem) {
        return NextResponse.json(
          {
            error:
              "Elke proefregel moet een geldig aantal en een geldige duur per stuk hebben.",
          },
          { status: 400 },
        );
      }
    }

    const existingTestsByCode = new Map(
      (existingTestsResponse.data ?? []).map((row) => [row.test_code, row.id]),
    );

    for (const test of normalizedTests) {
      const payload = {
        project_id: projectId,
        test_code: test.testCode,
        test_name: catalogByCode.get(test.testCode) ?? test.testCode,
        quantity: test.quantity,
        duration_hours_per_item: test.durationHoursPerItem,
        source_fragment:
          body.mode === "description"
            ? projectResponse.data.source_description
            : null,
        notes:
          body.mode === "description"
            ? "Automatisch overgenomen uit LABSPEC in de omschrijving."
            : "Handmatig bijgewerkt via de projectenpagina.",
      };

      const existingTestId = existingTestsByCode.get(test.testCode);

      if (existingTestId) {
        const updateResponse = await supabase
          .from("lab_request_tests")
          .update(payload)
          .eq("id", existingTestId);

        if (updateResponse.error) {
          throw new Error(updateResponse.error.message);
        }
      } else {
        const insertResponse = await supabase.from("lab_request_tests").insert(payload);

        if (insertResponse.error) {
          throw new Error(insertResponse.error.message);
        }
      }
    }

    const incomingCodes = normalizedTests.map((test) => test.testCode);
    const removableTestIds = (existingTestsResponse.data ?? [])
      .filter((row) => !incomingCodes.includes(row.test_code))
      .map((row) => row.id);

    if (removableTestIds.length > 0) {
      const deleteResponse = await supabase
        .from("lab_request_tests")
        .delete()
        .in("id", removableTestIds);

      if (deleteResponse.error) {
        throw new Error(deleteResponse.error.message);
      }
    }

    await syncProjectPlannerTasks(projectId, supabase);
    revalidateProjectPages();

    return NextResponse.json({
      message: "Projectproeven opgeslagen en planner-taken bijgewerkt.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout bij proefopslag";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
