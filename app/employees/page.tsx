import EmployeeAvailabilityForm from "@/components/EmployeeAvailabilityForm";
import EmployeeProfileForm from "@/components/EmployeeProfileForm";
import {
  formatAvailabilityHours,
  weekdayDefinitions,
} from "@/lib/availability";
import { getPlannerSeedData } from "@/lib/plannerData";

export const dynamic = "force-dynamic";

function formatHours(value: number) {
  return `${value.toFixed(1)}u`;
}

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
          De medewerkers staan hier naast elkaar voor een compact overzicht.
          Per medewerker kun je de verschillende onderdelen nu inklappen,
          zodat je sneller door het team bladert en alleen opent wat je wilt
          aanpassen.
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
            {plannerData.employees.map((employee) => {
              const availableDays = weekdayDefinitions.filter(
                (day) => employee.labAvailability[day.key].available,
              ).length;

              return (
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

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div>Standaard beschikbaar</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">
                        {formatHours(employee.capacityHours)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <div>Beschikbaar voor labwerk</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">
                        {availableDays} van {weekdayDefinitions.length} dagen
                      </div>
                    </div>
                  </div>

                  <details className="group mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/80">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Skills en profiel
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          Rol, skills en standaarduren
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {employee.specialties.length} skills
                      </span>
                    </summary>

                    <div className="border-t border-slate-200/80 px-5 py-5">
                      <div className="flex flex-wrap gap-2">
                        {employee.specialties.length > 0 ? (
                          employee.specialties.map((specialty) => (
                            <span
                              key={specialty}
                              className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"
                            >
                              {specialty}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            Nog geen skills ingesteld
                          </span>
                        )}
                      </div>

                      <EmployeeProfileForm employee={employee} editable={isEditable} />
                    </div>
                  </details>

                  <details className="group mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/80">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Labbeschikbaarheid
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          Weekplanning voor labwerk
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                        {availableDays} actief
                      </span>
                    </summary>

                    <div className="border-t border-slate-200/80 px-5 py-5">
                      <div className="flex flex-wrap gap-2">
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
                              {day.shortLabel}: {dayAvailability.available
                                ? formatAvailabilityHours(
                                    dayAvailability.startHour,
                                    dayAvailability.endHour,
                                  )
                                : "vrij"}
                            </span>
                          );
                        })}
                      </div>

                      <EmployeeAvailabilityForm
                        employee={employee}
                        editable={isEditable}
                      />
                    </div>
                  </details>
                </article>
              );
            })}

            <article className="w-[min(92vw,420px)] flex-none rounded-[28px] bg-slate-900 p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,31,45,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                Wachtrijoverzicht
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold">
                {formatHours(queuedHours)}
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
