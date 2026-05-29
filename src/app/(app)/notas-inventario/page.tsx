import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarNotasInventario } from "@/lib/services/notas-inventario";
import { TIPOS_NOTA, esEntrada } from "@/lib/domain/nota-inventario";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Notas de inventario — Vertex" };

type Fila = Awaited<ReturnType<typeof listarNotasInventario>>[number];
const ETIQUETA: Record<string, string> = Object.fromEntries(
  TIPOS_NOTA.map((t) => [t.value, t.label]),
);

export default async function NotasInventarioPage() {
  const sesion = await requirePermiso("notas_inventario.ver");
  const { empresaId } = await requireEmpresa();
  const filas = await listarNotasInventario(empresaId);
  const puedeCrear = puede(sesion.rol, "notas_inventario.crear");

  const columnas: Columna<Fila>[] = [
    { header: "Número", primary: true, cell: (f) => <span className="tabular font-medium">{f.nota.numero}</span> },
    { header: "Producto", cell: (f) => f.producto },
    { header: "Bodega", cell: (f) => f.bodega },
    {
      header: "Tipo",
      cell: (f) => (
        <Badge variant={esEntrada(f.nota.tipo) ? "default" : "secondary"} className="font-normal">
          {ETIQUETA[f.nota.tipo] ?? f.nota.tipo}
        </Badge>
      ),
    },
    {
      header: "Cantidad",
      className: "text-right",
      cell: (f) => (
        <span className="tabular">
          {esEntrada(f.nota.tipo) ? "+" : "−"}
          {Number(f.nota.cantidad)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Notas de inventario" description="Ajustes de existencias: mermas, daños y diferencias.">
        {puedeCrear && (
          <Link href="/notas-inventario/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva nota
          </Link>
        )}
      </PageHeader>

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <ClipboardList className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay notas</p>
          <p className="text-sm text-muted-foreground">Registra ajustes de inventario cuando haya mermas o diferencias.</p>
        </div>
      ) : (
        <ResponsiveTable items={filas} getKey={(f) => f.nota.id} columns={columnas} />
      )}
    </div>
  );
}
