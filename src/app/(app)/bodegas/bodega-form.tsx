"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarBodegaAction, type BodegaState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  bodega?: {
    id: number;
    codigo: string;
    nombre: string;
    direccion: string | null;
    responsable: string | null;
    telefono: string | null;
    esPrincipal: boolean;
  };
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

export function BodegaForm({ bodega }: Props) {
  const [state, action] = useActionState<BodegaState, FormData>(guardarBodegaAction, {});
  const [esPrincipal, setEsPrincipal] = useState(bodega?.esPrincipal ?? false);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      {bodega && <input type="hidden" name="id" value={bodega.id} />}
      <input type="hidden" name="esPrincipal" value={esPrincipal ? "true" : "false"} />

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
        title="Datos de la bodega"
        description="Nombre y ubicación del almacén o punto de venta."
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" name="codigo" defaultValue={bodega?.codigo} required maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" defaultValue={bodega?.nombre} required maxLength={100} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea id="direccion" name="direccion" defaultValue={bodega?.direccion ?? ""} rows={2} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" name="responsable" defaultValue={bodega?.responsable ?? ""} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" defaultValue={bodega?.telefono ?? ""} maxLength={20} />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <Switch id="esPrincipal" checked={esPrincipal} onCheckedChange={setEsPrincipal} />
            <div>
              <Label htmlFor="esPrincipal" className="cursor-pointer">
                Bodega principal
              </Label>
              <p className="text-xs text-muted-foreground">
                Solo una bodega por empresa puede ser la principal.
              </p>
            </div>
          </div>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/bodegas" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
