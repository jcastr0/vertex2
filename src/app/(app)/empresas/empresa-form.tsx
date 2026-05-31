"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarEmpresaAction, type EmpresaState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { PaletaPicker } from "./paleta-picker";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  empresa?: {
    id: number;
    nombre: string;
    razonSocial: string;
    nit: string;
    email: string;
    telefono: string | null;
    direccion: string | null;
    ciudad: string | null;
    pais: string | null;
    paletaTema?: string | null;
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

export function EmpresaForm({ empresa }: Props) {
  const [state, action] = useActionState<EmpresaState, FormData>(guardarEmpresaAction, {});
  return (
    <form action={action} className="max-w-2xl space-y-5">
      {empresa && <input type="hidden" name="id" value={empresa.id} />}
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}

      <FormSection
        title="Identificación"
        description="Nombre comercial, razón social y NIT de la empresa."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" required>
            <Input name="nombre" defaultValue={empresa?.nombre} required maxLength={150} />
          </Field>
          <Field label="Razón social" required>
            <Input name="razonSocial" defaultValue={empresa?.razonSocial} required maxLength={200} />
          </Field>
          <Field label="NIT" required>
            <Input name="nit" defaultValue={empresa?.nit} required maxLength={50} />
          </Field>
          <Field label="Email" required>
            <Input name="email" type="email" defaultValue={empresa?.email} required maxLength={150} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Contacto y ubicación"
        description="Teléfono, dirección, ciudad y país de la empresa."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Teléfono">
            <Input name="telefono" defaultValue={empresa?.telefono ?? ""} maxLength={30} />
          </Field>
          <Field label="Ciudad">
            <Input name="ciudad" defaultValue={empresa?.ciudad ?? ""} maxLength={100} />
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            <Input name="direccion" defaultValue={empresa?.direccion ?? ""} maxLength={255} />
          </Field>
          <Field label="País">
            <Input name="pais" defaultValue={empresa?.pais ?? "Colombia"} maxLength={100} />
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Apariencia"
        description="Elige la paleta de color de la empresa. El logo y los colores de la app se ajustan a esta selección."
      >
        <PaletaPicker defaultKey={empresa?.paletaTema} />
      </FormSection>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/empresas" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
