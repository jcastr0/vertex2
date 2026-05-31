import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarTraslados } from "@/lib/services/traslados";
import { listarBodegas } from "@/lib/services/bodegas";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeftRight } from "lucide-react";

export const metadata: Metadata = { title: "Traslados — Vertex" };
const PAGE_SIZE = 10;

type Fila = Awaited<ReturnType<typeof listarTraslados>>[number];
const VARIANTE: Record<string, "default" | "secondary" | "outline"> = {
  pendiente: "outline",
  enviado: "secondary",
  recibido: "default",
  cancelado: "outline",
};

export default async function TrasladosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("traslados.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const [todos, bodegas] = await Promise.all([listarTraslados(empresaId), listarBodegas(empresaId)]);
  const bodPorId = new Map(bodegas.map((b) => [b.id, b.nombre]));
  const puedeCrear = puede(permisos, "traslados.crear");

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (f) => `${f.traslado.numero} ${f.origen} ${bodPorId.get(f.traslado.bodegaDestinoId) ?? ""}`,
  });

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
          <Link href="/traslados/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo traslado
          </Link>
        )}
      </PageHeader>

      <ListaFiltrable
        base="/traslados"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(f) => f.traslado.id}
        columns={columnas}
        searchPlaceholder="Buscar por número o bodega…"
        hayDatos={todos.length > 0}
        vacio={{ icon: ArrowLeftRight, titulo: "Aún no hay traslados", texto: "Crea un traslado para mover stock entre bodegas." }}
      />
    </div>
  );
}
