import type { WeeklyAvailability, WeeklyAvailabilityDay, WeekdayKey } from "@/lib/types";

export const weekdayDefinitions: WeeklyAvailabilityDay[] = [
  { key: "monday", label: "Maandag", shortLabel: "Ma" },
  { key: "tuesday", label: "Dinsdag", shortLabel: "Di" },
  { key: "wednesday", label: "Woensdag", shortLabel: "Wo" },
  { key: "thursday", label: "Donderdag", shortLabel: "Do" },
  { key: "friday", label: "Vrijdag", shortLabel: "Vr" },
];

export const defaultWeeklyAvailability: WeeklyAvailability = {
  monday: { available: true, startHour: 8, endHour: 17 },
  tuesday: { available: true, startHour: 8, endHour: 17 },
  wednesday: { available: true, startHour: 8, endHour: 17 },
  thursday: { available: true, startHour: 8, endHour: 17 },
  friday: { available: true, startHour: 8, endHour: 17 },
};

function clampHour(value: unknown, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(24, Math.max(0, parsedValue));
}

export function normalizeWeeklyAvailability(value: unknown): WeeklyAvailability {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultWeeklyAvailability };
  }

  const candidate = value as Record<string, unknown>;
  const normalized = {} as WeeklyAvailability;

  for (const day of weekdayDefinitions) {
    const dayValue = candidate[day.key];

    if (!dayValue || typeof dayValue !== "object" || Array.isArray(dayValue)) {
      normalized[day.key] = { ...defaultWeeklyAvailability[day.key] };
      continue;
    }

    const availability = dayValue as Record<string, unknown>;
    const startHour = clampHour(
      availability.startHour,
      defaultWeeklyAvailability[day.key].startHour,
    );
    const endHour = clampHour(
      availability.endHour,
      defaultWeeklyAvailability[day.key].endHour,
    );

    normalized[day.key] = {
      available: Boolean(availability.available),
      startHour: Math.min(startHour, endHour),
      endHour: Math.max(startHour, endHour),
    };
  }

  return normalized;
}

export function weekdayKeyFromDateKey(dateKey: string): WeekdayKey | null {
  const parsedDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const dayIndex = parsedDate.getDay();

  switch (dayIndex) {
    case 1:
      return "monday";
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    default:
      return null;
  }
}

export function getAvailabilityForDateKey(
  availability: WeeklyAvailability,
  dateKey: string,
) {
  const weekdayKey = weekdayKeyFromDateKey(dateKey);

  return weekdayKey ? availability[weekdayKey] : null;
}

export function formatAvailabilityHours(startHour: number, endHour: number) {
  const formatHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

export function calculateAverageLabAvailabilityHours(
  availability: WeeklyAvailability,
) {
  const availableDays = Object.values(availability).filter((day) => day.available);

  if (availableDays.length === 0) {
    return 0;
  }

  const totalHours = availableDays.reduce(
    (sum, day) => sum + Math.max(0, day.endHour - day.startHour),
    0,
  );

  return totalHours / availableDays.length;
}
