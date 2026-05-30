"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { guardarTerceroAction, type TerceroState } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { DIAS_COBRO } from "@/lib/domain/ruta-recaudo";
import { AlertCircle, Loader2 } from "lucide-react";

type TerceroData = {
  id: number;
  tipo: string;
  codigo: string;
  razonSocial: string;
  nombreComercial: string | null;
  tipoIdentificacion: string;
  identificacion: string;
  tipoPersona: string;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  condicionesPago: string | null;
  diasCreditoProveedor: number;
  cupoCredito: string;
  diasCreditoCliente: number;
  requiereFacturaElectronica: boolean;
  observaciones: string | null;
  recaudadorId: number | null;
  diaCobro: number | null;
};

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Guardar
    </Button>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function TerceroForm({
  tercero,
  recaudadores,
}: {
  tercero?: TerceroData;
  recaudadores: { id: number; nombre: string }[];
}) {
  const [state, action] = useActionState<TerceroState, FormData>(guardarTerceroAction, {});
  const [fe, setFe] = useState(tercero?.requiereFacturaElectronica ?? false);

  return (
    <form action={action} className="max-w-3xl space-y-6">
      {tercero && <input type="hidden" name="id" value={tercero.id} />}
      <input type="hidden" name="requiereFacturaElectronica" value={fe ? "true" : "false"} />

      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo label="Tipo">
          <Select name="tipo" defaultValue={tercero?.tipo ?? "proveedor"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="proveedor">Proveedor</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Código">
          <Input name="codigo" defaultValue={tercero?.codigo} required maxLength={50} />
        </Campo>
        <Campo label="Tipo de persona">
          <Select name="tipoPersona" defaultValue={tercero?.tipoPersona ?? "juridica"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="juridica">Jurídica</SelectItem>
              <SelectItem value="natural">Natural</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
      </div>

      <Campo label="Razón social">
        <Input name="razonSocial" defaultValue={tercero?.razonSocial} required maxLength={200} />
      </Campo>
      <Campo label="Nombre comercial">
        <Input name="nombreComercial" defaultValue={tercero?.nombreComercial ?? ""} maxLength={200} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo label="Tipo de identificación">
          <Select name="tipoIdentificacion" defaultValue={tercero?.tipoIdentificacion ?? "NIT"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NIT">NIT</SelectItem>
              <SelectItem value="CC">Cédula</SelectItem>
              <SelectItem value="CE">Cédula extranjería</SelectItem>
              <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Identificación">
          <Input name="identificacion" defaultValue={tercero?.identificacion} required maxLength={50} />
        </Campo>
        <Campo label="Email">
          <Input name="email" type="email" defaultValue={tercero?.email ?? ""} maxLength={100} />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo label="Teléfono">
          <Input name="telefono" defaultValue={tercero?.telefono ?? ""} maxLength={20} />
        </Campo>
        <Campo label="Celular">
          <Input name="celular" defaultValue={tercero?.celular ?? ""} maxLength={20} />
        </Campo>
        <Campo label="Ciudad">
          <Input name="ciudad" defaultValue={tercero?.ciudad ?? ""} maxLength={100} />
        </Campo>
      </div>

      <Campo label="Dirección">
        <Input name="direccion" defaultValue={tercero?.direccion ?? ""} maxLength={500} />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-4">
        <Campo label="Días crédito proveedor">
          <Input name="diasCreditoProveedor" type="number" min={0} defaultValue={tercero?.diasCreditoProveedor ?? 0} />
        </Campo>
        <Campo label="Días crédito cliente">
          <Input name="diasCreditoCliente" type="number" min={0} defaultValue={tercero?.diasCreditoCliente ?? 0} />
        </Campo>
        <Campo label="Cupo de crédito">
          <Input name="cupoCredito" type="number" min={0} step="0.01" defaultValue={tercero?.cupoCredito ?? "0"} />
        </Campo>
        <Campo label="Condiciones de pago">
          <Input name="condicionesPago" defaultValue={tercero?.condicionesPago ?? ""} maxLength={100} />
        </Campo>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
        <Switch id="fe" checked={fe} onCheckedChange={setFe} />
        <Label htmlFor="fe" className="cursor-pointer">
          Requiere factura electrónica
        </Label>
      </div>

      <div className="grid gap-5 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <Campo label="Recaudador asignado">
          <SearchSelect
            name="recaudadorId"
            placeholder="Sin asignar"
            defaultValue={tercero?.recaudadorId ? String(tercero.recaudadorId) : undefined}
            options={recaudadores.map((r) => ({ value: String(r.id), label: r.nombre }))}
          />
        </Campo>
        <Campo label="Día de cobro">
          <Select name="diaCobro" defaultValue={tercero?.diaCobro ? String(tercero.diaCobro) : "0"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">— Sin día fijo —</SelectItem>
              {DIAS_COBRO.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      <Campo label="Observaciones">
        <Textarea name="observaciones" defaultValue={tercero?.observaciones ?? ""} rows={3} />
      </Campo>

      <div className="flex gap-3">
        <Guardar />
        <Link href="/terceros" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
