import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="lg:pl-64 min-h-screen">
        {/* En móvil/tableta el botón de menú es fijo arriba a la izquierda: se deja espacio para que no tape el contenido. */}
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-8">{children}</div>
      </main>
    </>
  );
}
