"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearNotaAction, proveedorSugeridoAction, type NotaState } from "./actions";
import { TIPOS_NOTA } from "@/lib/domain/nota-inventario";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string }

// Reorder tipos so the most common everyday operations appear first
const TIPOS_NOTA_ORDENADOS = [
  // faltante / merma / daño (los más frecuentes para novedades proveedor)
  TIPOS_NOTA.find((t) => t.value === "diferencia_negativa")!,
  TIPOS_NOTA.find((t) => t.value === "merma")!,
  TIPOS_NOTA.find((t) => t.value === "dano")!,
  // sobrante
  TIPOS_NOTA.find((t) => t.value === "diferencia_positiva")!,
  // ajustes explícitos
  TIPOS_NOTA.find((t) => t.value === "ajuste_entrada")!,
  TIPOS_NOTA.find((t) => t.value === "ajuste_salida")!,
];

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Registrar nota
    </Button>
  );
}

export function NotaForm({
  bodegas,
  productos,
  proveedores,
}: {
  bodegas: Opt[];
  productos: Prod[];
  proveedores: Opt[];
}) {
  const [state, action] = useActionState<NotaState, FormData>(crearNotaAction, {});

  const [productoId, setProductoId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [, startTransition] = useTransition();

  function handleProductoChange(value: string) {
    setProductoId(value);
    const pid = Number(value);
    if (!pid) {
      setProveedorId("");
      return;
    }
    startTransition(async () => {
      const sugerido = await proveedorSugeridoAction(pid);
      if (sugerido) {
        setProveedorId(String(sugerido));
      } else {
        setProveedorId("");
      }
    });
  }

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection title="Datos de la nota" description="Bodega, producto afectado, tipo de novedad y motivo.">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bodega" required>
              <SearchSelect
                name="bodegaId"
                placeholder="Selecciona…"
                options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))}
              />
            </Field>
            <Field label="Producto" required>
              <SearchSelect
                name="productoId"
                placeholder="Buscar producto…"
                searchPlaceholder="Nombre o SKU…"
                options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))}
                value={productoId}
                onValueChange={handleProductoChange}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tipo de novedad" required hint="Indica qué pasó con el producto.">
              <SearchSelect
                name="tipo"
                placeholder="¿Qué pasó?"
                options={TIPOS_NOTA_ORDENADOS.map((t) => ({ value: t.value, label: t.label }))}
              />
            </Field>
            <Field label="Cantidad" required hint="En unidad base del producto.">
              <Input name="cantidad" type="number" min="0" step="0.0001" required />
            </Field>
          </div>

          <Field
            label="Proveedor"
            hint="Se sugiere el último proveedor que surtió este producto. Puedes cambiarlo o dejarlo vacío."
          >
            <SearchSelect
              name="proveedorId"
              placeholder="Proveedor (opcional)…"
              searchPlaceholder="Buscar proveedor…"
              options={proveedores.map((p) => ({ value: String(p.id), label: p.nombre }))}
              value={proveedorId}
              onValueChange={setProveedorId}
            />
          </Field>

          <Field label="Motivo" required>
            <Textarea name="motivo" rows={3} required />
          </Field>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/notas-inventario" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
