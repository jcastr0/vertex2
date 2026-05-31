"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { FileText, HandCoins, Download } from "lucide-react";

/** Rango de fechas + descargas CSV de factura electrónica para el contador. */
export function ExportFE({ desdeInicial, hastaInicial }: { desdeInicial: string; hastaInicial: string }) {
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const qs = `?desde=${desde}&hasta=${hasta}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="fe-desde" className="text-xs text-muted-foreground">Desde</Label>
          <Input id="fe-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-auto" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fe-hasta" className="text-xs text-muted-foreground">Hasta</Label>
          <Input id="fe-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-auto" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`/reportes/exportar/fe-ventas${qs}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <FileText className="size-4" /> Ventas F.E. <Download className="size-3.5 opacity-60" />
        </a>
        <a href={`/reportes/exportar/fe-compras${qs}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <HandCoins className="size-4" /> Compras F.E. y retenciones <Download className="size-3.5 opacity-60" />
        </a>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Solo se exporta lo marcado como electrónico: ventas para emitir y compras (con retenciones) para el contador.
      </p>
    </div>
  );
}
