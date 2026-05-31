"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartBarras({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v), formato)} width={64} />
        <Tooltip formatter={(v) => fmt(Number(v), formato)} />
        <Bar dataKey="y" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
