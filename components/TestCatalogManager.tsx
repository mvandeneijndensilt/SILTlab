"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { LabTestCatalogItem, Task } from "@/lib/types";

interface EditableCatalogRow {
  code: string;
  name: string;
  defaultDurationHours: number;
  defaultPriority: Task["priority"];
  description: string;
  isNew?: boolean;
}

interface TestCatalogManagerProps {
  catalog: LabTestCatalogItem[];
  editable: boolean;
}

const priorityOptions: Array<Task["priority"]> = ["Hoog", "Middel", "Laag"];

function toEditableRow(item: LabTestCatalogItem): EditableCatalogRow {
  return {
    code: item.code,
    name: item.name,
    defaultDurationHours: item.defaultDurationHours,
    defaultPriority: item.defaultPriority,
    description: item.description ?? "",
  };
}

function createEmptyRow(): EditableCatalogRow {
  return {
    code: "",
    name: "",
    defaultDurationHours: 1,
    defaultPriority: "Middel",
    description: "",
    isNew: true,
  };
}

function normalizedSnapshot(rows: EditableCatalogRow[]) {
  return JSON.stringify(
    rows
      .map((row) => ({
        code: row.code.trim().toUpperCase(),
        name: row.name.trim(),
        defaultDurationHours: Number(row.defaultDurationHours.toFixed(2)),
        defaultPriority: row.defaultPriority,
        description: row.description.trim(),
      }))
      .sort((a, b) => a.code.localeCompare(b.code, "nl-NL")),
  );
}

export default function TestCatalogManager({
  catalog,
  editable,
}: TestCatalogManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableCatalogRow[]>(() =>
    catalog.map(toEditableRow),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(catalog.map(toEditableRow));
    setFeedback(null);
  }, [catalog]);

  const hasChanges = useMemo(
    () => normalizedSnapshot(rows) !== normalizedSnapshot(catalog.map(toEditableRow)),
    [catalog, rows],
  );

  function updateRow(index: number, updates: Partial<EditableCatalogRow>) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...updates } : row,
      ),
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, createEmptyRow()]);
  }

  function removeRow(index: number) {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index));
  }

  function handleSave() {
    if (!editable || !hasChanges) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/test-catalog", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            catalog: rows.map((row) => ({
              code: row.code,
              name: row.name,
              defaultDurationHours: row.defaultDurationHours,
              defaultPriority: row.defaultPriority,
              description: row.description,
            })),
          }),
        });

        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon de proevencatalogus niet opslaan.");
        }

        setFeedback(payload.message ?? "Proevencatalogus opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van de proevencatalogus.",
        );
      }
    });
  }

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Proevencatalogus
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Verwachte duur per proef
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Deze waarden worden gebruikt als standaardduur wanneer je proeven aan een
            project toevoegt of proeven automatisch laat herkennen vanuit de
            omschrijving.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addRow}
            disabled={!editable || isPending}
            className="rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Proef toevoegen
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

      <div className="mt-5 space-y-4">
        {rows.length > 0 ? (
          rows.map((row, index) => {
            const isNewRow = Boolean(row.isNew);

            return (
              <div
                key={`${row.code || "new"}-${index}`}
                className="grid gap-4 rounded-2xl border border-white/80 bg-white p-4 shadow-sm lg:grid-cols-[0.7fr_1.1fr_0.8fr_0.8fr_1.4fr_auto]"
              >
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Code
                  </span>
                  <input
                    type="text"
                    value={row.code}
                    onChange={(event) =>
                      updateRow(index, {
                        code: event.target.value.toUpperCase().replace(/\s+/g, ""),
                      })
                    }
                    disabled={!editable || isPending || !isNewRow}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:text-slate-500"
                    placeholder="Bijv. VGW"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Naam
                  </span>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(event) => updateRow(index, { name: event.target.value })}
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                    placeholder="Bijv. Korrelverdeling"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Uur per stuk
                  </span>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={row.defaultDurationHours}
                    onChange={(event) =>
                      updateRow(index, {
                        defaultDurationHours: Math.max(
                          0.25,
                          Number(event.target.value) || 0.25,
                        ),
                      })
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Prioriteit
                  </span>
                  <select
                    value={row.defaultPriority}
                    onChange={(event) =>
                      updateRow(index, {
                        defaultPriority: event.target.value as Task["priority"],
                      })
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Omschrijving
                  </span>
                  <input
                    type="text"
                    value={row.description}
                    onChange={(event) =>
                      updateRow(index, { description: event.target.value })
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                    placeholder="Optioneel"
                  />
                </label>

                <div className="flex items-end justify-end">
                  {isNewRow ? (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={!editable || isPending}
                      className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Verwijderen
                    </button>
                  ) : (
                    <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                      Bestaand
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
            Er zijn nog geen proeven in de catalogus.
          </div>
        )}
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            feedback.includes("opgeslagen")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {!editable ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bewerken is pas beschikbaar zodra de app live met Supabase-data werkt.
        </p>
      ) : null}
    </div>
  );
}

