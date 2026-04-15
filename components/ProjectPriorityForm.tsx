"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { LabProject, ProjectPlanningPriority } from "@/lib/types";

interface ProjectPriorityFormProps {
  project: LabProject;
  editable: boolean;
}

const priorityOptions: ProjectPlanningPriority[] = ["Standaard", "Spoed"];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Geen deadline";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function ProjectPriorityForm({
  project,
  editable,
}: ProjectPriorityFormProps) {
  const router = useRouter();
  const [planningPriority, setPlanningPriority] =
    useState<ProjectPlanningPriority>(project.planningPriority);
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [projectNotes, setProjectNotes] = useState(project.projectNotes ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = useMemo(
    () =>
      planningPriority !== project.planningPriority ||
      deadline !== (project.deadline ?? "") ||
      projectNotes !== (project.projectNotes ?? ""),
    [
      deadline,
      planningPriority,
      project.deadline,
      project.planningPriority,
      project.projectNotes,
      projectNotes,
    ],
  );

  function handleSave() {
    if (!editable || !hasChanges) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planningPriority,
            deadline: deadline || null,
            projectNotes: projectNotes || null,
          }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon het project niet opslaan.");
        }

        setFeedback("Projectinstellingen opgeslagen.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het opslaan.",
        );
      }
    });
  }

  function handleDelete() {
    if (!editable || isPending) {
      return;
    }

    const confirmed = window.confirm(
      `Weet je zeker dat je project "${project.title}" wilt verwijderen? De gekoppelde planner-taken worden ook verwijderd.`,
    );

    if (!confirmed) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Kon het project niet verwijderen.");
        }

        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Onbekende fout bij het verwijderen.",
        );
      }
    });
  }

  return (
    <div className="mt-6 space-y-4 border-t border-slate-200/80 pt-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Projectprioriteit
          </span>
          <select
            value={planningPriority}
            onChange={(event) =>
              setPlanningPriority(
                event.target.value as ProjectPlanningPriority,
              )
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
          <span className="text-sm font-semibold text-slate-700">Deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={!editable || isPending}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Projectopmerkingen
        </span>
        <textarea
          value={projectNotes}
          onChange={(event) => setProjectNotes(event.target.value)}
          disabled={!editable || isPending}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:bg-white"
          placeholder="Vrij veld voor opmerkingen dat zichtbaar blijft bij dit project."
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Huidige deadline:{" "}
          <span className="font-medium text-slate-700">{formatDate(deadline)}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={!editable || isPending}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {isPending ? "Bezig..." : "Verwijderen"}
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

      {feedback ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedback.includes("opgeslagen")
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
