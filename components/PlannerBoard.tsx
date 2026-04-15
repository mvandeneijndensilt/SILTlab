"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import EmployeeColumn from "@/components/EmployeeColumn";
import TaskCard from "@/components/TaskCard";
import {
  defaultDayKey,
  defaultStartHour,
  monthCells,
  monthWeekdayLabels,
  plannerDays,
  plannerMonthLabel,
  timeSlots,
  timelineEndHour,
  timelineStartHour,
} from "@/lib/mockData";
import type { Employee, Task } from "@/lib/types";

interface PlannerBoardProps {
  initialEmployees: Employee[];
  initialTasks: Task[];
}

interface BacklogGroup {
  id: string;
  sourceTaskName: string;
  projectName: string;
  sourceNummer: string | null;
  tasks: Task[];
  planningPriority: Task["projectPlanningPriority"];
  projectDeadline: string | null | undefined;
}

function compareBacklogTasks(a: Task, b: Task) {
  if (a.projectPlanningPriority !== b.projectPlanningPriority) {
    return a.projectPlanningPriority === "Spoed" ? -1 : 1;
  }

  if (a.projectDeadline && b.projectDeadline && a.projectDeadline !== b.projectDeadline) {
    return a.projectDeadline.localeCompare(b.projectDeadline);
  }

  if (a.projectDeadline && !b.projectDeadline) {
    return -1;
  }

  if (!a.projectDeadline && b.projectDeadline) {
    return 1;
  }

  return a.title.localeCompare(b.title, "nl-NL");
}

function compareBacklogGroups(a: BacklogGroup, b: BacklogGroup) {
  if (a.planningPriority !== b.planningPriority) {
    return a.planningPriority === "Spoed" ? -1 : 1;
  }

  if (
    a.projectDeadline &&
    b.projectDeadline &&
    a.projectDeadline !== b.projectDeadline
  ) {
    return a.projectDeadline.localeCompare(b.projectDeadline);
  }

  if (a.projectDeadline && !b.projectDeadline) {
    return -1;
  }

  if (!a.projectDeadline && b.projectDeadline) {
    return 1;
  }

  return a.sourceTaskName.localeCompare(b.sourceTaskName, "nl-NL");
}

function formatTaskCount(count: number) {
  return count === 1 ? "1 onderdeel" : `${count} onderdelen`;
}

function groupBacklogTasks(tasks: Task[]) {
  const groups = new Map<string, BacklogGroup>();

  for (const task of tasks) {
    const sourceTaskName = task.sourceTaskName ?? task.projectName;
    const groupId = task.projectId ?? `${sourceTaskName}:${task.projectName}`;

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        sourceTaskName,
        projectName: task.projectName,
        sourceNummer: task.sourceNummer ?? null,
        tasks: [],
        planningPriority: task.projectPlanningPriority,
        projectDeadline: task.projectDeadline,
      });
    }

    groups.get(groupId)?.tasks.push(task);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      tasks: [...group.tasks].sort(compareBacklogTasks),
    }))
    .sort(compareBacklogGroups);
}

function BacklogDropZone({ tasks }: { tasks: Task[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: "backlog" });
  const groupedTasks = groupBacklogTasks(tasks);

  return (
    <div
      ref={setNodeRef}
      className={`mt-6 min-h-56 rounded-[24px] border border-dashed p-4 transition ${
        isOver
          ? "border-brand bg-brand-soft/70"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="space-y-4">
        {groupedTasks.length > 0 ? (
          groupedTasks.map((group) => {
            const totalGroupHours = group.tasks.reduce(
              (sum, task) => sum + task.durationHours,
              0,
            );
            const hasSingleTask = group.tasks.length === 1;

            return (
              <article
                key={group.id}
                className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Taak uit import
                    </p>
                    <h4 className="mt-2 break-words font-display text-xl font-semibold text-slate-900">
                      {group.sourceTaskName}
                    </h4>
                    {group.projectName !== group.sourceTaskName ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Opdracht: {group.projectName}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {group.sourceNummer ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Lab {group.sourceNummer}
                      </span>
                    ) : null}
                    {group.planningPriority === "Spoed" ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        Spoed
                      </span>
                    ) : null}
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                      {formatTaskCount(group.tasks.length)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {totalGroupHours.toFixed(1)}u
                    </span>
                  </div>
                </div>

                {hasSingleTask ? (
                  <div className="mt-4">
                    <TaskCard task={group.tasks[0]} showContext={false} />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {group.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showContext={false}
                        className="h-full"
                      />
                    ))}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/80 bg-white/80 px-4 text-center text-sm text-slate-400">
            Alle taken zijn ingepland. Sleep een kaart hierheen om de toewijzing
            te verwijderen.
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlannerBoard({
  initialEmployees,
  initialTasks,
}: PlannerBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const activeTask = activeTaskId
    ? tasks.find((task) => task.id === activeTaskId) ?? null
    : null;

  const backlogTasks = tasks.filter(
    (task) => !task.assignment.employeeId || !task.assignment.dateKey,
  );

  const scheduledTasks = tasks.filter(
    (task) => task.assignment.employeeId && task.assignment.dateKey,
  );

  const scheduledHours = scheduledTasks.reduce(
    (total, task) => total + task.durationHours,
    0,
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);

    if (!event.over) {
      return;
    }

    const overId = String(event.over.id);
    const taskId = String(event.active.id);

    if (overId === "backlog") {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assignment: {
                  employeeId: null,
                  dateKey: null,
                  startHour: null,
                },
              }
            : task,
        ),
      );
      return;
    }

    if (!overId.startsWith("slot:")) {
      return;
    }

    const [, view, employeeId, dateKey, startHourValue] = overId.split(":");

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        const requestedStartHour =
          view === "day" && startHourValue
            ? Number(startHourValue)
            : task.assignment.startHour ?? defaultStartHour;
        const latestStartHour = Math.max(
          timelineStartHour,
          Math.floor(timelineEndHour - task.durationHours),
        );
        const boundedStartHour = Math.min(
          Math.max(requestedStartHour, timelineStartHour),
          latestStartHour,
        );

        return {
          ...task,
          assignment: {
            employeeId,
            dateKey,
            startHour: Number.isNaN(boundedStartHour)
              ? defaultStartHour
              : boundedStartHour,
          },
        };
      }),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="space-y-6">
        <div className="grid gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] bg-slate-900 p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,31,45,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Planningweergaven
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold">
                Persoonlijke dag-, week- en maandplanning
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Schakel per medewerker tussen een gedetailleerde dagplanning,
                een weekoverzicht en een maandplanning. De dagweergave gebruikt
                een brede tijdsbalk van 08:00 tot 17:00, zodat de blokbreedte
                direct de duur van de proef laat zien. Taken uit spoedprojecten
                blijven in de backlog automatisch bovenaan staan.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    Team
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {initialEmployees.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    Ingepland
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {scheduledTasks.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                    Uren
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {scheduledHours.toFixed(1)}u
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Niet ingeplande taken
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                    Klaar om te plannen
                  </h3>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                  {backlogTasks.length}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                De backlog is nu gegroepeerd op de taak uit de import. Bij een
                enkele proef krijgt die kaart de volle breedte, zodat alles
                leesbaar blijft binnen de kaart. Sleep daarna de juiste proef
                naar de dag-, week- of maandweergave van een medewerker.
              </p>

              <BacklogDropZone tasks={backlogTasks} />
            </section>
          </aside>

          <section className="space-y-4">
            {initialEmployees.map((employee) => (
              <EmployeeColumn
                key={employee.id}
                employee={employee}
                tasks={tasks.filter(
                  (task) => task.assignment.employeeId === employee.id,
                )}
                weekDays={plannerDays}
                monthCells={monthCells}
                timeSlots={timeSlots}
                monthLabel={plannerMonthLabel}
                monthWeekdayLabels={monthWeekdayLabels}
                defaultDayKey={defaultDayKey}
              />
            ))}
          </section>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} overlay /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
