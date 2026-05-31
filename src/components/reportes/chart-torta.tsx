"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SerieDato, FormatoNum } from "@/lib/reportes/tipos";
import { fmt } from "./fmt";

const COLORS = ["#059669", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#14b8a6"];

export function ChartTorta({ datos, formato = "num" }: { datos: SerieDato[]; formato?: FormatoNum }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={datos} dataKey="y" nameKey="etiqueta" cx="50%" cy="50%" outerRadius={90} label={(e) => (e as unknown as { etiqueta?: string }).etiqueta}>
          {datos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => fmt(Number(v), formato)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
