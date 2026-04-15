"use client";

import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  overlay?: boolean;
  compact?: boolean;
  showContext?: boolean;
  timeLabel?: string;
  className?: string;
  style?: CSSProperties;
}

interface TaskCardBodyProps {
  task: Task;
  compact: boolean;
  showContext: boolean;
  timeLabel?: string;
}

function formatDeadline(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function TaskCardBody({
  task,
  compact,
  showContext,
  timeLabel,
}: TaskCardBodyProps) {
  const deadlineLabel = formatDeadline(task.projectDeadline);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          {showContext ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {task.sourceTaskName ?? task.projectName}
              </p>
              {task.sourceTaskName && task.projectName !== task.sourceTaskName ? (
                <p className="mt-1 text-xs text-slate-500">
                  Opdracht: {task.projectName}
                </p>
              ) : null}
            </>
          ) : null}
          <h3
            className={`font-semibold text-slate-900 ${
              compact ? "text-sm" : "text-base"
            } ${showContext ? "mt-2" : "mt-0"}`}
          >
            {task.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          {task.projectPlanningPriority === "Spoed" ? (
            <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
              Spoed
            </span>
          ) : null}
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
            {task.priority}
          </span>
        </div>
      </div>

      <div
        className={`flex items-center justify-between gap-3 text-slate-500 ${compact ? "mt-3 text-xs" : "mt-4 text-sm"}`}
      >
        <span>{task.durationHours.toFixed(1)}u ingepland</span>
        {timeLabel ? (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {timeLabel}
          </span>
        ) : (
          <span className="font-medium text-slate-700">Sleep mij</span>
        )}
      </div>

      {deadlineLabel ? (
        <p
          className={`${compact ? "mt-2 text-[11px]" : "mt-3 text-xs"} font-medium uppercase tracking-[0.18em] text-slate-400`}
        >
          Deadline {deadlineLabel}
        </p>
      ) : null}
    </>
  );
}

export default function TaskCard({
  task,
  overlay = false,
  compact = false,
  showContext = true,
  timeLabel,
  className = "",
  style,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: overlay ? `${task.id}-overlay` : task.id,
      data: { taskId: task.id },
      disabled: overlay,
    });

  const dragStyle: CSSProperties | undefined = transform
    ? {
        ...style,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : style;

  const baseClassName = compact
    ? "rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

  if (overlay) {
    return (
      <div
        className={`w-[280px] ${baseClassName} shadow-2xl ${className}`.trim()}
        style={style}
      >
        <TaskCardBody
          task={task}
          compact={compact}
          showContext={showContext}
          timeLabel={timeLabel}
        />
      </div>
    );
  }

  return (
    <article
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      className={`${baseClassName} touch-none transition ${
        isDragging
          ? "opacity-40 shadow-none"
          : "hover:-translate-y-0.5 hover:shadow-lg"
      } ${className}`.trim()}
    >
      <TaskCardBody
        task={task}
        compact={compact}
        showContext={showContext}
        timeLabel={timeLabel}
      />
    </article>
  );
}
