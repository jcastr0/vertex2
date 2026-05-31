import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { getPermisos } from "@/lib/auth/permisos";
import { puede } from "@/lib/auth/roles";
import { listarCuentasPropias } from "@/lib/services/tesoreria";
import { listarBancosAdmin } from "@/lib/services/bancos";
import { filtrarPaginar, parsePage } from "@/lib/domain/listado";
import { PageHeader } from "@/components/page-header";
import { ListaFiltrable } from "@/components/lista-filtrable";
import { type Columna } from "@/components/responsive-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CuentaRowActions } from "./cuenta-row-actions";
import { BancosPanel } from "./bancos-panel";
import { Plus, Landmark, Calculator } from "lucide-react";

export const metadata: Metadata = { title: "Tesorería — Vertex" };
const PAGE_SIZE = 10;
const money = (n: number) => "$" + n.toLocaleString("es-CO");
type Fila = Awaited<ReturnType<typeof listarCuentasPropias>>[number];
const TIPO_LABEL: Record<string, string> = { ahorros: "Ahorros", corriente: "Corriente", caja: "Caja" };

export default async function TesoreriaPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermiso("tesoreria.ver");
  const { empresaId } = await requireEmpresa();
  const permisos = await getPermisos();
  const { q = "", page: pageRaw } = await searchParams;
  const [todas, bancos] = await Promise.all([listarCuentasPropias(empresaId), listarBancosAdmin()]);
  const { items, total, page } = filtrarPaginar(todas, { q, page: parsePage(pageRaw), pageSize: PAGE_SIZE, texto: (c) => `${c.nombre} ${c.banco ?? ""}` });
  const puedeCrear = puede(permisos, "tesoreria.crear");
  const puedeEditar = puede(permisos, "tesoreria.editar");

  const columnas: Columna<Fila>[] = [
    { header: "Cuenta", primary: true, cell: (c) => c.nombre },
    { header: "Tipo", cell: (c) => TIPO_LABEL[c.tipo] ?? c.tipo },
    { header: "Banco", cell: (c) => c.banco ?? "—" },
    { header: "Saldo", className: "text-right", cell: (c) => <span className="tabular font-medium">{money(c.saldo)}</span> },
    { header: "Estado", cell: (c) => <Badge variant={c.activa ? "default" : "outline"} className="font-normal">{c.activa ? "Activa" : "Inactiva"}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Tesorería" description="Cuentas propias, su saldo en vivo y el catálogo de bancos.">
        <Link href="/tesoreria/cierre" className={buttonVariants({ variant: "outline" })}>
          <Calculator className="size-4" /> Cierre de caja
        </Link>
        {puedeCrear && (
          <Link href="/tesoreria/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva cuenta
          </Link>
        )}
      </PageHeader>

      <Tabs defaultValue="cuentas">
        <TabsList>
          <TabsTrigger value="cuentas">Cuentas</TabsTrigger>
          <TabsTrigger value="bancos">
            Bancos
            <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">{bancos.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuentas">
          <ListaFiltrable
            base="/tesoreria"
            q={q}
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            items={items}
            getKey={(c) => c.id}
            rowClassName={(c) => (c.activa ? "" : "opacity-60")}
            columns={columnas}
            searchPlaceholder="Buscar cuenta…"
            hayDatos={todas.length > 0}
            vacio={{ icon: Landmark, titulo: "Aún no hay cuentas", texto: "Registra las cuentas bancarias y cajas de la empresa." }}
            actions={(c) => <CuentaRowActions id={c.id} puedeEditar={puedeEditar} />}
          />
        </TabsContent>

        <TabsContent value="bancos">
          <BancosPanel
            bancos={bancos.map((b) => ({ id: b.id, nombre: b.nombre, tipo: b.tipo, activo: b.activo }))}
            puedeCrear={puedeCrear}
            puedeEditar={puedeEditar}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
