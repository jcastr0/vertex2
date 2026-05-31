"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/** Botón que dispara la impresión del navegador (vista actual). */
export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" /> {label}
    </Button>
  );
}
