import LabImportPanel from "@/components/LabImportPanel";
import PlannerBoard from "@/components/PlannerBoard";
import { getPlannerSeedData } from "@/lib/plannerData";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const plannerData = await getPlannerSeedData();

  return (
    <section className="space-y-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Planning
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          SILT Labplanning
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Plan labwerk door taken te slepen naar de persoonlijke dag-, week- of
          maandplanning van elke medewerker. Alles werkt nu direct met data uit
          Supabase zodra de tabellen bestaan, en valt anders automatisch terug
          op mockdata.
        </p>

        <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          Databron: {plannerData.source === "supabase" ? "Supabase" : "mockdata"}
        </div>

        {plannerData.warning ? (
          <p className="mt-4 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {plannerData.warning}
          </p>
        ) : null}
      </div>

      <LabImportPanel />

      <PlannerBoard
        initialEmployees={plannerData.employees}
        initialTasks={plannerData.tasks}
      />
    </section>
  );
}
