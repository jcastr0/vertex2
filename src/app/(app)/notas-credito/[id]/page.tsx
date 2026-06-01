import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerNotaCredito } from "@/lib/services/devoluciones";
import { obtenerTercero } from "@/lib/services/terceros";
import { nombreUsuario } from "@/lib/services/usuarios";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "Nota crédito — Vertex" };
const money = (s: string | number) => "$" + Number(s).toLocaleString("es-CO");

export default async function NotaCreditoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("notas_credito.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const nota = await obtenerNotaCredito(empresaId, parseId(id));
  if (!nota) notFound();

  const [cli, creadoPor] = await Promise.all([
    obtenerTercero(empresaId, nota.clienteId),
    nombreUsuario(nota.usuarioId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Nota crédito ${nota.numero}`} description={cli?.razonSocial ?? ""} />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Cliente</div><div className="font-medium">{cli?.razonSocial ?? "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{nota.fecha}</div></div>
          <div><div className="text-xs text-muted-foreground">Valor</div><div className="font-semibold tabular text-primary">{money(nota.valor)}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Origen</div>
            {nota.facturaId ? (
              <Link href={`/facturas/${nota.facturaId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                factura <ArrowUpRight className="size-3" />
              </Link>
            ) : nota.devolucionId ? (
              <Link href={`/devoluciones/${nota.devolucionId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                devolución <ArrowUpRight className="size-3" />
              </Link>
            ) : (
              <div className="text-muted-foreground">manual</div>
            )}
          </div>
        </CardContent>
      </Card>

      {nota.motivo && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Motivo:</span> {nota.motivo}
        </div>
      )}

      <CreadoPor nombre={creadoPor} fecha={nota.createdAt} />
    </div>
  );
}
