import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerRecaudo } from "@/lib/services/cartera";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Recaudo — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");

export default async function RecaudoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("recaudos.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const row = await obtenerRecaudo(empresaId, parseId(id));
  if (!row) notFound();
  const { recaudo, cliente, cuentaDestino } = row;
  const creadoPor = await nombreUsuario(recaudo.usuarioId);
  const anulado = recaudo.estado !== "activo";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Recaudo ${recaudo.numero}`} description={cliente}>
        <div className="flex items-center gap-2">
          {anulado && <Badge variant="destructive" className="font-normal capitalize">{recaudo.estado}</Badge>}
          <PrintButton />
        </div>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cliente}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{recaudo.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Valor cobrado</div><div className="font-semibold tabular text-primary">{money(recaudo.valor)}</div></div>
          <div><div className="text-xs text-muted-foreground">Método</div><div className="font-medium capitalize">{recaudo.metodoPago}</div></div>
          <div><div className="text-xs text-muted-foreground">Entra a</div><div className="font-medium">{cuentaDestino ?? "—"}</div></div>
          {recaudo.referencia && (
            <div><div className="text-xs text-muted-foreground">Referencia</div><div className="font-medium tabular">{recaudo.referencia}</div></div>
          )}
        </CardContent>
      </Card>

      {recaudo.observaciones && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Observaciones:</span> {recaudo.observaciones}
        </div>
      )}

      <CreadoPor nombre={creadoPor} fecha={recaudo.createdAt} />
    </div>
  );
}
