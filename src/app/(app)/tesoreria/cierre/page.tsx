// src/app/(app)/tesoreria/cierre/page.tsx
import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { cuentasParaCierre, listarCierres } from "@/lib/services/cierre";
import { PageHeader } from "@/components/page-header";
import { CierreForm } from "./cierre-form";

export const metadata: Metadata = { title: "Cierre de caja — Vertex" };

export default async function CierrePage() {
  await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const hoy = new Date().toISOString().slice(0, 10);
  const [cuentas, cierres] = await Promise.all([cuentasParaCierre(empresaId), listarCierres(empresaId)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Cierre de caja" description="Arqueo del día: cuenta el efectivo y cuadra contra lo esperado." />
      <CierreForm cuentas={cuentas} hoy={hoy} />
      {cierres.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Cierres anteriores</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
            {cierres.map((c) => (
              <li key={c.id} className="flex justify-between px-4 py-2.5"><span className="tabular">{c.fecha}</span><span className="text-muted-foreground">{c.observaciones || "—"}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
