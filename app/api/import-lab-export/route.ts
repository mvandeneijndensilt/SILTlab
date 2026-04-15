import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { importLabWorkbook } from "@/lib/importLabExport";

export const runtime = "nodejs";
const maxUploadSizeBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecteer eerst een Excel-bestand om te uploaden." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Alleen .xlsx-bestanden worden ondersteund." },
        { status: 400 },
      );
    }

    if (file.size > maxUploadSizeBytes) {
      return NextResponse.json(
        { error: "Het bestand is te groot. Gebruik een bestand kleiner dan 10 MB." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const summary = await importLabWorkbook(
      file.name,
      Buffer.from(arrayBuffer),
    );

    revalidatePath("/dashboard");
    revalidatePath("/employees");
    revalidatePath("/projects");

    return NextResponse.json({
      message: "Labexport succesvol verwerkt.",
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende importfout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
