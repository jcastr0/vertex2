"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { guardarConfigBotAction, type ConfigState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, MessageCircle } from "lucide-react";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar
    </Button>
  );
}

export function ConfigForm({
  botActivo,
  mensaje,
  keyConfigurada,
  whatsappPhoneNumberId,
  whatsappTokenConfigurado,
}: {
  botActivo: boolean;
  mensaje: string;
  keyConfigurada: boolean;
  whatsappPhoneNumberId: string;
  whatsappTokenConfigurado: boolean;
}) {
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

      <FormSection title="Conexión con Claude (IA)" description="La API key se guarda cifrada y no se vuelve a mostrar.">
        <Field
          label="API key de Claude"
          hint={keyConfigurada ? "Hay una key configurada. Escribe una nueva solo si quieres reemplazarla." : "Pega tu API key de console.anthropic.com. Se guardará cifrada."}
        >
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="apiKeyClaude"
              type="password"
              autoComplete="off"
              placeholder={keyConfigurada ? "•••••••••• configurada" : "sk-ant-…"}
              className="pl-9"
            />
          </div>
        </Field>
      </FormSection>

      <FormSection title="Conexión con WhatsApp" description="Credenciales de Meta para que los clientes pidan por WhatsApp. El token se guarda cifrado.">
        <div className="space-y-5">
          <Field label="Phone Number ID" hint="El identificador del número en Meta (WhatsApp → API Setup). No es el número de teléfono.">
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="whatsappPhoneNumberId" autoComplete="off" placeholder="123456789012345" className="pl-9" defaultValue={whatsappPhoneNumberId} />
            </div>
          </Field>
          <Field
            label="Token de acceso"
            hint={whatsappTokenConfigurado ? "Hay un token configurado. Escribe uno nuevo solo si quieres reemplazarlo." : "Token de la app de Meta (temporal o permanente). Se guardará cifrado."}
          >
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="whatsappToken"
                type="password"
                autoComplete="off"
                placeholder={whatsappTokenConfigurado ? "•••••••••• configurado" : "EAAB…"}
                className="pl-9"
              />
            </div>
          </Field>
        </div>
      </FormSection>

      <Guardar />
    </form>
  );
}
