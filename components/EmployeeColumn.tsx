"use client";

import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import TaskCard from "@/components/TaskCard";
import {
  formatAvailabilityHours,
  getAvailabilityForDateKey,
  weekdayDefinitions,
} from "@/lib/availability";
import type {
  DailyAvailabilityWindow,
  Employee,
  MonthCell,
  PlannerDay,
  PlanningView,
  Task,
  TimeSlot,
} from "@/lib/types";

interface EmployeeColumnProps {
  employee: Employee;
  tasks: Task[];
  weekDays: PlannerDay[];
  monthCells: MonthCell[];
  timeSlots: TimeSlot[];
  monthLabel: string;
  monthWeekdayLabels: string[];
  defaultDayKey: string;
}

interface DayTimelineSegmentProps {
  slotId: string;
  showLeftBorder: boolean;
  showRightBorder: boolean;
}

interface WeekDaySlotProps {
  slotId: string;
  day: PlannerDay;
  tasks: Task[];
  availability: DailyAvailabilityWindow | null;
}

interface MonthDaySlotProps {
  slotId: string;
  cell: MonthCell;
  tasks: Task[];
  availability: DailyAvailabilityWindow | null;
}

const viewOptions: Array<{ id: PlanningView; label: string }> = [
  { id: "day", label: "Dag" },
  { id: "week", label: "Week" },
  { id: "month", label: "Maand" },
];

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getEndTimeLabel(startHour: number, durationHours: number) {
  const end = startHour + durationHours;
  const hours = Math.floor(end);
  const minutes = end % 1 === 0 ? "00" : "30";

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function sumHours(tasks: Task[]) {
  return tasks.reduce((total, task) => total + task.durationHours, 0);
}

function getTaskPlacement(
  task: Task,
  timelineStartHour: number,
  timelineEndHour: number,
) {
  const latestStartHour = Math.max(
    timelineStartHour,
    Math.floor(timelineEndHour - task.durationHours),
  );
  const startHour = Math.min(
    Math.max(task.assignment.startHour ?? timelineStartHour, timelineStartHour),
    latestStartHour,
  );
  const totalTimelineHours = timelineEndHour - timelineStartHour;
  const leftPercent =
    ((startHour - timelineStartHour) / totalTimelineHours) * 100;
  const widthPercent = Math.min(
    (task.durationHours / totalTimelineHours) * 100,
    100 - leftPercent,
  );

  return {
    leftPercent,
    widthPercent,
    timeLabel: `${formatHour(startHour)} - ${getEndTimeLabel(
      startHour,
      task.durationHours,
    )}`,
  };
}

function getAvailabilityPlacement(
  availability: DailyAvailabilityWindow,
  timelineStartHour: number,
  timelineEndHour: number,
) {
  const totalTimelineHours = timelineEndHour - timelineStartHour;
  const boundedStartHour = Math.max(
    timelineStartHour,
    Math.min(availability.startHour, timelineEndHour),
  );
  const boundedEndHour = Math.max(
    boundedStartHour,
    Math.min(availability.endHour, timelineEndHour),
  );
  const leftPercent =
    ((boundedStartHour - timelineStartHour) / totalTimelineHours) * 100;
  const widthPercent =
    ((boundedEndHour - boundedStartHour) / totalTimelineHours) * 100;

  return {
    leftPercent,
    widthPercent,
  };
}

function DayTimelineSegment({
  slotId,
  showLeftBorder,
  showRightBorder,
}: DayTimelineSegmentProps) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      className={`relative h-full ${showLeftBorder ? "border-l border-slate-200" : ""} ${showRightBorder ? "border-r border-slate-200" : ""}`}
    >
      <div
        className={`absolute inset-0 transition ${
          isOver ? "bg-brand-soft/75" : "bg-transparent"
        }`}
      />
    </div>
  );
}

function WeekDaySlot({ slotId, day, tasks, availability }: WeekDaySlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-44 rounded-2xl border border-dashed p-3 transition ${
        isOver
          ? "border-brand bg-brand-soft/70"
          : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {day.shortLabel}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
            {day.label}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
            {day.dayNumber}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              availability?.available
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {availability?.available
              ? formatAvailabilityHours(
                  availability.startHour,
                  availability.endHour,
                )
              : "Niet beschikbaar"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              timeLabel={
                task.assignment.startHour !== null
                  ? formatHour(task.assignment.startHour)
                  : undefined
              }
            />
          ))
        ) : (
          <div className="flex min-h-24 items-center justify-center rounded-xl border border-white/70 bg-white/80 px-3 text-center text-sm text-slate-400">
            Sleep hier een taak naartoe
          </div>
        )}
      </div>
    </div>
  );
}

function MonthDaySlot({ slotId, cell, tasks, availability }: MonthDaySlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-36 rounded-2xl border border-dashed p-3 transition ${
        isOver
          ? "border-brand bg-brand-soft/70"
          : cell.inCurrentMonth
            ? "border-slate-200 bg-white/80"
            : "border-slate-200 bg-slate-100/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {cell.shortLabel}
          </p>
          <h3
            className={`mt-1 font-semibold ${
              cell.inCurrentMonth ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {cell.label}
          </h3>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            cell.isToday
              ? "bg-brand text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {cell.dayNumber}
        </span>
      </div>

      <div className="mt-2">
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            availability?.available
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {availability?.available
            ? formatAvailabilityHours(
                availability.startHour,
                availability.endHour,
              )
            : "Niet beschikbaar"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {tasks.length > 0 ? (
          <>
            {tasks.slice(0, 3).map((task) => (
              <TaskCard key={task.id} task={task} compact />
            ))}
            {tasks.length > 3 ? (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                +{tasks.length - 3} meer
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-4 text-center text-xs text-slate-400">
            Sleep hierheen
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeeColumn({
  employee,
  tasks,
  weekDays,
  monthCells,
  timeSlots,
  monthLabel,
  monthWeekdayLabels,
  defaultDayKey,
}: EmployeeColumnProps) {
  const [view, setView] = useState<PlanningView>("day");
  const [selectedDayKey, setSelectedDayKey] = useState(defaultDayKey);

  const timelineStartHour = timeSlots[0]?.hour ?? 8;
  const timelineEndHour = (timeSlots.at(-1)?.hour ?? 16) + 1;
  const scheduledHours = sumHours(tasks);
  const selectedDay =
    weekDays.find((day) => day.dateKey === selectedDayKey) ?? weekDays[0];
  const selectedDayAvailability = getAvailabilityForDateKey(
    employee.labAvailability,
    selectedDayKey,
  );

  const selectedDayTasks = tasks
    .filter((task) => task.assignment.dateKey === selectedDayKey)
    .sort(
      (leftTask, rightTask) =>
        (leftTask.assignment.startHour ?? 99) -
        (rightTask.assignment.startHour ?? 99),
    );

  function getTasksForDate(dateKey: string) {
    return tasks
      .filter((task) => task.assignment.dateKey === dateKey)
      .sort(
        (leftTask, rightTask) =>
          (leftTask.assignment.startHour ?? 99) -
          (rightTask.assignment.startHour ?? 99),
      );
  }

  return (
    <article className="rounded-[30px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start">
          <div className="rounded-[24px] bg-slate-900 px-5 py-4 text-white 2xl:w-[320px] 2xl:min-w-[320px]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              {employee.role || "Rol niet ingesteld"}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              {employee.name}
            </h2>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <span className="text-slate-300">Ingepland</span>
              <span className="font-semibold">
                {scheduledHours.toFixed(1)} / {employee.capacityHours.toFixed(1)}h
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-300">
              Standaard beschikbaar: {employee.capacityHours.toFixed(1)} uur per dag
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {employee.specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  {specialty}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {weekdayDefinitions.map((day) => {
                const dayAvailability = employee.labAvailability[day.key];

                return (
                  <span
                    key={day.key}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      dayAvailability.available
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {day.shortLabel}:{" "}
                    {dayAvailability.available
                      ? formatAvailabilityHours(
                          dayAvailability.startHour,
                          dayAvailability.endHour,
                        )
                      : "vrij"}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="inline-flex rounded-full bg-slate-100 p-1">
                {viewOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setView(option.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      view === option.id
                        ? "bg-brand text-white shadow-sm"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {view === "day" ? (
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setSelectedDayKey(day.dateKey)}
                      className={`rounded-2xl border px-4 py-2 text-left transition ${
                        selectedDayKey === day.dateKey
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.24em]">
                        {day.shortLabel}
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        {day.dayNumber}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                  {view === "week" ? "Werkweekoverzicht" : monthLabel}
                </div>
              )}
            </div>

            {view === "day" ? (
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Dagplanning
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
                      {selectedDay.label}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedDayAvailability?.available
                        ? `Labbeschikbaar: ${formatAvailabilityHours(
                            selectedDayAvailability.startHour,
                            selectedDayAvailability.endHour,
                          )}`
                        : "Op deze dag staat de medewerker niet beschikbaar voor labwerk."}
                    </p>
                  </div>

                  <div className="min-w-[220px] rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                    <div className="flex items-center justify-between gap-6">
                      <span>{formatHour(timelineStartHour)}</span>
                      <span>{formatHour(timelineEndHour)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <span>Start van de werkdag</span>
                    <span>Einde van de werkdag</span>
                  </div>

                  <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/90">
                    <div
                      className="absolute inset-0 grid"
                      style={{
                        gridTemplateColumns: `repeat(${timeSlots.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {timeSlots.map((slot, index) => (
                        <DayTimelineSegment
                          key={slot.hour}
                          slotId={`slot:day:${employee.id}:${selectedDayKey}:${slot.hour}`}
                          showLeftBorder={index > 0}
                          showRightBorder={index === timeSlots.length - 1}
                        />
                      ))}
                    </div>

                    {selectedDayAvailability ? (
                      selectedDayAvailability.available ? (
                        <div
                          className="pointer-events-none absolute inset-y-0 z-[1] rounded-[18px] bg-emerald-100/70"
                          style={{
                            left: `${getAvailabilityPlacement(
                              selectedDayAvailability,
                              timelineStartHour,
                              timelineEndHour,
                            ).leftPercent}%`,
                            width: `${getAvailabilityPlacement(
                              selectedDayAvailability,
                              timelineStartHour,
                              timelineEndHour,
                            ).widthPercent}%`,
                          }}
                        />
                      ) : (
                        <div className="pointer-events-none absolute inset-0 z-[1] bg-rose-50/80" />
                      )
                    ) : null}

                    <div className="pointer-events-none absolute inset-x-0 top-4 z-0 flex items-center justify-between px-4">
                      {Array.from(
                        { length: timeSlots.length + 1 },
                        (_, index) => (
                          <span
                            key={index}
                            className="h-3 border-l border-slate-300 last:border-r"
                          />
                        ),
                      )}
                    </div>

                    <div className="relative z-10 space-y-3 p-4 pt-8">
                      {selectedDayTasks.length > 0 ? (
                        selectedDayTasks.map((task) => {
                          const placement = getTaskPlacement(
                            task,
                            timelineStartHour,
                            timelineEndHour,
                          );

                          return (
                            <div key={task.id} className="relative h-[96px]">
                              <TaskCard
                                task={task}
                                compact
                                showContext={false}
                                timeLabel={placement.timeLabel}
                                className="absolute top-0 h-full min-w-0 overflow-hidden"
                                style={{
                                  left: `${placement.leftPercent}%`,
                                  width: `${placement.widthPercent}%`,
                                }}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex h-[112px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 text-center text-sm text-slate-400">
                          Sleep een proef in deze tijdsbalk om hem direct binnen
                          de werkdag te plannen.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  De breedte van elk blok laat zien hoeveel tijd de proef inneemt
                  tussen 08:00 en 17:00.
                </p>
              </section>
            ) : null}

            {view === "week" ? (
              <section className="grid gap-3 xl:grid-cols-5">
                {weekDays.map((day) => (
                  <WeekDaySlot
                    key={day.id}
                    slotId={`slot:week:${employee.id}:${day.dateKey}`}
                    day={day}
                    tasks={getTasksForDate(day.dateKey)}
                    availability={getAvailabilityForDateKey(
                      employee.labAvailability,
                      day.dateKey,
                    )}
                  />
                ))}
              </section>
            ) : null}

            {view === "month" ? (
              <section className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Maandplanning
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
                    {monthLabel}
                  </h3>
                </div>

                <div className="mb-3 grid grid-cols-7 gap-3">
                  {monthWeekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-7">
                  {monthCells.map((cell) => (
                    <MonthDaySlot
                      key={cell.id}
                      slotId={`slot:month:${employee.id}:${cell.dateKey}`}
                      cell={cell}
                      tasks={getTasksForDate(cell.dateKey)}
                      availability={getAvailabilityForDateKey(
                        employee.labAvailability,
                        cell.dateKey,
                      )}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

