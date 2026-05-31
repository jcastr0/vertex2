"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartBarras({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="etiqueta"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={74}
          tickFormatter={(v: string) => (v && v.length > 12 ? v.slice(0, 11) + "…" : v)}
        />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(Number(v), formato)} width={56} />
        <Tooltip formatter={(v) => fmt(Number(v), formato)} />
        <Bar dataKey="y" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
