"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { agregarUnidadAction, eliminarUnidadAction, type ProductoState } from "./actions";
import { precioCalculado } from "@/lib/domain/conversion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface Unidad { id: number; nombre: string; abreviatura: string }
interface UnidadProducto {
  id: number;
  unidadNombre: string;
  unidadAbreviatura: string;
  factorConversion: string;
  precioVenta: string | null;
  esPrecioCalculado: boolean;
  permiteCompra: boolean;
  permiteVenta: boolean;
}
interface Props {
  productoId: number;
  unidadBaseAbreviatura: string;
  unidades: Unidad[];
  presentaciones: UnidadProducto[];
}

function Agregar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Agregar
    </Button>
  );
}

export function UnidadesSection({ productoId, unidadBaseAbreviatura, unidades, presentaciones }: Props) {
  const router = useRouter();
  const [state, action] = useActionState<ProductoState, FormData>(agregarUnidadAction, {});
  const [factor, setFactor] = useState("");
  const [esCalculado, setEsCalculado] = useState(true);
  const [pending, startTransition] = useTransition();

  // Precio base de referencia: la presentación con factor 1, si existe.
  const base = presentaciones.find((p) => Number(p.factorConversion) === 1 && p.precioVenta);
  const precioBase = base?.precioVenta ? Number(base.precioVenta) : null;
  const sugerido =
    precioBase != null && factor && Number(factor) > 0
      ? precioCalculado(precioBase, Number(factor))
      : null;

  function eliminar(id: number) {
    startTransition(async () => {
      await eliminarUnidadAction(id, productoId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Presentaciones / unidades</h3>
        <p className="text-sm text-muted-foreground">
          Define cómo se compra y vende este producto. El <em>factor</em> indica cuántas unidades
          base ({unidadBaseAbreviatura}) equivale 1 unidad de la presentación.
        </p>
      </div>

      {presentaciones.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Factor</TableHead>
                <TableHead className="text-right">Precio venta</TableHead>
                <TableHead>Compra/Venta</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentaciones.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.unidadNombre} <span className="text-muted-foreground">({p.unidadAbreviatura})</span>
                  </TableCell>
                  <TableCell className="tabular text-right">{Number(p.factorConversion)}</TableCell>
                  <TableCell className="tabular text-right">
                    {p.precioVenta ? `$${Number(p.precioVenta).toLocaleString("es-CO")}` : "—"}
                    {p.esPrecioCalculado && (
                      <span className="ml-1 text-xs text-muted-foreground">(calc.)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[p.permiteCompra && "Compra", p.permiteVenta && "Venta"].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => eliminar(p.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <form action={action} className="rounded-lg border border-dashed border-border p-4">
        <input type="hidden" name="productoId" value={productoId} />
        <input type="hidden" name="esPrecioCalculado" value={esCalculado ? "true" : "false"} />

        {state.error && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        )}

        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr_auto]">
          <div className="space-y-2">
            <Label>Unidad</Label>
            <Select name="unidadId">
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.nombre} ({u.abreviatura})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Factor</Label>
            <Input
              name="factorConversion"
              type="number"
              min="0"
              step="0.000001"
              className="w-28"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Precio venta {sugerido != null && <span className="text-xs text-muted-foreground">(sug. ${sugerido.toLocaleString("es-CO")})</span>}
            </Label>
            <Input name="precioVenta" type="number" min="0" step="0.01" />
          </div>
          <Agregar />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Switch id="calc" checked={esCalculado} onCheckedChange={setEsCalculado} />
          <Label htmlFor="calc" className="cursor-pointer text-sm font-normal text-muted-foreground">
            Precio calculado (proporcional al factor)
          </Label>
        </div>
      </form>
    </div>
  );
}
