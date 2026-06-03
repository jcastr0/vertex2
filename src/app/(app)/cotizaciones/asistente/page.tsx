import type { Metadata } from "next";
import Link from "next/link";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { listarTerceros } from "@/lib/services/terceros";
import { botActivo, mensajeNoRegistrado } from "@/lib/services/configuracion";
import { PageHeader } from "@/components/page-header";
import { ChatAsistente } from "../chat-asistente";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Asistente de pedidos — Vertex" };

export default async function AsistentePage() {
  await requirePermiso("cotizaciones.crear");
  const { empresaId } = await requireEmpresa();
  const [activo, terceros, mensaje] = await Promise.all([
    botActivo(empresaId),
    listarTerceros(empresaId),
    mensajeNoRegistrado(empresaId),
  ]);

  if (!activo) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Asistente de pedidos" description="Chatbot de pedidos de clientes." />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-medium">El asistente está desactivado para esta empresa.</p>
          <p className="text-sm text-muted-foreground">Actívalo en Configuración.</p>
          <Link href="/configuracion" className={buttonVariants({ variant: "outline", size: "sm" })}>Ir a Configuración</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Asistente de pedidos" description="Chat de prueba: escribe como el cliente; el bot arma la cotización." />
      <ChatAsistente
        clientes={terceros.filter((t) => t.activo && (t.tipo === "cliente" || t.tipo === "ambos")).map((t) => ({ id: t.id, nombre: t.razonSocial }))}
        mensajeNoRegistrado={mensaje}
      />
    </div>
  );
}
