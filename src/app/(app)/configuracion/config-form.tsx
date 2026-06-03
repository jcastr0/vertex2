"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { guardarConfigBotAction, type ConfigState } from "./actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar
    </Button>
  );
}

export function ConfigForm({ botActivo, mensaje }: { botActivo: boolean; mensaje: string }) {
  const [state, action] = useActionState<ConfigState, FormData>(guardarConfigBotAction, {});
  const [activo, setActivo] = useState(botActivo);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="botActivo" value={activo ? "1" : "0"} />
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {state.error}
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <CheckCircle2 className="size-4" /> Guardado.
        </div>
      )}
      <FormSection title="Asistente de pedidos (bot)" description="Activa o desactiva el asistente para esta empresa.">
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <span>
              <span className="block text-sm font-medium">Asistente activo</span>
              <span className="block text-xs text-muted-foreground">Cuando está apagado, la pantalla del asistente queda bloqueada.</span>
            </span>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </label>
          <Field label="Mensaje para quien no está registrado" hint="Lo recibe quien escriba sin ser cliente registrado.">
            <Textarea name="mensajeNoRegistrado" rows={3} defaultValue={mensaje} />
          </Field>
        </div>
      </FormSection>
      <Guardar />
    </form>
  );
}
