import type { Metadata } from "next";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { botActivo, mensajeNoRegistrado } from "@/lib/services/configuracion";
import { PageHeader } from "@/components/page-header";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configuración — Vertex" };

export default async function ConfiguracionPage() {
  await requirePermiso("configuracion.ver");
  const { empresaId } = await requireEmpresa();
  const [activo, mensaje] = await Promise.all([botActivo(empresaId), mensajeNoRegistrado(empresaId)]);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Configuración" description="Ajustes del asistente de pedidos para esta empresa." />
      <ConfigForm botActivo={activo} mensaje={mensaje} />
    </div>
  );
}
