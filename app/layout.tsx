import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const navItems = [
  { href: "/dashboard", label: "Planning" },
  { href: "/employees", label: "Medewerkers" },
  { href: "/projects", label: "Projecten" },
];

export const metadata: Metadata = {
  title: "SILT Labplanning",
  description: "Sleepbare labplanning voor SILT testwerkzaamheden.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-background text-foreground">
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
            <div className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-6 xl:px-8 2xl:px-10">
              <Link href="/dashboard" className="flex flex-col">
                <span className="font-display text-lg font-semibold tracking-tight text-slate-900">
                  SILT Labplanning
                </span>
                <span className="text-sm text-slate-500">
                  Dagelijkse sleepplanning
                </span>
              </Link>

              <nav className="flex items-center gap-2 rounded-full bg-slate-100/80 p-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex w-full flex-1 flex-col px-5 py-8 sm:px-6 xl:px-8 2xl:px-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
