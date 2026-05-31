// src/lib/temas/paletas.ts
export interface Paleta {
  key: string;
  nombre: string;
  familia: string;
  primario: string;
  acento: string;
  sidebar: string;
}

export const PALETAS: Paleta[] = [
  // Verdes
  { key: "esmeralda", nombre: "Esmeralda", familia: "Verdes", primario: "#059669", acento: "#f59e0b", sidebar: "#0b3b2e" },
  { key: "bosque", nombre: "Bosque", familia: "Verdes", primario: "#15803d", acento: "#84cc16", sidebar: "#14271b" },
  { key: "teal", nombre: "Teal", familia: "Verdes", primario: "#0d9488", acento: "#f59e0b", sidebar: "#0c2f2b" },
  // Azules
  { key: "oceano", nombre: "Océano", familia: "Azules", primario: "#0284c7", acento: "#f59e0b", sidebar: "#0b2a3f" },
  { key: "indigo", nombre: "Índigo", familia: "Azules", primario: "#4f46e5", acento: "#f59e0b", sidebar: "#1e1b4b" },
  { key: "cielo", nombre: "Cielo", familia: "Azules", primario: "#0ea5e9", acento: "#f43f5e", sidebar: "#0c2233" },
  // Naranjas / Ámbar
  { key: "mandarina", nombre: "Mandarina", familia: "Naranjas", primario: "#ea580c", acento: "#0d9488", sidebar: "#3a1c0b" },
  { key: "ambar", nombre: "Ámbar", familia: "Naranjas", primario: "#d97706", acento: "#1d4ed8", sidebar: "#3a2a0b" },
  { key: "dorado", nombre: "Dorado", familia: "Naranjas", primario: "#ca8a04", acento: "#0f766e", sidebar: "#2e2407" },
  // Rojos / Vino
  { key: "carmesi", nombre: "Carmesí", familia: "Rojos", primario: "#dc2626", acento: "#f59e0b", sidebar: "#3a1212" },
  { key: "vino", nombre: "Vino", familia: "Rojos", primario: "#9f1239", acento: "#f59e0b", sidebar: "#2e0e1a" },
  { key: "ladrillo", nombre: "Ladrillo", familia: "Rojos", primario: "#b91c1c", acento: "#0d9488", sidebar: "#311111" },
  // Morados
  { key: "violeta", nombre: "Violeta", familia: "Morados", primario: "#7c3aed", acento: "#f59e0b", sidebar: "#241452" },
  { key: "ciruela", nombre: "Ciruela", familia: "Morados", primario: "#9333ea", acento: "#14b8a6", sidebar: "#2a1140" },
  { key: "lavanda", nombre: "Lavanda", familia: "Morados", primario: "#6d28d9", acento: "#ec4899", sidebar: "#221049" },
  // Rosas
  { key: "fucsia", nombre: "Fucsia", familia: "Rosas", primario: "#c026d3", acento: "#f59e0b", sidebar: "#3a1043" },
  { key: "rosa", nombre: "Rosa", familia: "Rosas", primario: "#db2777", acento: "#0d9488", sidebar: "#3a1124" },
  { key: "coral", nombre: "Coral", familia: "Rosas", primario: "#f43f5e", acento: "#0ea5e9", sidebar: "#3a121e" },
  // Neutros
  { key: "grafito", nombre: "Grafito", familia: "Neutros", primario: "#475569", acento: "#f59e0b", sidebar: "#1e293b" },
  { key: "pizarra", nombre: "Pizarra", familia: "Neutros", primario: "#334155", acento: "#10b981", sidebar: "#0f172a" },
  { key: "acero", nombre: "Acero", familia: "Neutros", primario: "#57534e", acento: "#f59e0b", sidebar: "#1c1917" },
  // Tierra
  { key: "cafe", nombre: "Café", familia: "Tierra", primario: "#92400e", acento: "#16a34a", sidebar: "#2a1a0c" },
  { key: "oliva", nombre: "Oliva", familia: "Tierra", primario: "#4d7c0f", acento: "#ea580c", sidebar: "#1f2a0c" },
  { key: "terracota", nombre: "Terracota", familia: "Tierra", primario: "#c2410c", acento: "#0f766e", sidebar: "#2e1a0e" },
];

export function getPaleta(key: string | null | undefined): Paleta | null {
  if (!key) return null;
  return PALETAS.find((p) => p.key === key) ?? null;
}
