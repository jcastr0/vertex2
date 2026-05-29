import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { listarBodegas } from "@/lib/services/bodegas";
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
import { BodegaRowActions } from "./bodega-row-actions";
import { Plus, Warehouse } from "lucide-react";

export const metadata: Metadata = { title: "Bodegas — Vertex" };

export default async function BodegasPage() {
  const sesion = await requirePermiso("bodegas.ver");
  const { empresaId } = await requireEmpresa();
  const bodegas = await listarBodegas(empresaId);

  const puedeCrear = puede(sesion.rol, "bodegas.crear");
  const puedeEditar = puede(sesion.rol, "bodegas.editar");
  const puedeEliminar = puede(sesion.rol, "bodegas.eliminar");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bodegas" description="Almacenes físicos de la empresa.">
        {puedeCrear && (
          <Link href="/bodegas/nueva" className={buttonVariants()}>
            <Plus className="size-4" /> Nueva bodega
          </Link>
        )}
      </PageHeader>

      {bodegas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Warehouse className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">Aún no hay bodegas</p>
          <p className="text-sm text-muted-foreground">
            Crea la primera bodega para empezar a gestionar inventario.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bodegas.map((b) => (
                <TableRow key={b.id} className={b.activo ? "" : "opacity-60"}>
                  <TableCell className="tabular font-medium">{b.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {b.nombre}
                      {b.esPrincipal && (
                        <Badge variant="secondary" className="font-normal">
                          Principal
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.responsable ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.activo ? "default" : "outline"} className="font-normal">
                      {b.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <BodegaRowActions
                        id={b.id}
                        nombre={b.nombre}
                        activo={b.activo}
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
