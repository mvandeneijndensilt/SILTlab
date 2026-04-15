import VolumiekProjectForm from "@/components/VolumiekProjectForm";
import VolumiekSampleRequestsForm from "@/components/VolumiekSampleRequestsForm";
import VolumiekExportsForm from "@/components/VolumiekExportsForm";
import { getVolumiekManagementData } from "@/lib/volumiekManagementData";

export const dynamic = "force-dynamic";

function formatDeadline(value: string | null | undefined) {
  if (!value) {
    return "Nog niet ingesteld";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Niet opgegeven";
  }

  return `${value.toFixed(1)}u`;
}

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) {
    return "Nog niet opgeslagen";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function VolumiekPage() {
  const volumiekData = await getVolumiekManagementData();
  const totalRequested = volumiekData.projects.reduce(
    (total, project) => total + project.requestedQuantity,
    0,
  );
  const totalFilled = volumiekData.projects.reduce(
    (total, project) => total + project.filledRowCount,
    0,
  );
  const urgentProjects = volumiekData.projects.filter(
    (project) => project.planningPriority === "Spoed",
  ).length;
  const completedProjects = volumiekData.projects.filter(
    (project) => project.filledRowCount >= Math.max(1, project.requestedQuantity),
  ).length;
  const isEditable = volumiekData.source === "supabase";

  return (
    <section className="space-y-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Uitvoering
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Uitvoering: Volumiek gewicht
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Hier beheer je de monsterselectie (boring/monster) en de volumiek-invoer per project.
          De gegevens zijn bedoeld om rechtstreeks uit te wisselen met SILT Suite, zonder FTP.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-[28px] bg-slate-900 p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,31,45,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            Projecten
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            {volumiekData.projects.length}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Projecten met een volumiek-vraag of al opgeslagen volumiek-data.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Gevraagd
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
            {totalRequested}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Totaal aantal gevraagde monsters (of VGW-aantal als monsters nog niet zijn gespecificeerd).
          </p>
        </article>

        <article className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Ingevuld
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
            {totalFilled}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {completedProjects} projecten hebben al voldoende volumiek-invoer.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Spoedprojecten
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
            {urgentProjects}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Deze kaart helpt om urgente projecten eerst af te ronden.
          </p>
        </article>
      </div>

      {volumiekData.warning ? (
        <p className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {volumiekData.warning}
        </p>
      ) : null}

      {volumiekData.projects.length > 0 ? (
        <div className="space-y-4">
          {volumiekData.projects.map((project) => (
            <details
              key={project.projectNummer}
              className={`group overflow-hidden rounded-[28px] border shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm ${
                project.planningPriority === "Spoed"
                  ? "border-rose-200 bg-rose-50/80"
                  : "border-white/70 bg-white/80"
              }`}
            >
              <summary className="list-none cursor-pointer p-6 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Project {project.projectNummer}
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
                      {project.title}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                      {project.companyName ? (
                        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                          Bedrijf: {project.companyName}
                        </span>
                      ) : null}
                      {project.deadline ? (
                        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                          Deadline: {formatDeadline(project.deadline)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          project.planningPriority === "Spoed"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {project.planningPriority}
                      </span>
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                        {project.filledRowCount >= Math.max(1, project.requestedQuantity)
                          ? "Gereed"
                          : project.filledRowCount > 0
                            ? "Bezig"
                            : "Nog leeg"}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                      <span className="text-base leading-none transition group-open:rotate-45">
                        +
                      </span>
                      <span>Open project</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Monsters
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {project.sampleRequests.length > 0
                        ? `${project.sampleRequests.length} geselecteerd`
                        : "Nog niet gespecificeerd"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Gevraagd totaal: {project.requestedQuantity}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Ingevuld
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {project.filledRowCount} van {Math.max(1, project.requestedQuantity)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Geschat uit import
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatHours(project.sourceEstimatedHours)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Laatste update
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatUpdatedAt(project.updatedAt)}
                    </p>
                  </div>
                </div>
              </summary>

              <div className="border-t border-slate-200/80 px-6 pb-6 pt-6 space-y-6">
                <VolumiekSampleRequestsForm
                  projectNummer={project.projectNummer}
                  projectId={project.projectId}
                  title={project.title}
                  requests={project.sampleRequests}
                  editable={isEditable}
                />

                <VolumiekExportsForm
                  projectNummer={project.projectNummer}
                  projectId={project.projectId}
                  title={project.title}
                  exports={project.exports}
                  editable={isEditable}
                />

                <details className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white/70 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Uitvoering
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        Invulvelden (volumiek)
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {project.filledRowCount} / {Math.max(1, project.requestedQuantity)}
                    </span>
                  </summary>

                  <div className="border-t border-slate-200/80 px-5 py-6">
                    <VolumiekProjectForm project={project} editable={isEditable} />
                  </div>
                </details>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <article className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-500 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.25)]">
          Er zijn nog geen volumiek-projecten gevonden. Zodra een project een `VGW`-proef krijgt,
          verschijnt het hier automatisch.
        </article>
      )}
    </section>
  );
}
