"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarUsuarioAction, type UsuarioState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/ui/search-select";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, Loader2 } from "lucide-react";

interface Rol { id: number; nombre: string }
interface Props {
  usuario?: { id: number; nombre: string; email: string; activo: boolean; esRecaudador: boolean; rolId: number | null };
  roles: Rol[];
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

export function UsuarioForm({ usuario, roles }: Props) {
  const [state, action] = useActionState<UsuarioState, FormData>(guardarUsuarioAction, {});
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [esRecaudador, setEsRecaudador] = useState(usuario?.esRecaudador ?? false);

  return (
    <form action={action} className="max-w-xl space-y-5">
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <input type="hidden" name="activo" value={activo ? "true" : "false"} />
      <input type="hidden" name="esRecaudador" value={esRecaudador ? "true" : "false"} />
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection
        title="Datos del usuario"
        description="Nombre, correo y contraseña de acceso."
      >
        <div className="space-y-5">
          <Field label="Nombre" required>
            <Input name="nombre" defaultValue={usuario?.nombre} required maxLength={150} />
          </Field>
          <Field label="Correo electrónico" required>
            <Input name="email" type="email" defaultValue={usuario?.email} required maxLength={150} />
          </Field>
          <Field label={usuario ? "Nueva contraseña (opcional)" : "Contraseña"} hint="Mínimo 8 caracteres." required={!usuario}>
            <Input name="password" type="password" autoComplete="new-password" minLength={usuario ? undefined : 8} required={!usuario} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Acceso y permisos"
        description="Rol asignado y estado de la cuenta."
      >
        <div className="space-y-5">
          <Field label="Rol" required>
            <SearchSelect
              name="rolId"
              placeholder="Selecciona…"
              defaultValue={usuario?.rolId ? String(usuario.rolId) : undefined}
              options={roles.map((r) => ({ value: String(r.id), label: r.nombre }))}
            />
          </Field>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
            <Label htmlFor="activo" className="cursor-pointer">Usuario activo</Label>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
            <Switch id="esRecaudador" checked={esRecaudador} onCheckedChange={setEsRecaudador} />
            <div>
              <Label htmlFor="esRecaudador" className="cursor-pointer">Es recaudador</Label>
              <p className="text-xs text-muted-foreground">Podrá tener clientes asignados y su ruta diaria de cobro.</p>
            </div>
          </div>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/usuarios" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
