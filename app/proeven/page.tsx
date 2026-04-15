import TestCatalogManager from "@/components/TestCatalogManager";
import { getTestCatalogManagementData } from "@/lib/testCatalogManagementData";

export const dynamic = "force-dynamic";

export default async function ProevenPage() {
  const catalogData = await getTestCatalogManagementData();
  const isEditable = catalogData.source === "supabase";

  return (
    <section className="space-y-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Proeven
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Proeven en verwachte duur
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Beheer hier de proefcodes, benamingen, prioriteit en de standaard
          tijdsinschatting per proef. Dit vormt de basis voor het automatisch
          vullen van proefregels in projecten.
        </p>
      </div>

      {catalogData.warning ? (
        <p className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {catalogData.warning}
        </p>
      ) : null}

      <TestCatalogManager catalog={catalogData.catalog} editable={isEditable} />
    </section>
  );
}

