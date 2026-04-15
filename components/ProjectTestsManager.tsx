"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  extractProjectNotesFromDescription,
  parseProjectTestsFromDescription,
} from "@/lib/labSpec";
import type { LabProject, LabProjectTest, LabTestCatalogItem } from "@/lib/types";

interface ProjectTestsManagerProps {
  project: LabProject;
  catalog: LabTestCatalogItem[];
  editable: boolean;
}

interface EditableProjectTest {
  testCode: string;
  quantity: number;
  durationHoursPerItem: number;
}

function toEditableTest(test: LabProjectTest): EditableProjectTest {
  return {
    testCode: test.testCode,
    quantity: test.quantity,
    durationHoursPerItem: test.durationHoursPerItem,
  };
}

function createEmptyTest(catalog: LabTestCatalogItem[]): EditableProjectTest {
  const firstCatalogItem = catalog[0];

  return {
    testCode: firstCatalogItem?.code ?? "",
    quantity: 1,
    durationHoursPerItem: firstCatalogItem?.defaultDurationHours ?? 1,
  };
}

export default function ProjectTestsManager({
  project,
  catalog,
  editable,
}: ProjectTestsManagerProps) {
  const router = useRouter();
  const [tests, setTests] = useState<EditableProjectTest[]>(
    project.tests?.map(toEditableTest) ?? [],
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const detectedTests = useMemo(() => {
    const parsedItems = parseProjectTestsFromDescription(project.sourceDescription);

    return parsedItems.map((item) => {
      const catalogItem = catalog.find((entry) => entry.code === item.code);

      return {
        testCode: item.code,
        quantity: Math.max(1, Math.round(item.quantity)),
        durationHoursPerItem: catalogItem?.defaultDurationHours ?? 1,
        testName: catalogItem?.name ?? item.code,
      };
    });
  }, [catalog, project.sourceDescription]);

  const detectedNotes = useMemo(
    () => extractProjectNotesFromDescription(project.sourceDescription),
    [project.sourceDescription],
  );

  const hasChanges = useMemo(() => {
    const initial = JSON.stringify(
      (project.tests?.map(toEditableTest) ?? []).sort((a, b) =>
        a.testCode.localeCompare(b.testCode),
      ),
    );
    const current = JSON.stringify(
      [...tests].sort((a, b) => a.testCode.localeCompare(b.testCode)),
    );

    return initial !== current;
  }, [project.tests, tests]);

  function updateTest(
    index: number,
    updates: Partial<EditableProjectTest>,
    applyCatalogDefaults = false,
  ) {
    setTests((currentTests) =>
      currentTests.map((test, currentIndex) => {
        if (currentIndex !== index) {
          return test;
        }

        const nextTest = { ...test, ...updates };

        if (applyCatalogDefaults && updates.testCode) {
          const catalogItem = catalog.find((item) => item.code === updates.testCode);

          if (catalogItem) {
            nextTest.durationHoursPerItem = catalogItem.defaultDurationHours;
          }
        }

        return nextTest;
      }),
    );
  }

  function addTestRow() {
    setTests((currentTests) => [...currentTests, createEmptyTest(catalog)]);
  }

  function removeTestRow(index: number) {
    setTests((currentTests) => currentTests.filter((_, currentIndex) => currentIndex !== index));
  }

  function loadDetectedTests() {
    if (detectedTests.length === 0) {
      setFeedback(
        "Er zijn geen geldige proeven herkend in `LABSPEC:` of onder `Lab opdracht:`.",
      );
      return;
    }

    setFeedback(null);
    setTests(
      detectedTests.map((test) => ({
        testCode: test.testCode,
        quantity: test.quantity,
        durationHoursPerItem: test.durationHoursPerItem,
      })),
    );
  }

  function handleSave(mode: "manual" | "description") {
    if (!editable) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/tests`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode,
            tests,
          }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon de projectproeven niet opslaan.");
        }

        setFeedback("Projectproeven opgeslagen en als losse planner-taken bijgewerkt.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van projectproeven.",
        );
      }
    });
  }

  return (
    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Projectproeven
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Afzonderlijk planbare proeven
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Hier bepaal je welke losse proeven voor dit project in de planner
            terechtkomen. Bij een geldige `LABSPEC:` of een nette sectie onder
            `Lab opdracht:` in de omschrijving kun je de proefregels ook
            automatisch laten invullen.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadDetectedTests}
            disabled={!editable || isPending}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Overnemen uit omschrijving
          </button>
          <button
            type="button"
            onClick={addTestRow}
            disabled={!editable || isPending || catalog.length === 0}
            className="rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Proef toevoegen
          </button>
        </div>
      </div>

      {detectedTests.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-brand/10 bg-white/80 px-4 py-3 text-sm text-slate-600">
          Herkend in omschrijving:
          <span className="ml-2 font-medium text-slate-900">
            {detectedTests
              .map((test) => `${test.testCode}=${test.quantity}`)
              .join("; ")}
          </span>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
          Nog geen geldige proefregels herkend in `LABSPEC:` of onder `Lab opdracht:`.
        </div>
      )}

      {detectedNotes ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
          Herkende opmerkingen:
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-900">
            {detectedNotes}
          </pre>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {tests.length > 0 ? (
          tests.map((test, index) => {
            const selectedCatalogItem = catalog.find(
              (item) => item.code === test.testCode,
            );
            const totalHours = test.quantity * test.durationHoursPerItem;

            return (
              <div
                key={`${test.testCode}-${index}`}
                className="grid gap-4 rounded-2xl border border-white/80 bg-white p-4 shadow-sm lg:grid-cols-[1.1fr_0.7fr_0.8fr_auto]"
              >
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Proef
                  </span>
                  <select
                    value={test.testCode}
                    onChange={(event) =>
                      updateTest(
                        index,
                        { testCode: event.target.value },
                        true,
                      )
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                  >
                    {catalog.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Aantal
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={test.quantity}
                    onChange={(event) =>
                      updateTest(index, {
                        quantity: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
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
                    value={test.durationHoursPerItem}
                    onChange={(event) =>
                      updateTest(index, {
                        durationHoursPerItem: Math.max(
                          0.25,
                          Number(event.target.value) || 0.25,
                        ),
                      })
                    }
                    disabled={!editable || isPending}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                  />
                </label>

                <div className="flex items-end justify-between gap-3 lg:flex-col lg:items-end">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm text-slate-500">
                    <div className="font-semibold text-slate-900">
                      {totalHours.toFixed(2)}u
                    </div>
                    <div>{selectedCatalogItem?.defaultPriority ?? "Middel"} prioriteit</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTestRow(index)}
                    disabled={!editable || isPending}
                    className="rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
            Er zijn nog geen afzonderlijke proeven ingesteld voor dit project.
            Voeg handmatig proeven toe of neem ze over uit `LABSPEC:` of uit de
            sectie `Lab opdracht:` in de omschrijving.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          Totale proefuren:{" "}
          <span className="font-semibold text-slate-900">
            {tests
              .reduce(
                (total, test) =>
                  total + test.quantity * test.durationHoursPerItem,
                0,
              )
              .toFixed(2)}
            u
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            handleSave(
              detectedTests.length > 0 &&
                tests.length === detectedTests.length &&
                tests.every((test, index) => test.testCode === detectedTests[index]?.testCode)
                ? "description"
                : "manual",
            )
          }
          disabled={!editable || isPending || !hasChanges}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Opslaan..." : "Proeven opslaan"}
        </button>
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
          Bewerken van projectproeven is pas beschikbaar zodra de app live met
          Supabase-data werkt.
        </p>
      ) : null}
    </div>
  );
}
