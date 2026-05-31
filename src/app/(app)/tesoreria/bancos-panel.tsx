"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { crearBancoAction, toggleBancoAction, type BancoState } from "./actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/ui/search-select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus, Search, Landmark } from "lucide-react";

interface Banco { id: number; nombre: string; tipo: string | null; activo: boolean }
interface Props { bancos: Banco[]; puedeCrear: boolean; puedeEditar: boolean }

const TIPO_LABEL: Record<string, string> = {
  banco: "Banco",
  billetera: "Billetera",
  cooperativa: "Cooperativa",
  financiera: "Financiera",
};

function GuardarBanco() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Agregar
    </Button>
  );
}

export function BancosPanel({ bancos, puedeCrear, puedeEditar }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [state, formAction] = useActionState<BancoState, FormData>(crearBancoAction, {});
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) { setOpen(false); router.refresh(); }
  }, [state.ok, router]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? bancos.filter((b) => b.nombre.toLowerCase().includes(t)) : bancos;
  }, [bancos, q]);

  function toggle(id: number, activo: boolean) {
    startTransition(async () => { await toggleBancoAction(id, activo); router.refresh(); });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Bancos y billeteras</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Catálogo para elegir al registrar cuentas. {bancos.length} en total.</p>
        </div>
        {puedeCrear && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Agregar banco
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar banco…" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" />
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Landmark className="mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Ningún banco coincide.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtrados.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className="min-w-0 flex-1 truncate">
                <span className={b.activo ? "font-medium" : "font-medium text-muted-foreground line-through"}>{b.nombre}</span>
              </span>
              {b.tipo && b.tipo !== "banco" && (
                <Badge variant="outline" className="hidden font-normal sm:inline-flex">{TIPO_LABEL[b.tipo] ?? b.tipo}</Badge>
              )}
              {puedeEditar ? (
                <Switch checked={b.activo} onCheckedChange={(v) => toggle(b.id, v)} aria-label={b.activo ? "Desactivar" : "Activar"} />
              ) : (
                <Badge variant={b.activo ? "default" : "outline"} className="font-normal">{b.activo ? "Activo" : "Inactivo"}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Agregar banco" description="Aparecerá en la lista al registrar cuentas.">
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" /> {state.error}
            </div>
          )}
          <Field label="Nombre" required>
            <Input name="nombre" maxLength={100} required autoFocus placeholder="Ej. Banco de la Costa" />
          </Field>
          <Field label="Tipo" required>
            <SearchSelect
              name="tipo"
              defaultValue="banco"
              options={[
                { value: "banco", label: "Banco" },
                { value: "billetera", label: "Billetera (Nequi, Daviplata…)" },
                { value: "cooperativa", label: "Cooperativa" },
                { value: "financiera", label: "Financiera" },
              ]}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <GuardarBanco />
          </div>
        </form>
      </Modal>
    </section>
  );
}
