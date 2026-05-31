import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { clientesParaRuta } from "@/lib/services/ruta-recaudo";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { PageHeader } from "@/components/page-header";
import { AsignarRuta } from "../asignar-ruta";

export const metadata: Metadata = { title: "Programar ruta — Vertex" };

export default async function AsignarRutaPage() {
  await requirePermiso("ruta_recaudo.editar");
  const { empresaId } = await requireEmpresa();
  const [clientes, recaudadores] = await Promise.all([
    clientesParaRuta(empresaId),
    listarRecaudadores(empresaId),
  ]);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        title="Programar ruta"
        description="Asigna quién cobra y qué día. Marca clientes y aplícales el recaudador y el día — puedes reprogramar cuando quieras."
      />
      {recaudadores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Primero marca a alguien como <strong>recaudador</strong> en Administración → Usuarios.
        </div>
      ) : (
        <AsignarRuta
          clientes={clientes}
          recaudadores={recaudadores}
        />
      )}
    </div>
  );
}
