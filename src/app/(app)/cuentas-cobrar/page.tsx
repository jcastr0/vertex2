import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { deudoresPorCliente, cuentasPorCobrarAbiertasPorCliente } from "@/lib/services/cartera";
import { cuentasPropiasActivas } from "@/lib/services/tesoreria";
import { PageHeader } from "@/components/page-header";
import { FiltroBar } from "@/components/ui/filtro-bar";
import { CobrarCliente } from "./cobrar-cliente";
import { HandCoins, PartyPopper } from "lucide-react";

export const metadata: Metadata = { title: "Cobrar — Vertex" };
const money = (n: number) => "$" + n.toLocaleString("es-CO");

export default async function CobrarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sesion = await requirePermiso("cuentas_cobrar.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "" } = await searchParams;
  const [deudores, cuentasDestino, docsPorCliente] = await Promise.all([
    deudoresPorCliente(empresaId),
    cuentasPropiasActivas(empresaId),
    cuentasPorCobrarAbiertasPorCliente(empresaId),
  ]);
  const hoy = new Date().toISOString().slice(0, 10);
  const puedeCobrar = puede(permisos, "recaudos.crear");

  const t = q.trim().toLowerCase();
  const lista = t ? deudores.filter((d) => d.cliente.toLowerCase().includes(t)) : deudores;
  const totalGeneral = deudores.reduce((a, d) => a + d.total, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Cobrar" description="¿Quién te debe?" />

      {deudores.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <PartyPopper className="mb-3 size-9 text-primary/60" />
          <p className="font-medium">Nadie te debe</p>
          <p className="text-sm text-muted-foreground">Cuando vendas fiado, aquí verás a quién cobrarle.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HandCoins className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Te deben en total</p>
                <p className="tabular text-2xl font-bold tracking-tight">{money(totalGeneral)}</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{deudores.length} {deudores.length === 1 ? "cliente" : "clientes"}</span>
          </div>

          <div className="mb-3">
            <FiltroBar placeholder="Buscar cliente…" />
          </div>

          {lista.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              Ningún cliente coincide con “{q}”.
            </p>
          ) : (
            <div className="space-y-2.5">
              {lista.map((d) =>
                puedeCobrar ? (
                  <CobrarCliente
                    key={d.clienteId}
                    clienteId={d.clienteId}
                    cliente={d.cliente}
                    total={d.total}
                    vencido={d.venceMin < hoy}
                    hoy={hoy}
                    cuentasDestino={cuentasDestino}
                    docs={docsPorCliente[d.clienteId] ?? []}
                  />
                ) : (
                  <div key={d.clienteId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <span className={`size-2.5 shrink-0 rounded-full ${d.venceMin < hoy ? "bg-destructive" : "bg-primary/40"}`} />
                    <span className="min-w-0 flex-1 truncate font-medium">{d.cliente}</span>
                    <span className="tabular text-lg font-bold">{money(d.total)}</span>
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
