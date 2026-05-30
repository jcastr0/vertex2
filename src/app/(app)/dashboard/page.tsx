import type { Metadata } from "next";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/guard";
import { empresaActivaId } from "@/lib/auth/empresa";
import { kpis, stockBajo, cxcVencidas, novedadesPorProveedor } from "@/lib/services/reportes";
import { rangoMes } from "@/lib/domain/periodo";
import {
  ShoppingBag,
  HandCoins,
  Truck,
  TrendingUp,
  ArrowRight,
  PackageX,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = { title: "Inicio — Vertex" };

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function InicioPage() {
  const sesion = await requireSesion();
  const empresaId = await empresaActivaId(sesion);

  const now = new Date();
  const { desde, hasta } = rangoMes(now.getFullYear(), now.getMonth());
  const hoy = now.toISOString().slice(0, 10);

  const datos = empresaId
    ? await Promise.all([kpis(empresaId, desde, hasta), stockBajo(empresaId), cxcVencidas(empresaId, hoy), novedadesPorProveedor(empresaId)])
    : null;
  const k = datos?.[0] ?? { ventas: 0, compras: 0, utilidad: 0, inventario: 0, porCobrar: 0, porPagar: 0 };
  const alertaStock = datos?.[1] ?? [];
  const alertaCxc = datos?.[2] ?? [];
  const alertaNovedades = datos?.[3] ?? [];
  const totalNovedades = alertaNovedades.reduce((acc, n) => acc + n.novedades, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hola, {sesion.nombre.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">¿Qué quieres hacer?</p>
      </div>

      {/* Acción estrella */}
      <Link
        href="/facturas/nueva"
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02] p-5 transition-all hover:border-primary/50 hover:shadow-md sm:p-6"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <ShoppingBag className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold tracking-tight">Vender</h3>
          <p className="text-sm text-muted-foreground">Registra una venta —de contado o fiada— en segundos.</p>
        </div>
        <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
      </Link>

      {/* Las otras tareas del día */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TareaCard href="/cuentas-cobrar" icon={HandCoins} titulo="Cobrar" desc="Quién te debe y registrar abonos" dato="Te deben" valor={money(k.porCobrar)} />
        <TareaCard href="/pedidos" icon={Truck} titulo="Comprar y pagar" desc="Pedidos y pagos a proveedores" dato="Debes" valor={money(k.porPagar)} />
        <TareaCard href="/reportes" icon={TrendingUp} titulo="Cómo va el negocio" desc="Ventas, ganancia y existencias" dato={`Ganancia de ${MESES[now.getMonth()]}`} valor={money(k.utilidad)} />
      </div>

      {/* Resumen del mes, en cristiano */}
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <Resumen label={`Vendiste en ${MESES[now.getMonth()]}`} valor={money(k.ventas)} />
        <Resumen label="Mercancía en bodega" valor={money(k.inventario)} />
        <Resumen label={`Compraste en ${MESES[now.getMonth()]}`} valor={money(k.compras)} />
      </div>

      {/* Avisos: solo si hay algo que atender */}
      {(alertaStock.length > 0 || alertaCxc.length > 0 || alertaNovedades.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {alertaStock.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><PackageX className="size-4 text-amber-600" /> Se está acabando</h3>
              <ul className="space-y-1.5 text-sm">
                {alertaStock.slice(0, 5).map((s) => (
                  <li key={`${s.productoId}-${s.bodega}`} className="flex justify-between gap-2">
                    <Link href={`/inventario/${s.productoId}`} className="truncate hover:underline">{s.producto}</Link>
                    <span className="tabular shrink-0 text-muted-foreground">quedan {Number(s.cantidad)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {alertaCxc.length > 0 && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.05] p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><CalendarClock className="size-4 text-destructive" /> Te deben hace rato</h3>
              <ul className="space-y-1.5 text-sm">
                {alertaCxc.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">{c.cliente}</span>
                    <span className="tabular shrink-0 font-medium text-destructive">{money(Number(c.saldo))}</span>
                  </li>
                ))}
              </ul>
              <Link href="/cuentas-cobrar" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ir a cobrar <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
          {alertaNovedades.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <h3 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-amber-600" /> Novedades de proveedores</h3>
              <p className="text-sm text-muted-foreground">
                {totalNovedades} novedad{totalNovedades !== 1 ? "es" : ""} registrada{totalNovedades !== 1 ? "s" : ""} (faltantes, mermas o daños).
              </p>
              <Link href="/reportes" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver detalle <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TareaCard({ href, icon: Icon, titulo, desc, dato, valor }: { href: string; icon: typeof HandCoins; titulo: string; desc: string; dato: string; valor: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-0.5">
        <h3 className="font-semibold tracking-tight">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="mt-auto border-t border-border pt-2.5">
        <p className="text-xs text-muted-foreground">{dato}</p>
        <p className="tabular text-lg font-bold tracking-tight">{valor}</p>
      </div>
    </Link>
  );
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="px-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular text-xl font-bold tracking-tight">{valor}</p>
    </div>
  );
}
