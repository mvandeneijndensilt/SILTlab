"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

interface ImportSummary {
  batchId: string;
  totalRows: number;
  importedLabRows: number;
  projectsUpserted: number;
  tasksInserted: number;
  tasksUpdated: number;
}

export default function LabImportPanel() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage("");
    setError("");
    setSummary(null);

    startTransition(async () => {
      const response = await fetch("/api/import-lab-export", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        summary?: ImportSummary;
      };

      if (!response.ok || result.error) {
        setError(result.error ?? "De upload is mislukt.");
        return;
      }

      setMessage(result.message ?? "Import voltooid.");
      setSummary(result.summary ?? null);
      formRef.current?.reset();
      setSelectedFileName("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Import
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-slate-950">
            Upload labexport
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Upload hier de Excel-export uit het bronprogramma. Alleen regels met
            <span className="font-semibold text-slate-900"> Type = Lab </span>
            worden verwerkt. Bestaand labwerk wordt bijgewerkt en nieuwe regels
            worden toegevoegd aan de planner. Maximale bestandsgrootte: 10 MB.
          </p>
        </div>

        <form
          ref={formRef}
          action={handleSubmit}
          className="flex w-full flex-col gap-3 xl:max-w-xl"
        >
          <label
            htmlFor="lab-export-upload"
            className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-500 transition hover:border-slate-400 hover:bg-white"
          >
            <span className="block font-semibold text-slate-900">
              Kies een `.xlsx` bestand
            </span>
            <span className="mt-1 block">
              {selectedFileName || "Nog geen bestand geselecteerd"}
            </span>
          </label>

          <input
            id="lab-export-upload"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(event) =>
              setSelectedFileName(event.target.files?.[0]?.name ?? "")
            }
          />

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Bezig met importeren..." : "Upload en verwerk bestand"}
          </button>
        </form>
      </div>

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Batch
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {summary.batchId.slice(0, 8)}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Bronregels
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {summary.totalRows}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Labregels
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {summary.importedLabRows}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Projecten
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {summary.projectsUpserted}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Taken
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              +{summary.tasksInserted} / bijgewerkt {summary.tasksUpdated}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
