import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermiso, requireEmpresa } from "@/lib/auth/guard";
import { puede } from "@/lib/auth/roles";
import { obtenerTercero } from "@/lib/services/terceros";
import { listarRecaudadores } from "@/lib/services/usuarios";
import { listarBeneficiarios } from "@/lib/services/beneficiarios";
import { listarBancos } from "@/lib/services/bancos";
import { resumenCliente, resumenProveedor } from "@/lib/services/relacion";
import { facturasDeCliente } from "@/lib/services/facturas";
import { pedidosDeProveedor } from "@/lib/services/pedidos";
import { BeneficiariosPanel } from "../beneficiarios-panel";
import { PageHeader } from "@/components/page-header";
import { FormSection } from "@/components/ui/form-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Pencil, HandCoins, ShoppingBag, CalendarClock, Wallet } from "lucide-react";

export const metadata: Metadata = { title: "Tercero — Vertex" };

const money = (s: string | null) => "$" + Number(s ?? 0).toLocaleString("es-CO");
const TIPO: Record<string, string> = { cliente: "Cliente", proveedor: "Proveedor", ambos: "Cliente y proveedor" };
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const fmtFecha = (s: string | null) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function Tarjeta({
  icon: Icon,
  label,
  valor,
  tono = "neutro",
  pie,
}: {
  icon: typeof HandCoins;
  label: string;
  valor: string;
  tono?: "neutro" | "activo" | "alerta";
  pie?: string;
}) {
  const caja =
    tono === "alerta"
      ? "border-destructive/30 bg-destructive/[0.04]"
      : tono === "activo"
        ? "border-primary/30 bg-primary/[0.04]"
        : "border-border bg-card";
  const ic = tono === "alerta" ? "text-destructive" : tono === "activo" ? "text-primary" : "text-muted-foreground";
  return (
    <div className={`rounded-2xl border p-4 ${caja}`}>
      <div className="mb-1 flex items-center gap-2">
        <Icon className={`size-4 shrink-0 ${ic}`} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="tabular text-lg font-bold tracking-tight">{valor}</p>
      {pie && <p className="mt-0.5 text-xs text-muted-foreground">{pie}</p>}
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
  const esCliente = t.tipo === "cliente" || t.tipo === "ambos";
  const recaudadores = t.recaudadorId ? await listarRecaudadores(empresaId) : [];
  const recaudador = recaudadores.find((r) => r.id === t.recaudadorId)?.nombre ?? null;
  const beneficiarios = esProveedor ? (await listarBeneficiarios(empresaId, t.id)).filter((b) => b.activa) : [];
  const bancos = esProveedor ? await listarBancos() : [];
  const puedeEditar = puede(sesion.rol, "terceros.editar");

  const hoy = new Date().toISOString().slice(0, 10);
  const desdeMes = hoy.slice(0, 8) + "01";
  const [resCli, resProv, facturasCli, pedidosProv] = await Promise.all([
    esCliente ? resumenCliente(empresaId, t.id, hoy, desdeMes) : null,
    esProveedor ? resumenProveedor(empresaId, t.id, hoy, desdeMes) : null,
    esCliente ? facturasDeCliente(empresaId, t.id) : [],
    esProveedor ? pedidosDeProveedor(empresaId, t.id) : [],
  ]);

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

      {/* Resumen de la relación comercial */}
      {(resCli || resProv) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resCli && (
            <>
              <Tarjeta icon={HandCoins} label="Te debe" valor={money(String(resCli.debe))} tono={resCli.vencido ? "alerta" : resCli.debe > 0 ? "activo" : "neutro"} pie={resCli.vencido ? "Tiene vencido" : resCli.docsAbiertos > 0 ? `${resCli.docsAbiertos} factura(s)` : "Al día"} />
              <Tarjeta icon={ShoppingBag} label="Te ha comprado" valor={money(String(resCli.haComprado))} />
              <Tarjeta icon={Wallet} label="Este mes" valor={money(String(resCli.mes))} />
              <Tarjeta icon={CalendarClock} label="Última compra" valor={fmtFecha(resCli.ultima)} />
            </>
          )}
          {resProv && (
            <>
              <Tarjeta icon={HandCoins} label="Le debes" valor={money(String(resProv.leDebes))} tono={resProv.vencido ? "alerta" : resProv.leDebes > 0 ? "activo" : "neutro"} pie={resProv.vencido ? "Hay vencido" : resProv.docsAbiertos > 0 ? `${resProv.docsAbiertos} factura(s)` : "Al día"} />
              <Tarjeta icon={ShoppingBag} label="Le has comprado" valor={money(String(resProv.leHasComprado))} />
              <Tarjeta icon={Wallet} label="Este mes" valor={money(String(resProv.mes))} />
              <Tarjeta icon={CalendarClock} label="Última compra" valor={fmtFecha(resProv.ultima)} />
            </>
          )}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="movimiento">Movimiento</TabsTrigger>
          {esProveedor && (
            <TabsTrigger value="cuentas">
              Cuentas de pago
              {beneficiarios.length > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">{beneficiarios.length}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-4">
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

        {t.observaciones && (
          <FormSection title="Observaciones">
            <p className="whitespace-pre-line text-sm">{t.observaciones}</p>
          </FormSection>
        )}
        </TabsContent>

        <TabsContent value="movimiento" className="space-y-4">
          {esCliente && (
            <FormSection title="Facturas del cliente" description="Sus ventas; primero las que tienen saldo.">
              {facturasCli.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no le has vendido.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {facturasCli.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/facturas/${f.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        <span className="font-medium">{f.numero}</span>
                        <span className="text-muted-foreground"> · {fmtFecha(f.fecha)} · {f.tipoVenta}</span>
                        {f.esElectronica && <Badge variant="secondary" className="ml-2 font-normal">F.E.</Badge>}
                      </Link>
                      <span className="tabular shrink-0 text-right">{money(String(f.total))}</span>
                      {f.saldo > 0 && <span className="tabular shrink-0 text-right text-destructive" title="Saldo pendiente">{money(String(f.saldo))}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          )}
          {esProveedor && (
            <FormSection title="Compras al proveedor" description="Pedidos hechos a este proveedor.">
              {pedidosProv.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no le has comprado.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {pedidosProv.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Link href={`/pedidos/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        <span className="font-medium">{p.numero}</span>
                        <span className="text-muted-foreground"> · {fmtFecha(p.fecha)}</span>
                        <Badge variant="outline" className="ml-2 font-normal capitalize">{p.estado}</Badge>
                      </Link>
                      <span className="tabular shrink-0 text-right">{money(String(p.total))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </FormSection>
          )}
        </TabsContent>

        {esProveedor && (
          <TabsContent value="cuentas">
            {puedeEditar ? (
              <BeneficiariosPanel terceroId={t.id} terceroNit={t.identificacion} terceroNombre={t.razonSocial} cuentas={beneficiarios} bancos={bancos} />
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
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
