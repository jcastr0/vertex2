import type { Metadata } from "next";
import Link from "next/link";
import { requireSesion } from "@/lib/auth/guard";
import { empresaActivaId } from "@/lib/auth/empresa";
import { kpis, stockBajo, cxcVencidas } from "@/lib/services/reportes";
import { rangoMes } from "@/lib/domain/periodo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  Wallet,
  HandCoins,
  PiggyBank,
  AlertTriangle,
  CircleDashed,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Vertex" };

const money = (n: number) => "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const FASES = [
  { n: 0, t: "Cimientos", done: true },
  { n: 1, t: "Núcleo (auth, multiempresa, auditoría)", done: true },
  { n: 2, t: "Maestros (bodegas, terceros)", done: true },
  { n: 3, t: "Productos y unidades", done: true },
  { n: 4, t: "Compras e inventario", done: true },
  { n: 5, t: "Ventas y facturación", done: true },
  { n: 6, t: "Cartera (pagos y recaudos)", done: true },
  { n: 7, t: "Reportes y dashboard", done: true },
  { n: 8, t: "Manuales", done: false },
];

export default async function DashboardPage() {
  const sesion = await requireSesion();
  const empresaId = await empresaActivaId(sesion);

  const now = new Date();
  const { desde, hasta } = rangoMes(now.getFullYear(), now.getMonth());
  const hoy = now.toISOString().slice(0, 10);

  const datos = empresaId
    ? await Promise.all([kpis(empresaId, desde, hasta), stockBajo(empresaId), cxcVencidas(empresaId, hoy)])
    : null;
  const k = datos?.[0] ?? { ventas: 0, compras: 0, utilidad: 0, inventario: 0, porCobrar: 0, porPagar: 0 };
  const alertaStock = datos?.[1] ?? [];
  const alertaCxc = datos?.[2] ?? [];

  const KPIS = [
    { label: `Ventas de ${MESES[now.getMonth()]}`, valor: money(k.ventas), icon: TrendingUp, href: "/facturas" },
    { label: `Compras de ${MESES[now.getMonth()]}`, valor: money(k.compras), icon: ShoppingCart, href: "/pedidos" },
    { label: "Utilidad bruta del mes", valor: money(k.utilidad), icon: PiggyBank, href: "/facturas" },
    { label: "Inventario valorizado", valor: money(k.inventario), icon: Boxes, href: "/inventario" },
    { label: "Por cobrar", valor: money(k.porCobrar), icon: HandCoins, href: "/cuentas-cobrar" },
    { label: "Por pagar", valor: money(k.porPagar), icon: Wallet, href: "/cuentas-pagar" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hola, {sesion.nombre.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">Resumen de la operación al día de hoy.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <Icon className="size-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="tabular text-2xl font-semibold">{kpi.valor}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" /> Stock bajo ({alertaStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertaStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo en orden.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {alertaStock.slice(0, 5).map((s) => (
                  <li key={`${s.productoId}-${s.bodega}`} className="flex justify-between gap-2">
                    <Link href={`/inventario/${s.productoId}`} className="truncate text-primary hover:underline">
                      {s.producto}
                    </Link>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {Number(s.cantidad)} / mín {Number(s.minimo)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" /> Cartera vencida ({alertaCxc.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertaCxc.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cuentas vencidas.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {alertaCxc.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">{c.cliente}</span>
                    <span className="tabular shrink-0 text-destructive">{money(Number(c.saldo))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roadmap de migración</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {FASES.map((f) => (
              <li key={f.n} className="flex items-center gap-3 text-sm">
                {f.done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className="tabular text-xs text-muted-foreground">Fase {f.n}</span>
                <span className={f.done ? "" : "text-muted-foreground"}>{f.t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
