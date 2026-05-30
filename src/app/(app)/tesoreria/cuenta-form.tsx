"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarCuentaAction, type TesoreriaState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  cuenta?: { id: number; nombre: string; tipo: string; banco: string | null; numeroCuenta: string | null; titularNit: string | null; titularNombre: string | null; saldoInicial: string };
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

export function CuentaForm({ cuenta }: Props) {
  const [state, action] = useActionState<TesoreriaState, FormData>(guardarCuentaAction, {});
  return (
    <form action={action} className="max-w-xl space-y-6">
      {cuenta && <input type="hidden" name="id" value={cuenta.id} />}
      {state.error && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre / alias</Label>
        <Input id="nombre" name="nombre" defaultValue={cuenta?.nombre} required maxLength={100} placeholder="Ej. Bancolombia ahorros" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select name="tipo" defaultValue={cuenta?.tipo ?? "ahorros"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
              <SelectItem value="caja">Caja / efectivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="banco">Banco</Label>
          <Input id="banco" name="banco" defaultValue={cuenta?.banco ?? ""} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numeroCuenta">N° de cuenta</Label>
          <Input id="numeroCuenta" name="numeroCuenta" defaultValue={cuenta?.numeroCuenta ?? ""} maxLength={50} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="titularNit">NIT titular</Label>
          <Input id="titularNit" name="titularNit" defaultValue={cuenta?.titularNit ?? ""} maxLength={50} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="titularNombre">Nombre del titular</Label>
          <Input id="titularNombre" name="titularNombre" defaultValue={cuenta?.titularNombre ?? ""} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="saldoInicial">Saldo inicial</Label>
          <Input id="saldoInicial" name="saldoInicial" type="number" step="0.01" defaultValue={cuenta?.saldoInicial ?? "0"} disabled={!!cuenta} />
          {cuenta && <p className="text-xs text-muted-foreground">El saldo inicial no se edita; usa un ajuste.</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <Guardar />
        <Link href="/tesoreria" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
      </div>
    </form>
  );
}
