import EmployeeProfileForm from "@/components/EmployeeProfileForm";
import EmployeeAvailabilityForm from "@/components/EmployeeAvailabilityForm";
import {
  formatAvailabilityHours,
  weekdayDefinitions,
} from "@/lib/availability";
import { getPlannerSeedData } from "@/lib/plannerData";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const plannerData = await getPlannerSeedData();
  const queuedHours = plannerData.tasks.reduce(
    (total, task) => total + task.durationHours,
    0,
  );
  const isEditable = plannerData.source === "supabase";

  return (
    <section className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Medewerkers
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Teamcapaciteit
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Een snel overzicht van het labteam dat beschikbaar is voor de
          planning. Deze pagina leest dezelfde medewerkers als de planner.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Teamoverzicht
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">
              Medewerkers naast elkaar
            </h2>
          </div>

          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            Horizontaal scrollen
          </span>
        </div>

        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max items-start gap-6">
            {plannerData.employees.map((employee) => (
              <article
                key={employee.id}
                className="w-[min(92vw,560px)] flex-none rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {employee.role || "Rol niet ingesteld"}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
                  {employee.name}
                </h2>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>Standaard beschikbaar</span>
                  <span className="font-semibold text-slate-900">
                    {employee.capacityHours.toFixed(1)}h
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {employee.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {weekdayDefinitions.map((day) => {
                    const dayAvailability = employee.labAvailability[day.key];

                    return (
                      <span
                        key={day.key}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          dayAvailability.available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
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

                <EmployeeProfileForm employee={employee} editable={isEditable} />
                <EmployeeAvailabilityForm
                  employee={employee}
                  editable={isEditable}
                />
              </article>
            ))}

            <article className="w-[min(92vw,420px)] flex-none rounded-[28px] bg-slate-900 p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,31,45,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Wachtrijoverzicht
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold">
                {queuedHours.toFixed(1)} uur
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Totale hoeveelheid werk die klaarstaat voor de planner.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
