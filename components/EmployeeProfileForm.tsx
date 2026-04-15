"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { calculateAverageLabAvailabilityHours } from "@/lib/availability";
import type { Employee } from "@/lib/types";

interface EmployeeProfileFormProps {
  employee: Employee;
  editable: boolean;
}

function formatSkillsForTextarea(skills: string[]) {
  return skills.join(", ");
}

export default function EmployeeProfileForm({
  employee,
  editable,
}: EmployeeProfileFormProps) {
  const router = useRouter();
  const [role, setRole] = useState(employee.role);
  const [skills, setSkills] = useState(formatSkillsForTextarea(employee.specialties));
  const [capacityHours, setCapacityHours] = useState(
    employee.capacityHours.toString(),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const suggestedCapacityHours = calculateAverageLabAvailabilityHours(
    employee.labAvailability,
  );

  function handleSave() {
    if (!editable) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/employees/${employee.id}/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role,
            specialties: skills
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            capacityHours: Number(capacityHours),
          }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(
            payload.error ?? "Kon rol en skills niet opslaan.",
          );
        }

        setFeedback("Rol en skills opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van rol en skills.",
        );
      }
    });
  }

  return (
    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Profiel
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Rol en skills
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pas hier de functienaam en skills van deze medewerker aan. De rol
            wordt direct ook boven de naam in de planner getoond.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!editable || isPending}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Opslaan..." : "Opslaan"}
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Rol</span>
          <input
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={!editable || isPending}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
            placeholder="Bijvoorbeeld: Geotechnisch analist"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Skills</span>
          <textarea
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            disabled={!editable || isPending}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
            placeholder="Bijvoorbeeld: Oedometer, Monsteropbouw, Atterberg"
          />
          <p className="text-xs text-slate-500">
            Gebruik komma&apos;s tussen de skills.
          </p>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Standaard beschikbare uren per dag
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={capacityHours}
              onChange={(event) => setCapacityHours(event.target.value)}
              disabled={!editable || isPending}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white sm:max-w-[220px]"
            />
            <button
              type="button"
              onClick={() => setCapacityHours(suggestedCapacityHours.toFixed(2))}
              disabled={!editable || isPending}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Neem over uit labbeschikbaarheid
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Huidige berekende suggestie op basis van beschikbare laburen:{" "}
            {suggestedCapacityHours.toFixed(2)} uur per beschikbare dag.
          </p>
        </label>
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
