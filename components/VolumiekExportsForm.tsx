"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type {
  ToolExportCleanupStatus,
  VolumiekExportRecord,
} from "@/lib/volumiek";

interface VolumiekExportsFormProps {
  projectNummer: string;
  projectId?: string | null;
  title: string;
  exports: VolumiekExportRecord[];
  editable: boolean;
}

const cleanupOptions: Array<{ value: ToolExportCleanupStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "bewaren", label: "Bewaren" },
  { value: "verwijderen", label: "Verwijderen" },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Onbekend";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeText(value: string) {
  return value.trim();
}

export default function VolumiekExportsForm({
  projectNummer,
  projectId,
  title,
  exports,
  editable,
}: VolumiekExportsFormProps) {
  const router = useRouter();
  const [draftFilename, setDraftFilename] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setFeedback(null);
    setDraftFilename("");
  }, [projectNummer]);

  const hasExports = exports.length > 0;
  const openCount = useMemo(
    () => exports.filter((entry) => entry.cleanupStatus === "open").length,
    [exports],
  );

  function handleAddExport() {
    if (!editable) {
      return;
    }

    const outputFilename = normalizeText(draftFilename);

    if (!outputFilename) {
      setFeedback("Vul een bestandsnaam in.");
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/volumiek/${projectNummer}/exports`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectId ?? null,
            title,
            outputFilename,
          }),
        });

        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon export niet opslaan.");
        }

        setDraftFilename("");
        setFeedback(payload.message ?? "Export opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van de export.",
        );
      }
    });
  }

  function updateStatus(exportId: string, cleanupStatus: ToolExportCleanupStatus) {
    if (!editable) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/volumiek/${projectNummer}/exports/${exportId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cleanupStatus }),
          },
        );

        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon status niet opslaan.");
        }

        setFeedback(payload.message ?? "Status bijgewerkt.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van de status.",
        );
      }
    });
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Exports
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Rapportages / PDF exports
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Zodra SILT Suite een PDF export maakt, verschijnt die hier. Een beheerder kan
            daarna aangeven of de onderliggende webapp-data bewaard of opgeschoond mag
            worden.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
            Open: {openCount}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Handmatig toevoegen
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={draftFilename}
                onChange={(event) => setDraftFilename(event.target.value)}
                disabled={!editable || isPending}
                className="w-[min(72vw,420px)] rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                placeholder="2503090_VOL_B01_20260415.pdf"
              />
              <button
                type="button"
                onClick={handleAddExport}
                disabled={!editable || isPending}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isPending ? "Opslaan..." : "Toevoegen"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm text-slate-700">
          <thead>
            <tr>
              <th className="rounded-l-2xl bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Bestand
              </th>
              <th className="bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Exportdatum
              </th>
              <th className="bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Door
              </th>
              <th className="rounded-r-2xl bg-slate-100 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Opschonen
              </th>
            </tr>
          </thead>
          <tbody>
            {hasExports ? (
              exports.map((entry) => (
                <tr key={entry.id}>
                  <td className="rounded-l-2xl border border-r-0 border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 shadow-sm">
                    {entry.outputFilename}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3 shadow-sm">
                    {formatDateTime(entry.exportedAt)}
                  </td>
                  <td className="border-y border-slate-200 bg-white px-4 py-3 shadow-sm">
                    {entry.exportedBy ?? "—"}
                  </td>
                  <td className="rounded-r-2xl border border-l-0 border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <select
                      value={entry.cleanupStatus}
                      onChange={(event) =>
                        updateStatus(
                          entry.id,
                          event.target.value as ToolExportCleanupStatus,
                        )
                      }
                      disabled={!editable || isPending}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                    >
                      {cleanupOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500"
                >
                  Nog geen exports gevonden. Exports verschijnen automatisch zodra SILT Suite
                  een PDF opslaat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            feedback.toLowerCase().includes("opgeslagen") ||
            feedback.toLowerCase().includes("bijgewerkt")
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
