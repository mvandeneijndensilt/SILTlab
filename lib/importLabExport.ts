import "server-only";

import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import {
  extractProjectNotesFromDescription,
  knownLabTestCodes,
  parseProjectTestsFromDescription,
} from "@/lib/labSpec";
import { syncProjectPlannerTasks } from "@/lib/projectTestSync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Task } from "@/lib/types";

const sourceColumnNames = [
  "Type",
  "Taak",
  "Nummer",
  "Fase",
  "Afgerond op",
  "Omschrijving",
  "Aantal",
  "Eenheid",
  "Tijschrijven",
  "Werkelijk",
  "Gepland",
  "Begindatum",
  "Einddatum",
  "eindtijd",
  "Bedrijf",
  "Offerte / opdracht",
  "Onderdeel",
  "Tonen als taak is afgerond",
  "Tonen als offerte of opdracht is afgerond",
  "Parentonderdeel",
  "Voorkeursmedewerker",
  "Groep",
  "Bedrijf - offerte / opdracht",
  "Gepland bij",
  "Contract",
] as const;

interface ImportedSourceRow {
  rowNumber: number;
  type: string | null;
  taak: string | null;
  nummer: number | null;
  fase: string | null;
  afgerondOp: string | null;
  omschrijving: string | null;
  aantal: number | null;
  eenheid: string | null;
  tijdschrijven: string | null;
  werkelijk: number | null;
  gepland: number | null;
  begindatum: string | null;
  einddatum: string | null;
  eindtijd: string | null;
  bedrijf: string | null;
  offerteOpdracht: string | null;
  onderdeel: string | null;
  tonenAlsTaakIsAfgerond: string | null;
  tonenAlsOfferteOfOpdrachtIsAfgerond: string | null;
  parentonderdeel: string | null;
  voorkeursmedewerker: string | null;
  groep: string | null;
  bedrijfOfferteOpdracht: string | null;
  geplandBij: string | null;
  contract: string | null;
  rawPayload: Record<string, unknown>;
}

interface ImportSummary {
  batchId: string;
  totalRows: number;
  importedLabRows: number;
  projectsUpserted: number;
  tasksInserted: number;
  tasksUpdated: number;
}

interface DatabaseProjectRow {
  id: string;
  source_nummer: number;
}

interface DatabasePlannerTaskRow {
  id: string;
  source_nummer: number | null;
  title: string;
}

interface DatabaseCatalogRow {
  code: string;
  name: string;
  default_duration_hours: number;
  default_priority: Task["priority"];
}

type ExcelLoadBuffer = Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
const defaultGenericDurationHours = 1;
const maxSuggestedPlannerDurationHours = 9;

function normalizeString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : null;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsedValue = Number(String(value).replace(",", "."));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const parsedDate = new Date(excelEpoch + value * 24 * 60 * 60 * 1000);

    return Number.isNaN(parsedDate.getTime())
      ? null
      : parsedDate.toISOString().slice(0, 10);
  }

  const textValue = normalizeString(value);

  if (!textValue) {
    return null;
  }

  const parsedDate = new Date(textValue);
  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate.toISOString().slice(0, 10);
}

function buildRowHash(row: ImportedSourceRow) {
  return createHash("sha256")
    .update(JSON.stringify(row.rawPayload))
    .digest("hex");
}

function unwrapExcelValue(
  value: ExcelJS.CellValue | ExcelJS.RichText[] | null | undefined,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    value instanceof Date ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => ("text" in item ? item.text : ""))
      .join("");
  }

  if (typeof value === "object") {
    if ("result" in value) {
      return unwrapExcelValue(value.result);
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink;
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }
  }

  return String(value);
}

async function parseWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelLoadBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Het Excel-bestand bevat geen werkblad.");
  }

  const headerMap = new Map<number, string>();
  const allowedColumns = new Set<string>(sourceColumnNames);

  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = normalizeString(unwrapExcelValue(cell.value));

    if (header) {
      headerMap.set(columnNumber, header);
    }
  });

  const importedRows: ImportedSourceRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const worksheetRow = worksheet.getRow(rowNumber);
    const rawPayload = sourceColumnNames.reduce<Record<string, unknown>>(
      (result, columnName) => {
        result[columnName] = null;
        return result;
      },
      {},
    );

    let hasAnyValue = false;

    headerMap.forEach((header, columnNumber) => {
      const rawValue = unwrapExcelValue(worksheetRow.getCell(columnNumber).value);

      if (rawValue !== null && rawValue !== "") {
        hasAnyValue = true;
      }

      if (allowedColumns.has(header)) {
        rawPayload[header] = rawValue;
      }
    });

    if (!hasAnyValue) {
      continue;
    }

    importedRows.push({
      rowNumber,
      type: normalizeString(rawPayload.Type),
      taak: normalizeString(rawPayload.Taak),
      nummer: normalizeNumber(rawPayload.Nummer),
      fase: normalizeString(rawPayload.Fase),
      afgerondOp: normalizeDate(rawPayload["Afgerond op"]),
      omschrijving: normalizeString(rawPayload.Omschrijving),
      aantal: normalizeNumber(rawPayload.Aantal),
      eenheid: normalizeString(rawPayload.Eenheid),
      tijdschrijven: normalizeString(rawPayload.Tijschrijven),
      werkelijk: normalizeNumber(rawPayload.Werkelijk),
      gepland: normalizeNumber(rawPayload.Gepland),
      begindatum: normalizeDate(rawPayload.Begindatum),
      einddatum: normalizeDate(rawPayload.Einddatum),
      eindtijd: normalizeString(rawPayload.eindtijd),
      bedrijf: normalizeString(rawPayload.Bedrijf),
      offerteOpdracht: normalizeString(rawPayload["Offerte / opdracht"]),
      onderdeel: normalizeString(rawPayload.Onderdeel),
      tonenAlsTaakIsAfgerond: normalizeString(
        rawPayload["Tonen als taak is afgerond"],
      ),
      tonenAlsOfferteOfOpdrachtIsAfgerond: normalizeString(
        rawPayload["Tonen als offerte of opdracht is afgerond"],
      ),
      parentonderdeel: normalizeString(rawPayload.Parentonderdeel),
      voorkeursmedewerker: normalizeString(rawPayload.Voorkeursmedewerker),
      groep: normalizeString(rawPayload.Groep),
      bedrijfOfferteOpdracht: normalizeString(
        rawPayload["Bedrijf - offerte / opdracht"],
      ),
      geplandBij: normalizeString(rawPayload["Gepland bij"]),
      contract: normalizeString(rawPayload.Contract),
      rawPayload,
    });
  }

  return importedRows;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function toPriority(row: ImportedSourceRow): Task["priority"] {
  if ((row.fase ?? "").toLowerCase().includes("uitvoering")) {
    return "Hoog";
  }

  return "Middel";
}

function toTaskDuration(row: ImportedSourceRow) {
  if (row.gepland !== null && row.gepland > 0) {
    return Math.min(
      Math.max(row.gepland, 0.25),
      maxSuggestedPlannerDurationHours,
    );
  }

  if (row.aantal !== null && row.aantal > 0 && row.aantal <= 24) {
    return Math.min(
      Math.max(row.aantal, 0.25),
      maxSuggestedPlannerDurationHours,
    );
  }

  return defaultGenericDurationHours;
}

function toTaskQuantity(row: ImportedSourceRow) {
  if (row.aantal !== null && row.aantal > 24) {
    return Math.max(1, Math.round(row.aantal));
  }

  return 1;
}

function buildGenericTaskDescription(row: ImportedSourceRow) {
  const parts = [
    row.omschrijving,
    row.aantal !== null && row.aantal > 24
      ? `Bronaantal: ${row.aantal}`
      : null,
    row.aantal !== null && row.aantal > 24
      ? "Geen LABSPEC gevonden, daarom is de planduur conservatief op 1 uur gezet."
      : null,
    row.bedrijf ? `Bedrijf: ${row.bedrijf}` : null,
    row.offerteOpdracht ? `Project: ${row.offerteOpdracht}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

function normalizeSpecItems(row: ImportedSourceRow) {
  return parseProjectTestsFromDescription(row.omschrijving).reduce<
    Array<{ code: string; quantity: number }>
  >(
    (result, item) => {
      const existingItem = result.find((entry) => entry.code === item.code);

      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        result.push({ ...item });
      }

      return result;
    },
    [],
  );
}

export async function importLabWorkbook(
  fileName: string,
  buffer: Buffer,
): Promise<ImportSummary> {
  const supabase = createSupabaseAdminClient();
  const parsedRows = await parseWorkbook(buffer);
  const labRows = parsedRows.filter(
    (row) => (row.type ?? "").toLowerCase() === "lab" && row.nummer !== null,
  );

  const batchResponse = await supabase
    .from("source_import_batches")
    .insert({
      filename: fileName,
      source_system: "web_upload",
      note: `Upload via webapp, ${labRows.length} labregels gevonden.`,
    })
    .select("id")
    .single();

  if (batchResponse.error || !batchResponse.data) {
    throw new Error(
      batchResponse.error?.message ?? "Kon geen importbatch aanmaken.",
    );
  }

  const batchId = batchResponse.data.id;

  for (const chunk of chunkArray(parsedRows, 250)) {
    const rawRowsPayload = chunk.map((row) => ({
      batch_id: batchId,
      source_row_number: row.rowNumber,
      type: row.type,
      taak: row.taak,
      nummer: row.nummer,
      fase: row.fase,
      afgerond_op: row.afgerondOp,
      omschrijving: row.omschrijving,
      aantal: row.aantal,
      eenheid: row.eenheid,
      tijdschrijven: row.tijdschrijven,
      werkelijk: row.werkelijk,
      gepland: row.gepland,
      begindatum: row.begindatum,
      einddatum: row.einddatum,
      eindtijd: row.eindtijd,
      bedrijf: row.bedrijf,
      offerte_opdracht: row.offerteOpdracht,
      onderdeel: row.onderdeel,
      tonen_als_taak_is_afgerond: row.tonenAlsTaakIsAfgerond,
      tonen_als_offerte_of_opdracht_is_afgerond:
        row.tonenAlsOfferteOfOpdrachtIsAfgerond,
      parentonderdeel: row.parentonderdeel,
      voorkeursmedewerker: row.voorkeursmedewerker,
      groep: row.groep,
      bedrijf_offerte_opdracht: row.bedrijfOfferteOpdracht,
      gepland_bij: row.geplandBij,
      contract: row.contract,
      row_hash: buildRowHash(row),
      raw_payload: row.rawPayload,
    }));

    const insertRawResponse = await supabase
      .from("source_export_rows")
      .insert(rawRowsPayload);

    if (insertRawResponse.error) {
      throw new Error(
        `Kon ruwe bronregels niet opslaan: ${insertRawResponse.error.message}`,
      );
    }
  }

  if (labRows.length === 0) {
    return {
      batchId,
      totalRows: parsedRows.length,
      importedLabRows: 0,
      projectsUpserted: 0,
      tasksInserted: 0,
      tasksUpdated: 0,
    };
  }

  const projectPayload = labRows.map((row) => ({
    source_nummer: row.nummer,
    source_type: row.type ?? "Lab",
    title: row.taak ?? `Lab ${row.nummer}`,
    company_name: row.bedrijf,
    offer_assignment: row.offerteOpdracht,
    component: row.onderdeel,
    group_name: row.groep,
    contract: row.contract,
    preferred_employee_name: row.voorkeursmedewerker,
    status: row.fase,
    source_description: row.omschrijving,
    project_notes: extractProjectNotesFromDescription(row.omschrijving),
    source_quantity: row.aantal,
    source_unit: row.eenheid,
    source_start_date: row.begindatum,
    source_end_date: row.einddatum,
    source_end_time: row.eindtijd,
    source_planned_at: row.geplandBij,
    source_company_offer_assignment: row.bedrijfOfferteOpdracht,
    raw_payload: row.rawPayload,
  }));

  const upsertProjectsResponse = await supabase
    .from("lab_projects")
    .upsert(projectPayload, {
      onConflict: "source_nummer",
    })
    .select("id, source_nummer");

  if (upsertProjectsResponse.error) {
    throw new Error(
      `Kon labprojecten niet bijwerken: ${upsertProjectsResponse.error.message}`,
    );
  }

  const projectMap = new Map<number, DatabaseProjectRow>();

  for (const row of upsertProjectsResponse.data ?? []) {
    projectMap.set(row.source_nummer, row);
  }

  const sourceNummers = labRows
    .map((row) => row.nummer)
    .filter((value): value is number => value !== null);

  const [catalogResponse, existingTasksResponse] = await Promise.all([
    supabase
      .from("lab_test_catalog")
      .select("code, name, default_duration_hours, default_priority"),
    supabase
      .from("planner_tasks")
      .select("id, source_nummer, title")
      .in("source_nummer", sourceNummers),
  ]);

  if (catalogResponse.error) {
    throw new Error(
      `Kon proefcatalogus niet laden: ${catalogResponse.error.message}`,
    );
  }

  if (existingTasksResponse.error) {
    throw new Error(
      `Kon bestaande planner taken niet laden: ${existingTasksResponse.error.message}`,
    );
  }

  const catalogMap = new Map(
    (catalogResponse.data ?? []).map((row: DatabaseCatalogRow) => [row.code, row]),
  );

  const existingTaskMap = new Map<string, DatabasePlannerTaskRow>();

  for (const row of existingTasksResponse.data ?? []) {
    if (row.source_nummer !== null) {
      existingTaskMap.set(`${row.source_nummer}:${row.title}`, row);
    }
  }

  let tasksInserted = 0;
  let tasksUpdated = 0;

  for (const row of labRows) {
    if (row.nummer === null) {
      continue;
    }

    const project = projectMap.get(row.nummer);

    if (!project) {
      continue;
    }

    const normalizedSpecItems = normalizeSpecItems(row);

    if (normalizedSpecItems.length > 0) {
      const existingTestsResponse = await supabase
        .from("lab_request_tests")
        .select("id, test_code")
        .eq("project_id", project.id);

      if (existingTestsResponse.error) {
        throw new Error(
          `Kon bestaande proeftypes niet laden: ${existingTestsResponse.error.message}`,
        );
      }

      const existingTestsMap = new Map(
        (existingTestsResponse.data ?? []).map((test) => [test.test_code, test.id]),
      );

      for (const item of normalizedSpecItems) {
        const catalogItem = catalogMap.get(item.code);
        const testName =
          catalogItem?.name ?? knownLabTestCodes[item.code] ?? item.code;
        const durationPerItem = catalogItem?.default_duration_hours ?? 1;

        const testPayload = {
          project_id: project.id,
          test_code: item.code,
          test_name: testName,
          quantity: Math.max(1, Math.round(item.quantity)),
          duration_hours_per_item: durationPerItem,
          source_fragment: row.omschrijving,
          notes: "Ingelezen vanuit LABSPEC in de bronomschrijving.",
        };

        const existingTestId = existingTestsMap.get(item.code);

        if (existingTestId) {
          const updateTestResponse = await supabase
            .from("lab_request_tests")
            .update(testPayload)
            .eq("id", existingTestId);

          if (updateTestResponse.error) {
            throw new Error(
              `Kon proefregel ${item.code} niet bijwerken: ${updateTestResponse.error.message}`,
            );
          }
        } else {
          const insertTestResponse = await supabase
            .from("lab_request_tests")
            .insert(testPayload);

          if (insertTestResponse.error) {
            throw new Error(
              `Kon proefregel ${item.code} niet opslaan: ${insertTestResponse.error.message}`,
            );
          }
        }
      }

      const syncResult = await syncProjectPlannerTasks(project.id, supabase);
      tasksUpdated += syncResult.syncedTaskCount;
    } else {
      const syncResult = await syncProjectPlannerTasks(project.id, supabase);

      if (syncResult.hasRequestTests) {
        tasksUpdated += syncResult.syncedTaskCount;
        continue;
      }

      const genericTitle = row.taak ?? `Lab ${row.nummer}`;
      const genericPayload = {
        project_id: project.id,
        source_nummer: row.nummer,
        request_test_id: null,
        title: genericTitle,
        project_name:
          row.offerteOpdracht ??
          row.bedrijfOfferteOpdracht ??
          genericTitle,
        description: buildGenericTaskDescription(row),
        priority: toPriority(row),
        duration_hours: Math.max(toTaskDuration(row), 0.25),
        quantity: toTaskQuantity(row),
        source_omschrijving: row.omschrijving,
        source_type: "Lab",
      };

      const existingTask = existingTaskMap.get(`${row.nummer}:${genericTitle}`);

      if (existingTask) {
        const updateTaskResponse = await supabase
          .from("planner_tasks")
          .update(genericPayload)
          .eq("id", existingTask.id);

        if (updateTaskResponse.error) {
          throw new Error(
            `Kon planner taak ${genericTitle} niet bijwerken: ${updateTaskResponse.error.message}`,
          );
        }

        tasksUpdated += 1;
      } else {
        const insertTaskResponse = await supabase
          .from("planner_tasks")
          .insert(genericPayload)
          .select("id, source_nummer, title")
          .single();

        if (insertTaskResponse.error || !insertTaskResponse.data) {
          throw new Error(
            `Kon planner taak ${genericTitle} niet opslaan: ${insertTaskResponse.error?.message ?? "onbekende fout"}`,
          );
        }

        existingTaskMap.set(
          `${row.nummer}:${genericTitle}`,
          insertTaskResponse.data as DatabasePlannerTaskRow,
        );
        tasksInserted += 1;
      }
    }
  }

  return {
    batchId,
    totalRows: parsedRows.length,
    importedLabRows: labRows.length,
    projectsUpserted: projectMap.size,
    tasksInserted,
    tasksUpdated,
  };
}
