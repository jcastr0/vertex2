import type { Metadata } from "next";
import { hoyColombia } from "@/lib/fecha";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { acreedoresPorProveedor, cuentasPorPagarAbiertasPorProveedor } from "@/lib/services/cartera";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { retencionesActivas } from "@/lib/services/retenciones";
import { PageHeader } from "@/components/page-header";
import { FiltroBar } from "@/components/ui/filtro-bar";
import { PagarProveedor } from "./pagar-proveedor";
import { Wallet, PartyPopper } from "lucide-react";

export const metadata: Metadata = { title: "Pagar — Vertex" };
const money = (n: number) => "$" + n.toLocaleString("es-CO");

export default async function PagarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermiso("cuentas_pagar.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "" } = await searchParams;

  const [acreedores, cuentasOrigen, retenciones, docsPorProveedor] = await Promise.all([
    acreedoresPorProveedor(empresaId),
    cuentasPropiasActivas(empresaId),
    retencionesActivas(empresaId),
    cuentasPorPagarAbiertasPorProveedor(empresaId),
  ]);

  const hoy = hoyColombia();
  const puedePagar = puede(permisos, "pagos_proveedor.crear");

  const t = q.trim().toLowerCase();
  const lista = t
    ? acreedores.filter((a) => a.proveedor.toLowerCase().includes(t))
    : acreedores;

  const totalGeneral = acreedores.reduce((acc, a) => acc + a.total, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pagar" description="¿A quién le debes?" />

      {acreedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <PartyPopper className="mb-3 size-9 text-primary/60" />
          <p className="font-medium">No le debes a nadie</p>
          <p className="text-sm text-muted-foreground">
            Cuando recibas pedidos de proveedores, aquí verás a quién pagarle.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Wallet className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Debes en total</p>
                <p className="tabular text-2xl font-bold tracking-tight">{money(totalGeneral)}</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {acreedores.length} {acreedores.length === 1 ? "proveedor" : "proveedores"}
            </span>
          </div>

          <div className="mb-3">
            <FiltroBar placeholder="Buscar proveedor…" />
          </div>

          {lista.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Ningún proveedor coincide con &ldquo;{q}&rdquo;.
            </p>
          ) : (
            <div className="space-y-2.5">
              {lista.map((a) =>
                puedePagar ? (
                  <PagarProveedor
                    key={a.proveedorId}
                    proveedorId={a.proveedorId}
                    proveedor={a.proveedor}
                    total={a.total}
                    vencido={a.venceMin < hoy}
                    facturaElectronica={a.facturaElectronica ?? false}
                    docsSinFactura={a.docsSinFactura}
                    hoy={hoy}
                    cuentasOrigen={cuentasOrigen}
                    retenciones={retenciones}
                    docs={docsPorProveedor[a.proveedorId] ?? []}
                  />
                ) : (
                  <div
                    key={a.proveedorId}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${a.venceMin < hoy ? "bg-destructive" : "bg-primary/40"}`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{a.proveedor}</span>
                    <span className="tabular text-lg font-bold">{money(a.total)}</span>
                  </div>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
