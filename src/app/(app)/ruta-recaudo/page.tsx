import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { rutaDelRecaudador } from "@/lib/services/ruta-recaudo";
import { diaSemana, DIAS_COBRO } from "@/lib/domain/ruta-recaudo";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ParadaCard } from "./parada-card";
import { RecaudadorPicker } from "./recaudador-picker";
import { Route, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Ruta de recaudo — Vertex" };

const money = (n: number) => "$" + n.toLocaleString("es-CO");

export default async function RutaRecaudoPage({
  searchParams,
}: {
  searchParams: Promise<{ recaudador?: string }>;
}) {
  const sesion = await requirePermiso("ruta_recaudo.ver");
  const { empresaId } = await requireEmpresa();
  const { recaudador: recParam } = await searchParams;

  const puedeElegir = puede(sesion.rol, "usuarios.ver");
  const recaudadores = puedeElegir ? await listarRecaudadores(empresaId) : [];

  const recaudadorId = puedeElegir
    ? Number(recParam) || recaudadores[0]?.id || sesion.uid
    : sesion.uid;

  const now = new Date();
  const hoyDia = diaSemana(now);
  const hoyISO = now.toISOString().slice(0, 10);
  const hoyLabel = DIAS_COBRO.find((d) => d.value === hoyDia)?.label ?? "Hoy";

  const { paradas, recaudadoHoy } = await rutaDelRecaudador(empresaId, recaudadorId, hoyDia, hoyISO);
  const hoyToca = paradas.filter((p) => p.grupo === "hoy");
  const otros = paradas.filter((p) => p.grupo !== "hoy");
  const visitados = paradas.filter((p) => p.resultadoHoy).length;

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader title="Ruta de recaudo" description={`${hoyLabel} — a quién cobrar hoy.`}>
        {puedeElegir && <RecaudadorPicker recaudadores={recaudadores} actual={recaudadorId} />}
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="grid grid-cols-3 gap-3 pt-6 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Recaudado hoy</div>
            <div className="tabular text-lg font-bold text-primary">{money(recaudadoHoy)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Clientes con saldo</div>
            <div className="tabular text-lg font-bold">{paradas.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Visitados</div>
            <div className="tabular text-lg font-bold">{visitados}/{paradas.length}</div>
          </div>
        </CardContent>
      </Card>

      {paradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Route className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Sin clientes por cobrar</p>
          <p className="text-sm text-muted-foreground">
            Asigna clientes a este recaudador (en Terceros) o no hay saldos pendientes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {hoyToca.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-primary" /> Hoy te toca ({hoyToca.length})
              </h3>
              {hoyToca.map((p) => (
                <ParadaCard key={p.clienteId} parada={p} recaudadorId={recaudadorId} hoy={hoyISO} />
              ))}
            </section>
          )}
          {otros.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Otros con saldo ({otros.length})</h3>
              {otros.map((p) => (
                <ParadaCard key={p.clienteId} parada={p} recaudadorId={recaudadorId} hoy={hoyISO} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
