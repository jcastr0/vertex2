import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { listarBeneficiarios } from "@/lib/services/beneficiarios";
import { BeneficiariosPanel } from "../beneficiarios-panel";
import { PageHeader } from "@/components/page-header";
import { FormSection } from "@/components/ui/form-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Tercero — Vertex" };

const money = (s: string | null) => "$" + Number(s ?? 0).toLocaleString("es-CO");
const TIPO: Record<string, string> = { cliente: "Cliente", proveedor: "Proveedor", ambos: "Cliente y proveedor" };
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export default async function TerceroPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requirePermiso("terceros.ver");
  const { empresaId } = await requireEmpresa();
  const { id } = await params;
  const t = await obtenerTercero(empresaId, Number(id));
  if (!t) notFound();

  const esProveedor = t.tipo === "proveedor" || t.tipo === "ambos";
  const recaudadores = t.recaudadorId ? await listarRecaudadores(empresaId) : [];
  const recaudador = recaudadores.find((r) => r.id === t.recaudadorId)?.nombre ?? null;
  const beneficiarios = esProveedor ? (await listarBeneficiarios(empresaId, t.id)).filter((b) => b.activa) : [];
  const puedeEditar = puede(sesion.rol, "terceros.editar");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.razonSocial} description={`${TIPO[t.tipo] ?? t.tipo} · ${t.codigo}`}>
        {puedeEditar && (
          <Link href={`/terceros/${t.id}/editar`} className={buttonVariants({ variant: "outline" })}>
            <Pencil className="size-4" /> Editar
          </Link>
        )}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={t.activo ? "default" : "outline"} className="font-normal">{t.activo ? "Activo" : "Inactivo"}</Badge>
        {t.requiereFacturaElectronica && <Badge variant="secondary" className="font-normal">Factura electrónica</Badge>}
        {t.nombreComercial && <span className="text-sm text-muted-foreground">{t.nombreComercial}</span>}
      </div>

      <div className="space-y-4">
        <FormSection title="Identificación">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Dato label="Tipo">{TIPO[t.tipo] ?? t.tipo}</Dato>
            <Dato label="Tipo de persona">{t.tipoPersona === "juridica" ? "Jurídica" : "Natural"}</Dato>
            <Dato label="Código">{t.codigo}</Dato>
            <Dato label="Documento">{t.tipoIdentificacion} {t.identificacion}{t.digitoVerificacion ? `-${t.digitoVerificacion}` : ""}</Dato>
            <Dato label="Razón social">{t.razonSocial}</Dato>
            <Dato label="Nombre comercial">{t.nombreComercial}</Dato>
          </dl>
        </FormSection>

        <FormSection title="Contacto">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Dato label="Email">{t.email}</Dato>
            <Dato label="Teléfono">{t.telefono}</Dato>
            <Dato label="Celular">{t.celular}</Dato>
          </dl>
        </FormSection>

        <FormSection title="Ubicación">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Dato label="Dirección">{t.direccion}</Dato>
            <Dato label="Ciudad">{t.ciudad}</Dato>
            <Dato label="Departamento">{t.departamento}</Dato>
          </dl>
        </FormSection>

        <FormSection title="Condiciones comerciales">
          <dl className="grid gap-5 sm:grid-cols-3">
            <Dato label="Condiciones de pago">{t.condicionesPago}</Dato>
            <Dato label="Días crédito proveedor">{t.diasCreditoProveedor} días</Dato>
            <Dato label="Días crédito cliente">{t.diasCreditoCliente} días</Dato>
            <Dato label="Cupo de crédito">{money(t.cupoCredito)}</Dato>
            <Dato label="Factura electrónica">{t.requiereFacturaElectronica ? "Sí" : "No"}</Dato>
          </dl>
        </FormSection>

        {(recaudador || t.diaCobro) && (
          <FormSection title="Recaudo">
            <dl className="grid gap-5 sm:grid-cols-3">
              <Dato label="Recaudador">{recaudador}</Dato>
              <Dato label="Día de cobro">{t.diaCobro ? DIAS[t.diaCobro] : null}</Dato>
            </dl>
          </FormSection>
        )}

        {esProveedor && (
          puedeEditar ? (
            <BeneficiariosPanel terceroId={t.id} terceroNit={t.identificacion} terceroNombre={t.razonSocial} cuentas={beneficiarios} />
          ) : (
            <FormSection title="Cuentas de pago" description="Cuentas a las que se le paga a este proveedor.">
              {beneficiarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cuentas registradas.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {beneficiarios.map((b) => (
                    <li key={b.id} className="py-2 first:pt-0 last:pb-0">
                      <span className="font-medium">{b.titularNombre}</span>
                      <span className="text-muted-foreground"> · {b.banco} {b.numeroCuenta} · NIT {b.titularNit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          )
        )}

        {t.observaciones && (
          <FormSection title="Observaciones">
            <p className="whitespace-pre-line text-sm">{t.observaciones}</p>
          </FormSection>
        )}
      </div>
    </div>
  );
}
