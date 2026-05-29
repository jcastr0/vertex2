import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarTraslados } from "@/lib/services/traslados";
import { listarBodegas } from "@/lib/services/bodegas";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeftRight } from "lucide-react";

export const metadata: Metadata = { title: "Traslados — Vertex" };

type Fila = Awaited<ReturnType<typeof listarTraslados>>[number];
const VARIANTE: Record<string, "default" | "secondary" | "outline"> = {
  pendiente: "outline",
  enviado: "secondary",
  recibido: "default",
  cancelado: "outline",
};

export default async function TrasladosPage() {
  const sesion = await requirePermiso("traslados.ver");
  const { empresaId } = await requireEmpresa();
  const [filas, bodegas] = await Promise.all([listarTraslados(empresaId), listarBodegas(empresaId)]);
  const bodPorId = new Map(bodegas.map((b) => [b.id, b.nombre]));
  const puedeCrear = puede(sesion.rol, "traslados.crear");

  const columnas: Columna<Fila>[] = [
    {
      header: "Número",
      primary: true,
      cell: (f) => (
        <Link href={`/traslados/${f.traslado.id}`} className="tabular font-medium text-primary hover:underline">
          {f.traslado.numero}
        </Link>
      ),
    },
    { header: "Origen", cell: (f) => f.origen },
    { header: "Destino", cell: (f) => bodPorId.get(f.traslado.bodegaDestinoId) ?? "—" },
    {
      header: "Estado",
      cell: (f) => (
        <Badge variant={VARIANTE[f.traslado.estado] ?? "outline"} className="font-normal capitalize">
          {f.traslado.estado}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Traslados entre bodegas" description="Mueve existencias de una bodega a otra.">
        {puedeCrear && (
          <Link href="/traslados/nuevo" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo traslado
          </Link>
        )}
      </PageHeader>

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ArrowLeftRight className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay traslados</p>
          <p className="text-sm text-muted-foreground">Crea un traslado para mover stock entre bodegas.</p>
        </div>
      ) : (
        <ResponsiveTable items={filas} getKey={(f) => f.traslado.id} columns={columnas} />
      )}
    </div>
  );
}
