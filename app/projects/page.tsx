import ProjectPriorityForm from "@/components/ProjectPriorityForm";
import ProjectTestsManager from "@/components/ProjectTestsManager";
import { getProjectManagementData } from "@/lib/projectManagementData";

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

export default async function ProjectsPage() {
  const projectData = await getProjectManagementData();
  const totalQueuedHours = projectData.projects.reduce(
    (total, project) => total + project.queuedHours,
    0,
  );
  const urgentProjects = projectData.projects.filter(
    (project) => project.planningPriority === "Spoed",
  ).length;
  const projectsWithDeadline = projectData.projects.filter(
    (project) => project.deadline,
  ).length;
  const projectsWithTests = projectData.projects.filter(
    (project) => (project.tests?.length ?? 0) > 0,
  ).length;
  const isEditable = projectData.source === "supabase";

  return (
    <section className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Projecten
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Projecten, proeven en planning
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Nieuwe importregels komen standaard binnen als `Standaard`. Hier kun
          je per project achteraf schakelen naar `Spoed` en een deadline
          invullen, zonder dat een volgende import jouw keuze overschrijft. Ook
          kun je per project de afzonderlijke labproeven vastleggen die als
          losse planner-taken ingepland moeten worden.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[28px] bg-slate-900 p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,31,45,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            Projecten
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            {projectData.projects.length}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Totale instroom van labprojecten in de planner.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Spoed
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
            {urgentProjects}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Projecten die automatisch extra aandacht krijgen in de backlog.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Werkvoorraad
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
            {totalQueuedHours.toFixed(1)}u
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {projectsWithDeadline} projecten hebben al een deadline en{" "}
            {projectsWithTests} projecten hebben al losse proefregels.
          </p>
        </article>
      </div>

      {projectData.warning ? (
        <p className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {projectData.warning}
        </p>
      ) : null}

      {projectData.projects.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {projectData.projects.map((project) => (
            <article
              key={project.id}
              className={`rounded-[28px] border p-6 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.35)] backdrop-blur-sm ${
                project.planningPriority === "Spoed"
                  ? "border-rose-200 bg-rose-50/80"
                  : "border-white/70 bg-white/80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {project.sourceNummer
                      ? `Labopdracht ${project.sourceNummer}`
                      : "Labproject"}
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900">
                    {project.title}
                  </h2>
                </div>

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
                  {project.status ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {project.status}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Taken
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {project.taskCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Werkuren
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {project.queuedHours.toFixed(1)}u
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Deadline
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDeadline(project.deadline)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                {project.companyName ? <p>Bedrijf: {project.companyName}</p> : null}
                {project.offerAssignment ? (
                  <p>Project: {project.offerAssignment}</p>
                ) : null}
              </div>

              {project.projectNotes ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Opmerkingen
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
                    {project.projectNotes}
                  </pre>
                </div>
              ) : null}

              <ProjectTestsManager
                project={project}
                catalog={projectData.catalog}
                editable={isEditable}
              />
              <ProjectPriorityForm project={project} editable={isEditable} />
            </article>
          ))}
        </div>
      ) : (
        <article className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-slate-500 shadow-[0_24px_60px_-32px_rgba(15,31,45,0.25)]">
          Er zijn nog geen projecten om te beheren. Importeer eerst een
          labexport via het dashboard.
        </article>
      )}
    </section>
  );
}
