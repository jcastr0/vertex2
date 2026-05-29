import type { Metadata } from "next";
import { getSesion } from "@/lib/auth/cookies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  Wallet,
  ArrowUpRight,
  CircleDashed,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Vertex" };

const KPIS = [
  { label: "Ventas del mes", valor: "—", icon: TrendingUp, hint: "Disponible en Fase 7" },
  { label: "Compras del mes", valor: "—", icon: ShoppingCart, hint: "Disponible en Fase 7" },
  { label: "Inventario valorizado", valor: "—", icon: Boxes, hint: "Disponible en Fase 7" },
  { label: "Cartera por cobrar", valor: "—", icon: Wallet, hint: "Disponible en Fase 7" },
];

const FASES = [
  { n: 0, t: "Cimientos (Next.js, Supabase, Drizzle, UI)", done: true },
  { n: 1, t: "Núcleo (auth, multiempresa, esquema, auditoría)", done: true },
  { n: 2, t: "Maestros (bodegas, terceros)", done: true },
  { n: 3, t: "Productos y unidades", done: false },
  { n: 4, t: "Compras e inventario", done: false },
  { n: 5, t: "Ventas y facturación", done: false },
  { n: 6, t: "Cartera (pagos y recaudos)", done: false },
  { n: 7, t: "Reportes y dashboard", done: false },
  { n: 8, t: "Manuales", done: false },
];

export default async function DashboardPage() {
  const sesion = await getSesion();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Hola, {sesion?.nombre?.split(" ")[0] ?? "bienvenido"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Esta es la base de Vertex 2. Los indicadores se activan al avanzar las fases de migración.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="relative overflow-hidden">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="tabular text-3xl font-semibold">{k.valor}</div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="size-3" />
                  {k.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
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
                <span className="tabular text-xs text-muted-foreground">
                  Fase {f.n}
                </span>
                <span className={f.done ? "" : "text-muted-foreground"}>{f.t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
