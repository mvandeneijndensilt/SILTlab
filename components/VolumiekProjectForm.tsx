"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  countFilledVolumiekRows,
  createEmptyVolumiekRow,
  type VolumiekProjectRecord,
  type VolumiekRow,
  type VolumiekState,
} from "@/lib/volumiek";

interface VolumiekProjectFormProps {
  project: VolumiekProjectRecord;
  editable: boolean;
}

const rowFields: Array<{
  key: keyof VolumiekRow;
  label: string;
  placeholder?: string;
  widthClassName?: string;
}> = [
  { key: "schaalnr", label: "Schaalnr", placeholder: "Bijv. 1045", widthClassName: "w-28" },
  { key: "boring", label: "Boring", placeholder: "Bijv. B01", widthClassName: "w-24" },
  { key: "monster", label: "Monster", placeholder: "Bijv. M1", widthClassName: "w-24" },
  { key: "diepte_van_cm", label: "Diepte van", placeholder: "0", widthClassName: "w-24" },
  { key: "diepte_tot_cm", label: "Diepte tot", placeholder: "25", widthClassName: "w-24" },
  {
    key: "monsterbasis",
    label: "Visuele classificatie",
    placeholder: "Bijv. zwak zandig klei",
    widthClassName: "w-52",
  },
  {
    key: "bijzonderheden",
    label: "Bijzonderheden",
    placeholder: "Vrij veld",
    widthClassName: "w-52",
  },
  { key: "kleur", label: "Kleur", placeholder: "Bruin", widthClassName: "w-28" },
  {
    key: "gewicht_schaaltje_g",
    label: "Gewicht schaaltje (g)",
    placeholder: "0",
    widthClassName: "w-32",
  },
  {
    key: "gewicht_ring_g",
    label: "Gewicht ring (g)",
    placeholder: "0",
    widthClassName: "w-32",
  },
  { key: "type_ring", label: "Type ring", placeholder: "K / N / H", widthClassName: "w-24" },
  {
    key: "nat_m_ring_schaal_g",
    label: "Nat M+ring+schaal (g)",
    placeholder: "0",
    widthClassName: "w-36",
  },
  {
    key: "nat_m_schaal_g",
    label: "Nat M+schaal (g)",
    placeholder: "0",
    widthClassName: "w-32",
  },
  {
    key: "droog_m_schaal_g",
    label: "Droog M+schaal (g)",
    placeholder: "0",
    widthClassName: "w-32",
  },
  { key: "pct_gevuld", label: "% gevuld", placeholder: "100", widthClassName: "w-24" },
];

function cloneState(state: VolumiekState): VolumiekState {
  return {
    ...state,
    rows: state.rows.map((row) => ({ ...row })),
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Nog niet opgeslagen";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function parsePositiveNumber(value: string, fallback: number) {
  const parsedValue = Number(value.replace(",", "."));
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export default function VolumiekProjectForm({
  project,
  editable,
}: VolumiekProjectFormProps) {
  const router = useRouter();
  const [state, setState] = useState<VolumiekState>(() => cloneState(project.state));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const minimumRowCount = Math.max(1, project.requestedQuantity);

  useEffect(() => {
    setState(cloneState(project.state));
    setFeedback(null);
  }, [project.projectNummer, project.updatedAt, project.requestedQuantity, project.state]);

  const filledRowCount = useMemo(() => countFilledVolumiekRows(state), [state]);
  const hasChanges = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(project.state),
    [project.state, state],
  );

  function updateField<K extends keyof VolumiekState>(
    key: K,
    value: VolumiekState[K],
  ) {
    setState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
  }

  function updateRow(index: number, key: keyof VolumiekRow, value: string) {
    setState((currentState) => ({
      ...currentState,
      rows: currentState.rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    }));
  }

  function addRow() {
    setState((currentState) => ({
      ...currentState,
      rows: [...currentState.rows, createEmptyVolumiekRow()],
    }));
  }

  function removeRow(index: number) {
    if (state.rows.length <= minimumRowCount) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      rows: currentState.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  function resetForm() {
    setState(cloneState(project.state));
    setFeedback(null);
  }

  function handleSave() {
    if (!editable || !hasChanges) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/volumiek/${project.projectNummer}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: project.projectId ?? null,
            title: project.title,
            requestedQuantity: project.requestedQuantity,
            state,
          }),
        });

        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon volumiek-invoer niet opslaan.");
        }

        setFeedback(payload.message ?? "Volumiek-invoer opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van volumiek-invoer.",
        );
      }
    });
  }

  const completionTone =
    filledRowCount >= Math.max(1, project.requestedQuantity)
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : filledRowCount > 0
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Gevraagd
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {project.requestedQuantity}
          </p>
          <p className="mt-1 text-sm text-slate-500">Volumegewicht-proeven vanuit projectproeven.</p>
        </div>

        <div className={`rounded-2xl border px-4 py-4 shadow-sm ${completionTone}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Ingevuld</p>
          <p className="mt-2 text-2xl font-semibold">
            {filledRowCount} / {Math.max(1, project.requestedQuantity)}
          </p>
          <p className="mt-1 text-sm">
            {filledRowCount >= Math.max(1, project.requestedQuantity)
              ? "Klaar om in SILT Suite verder te verwerken."
              : "Nog niet alle gevraagde monsters hebben invoer."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Laatste update
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatDateTime(project.updatedAt)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Bron: {project.lastEditorSource ?? "nog niet ingevuld"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Uitvoerder
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {state.uitgevoerd_door || "Nog niet ingevuld"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Laatst opgeslagen door: {project.updatedBy ?? "onbekend"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_0.7fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Project</span>
          <input
            type="text"
            value={state.project}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Projectnummer</span>
          <input
            type="text"
            value={state.projectnummer}
            readOnly
            className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Uitgevoerd door</span>
          <input
            type="text"
            value={state.uitgevoerd_door}
            onChange={(event) => updateField("uitgevoerd_door", event.target.value)}
            disabled={!editable || isPending}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
            placeholder="Initialen of naam"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Kopecky (cm3)</span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={state.kopecky_cm3}
            onChange={(event) =>
              updateField(
                "kopecky_cm3",
                parsePositiveNumber(event.target.value, state.kopecky_cm3),
              )
            }
            disabled={!editable || isPending}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Ring N D (cm)</span>
            <input
              type="number"
              min={1}
              step={0.1}
              value={state.ringN_d_cm}
              onChange={(event) =>
                updateField(
                  "ringN_d_cm",
                  parsePositiveNumber(event.target.value, state.ringN_d_cm),
                )
              }
              disabled={!editable || isPending}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Ring N H (cm)</span>
            <input
              type="number"
              min={1}
              step={0.1}
              value={state.ringN_h_cm}
              onChange={(event) =>
                updateField(
                  "ringN_h_cm",
                  parsePositiveNumber(event.target.value, state.ringN_h_cm),
                )
              }
              disabled={!editable || isPending}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={state.show_executor_on_pdf}
            onChange={(event) => updateField("show_executor_on_pdf", event.target.checked)}
            disabled={!editable || isPending}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          Toon uitvoerder op PDF
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={state.show_ring_settings_on_pdf}
            onChange={(event) =>
              updateField("show_ring_settings_on_pdf", event.target.checked)
            }
            disabled={!editable || isPending}
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
          />
          Toon ringinstellingen op PDF
        </label>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Ruwe invoer
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              Volumiek-regels voor webapp en SILT Suite
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Deze tabel vervangt de oude FTP-webform. De opgeslagen invoer kan
              straks rechtstreeks door de desktoptool worden opgehaald.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addRow}
              disabled={!editable || isPending}
              className="rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Regel toevoegen
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending || !hasChanges}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Herstel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!editable || isPending || !hasChanges}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto px-5 py-5">
          <table className="min-w-max border-separate border-spacing-y-3 text-sm text-slate-700">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 rounded-l-2xl bg-slate-100 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Regel
                </th>
                {rowFields.map((field) => (
                  <th
                    key={field.key}
                    className="bg-slate-100 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
                  >
                    {field.label}
                  </th>
                ))}
                <th className="rounded-r-2xl bg-slate-100 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Actie
                </th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row, index) => (
                <tr key={`${project.projectNummer}-${index}`}>
                  <td className="sticky left-0 z-10 rounded-l-2xl border border-r-0 border-slate-200 bg-white px-3 py-3 align-top font-semibold text-slate-900 shadow-sm">
                    {index + 1}
                  </td>
                  {rowFields.map((field) => (
                    <td key={field.key} className="border-y border-slate-200 bg-white px-3 py-3 shadow-sm">
                      <input
                        type="text"
                        value={row[field.key]}
                        onChange={(event) => updateRow(index, field.key, event.target.value)}
                        disabled={!editable || isPending}
                        placeholder={field.placeholder}
                        className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100 ${field.widthClassName ?? "w-40"}`}
                      />
                    </td>
                  ))}
                  <td className="rounded-r-2xl border border-l-0 border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={!editable || isPending || state.rows.length <= minimumRowCount}
                      className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {feedback ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedback.toLowerCase().includes("opgeslagen")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {!editable ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bewerken is pas beschikbaar zodra de app live met Supabase-data werkt.
        </p>
      ) : null}
    </div>
  );
}
