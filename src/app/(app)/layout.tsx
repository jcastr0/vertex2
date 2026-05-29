import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSesion } from "@/lib/auth/cookies";
import { db } from "@/lib/db";
import { empresas } from "@/lib/db/schema";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getSesion();
  if (!sesion) redirect("/login");

  let empresaNombre: string | null = null;
  if (sesion.empresaId) {
    try {
      const [e] = await db
        .select({ nombre: empresas.nombre })
        .from(empresas)
        .where(eq(empresas.id, sesion.empresaId))
        .limit(1);
      empresaNombre = e?.nombre ?? null;
    } catch {
      empresaNombre = null;
    }
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar rol={sesion.rol} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          nombre={sesion.nombre}
          email={sesion.email}
          rol={sesion.rol}
          empresa={empresaNombre}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
