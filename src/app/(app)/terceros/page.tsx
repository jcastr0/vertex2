import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarTerceros } from "@/lib/services/terceros";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TerceroRowActions } from "./tercero-row-actions";
import { Plus, Contact } from "lucide-react";

export const metadata: Metadata = { title: "Terceros — Vertex" };

const ETIQUETA_TIPO: Record<string, string> = {
  proveedor: "Proveedor",
  cliente: "Cliente",
  ambos: "Ambos",
};

export default async function TercerosPage() {
  const sesion = await requirePermiso("terceros.ver");
  const { empresaId } = await requireEmpresa();
  const terceros = await listarTerceros(empresaId);

  const puedeCrear = puede(sesion.rol, "terceros.crear");
  const puedeEditar = puede(sesion.rol, "terceros.editar");
  const puedeEliminar = puede(sesion.rol, "terceros.eliminar");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Terceros" description="Proveedores y clientes de la empresa.">
        {puedeCrear && (
          <Link href="/terceros/nuevo" className={buttonVariants()}>
            <Plus className="size-4" /> Nuevo tercero
          </Link>
        )}
      </PageHeader>

      {terceros.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Contact className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay terceros</p>
          <p className="text-sm text-muted-foreground">
            Registra proveedores y clientes para usarlos en compras y ventas.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Razón social</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {terceros.map((t) => (
                <TableRow key={t.id} className={t.activo ? "" : "opacity-60"}>
                  <TableCell className="tabular font-medium">{t.codigo}</TableCell>
                  <TableCell>
                    <div>{t.razonSocial}</div>
                    {t.nombreComercial && (
                      <div className="text-xs text-muted-foreground">{t.nombreComercial}</div>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {t.identificacion}
                    {t.digitoVerificacion ? `-${t.digitoVerificacion}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {ETIQUETA_TIPO[t.tipo] ?? t.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? "default" : "outline"} className="font-normal">
                      {t.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <TerceroRowActions
                        id={t.id}
                        nombre={t.razonSocial}
                        activo={t.activo}
                        puedeEditar={puedeEditar}
                        puedeEliminar={puedeEliminar}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
