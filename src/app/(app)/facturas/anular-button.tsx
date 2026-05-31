"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { anularFacturaAction, type AnularState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { AlertCircle, Loader2, Ban } from "lucide-react";

function Confirmar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null} Anular factura
    </Button>
  );
}

export function AnularButton({ facturaId }: { facturaId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = anularFacturaAction.bind(null, facturaId);
  const [state, formAction] = useActionState<AnularState, FormData>(action, {});
  useEffect(() => { if (state.ok) { setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Ban className="size-4" /> Anular
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Anular factura"
        description="Devuelve el inventario y revierte la cartera o el ingreso de caja. No se puede deshacer."
      >
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Motivo" required>
            <Textarea name="motivo" rows={2} required placeholder="Ej. error en el precio / cliente equivocado" autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}
