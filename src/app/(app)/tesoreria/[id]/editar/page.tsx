import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseId } from "@/lib/route-params";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { obtenerCuentaPropia } from "@/lib/services/tesoreria";
import { listarBancos } from "@/lib/services/bancos";
import { PageHeader } from "@/components/page-header";
import { CuentaForm } from "../../cuenta-form";

export const metadata: Metadata = { title: "Editar cuenta — Vertex" };

export default async function EditarCuentaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermiso("tesoreria.editar");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const cuenta = await obtenerCuentaPropia(empresaId, parseId(id));
  if (!cuenta) notFound();
  const bancos = await listarBancos();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Editar cuenta" description={cuenta.nombre} />
      <CuentaForm bancos={bancos} cuenta={{ id: cuenta.id, nombre: cuenta.nombre, tipo: cuenta.tipo, banco: cuenta.banco, numeroCuenta: cuenta.numeroCuenta, titularNit: cuenta.titularNit, titularNombre: cuenta.titularNombre, saldoInicial: cuenta.saldoInicial }} />
    </div>
  );
}
