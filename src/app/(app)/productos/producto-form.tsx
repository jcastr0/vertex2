"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarProductoAction, type ProductoState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2 } from "lucide-react";

interface Opcion { id: number; nombre: string }
interface Unidad { id: number; nombre: string; abreviatura: string }
interface Props {
  producto?: {
    id: number;
    sku: string;
    nombre: string;
    descripcion: string | null;
    categoriaId: number | null;
    unidadBaseId: number;
    precioCompraSugerido: string | null;
    stockMinimo: string;
    stockMaximo: string | null;
    clasificacionAbc: string | null;
  };
  categorias: Opcion[];
  unidades: Unidad[];
}

function Guardar({ nuevo }: { nuevo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {nuevo ? "Crear y agregar presentaciones" : "Guardar"}
    </Button>
  );
}

const SIN_CAT = "0";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ProductoForm({ producto, categorias, unidades }: Props) {
  const [state, action] = useActionState<ProductoState, FormData>(guardarProductoAction, {});

  return (
    <form action={action} className="max-w-3xl space-y-5">
      {producto && <input type="hidden" name="id" value={producto.id} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <FormSection
        title="Datos del producto"
        description="Identificación, clasificación y descripción del producto."
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Campo label="SKU">
              <Input name="sku" defaultValue={producto?.sku} required maxLength={50} />
            </Campo>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre</Label>
              <Input name="nombre" defaultValue={producto?.nombre} required maxLength={200} />
            </div>
          </div>

          <Campo label="Descripción">
            <Textarea name="descripcion" defaultValue={producto?.descripcion ?? ""} rows={2} />
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo label="Categoría">
              <Select name="categoriaId" defaultValue={producto?.categoriaId ? String(producto.categoriaId) : SIN_CAT}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_CAT}>— Sin categoría —</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Unidad base (de inventario)">
              <Select name="unidadBaseId" defaultValue={producto ? String(producto.unidadBaseId) : undefined}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nombre} ({u.abreviatura})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Inventario y precios"
        description="Precio de compra sugerido, niveles de stock y clasificación ABC."
      >
        <div className="grid gap-5 sm:grid-cols-4">
          <Campo label="Precio compra sugerido">
            <Input name="precioCompraSugerido" type="number" min={0} step="0.01" defaultValue={producto?.precioCompraSugerido ?? ""} />
          </Campo>
          <Campo label="Stock mínimo">
            <Input name="stockMinimo" type="number" min={0} step="0.0001" defaultValue={producto?.stockMinimo ?? "0"} />
          </Campo>
          <Campo label="Stock máximo">
            <Input name="stockMaximo" type="number" min={0} step="0.0001" defaultValue={producto?.stockMaximo ?? ""} />
          </Campo>
          <Campo label="Clasificación ABC">
            <Select name="clasificacionAbc" defaultValue={producto?.clasificacionAbc || "none"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Guardar nuevo={!producto} />
        <Link href="/productos" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
