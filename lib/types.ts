export type PlanningView = "day" | "week" | "month";

export interface PlannerDay {
  id: string;
  dateKey: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
}

export interface MonthCell {
  id: string;
  dateKey: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

export interface TimeSlot {
  hour: number;
  label: string;
  endLabel: string;
}

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export interface WeeklyAvailabilityDay {
  key: WeekdayKey;
  label: string;
  shortLabel: string;
}

export interface DailyAvailabilityWindow {
  available: boolean;
  startHour: number;
  endHour: number;
}

export type WeeklyAvailability = Record<WeekdayKey, DailyAvailabilityWindow>;

export interface Employee {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  capacityHours: number;
  labAvailability: WeeklyAvailability;
}

export type ProjectPlanningPriority = "Standaard" | "Spoed";

export interface LabProjectTest {
  id: string;
  projectId: string;
  testCode: string;
  testName: string;
  quantity: number;
  durationHoursPerItem: number;
  totalDurationHours: number;
  sourceFragment?: string | null;
  notes?: string | null;
}

export interface LabTestCatalogItem {
  code: string;
  name: string;
  defaultDurationHours: number;
  defaultPriority: "Hoog" | "Middel" | "Laag";
  description?: string | null;
}

export interface LabProject {
  id: string;
  sourceNummer: string | null;
  title: string;
  companyName?: string | null;
  offerAssignment?: string | null;
  status?: string | null;
  planningPriority: ProjectPlanningPriority;
  deadline?: string | null;
  sourceDescription?: string | null;
  projectNotes?: string | null;
  taskCount: number;
  queuedHours: number;
  tests?: LabProjectTest[];
}

export interface TaskAssignment {
  employeeId: string | null;
  dateKey: string | null;
  startHour: number | null;
}

export interface Task {
  id: string;
  projectId: string | null;
  sourceTaskName?: string | null;
  sourceNummer?: string | null;
  title: string;
  projectName: string;
  description?: string | null;
  durationHours: number;
  quantity?: number;
  priority: "Hoog" | "Middel" | "Laag";
  projectPlanningPriority: ProjectPlanningPriority;
  projectDeadline?: string | null;
  assignment: TaskAssignment;
}

export type PlannerDataSource = "mock" | "supabase";

export interface PlannerSeedData {
  employees: Employee[];
  projects: LabProject[];
  tasks: Task[];
  source: PlannerDataSource;
  warning?: string;
}
