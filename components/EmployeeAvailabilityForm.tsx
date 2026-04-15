"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  defaultWeeklyAvailability,
  formatAvailabilityHours,
  weekdayDefinitions,
} from "@/lib/availability";
import type { Employee, WeekdayKey, WeeklyAvailability } from "@/lib/types";

interface EmployeeAvailabilityFormProps {
  employee: Employee;
  editable: boolean;
}

const hourOptions = Array.from({ length: 18 }, (_, index) => index + 6);

export default function EmployeeAvailabilityForm({
  employee,
  editable,
}: EmployeeAvailabilityFormProps) {
  const router = useRouter();
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    employee.labAvailability,
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDay(
    dayKey: WeekdayKey,
    updates: Partial<WeeklyAvailability[WeekdayKey]>,
  ) {
    setAvailability((currentAvailability) => {
      const currentDay =
        currentAvailability[dayKey] ?? defaultWeeklyAvailability[dayKey];
      const nextDay = { ...currentDay, ...updates };

      if (nextDay.endHour < nextDay.startHour) {
        nextDay.endHour = nextDay.startHour;
      }

      return {
        ...currentAvailability,
        [dayKey]: nextDay,
      };
    });
  }

  function handleSave() {
    if (!editable) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/employees/${employee.id}/availability`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              labAvailability: availability,
            }),
          },
        );

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(
            payload.error ?? "Kon de weekbeschikbaarheid niet opslaan.",
          );
        }

        setFeedback("Weekbeschikbaarheid opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan van de beschikbaarheid.",
        );
      }
    });
  }

  return (
    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Weekbeschikbaarheid
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
            Beschikbaar voor labwerk
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Deze tijden zijn zichtbaar in de planner, maar blokkeren het
            slepen van proefblokken nog niet.
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

      <div className="mt-5 space-y-3">
        {weekdayDefinitions.map((day) => {
          const dayAvailability = availability[day.key];

          return (
            <div
              key={day.key}
              className="grid gap-3 rounded-2xl border border-white/80 bg-white p-4 shadow-sm md:grid-cols-[0.9fr_0.9fr_0.8fr_0.8fr]"
            >
              <div className="flex items-center gap-3">
                <input
                  id={`${employee.id}-${day.key}-available`}
                  type="checkbox"
                  checked={dayAvailability.available}
                  onChange={(event) =>
                    updateDay(day.key, { available: event.target.checked })
                  }
                  disabled={!editable || isPending}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label
                  htmlFor={`${employee.id}-${day.key}-available`}
                  className="text-sm font-semibold text-slate-900"
                >
                  {day.label}
                </label>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {dayAvailability.available
                  ? formatAvailabilityHours(
                      dayAvailability.startHour,
                      dayAvailability.endHour,
                    )
                  : "Niet beschikbaar"}
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Van
                </span>
                <select
                  value={dayAvailability.startHour}
                  onChange={(event) =>
                    updateDay(day.key, { startHour: Number(event.target.value) })
                  }
                  disabled={!editable || isPending || !dayAvailability.available}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Tot
                </span>
                <select
                  value={dayAvailability.endHour}
                  onChange={(event) =>
                    updateDay(day.key, { endHour: Number(event.target.value) })
                  }
                  disabled={!editable || isPending || !dayAvailability.available}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
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
