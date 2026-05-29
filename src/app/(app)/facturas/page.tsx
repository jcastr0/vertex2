import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarFacturas } from "@/lib/services/facturas";
import { PageHeader } from "@/components/page-header";
import { ResponsiveTable, type Columna } from "@/components/responsive-table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt } from "lucide-react";

export const metadata: Metadata = { title: "Facturas — Vertex" };

type Fila = Awaited<ReturnType<typeof listarFacturas>>[number];
const money = (s: string) => "$" + Number(s).toLocaleString("es-CO");

export default async function FacturasPage() {
  const sesion = await requirePermiso("facturas.ver");
  const { empresaId } = await requireEmpresa();
  const filas = await listarFacturas(empresaId);
  const puedeCrear = puede(sesion.rol, "facturas.crear");

  const columnas: Columna<Fila>[] = [
    {
      header: "Número",
      primary: true,
      cell: (f) => (
        <Link href={`/facturas/${f.factura.id}`} className="tabular font-medium text-primary hover:underline">
          {f.factura.numero}
        </Link>
      ),
    },
    { header: "Cliente", cell: (f) => f.cliente },
    { header: "Fecha", cell: (f) => f.factura.fecha },
    {
      header: "Tipo",
      cell: (f) => (
        <Badge variant={f.factura.tipoVenta === "credito" ? "secondary" : "outline"} className="font-normal capitalize">
          {f.factura.tipoVenta}
        </Badge>
      ),
    },
    { header: "Total", className: "text-right", cell: (f) => <span className="tabular">{money(f.factura.total)}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Facturas" description="Ventas registradas.">
        {puedeCrear && (
          <Link href="/facturas/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Vender
          </Link>
        )}
      </PageHeader>

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Receipt className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay ventas</p>
          <p className="text-sm text-muted-foreground">Toca “Vender” para registrar la primera.</p>
        </div>
      ) : (
        <ResponsiveTable items={filas} getKey={(f) => f.factura.id} columns={columnas} />
      )}
    </div>
  );
}
