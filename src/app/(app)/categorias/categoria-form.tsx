"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarCategoriaAction, type CategoriaState } from "./actions";
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
import { AlertCircle, Loader2 } from "lucide-react";

interface Opcion {
  id: number;
  nombre: string;
}
interface Props {
  categoria?: { id: number; nombre: string; descripcion: string | null; padreId: number | null };
  opcionesPadre: Opcion[];
}

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Guardar
    </Button>
  );
}

const SIN_PADRE = "0";

export function CategoriaForm({ categoria, opcionesPadre }: Props) {
  const [state, action] = useActionState<CategoriaState, FormData>(guardarCategoriaAction, {});
  const opciones = opcionesPadre.filter((o) => o.id !== categoria?.id);

  return (
    <form action={action} className="max-w-xl space-y-6">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}

      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" defaultValue={categoria?.nombre} required maxLength={100} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" name="descripcion" defaultValue={categoria?.descripcion ?? ""} rows={2} />
      </div>

      <div className="space-y-2">
        <Label>Categoría padre (opcional)</Label>
        <Select name="padreId" defaultValue={categoria?.padreId ? String(categoria.padreId) : SIN_PADRE}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SIN_PADRE}>— Sin padre (raíz) —</SelectItem>
            {opciones.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/categorias" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
