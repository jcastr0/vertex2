"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearNotaAction, type NotaState } from "./actions";
import { TIPOS_NOTA } from "@/lib/domain/nota-inventario";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { AlertCircle, Loader2 } from "lucide-react";

interface Opt { id: number; nombre: string }
interface Prod { id: number; nombre: string; sku: string }

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Registrar nota
    </Button>
  );
}

export function NotaForm({ bodegas, productos }: { bodegas: Opt[]; productos: Prod[] }) {
  const [state, action] = useActionState<NotaState, FormData>(crearNotaAction, {});

  return (
    <form action={action} className="max-w-2xl space-y-6">
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Bodega" required>
          <SearchSelect name="bodegaId" placeholder="Selecciona…" options={bodegas.map((b) => ({ value: String(b.id), label: b.nombre }))} />
        </Field>
        <Field label="Producto" required>
          <SearchSelect name="productoId" placeholder="Buscar producto…" searchPlaceholder="Nombre o SKU…" options={productos.map((p) => ({ value: String(p.id), label: p.nombre, hint: `(${p.sku})` }))} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de ajuste" required>
          <SearchSelect name="tipo" placeholder="Selecciona…" options={TIPOS_NOTA.map((t) => ({ value: t.value, label: t.label }))} />
        </Field>
        <Field label="Cantidad" required hint="En unidad base del producto.">
          <Input name="cantidad" type="number" min="0" step="0.0001" required />
        </Field>
      </div>

      <Field label="Motivo" required>
        <Textarea name="motivo" rows={3} required />
      </Field>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/notas-inventario" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
