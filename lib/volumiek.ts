import type {
  PlannerDataSource,
  ProjectPlanningPriority,
} from "@/lib/types";

export const volumiekToolKey = "volumiek";

export interface VolumiekRow {
  schaalnr: string;
  boring: string;
  monster: string;
  diepte_van_cm: string;
  diepte_tot_cm: string;
  monsterbasis: string;
  bijzonderheden: string;
  kleur: string;
  gewicht_schaaltje_g: string;
  gewicht_ring_g: string;
  type_ring: string;
  nat_m_ring_schaal_g: string;
  nat_m_schaal_g: string;
  droog_m_schaal_g: string;
  pct_gevuld: string;
}

export interface VolumiekState {
  project: string;
  projectnummer: string;
  uitgevoerd_door: string;
  show_executor_on_pdf: boolean;
  show_ring_settings_on_pdf: boolean;
  kopecky_cm3: number;
  ringN_d_cm: number;
  ringN_h_cm: number;
  rows: VolumiekRow[];
  make_json_backup: boolean;
}

export interface VolumiekSampleRequest {
  id?: string | null;
  boring: string;
  monster: string;
  diepteVanCm?: string | null;
  diepteTotCm?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  lastEditorSource?: string | null;
}

export type ToolExportCleanupStatus = "open" | "bewaren" | "verwijderen";

export interface VolumiekExportRecord {
  id: string;
  outputFilename: string;
  exportedAt: string | null;
  exportedBy: string | null;
  cleanupStatus: ToolExportCleanupStatus;
  cleanupBy?: string | null;
  cleanupAt?: string | null;
  meta?: Record<string, unknown> | null;
  lastEditorSource?: string | null;
}

export interface VolumiekProjectRecord {
  projectNummer: string;
  projectId?: string | null;
  title: string;
  companyName?: string | null;
  planningPriority: ProjectPlanningPriority;
  deadline?: string | null;
  sourceEstimatedHours?: number | null;
  requestedQuantity: number;
  sampleRequests: VolumiekSampleRequest[];
  exports: VolumiekExportRecord[];
  state: VolumiekState;
  formId?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  lastEditorSource?: string | null;
  rowCount: number;
  filledRowCount: number;
}

export interface VolumiekManagementData {
  projects: VolumiekProjectRecord[];
  source: PlannerDataSource;
  warning?: string;
}

export function createEmptyVolumiekRow(): VolumiekRow {
  return {
    schaalnr: "",
    boring: "",
    monster: "",
    diepte_van_cm: "",
    diepte_tot_cm: "",
    monsterbasis: "",
    bijzonderheden: "",
    kleur: "",
    gewicht_schaaltje_g: "",
    gewicht_ring_g: "",
    type_ring: "",
    nat_m_ring_schaal_g: "",
    nat_m_schaal_g: "",
    droog_m_schaal_g: "",
    pct_gevuld: "100",
  };
}

function toText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toPositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeSampleKey(boring: string, monster: string) {
  const boringToken = boring.trim().toUpperCase();
  const monsterToken = monster.trim();

  if (!boringToken || !monsterToken) {
    return "";
  }

  return `${boringToken}|${monsterToken}`;
}

export function rowHasVolumiekInput(row: VolumiekRow) {
  // Boring/monster/diepte worden vaak vooraf ingevuld vanuit requests; tel dat niet als 'werk gedaan'.
  const measurementKeys: Array<keyof VolumiekRow> = [
    "schaalnr",
    "monsterbasis",
    "bijzonderheden",
    "kleur",
    "gewicht_schaaltje_g",
    "gewicht_ring_g",
    "type_ring",
    "nat_m_ring_schaal_g",
    "nat_m_schaal_g",
    "droog_m_schaal_g",
  ];

  return measurementKeys.some((key) => row[key].trim().length > 0);
}

export function countFilledVolumiekRows(state: VolumiekState) {
  return state.rows.filter(rowHasVolumiekInput).length;
}

export function normalizeVolumiekRow(
  input: Partial<VolumiekRow> | null | undefined,
): VolumiekRow {
  const emptyRow = createEmptyVolumiekRow();

  return {
    schaalnr: toText(input?.schaalnr ?? emptyRow.schaalnr).trim(),
    boring: toText(input?.boring ?? emptyRow.boring).trim(),
    monster: toText(input?.monster ?? emptyRow.monster).trim(),
    diepte_van_cm: toText(input?.diepte_van_cm ?? emptyRow.diepte_van_cm).trim(),
    diepte_tot_cm: toText(input?.diepte_tot_cm ?? emptyRow.diepte_tot_cm).trim(),
    monsterbasis: toText(input?.monsterbasis ?? emptyRow.monsterbasis).trim(),
    bijzonderheden: toText(input?.bijzonderheden ?? emptyRow.bijzonderheden).trim(),
    kleur: toText(input?.kleur ?? emptyRow.kleur).trim(),
    gewicht_schaaltje_g: toText(
      input?.gewicht_schaaltje_g ?? emptyRow.gewicht_schaaltje_g,
    ).trim(),
    gewicht_ring_g: toText(input?.gewicht_ring_g ?? emptyRow.gewicht_ring_g).trim(),
    type_ring: toText(input?.type_ring ?? emptyRow.type_ring).trim(),
    nat_m_ring_schaal_g: toText(
      input?.nat_m_ring_schaal_g ?? emptyRow.nat_m_ring_schaal_g,
    ).trim(),
    nat_m_schaal_g: toText(input?.nat_m_schaal_g ?? emptyRow.nat_m_schaal_g).trim(),
    droog_m_schaal_g: toText(
      input?.droog_m_schaal_g ?? emptyRow.droog_m_schaal_g,
    ).trim(),
    pct_gevuld: toText(input?.pct_gevuld ?? emptyRow.pct_gevuld).trim() || "100",
  };
}

function ensureMinimumRows(rows: VolumiekRow[], requestedQuantity: number) {
  const minimumRowCount = Math.max(1, requestedQuantity);
  const normalizedRows = rows.length > 0 ? [...rows] : [createEmptyVolumiekRow()];

  while (normalizedRows.length < minimumRowCount) {
    normalizedRows.push(createEmptyVolumiekRow());
  }

  return normalizedRows;
}

export function applyVolumiekSampleRequests(
  state: VolumiekState,
  requests: VolumiekSampleRequest[],
) {
  if (!requests.length) {
    return state;
  }

  const nextState: VolumiekState = {
    ...state,
    rows: state.rows.map((row) => ({ ...row })),
  };

  const existingByKey = new Map<string, number>();

  nextState.rows.forEach((row, index) => {
    const key = normalizeSampleKey(row.boring, row.monster);
    if (key) {
      existingByKey.set(key, index);
    }
  });

  for (const request of requests) {
    const boring = request.boring.trim().toUpperCase();
    const monster = request.monster.trim();
    const key = normalizeSampleKey(boring, monster);

    if (!key) {
      continue;
    }

    const existingIndex = existingByKey.get(key);
    const depthFrom = request.diepteVanCm?.trim() ?? "";
    const depthTo = request.diepteTotCm?.trim() ?? "";

    if (existingIndex !== undefined) {
      const existingRow = nextState.rows[existingIndex];

      if (!existingRow.diepte_van_cm && depthFrom) {
        existingRow.diepte_van_cm = depthFrom;
      }

      if (!existingRow.diepte_tot_cm && depthTo) {
        existingRow.diepte_tot_cm = depthTo;
      }

      continue;
    }

    const emptyIndex = nextState.rows.findIndex(
      (row) => !row.boring.trim() && !row.monster.trim(),
    );
    const targetRow =
      emptyIndex >= 0
        ? nextState.rows[emptyIndex]
        : (() => {
            const created = createEmptyVolumiekRow();
            nextState.rows.push(created);
            return created;
          })();

    targetRow.boring = boring;
    targetRow.monster = monster;

    if (!targetRow.diepte_van_cm && depthFrom) {
      targetRow.diepte_van_cm = depthFrom;
    }

    if (!targetRow.diepte_tot_cm && depthTo) {
      targetRow.diepte_tot_cm = depthTo;
    }

    existingByKey.set(key, emptyIndex >= 0 ? emptyIndex : nextState.rows.length - 1);
  }

  return nextState;
}

export function createDefaultVolumiekState(
  projectName: string,
  projectNummer: string,
  requestedQuantity = 1,
): VolumiekState {
  return {
    project: projectName,
    projectnummer: projectNummer,
    uitgevoerd_door: "",
    show_executor_on_pdf: true,
    show_ring_settings_on_pdf: true,
    kopecky_cm3: 100,
    ringN_d_cm: 5,
    ringN_h_cm: 5,
    rows: ensureMinimumRows([], requestedQuantity),
    make_json_backup: false,
  };
}

export function normalizeVolumiekState(
  input: Partial<VolumiekState> | null | undefined,
  options: {
    projectName: string;
    projectNummer: string;
    requestedQuantity: number;
  },
): VolumiekState {
  const fallbackState = createDefaultVolumiekState(
    options.projectName,
    options.projectNummer,
    options.requestedQuantity,
  );
  const rowsInput = Array.isArray(input?.rows) ? input.rows : [];
  const normalizedRows = ensureMinimumRows(
    rowsInput.map((row) => normalizeVolumiekRow(row)),
    options.requestedQuantity,
  );

  return {
    project:
      toText(input?.project ?? fallbackState.project).trim() || options.projectName,
    projectnummer:
      toText(input?.projectnummer ?? fallbackState.projectnummer).trim() ||
      options.projectNummer,
    uitgevoerd_door: toText(input?.uitgevoerd_door ?? fallbackState.uitgevoerd_door).trim(),
    show_executor_on_pdf: toBoolean(
      input?.show_executor_on_pdf,
      fallbackState.show_executor_on_pdf,
    ),
    show_ring_settings_on_pdf: toBoolean(
      input?.show_ring_settings_on_pdf,
      fallbackState.show_ring_settings_on_pdf,
    ),
    kopecky_cm3: toPositiveNumber(input?.kopecky_cm3, fallbackState.kopecky_cm3),
    ringN_d_cm: toPositiveNumber(input?.ringN_d_cm, fallbackState.ringN_d_cm),
    ringN_h_cm: toPositiveNumber(input?.ringN_h_cm, fallbackState.ringN_h_cm),
    rows: normalizedRows,
    make_json_backup: toBoolean(input?.make_json_backup, false),
  };
}
