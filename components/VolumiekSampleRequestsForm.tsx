"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { VolumiekSampleRequest } from "@/lib/volumiek";

interface VolumiekSampleRequestsFormProps {
  projectNummer: string;
  projectId?: string | null;
  title: string;
  requests: VolumiekSampleRequest[];
  editable: boolean;
}

function normalizeText(value: string) {
  return value.trim();
}

function buildComparablePayload(requests: VolumiekSampleRequest[]) {
  return requests
    .map((request) => ({
      boring: normalizeText(request.boring).toUpperCase(),
      monster: normalizeText(request.monster),
      diepteVanCm: normalizeText(request.diepteVanCm ?? ""),
      diepteTotCm: normalizeText(request.diepteTotCm ?? ""),
      notes: normalizeText(request.notes ?? ""),
    }))
    .sort(
      (left, right) =>
        left.boring.localeCompare(right.boring, "nl-NL") ||
        left.monster.localeCompare(right.monster, "nl-NL"),
    );
}

function createEmptyRequest(): VolumiekSampleRequest {
  return {
    id: null,
    boring: "",
    monster: "",
    diepteVanCm: "",
    diepteTotCm: "",
    notes: "",
  };
}

export default function VolumiekSampleRequestsForm({
  projectNummer,
  projectId,
  title,
  requests,
  editable,
}: VolumiekSampleRequestsFormProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<VolumiekSampleRequest[]>(() =>
    requests.map((request) => ({ ...request })),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDrafts(requests.map((request) => ({ ...request })));
    setFeedback(null);
  }, [projectNummer, requests]);

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(buildComparablePayload(requests)) !==
      JSON.stringify(buildComparablePayload(drafts))
    );
  }, [drafts, requests]);

  function updateRequest(index: number, updates: Partial<VolumiekSampleRequest>) {
    setDrafts((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...updates } : item,
      ),
    );
  }

  function addRequest() {
    setDrafts((current) => [...current, createEmptyRequest()]);
  }

  function removeRequest(index: number) {
    setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleSave() {
    if (!editable || !hasChanges) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/volumiek/${projectNummer}/requests`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId: projectId ?? null,
            title,
            requests: drafts,
          }),
        });

        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon de monsterselectie niet opslaan.");
        }

        setFeedback(payload.message ?? "Monsterselectie opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van de monsterselectie.",
        );
      }
    });
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Monsterselectie
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Gevraagde monsters (volumiek)
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Deze lijst komt idealiter automatisch uit LabSpec (SILT Suite). Je kunt hem hier
            aanvullen of corrigeren. De volumiek-rijen nemen boring/monster automatisch over.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addRequest}
            disabled={!editable || isPending}
            className="rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Monster toevoegen
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

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
          Aantal monsters: {drafts.length}
        </span>
        {hasChanges ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            Niet opgeslagen wijzigingen
          </span>
        ) : null}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[860px] border-separate border-spacing-y-2 text-sm text-slate-700">
          <thead>
            <tr>
              <th className="rounded-l-2xl bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Boring
              </th>
              <th className="bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Monster
              </th>
              <th className="bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Diepte van (cm)
              </th>
              <th className="bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Diepte tot (cm)
              </th>
              <th className="bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Opmerking
              </th>
              <th className="rounded-r-2xl bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Actie
              </th>
            </tr>
          </thead>
          <tbody>
            {drafts.length > 0 ? (
              drafts.map((request, index) => (
                <tr key={`${projectNummer}-${request.id ?? index}`}
                >
                  <td className="rounded-l-2xl border border-r-0 border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={request.boring}
                      onChange={(event) =>
                        updateRequest(index, { boring: event.target.value })
                      }
                      disabled={!editable || isPending}
                      className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                      placeholder="B01"
                    />
                  </td>
                  <td className="border-y border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={request.monster}
                      onChange={(event) =>
                        updateRequest(index, { monster: event.target.value })
                      }
                      disabled={!editable || isPending}
                      className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                      placeholder="M1"
                    />
                  </td>
                  <td className="border-y border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={request.diepteVanCm ?? ""}
                      onChange={(event) =>
                        updateRequest(index, { diepteVanCm: event.target.value })
                      }
                      disabled={!editable || isPending}
                      className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                      placeholder="0"
                    />
                  </td>
                  <td className="border-y border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={request.diepteTotCm ?? ""}
                      onChange={(event) =>
                        updateRequest(index, { diepteTotCm: event.target.value })
                      }
                      disabled={!editable || isPending}
                      className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                      placeholder="25"
                    />
                  </td>
                  <td className="border-y border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="text"
                      value={request.notes ?? ""}
                      onChange={(event) =>
                        updateRequest(index, { notes: event.target.value })
                      }
                      disabled={!editable || isPending}
                      className="w-[min(52vw,420px)] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white disabled:bg-slate-100"
                      placeholder="Optioneel"
                    />
                  </td>
                  <td className="rounded-r-2xl border border-l-0 border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <button
                      type="button"
                      onClick={() => removeRequest(index)}
                      disabled={!editable || isPending}
                      className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500"
                >
                  Nog geen monsters ingesteld. Voeg monsters toe of sync vanuit SILT Suite.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {feedback ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            feedback.toLowerCase().includes("opgeslagen")
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
