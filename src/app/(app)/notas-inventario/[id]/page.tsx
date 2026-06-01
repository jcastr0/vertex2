import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerNotaInventario } from "@/lib/services/notas-inventario";
import { obtenerTercero } from "@/lib/services/terceros";
import { nombreUsuario } from "@/lib/services/usuarios";
import { TIPOS_NOTA, esEntrada } from "@/lib/domain/nota-inventario";
import { fechaInstante } from "@/lib/fecha";
import { CreadoPor } from "@/components/creado-por";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "Nota de inventario — Vertex" };
const num = (s: string | number) => Number(s).toLocaleString("es-CO", { maximumFractionDigits: 4 });
const ETIQUETA = new Map<string, string>(TIPOS_NOTA.map((t) => [t.value, t.label]));

export default async function NotaInventarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("notas_inventario.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const row = await obtenerNotaInventario(empresaId, parseId(id));
  if (!row) notFound();
  const { nota, producto, bodega } = row;

  const [proveedor, creadoPor] = await Promise.all([
    nota.proveedorId ? obtenerTercero(empresaId, nota.proveedorId) : Promise.resolve(null),
    nombreUsuario(nota.usuarioId),
  ]);
  const entrada = esEntrada(nota.tipo);
  const adjuntos = Array.isArray(nota.adjuntos) ? (nota.adjuntos as string[]) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Nota de inventario ${nota.numero}`} description={producto}>
        <Badge variant={entrada ? "default" : "secondary"} className="font-normal">
          {entrada ? "Entrada" : "Salida"}
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Producto</div><div className="font-medium">{producto}</div></div>
          <div><div className="text-xs text-muted-foreground">Bodega</div><div className="font-medium">{bodega}</div></div>
          <div><div className="text-xs text-muted-foreground">Tipo</div><div className="font-medium">{ETIQUETA.get(nota.tipo) ?? nota.tipo}</div></div>
          <div>
            <div className="text-xs text-muted-foreground">Cantidad</div>
            <div className={`font-semibold tabular ${entrada ? "text-primary" : "text-destructive"}`}>
              {entrada ? "+" : "−"}{num(nota.cantidad)}
            </div>
          </div>
          <div><div className="text-xs text-muted-foreground">Fecha</div><div className="font-medium tabular">{fechaInstante(nota.fecha)}</div></div>
          {nota.proveedorId && (
            <div><div className="text-xs text-muted-foreground">Proveedor</div><div className="font-medium">{proveedor?.razonSocial ?? "—"}</div></div>
          )}
          {nota.pedidoId && (
            <div>
              <div className="text-xs text-muted-foreground">Pedido</div>
              <Link href={`/pedidos/${nota.pedidoId}`} className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                ver <ArrowUpRight className="size-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {nota.motivo && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-semibold">Motivo:</span> {nota.motivo}
        </div>
      )}

      {adjuntos.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Soportes ({adjuntos.length})</div>
          <div className="flex flex-wrap gap-3">
            {adjuntos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Soporte ${i + 1}`} className="size-24 rounded-lg border border-border object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <CreadoPor nombre={creadoPor} fecha={nota.createdAt} />
    </div>
  );
}
