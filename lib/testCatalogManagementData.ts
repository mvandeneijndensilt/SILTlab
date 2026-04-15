import "server-only";

import { labTestCatalog as mockCatalog } from "@/lib/mockData";
import {
  createSupabaseServerClient,
  hasSupabaseEnvironment,
} from "@/lib/supabase/server";
import type { LabTestCatalogItem, PlannerDataSource, Task } from "@/lib/types";

interface DatabaseCatalogRow {
  code: string;
  name: string;
  default_duration_hours: number | string;
  default_priority: Task["priority"];
  description: string | null;
  active: boolean | null;
}

export interface TestCatalogManagementData {
  catalog: LabTestCatalogItem[];
  source: PlannerDataSource;
  warning?: string;
}

function toNumber(value: number | string | null | undefined, fallback: number) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function mapCatalogRow(row: DatabaseCatalogRow): LabTestCatalogItem {
  return {
    code: row.code,
    name: row.name,
    defaultDurationHours: Math.max(0.25, toNumber(row.default_duration_hours, 1)),
    defaultPriority: row.default_priority,
    description: row.description,
  };
}

function buildMockCatalogData(warning: string): TestCatalogManagementData {
  return {
    catalog: mockCatalog,
    source: "mock",
    warning,
  };
}

export async function getTestCatalogManagementData(): Promise<TestCatalogManagementData> {
  if (!hasSupabaseEnvironment()) {
    return buildMockCatalogData(
      "Supabase-omgeving ontbreekt, daarom wordt mockdata gebruikt.",
    );
  }

  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return buildMockCatalogData(
      "Supabase-client kon niet worden aangemaakt, daarom wordt mockdata gebruikt.",
    );
  }

  try {
    const catalogResponse = await supabase
      .from("lab_test_catalog")
      .select("code, name, default_duration_hours, default_priority, description, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (catalogResponse.error) {
      throw new Error(catalogResponse.error.message);
    }

    return {
      catalog: (catalogResponse.data ?? []).map((row) =>
        mapCatalogRow(row as DatabaseCatalogRow),
      ),
      source: "supabase",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende Supabase-fout";

    return buildMockCatalogData(
      `Supabase-data kon niet worden geladen (${message}). Mockdata wordt gebruikt.`,
    );
  }
}

