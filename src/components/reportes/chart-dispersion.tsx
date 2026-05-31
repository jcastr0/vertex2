"use client";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

export function ChartDispersion({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" dataKey="x" name="x" tick={{ fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name="y" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v), formato)} width={64} />
        <Tooltip formatter={(v) => fmt(Number(v), formato)} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={datos} fill="#059669" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
