import type {
  Employee,
  LabProject,
  LabProjectTest,
  LabTestCatalogItem,
  MonthCell,
  PlannerDay,
  Task,
  TimeSlot,
} from "@/lib/types";
import { defaultWeeklyAvailability } from "@/lib/availability";

function cloneDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const nextDate = cloneDate(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getWeekStart(date: Date) {
  const weekStart = cloneDate(date);
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  weekStart.setDate(weekStart.getDate() + mondayOffset);
  return weekStart;
}

function getWeekEnd(date: Date) {
  const weekEnd = cloneDate(date);
  const dayOfWeek = weekEnd.getDay();
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  weekEnd.setDate(weekEnd.getDate() + sundayOffset);
  return weekEnd;
}

const referenceDate = new Date(2026, 3, 15);
const todayKey = formatDateKey(referenceDate);

const fullWeekdayFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
});

const shortWeekdayFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
});

const shortMonthFormatter = new Intl.DateTimeFormat("nl-NL", {
  month: "short",
});

const fullMonthFormatter = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
});

export const timelineStartHour = 8;
export const timelineEndHour = 17;
export const defaultStartHour = timelineStartHour;

export const timeSlots: TimeSlot[] = Array.from(
  { length: timelineEndHour - timelineStartHour },
  (_, index) => {
    const hour = timelineStartHour + index;

    return {
      hour,
      label: formatHour(hour),
      endLabel: formatHour(hour + 1),
    };
  },
);

const weekStart = getWeekStart(referenceDate);

export const plannerDays: PlannerDay[] = Array.from({ length: 5 }, (_, index) => {
  const date = addDays(weekStart, index);

  return {
    id: formatDateKey(date),
    dateKey: formatDateKey(date),
    label: fullWeekdayFormatter.format(date),
    shortLabel: shortWeekdayFormatter.format(date),
    dayNumber: String(date.getDate()).padStart(2, "0"),
  };
});

export const defaultDayKey =
  plannerDays.find((day) => day.dateKey === todayKey)?.dateKey ??
  plannerDays[0].dateKey;

const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
const calendarGridStart = getWeekStart(monthStart);
const calendarGridEnd = getWeekEnd(monthEnd);

const monthCellAccumulator: MonthCell[] = [];
let currentDate = cloneDate(calendarGridStart);

while (currentDate <= calendarGridEnd) {
  monthCellAccumulator.push({
    id: formatDateKey(currentDate),
    dateKey: formatDateKey(currentDate),
    label: `${shortMonthFormatter.format(currentDate)} ${String(
      currentDate.getDate(),
    ).padStart(2, "0")}`,
    shortLabel: shortWeekdayFormatter.format(currentDate),
    dayNumber: String(currentDate.getDate()).padStart(2, "0"),
    inCurrentMonth: currentDate.getMonth() === referenceDate.getMonth(),
    isToday: formatDateKey(currentDate) === todayKey,
  });

  currentDate = addDays(currentDate, 1);
}

export const monthCells = monthCellAccumulator;
export const monthWeekdayLabels = Array.from({ length: 7 }, (_, index) =>
  shortWeekdayFormatter.format(addDays(calendarGridStart, index)),
);

export const plannerMonthLabel = `${fullMonthFormatter.format(referenceDate)} ${referenceDate.getFullYear()}`;

export const employees: Employee[] = [
  {
    id: "jan",
    name: "Jan",
    role: "Geotechnisch analist",
    specialties: ["Oedometer", "Monsteropbouw"],
    capacityHours: 7.5,
    labAvailability: {
      ...defaultWeeklyAvailability,
      wednesday: { available: false, startHour: 8, endHour: 17 },
    },
  },
  {
    id: "piet",
    name: "Piet",
    role: "Specialist bodemclassificatie",
    specialties: ["Atterberg", "Vochtbepaling"],
    capacityHours: 7.5,
    labAvailability: {
      ...defaultWeeklyAvailability,
      monday: { available: false, startHour: 8, endHour: 17 },
      friday: { available: true, startHour: 8, endHour: 13 },
    },
  },
  {
    id: "klaas",
    name: "Klaas",
    role: "Triaxiaal medewerker",
    specialties: ["Triaxiaal", "Instrumentatie"],
    capacityHours: 7.5,
    labAvailability: {
      ...defaultWeeklyAvailability,
      tuesday: { available: true, startHour: 10, endHour: 17 },
      thursday: { available: false, startHour: 8, endHour: 17 },
    },
  },
];

export const projects: LabProject[] = [
  {
    id: "project-polderzettingsreeks",
    sourceNummer: "2503090",
    title: "Polderzettingsreeks",
    companyName: "Adcim B.V.",
    offerAssignment: "Ontwikkeling Nieuwbouw (2503090)",
    status: "Nog doen",
    planningPriority: "Standaard",
    deadline: null,
    sourceDescription: "LABSPEC: OED=1; VGW=2",
    projectNotes: "8 x volumegewichten conform labopgave\n\n4 x korrelverdeling conform e-mail",
    taskCount: 2,
    queuedHours: 3.5,
  },
  {
    id: "project-classificatie-intake",
    sourceNummer: "2503010",
    title: "Classificatie-intake",
    companyName: "Adcim B.V.",
    offerAssignment: "Ophoogprogramma (2503010)",
    status: "Nog doen",
    planningPriority: "Standaard",
    deadline: null,
    sourceDescription: "LABSPEC: ATB=1",
    projectNotes: null,
    taskCount: 1,
    queuedHours: 1.5,
  },
  {
    id: "project-stabiliteitsscreening",
    sourceNummer: "2503215",
    title: "Stabiliteitsscreening",
    companyName: "Adcim B.V.",
    offerAssignment: "Optiflor terrein (2503215)",
    status: "Nog doen",
    planningPriority: "Standaard",
    deadline: null,
    sourceDescription: "LABSPEC: TRIAX=1",
    projectNotes: null,
    taskCount: 1,
    queuedHours: 3,
  },
];

export const projectTests: LabProjectTest[] = [
  {
    id: "test-oed-2503090",
    projectId: "project-polderzettingsreeks",
    testCode: "OED",
    testName: "Oedometerproef",
    quantity: 1,
    durationHoursPerItem: 2.5,
    totalDurationHours: 2.5,
    sourceFragment: "LABSPEC: OED=1; VGW=2",
    notes: "Automatisch herkend uit omschrijving.",
  },
  {
    id: "test-vgw-2503090",
    projectId: "project-polderzettingsreeks",
    testCode: "VGW",
    testName: "Volumiek gewicht",
    quantity: 2,
    durationHoursPerItem: 0.5,
    totalDurationHours: 1,
    sourceFragment: "LABSPEC: OED=1; VGW=2",
    notes: "Automatisch herkend uit omschrijving.",
  },
  {
    id: "test-atb-2503010",
    projectId: "project-classificatie-intake",
    testCode: "ATB",
    testName: "Atterberg-grenzen",
    quantity: 1,
    durationHoursPerItem: 1.5,
    totalDurationHours: 1.5,
    sourceFragment: "LABSPEC: ATB=1",
    notes: "Automatisch herkend uit omschrijving.",
  },
  {
    id: "test-triax-2503215",
    projectId: "project-stabiliteitsscreening",
    testCode: "TRIAX",
    testName: "Triaxiaal",
    quantity: 1,
    durationHoursPerItem: 3,
    totalDurationHours: 3,
    sourceFragment: "LABSPEC: TRIAX=1",
    notes: "Automatisch herkend uit omschrijving.",
  },
];

export const labTestCatalog: LabTestCatalogItem[] = [
  {
    code: "VGW",
    name: "Volumiek gewicht",
    defaultDurationHours: 0.5,
    defaultPriority: "Middel",
    description: "Standaard volumiek gewicht / watergehalte",
  },
  {
    code: "KVD",
    name: "Korrelverdeling",
    defaultDurationHours: 0.75,
    defaultPriority: "Middel",
    description: "Korrelverdeling of korrelgrootte",
  },
  {
    code: "SDP",
    name: "Samendrukkingsproef",
    defaultDurationHours: 2.5,
    defaultPriority: "Hoog",
    description: "Samendrukkingsproef / samendrukking",
  },
  {
    code: "OED",
    name: "Oedometerproef",
    defaultDurationHours: 2.5,
    defaultPriority: "Hoog",
    description: "Oedometer of samendrukking",
  },
  {
    code: "ATB",
    name: "Atterberg-grenzen",
    defaultDurationHours: 1.5,
    defaultPriority: "Middel",
    description: "Vloeigrens en uitrolgrens",
  },
  {
    code: "TRIAX",
    name: "Triaxiaal",
    defaultDurationHours: 3,
    defaultPriority: "Hoog",
    description: "Triaxiaal opbouwen of beproeven",
  },
  {
    code: "TV",
    name: "Torvane",
    defaultDurationHours: 0.25,
    defaultPriority: "Laag",
    description: "Torvane-bepaling",
  },
  {
    code: "ZKF",
    name: "Zeefkromme",
    defaultDurationHours: 0.75,
    defaultPriority: "Middel",
    description: "Zeefkromme",
  },
];

export const initialTasks: Task[] = [
  {
    id: "oedometer-test",
    projectId: "project-polderzettingsreeks",
    sourceTaskName: "Lab 2503090 Deil",
    sourceNummer: "2503090",
    title: "Oedometerproef",
    projectName: "Polderzettingsreeks",
    durationHours: 2.5,
    priority: "Hoog",
    projectPlanningPriority: "Standaard",
    projectDeadline: null,
    assignment: {
      employeeId: null,
      dateKey: null,
      startHour: null,
    },
  },
  {
    id: "vgw-test",
    projectId: "project-polderzettingsreeks",
    sourceTaskName: "Lab 2503090 Deil",
    sourceNummer: "2503090",
    title: "Volumiek gewicht",
    projectName: "Polderzettingsreeks",
    durationHours: 1,
    priority: "Middel",
    projectPlanningPriority: "Standaard",
    projectDeadline: null,
    assignment: {
      employeeId: null,
      dateKey: null,
      startHour: null,
    },
  },
  {
    id: "atterberg-limits",
    projectId: "project-classificatie-intake",
    sourceTaskName: "Lab 2503010 Classificatie",
    sourceNummer: "2503010",
    title: "Atterberg-grenzen",
    projectName: "Classificatie-intake",
    durationHours: 1.5,
    priority: "Middel",
    projectPlanningPriority: "Standaard",
    projectDeadline: null,
    assignment: {
      employeeId: null,
      dateKey: null,
      startHour: null,
    },
  },
  {
    id: "triaxial-setup",
    projectId: "project-stabiliteitsscreening",
    sourceTaskName: "Lab 2503215 Stabiliteit",
    sourceNummer: "2503215",
    title: "Triaxiaal opbouwen",
    projectName: "Stabiliteitsscreening",
    durationHours: 3,
    priority: "Hoog",
    projectPlanningPriority: "Standaard",
    projectDeadline: null,
    assignment: {
      employeeId: null,
      dateKey: null,
      startHour: null,
    },
  },
];
