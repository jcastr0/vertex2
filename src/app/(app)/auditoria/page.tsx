import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarAuditoria, type FilaAuditoria } from "@/lib/services/auditoria";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Auditoría — Vertex" };
const PAGE_SIZE = 15;

const VARIANTE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREAR: "default",
  ACTUALIZAR: "secondary",
  ELIMINAR: "destructive",
};
const moduloLabel = (a: { modulo: string | null; tabla: string }) => a.modulo ?? a.tabla;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermiso("auditoria.ver");
  const { empresaId } = await requireEmpresa();
  const { q = "", page: pageRaw } = await searchParams;
  const todos = await listarAuditoria(empresaId);

  const { items, total, page } = filtrarPaginar(todos, {
    q,
    page: parsePage(pageRaw),
    pageSize: PAGE_SIZE,
    texto: (a) => `${a.usuario ?? ""} ${a.accion} ${moduloLabel(a)}`,
  });

  const columnas: Columna<FilaAuditoria>[] = [
    { header: "Fecha", primary: true, cell: (a) => <span className="tabular">{new Date(a.fecha).toLocaleString("es-CO")}</span> },
    { header: "Usuario", cell: (a) => a.usuario ?? "—" },
    {
      header: "Acción",
      cell: (a) => <Badge variant={VARIANTE[a.accion] ?? "outline"} className="font-normal capitalize">{a.accion.toLowerCase()}</Badge>,
    },
    { header: "Módulo", cell: (a) => moduloLabel(a) },
    { header: "IP", cell: (a) => <span className="tabular text-muted-foreground">{a.ip ?? "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Auditoría" description="Registro de operaciones (últimos 500 eventos)." />
      <ListaFiltrable
        base="/auditoria"
        q={q}
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        items={items}
        getKey={(a) => a.id}
        columns={columnas}
        searchPlaceholder="Buscar por usuario, acción o módulo…"
        hayDatos={todos.length > 0}
        vacio={{ icon: ShieldCheck, titulo: "Sin registros", texto: "Las operaciones aparecerán aquí a medida que uses el sistema." }}
      />
    </div>
  );
}
