import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarSolicitudes } from "@/lib/services/solicitudes-registro";
import { fechaHora } from "@/lib/fecha";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Solicitudes de registro — Vertex" };

type Solicitud = Awaited<ReturnType<typeof listarSolicitudes>>[number];

const ESTADO: Record<string, { label: string; variant: "secondary" | "default" | "outline" }> = {
  pendiente: { label: "Pendiente", variant: "secondary" },
  atendida: { label: "Atendida", variant: "outline" },
};

export default async function SolicitudesRegistroPage() {
  await requirePermiso("configuracion.ver");
  const { empresaId } = await requireEmpresa();
  const solicitudes = await listarSolicitudes(empresaId);

  const columns: Columna<Solicitud>[] = [
    { header: "Teléfono", primary: true, cell: (s) => <span className="font-medium">{s.telefono}</span> },
    { header: "Mensaje", cell: (s) => <span className="text-muted-foreground">{s.mensaje || "—"}</span> },
    {
      header: "Estado",
      cell: (s) => {
        const e = ESTADO[s.estado] ?? { label: s.estado, variant: "secondary" as const };
        return <Badge variant={e.variant}>{e.label}</Badge>;
      },
    },
    { header: "Cuándo", className: "whitespace-nowrap", cell: (s) => (s.createdAt ? fechaHora(s.createdAt) : "—") },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Solicitudes de registro" description="Números desconocidos que escribieron al WhatsApp y pidieron registrarse como clientes." />
      {solicitudes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <Inbox className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Aún no hay solicitudes</p>
          <p className="text-sm text-muted-foreground">Cuando alguien no registrado escriba al WhatsApp, aparecerá aquí para que decidas si lo das de alta como cliente.</p>
        </div>
      ) : (
        <ResponsiveTable items={solicitudes} columns={columns} getKey={(s) => s.id} />
      )}
    </div>
  );
}
