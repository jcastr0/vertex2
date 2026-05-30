"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  confirmarPedidoAction,
  recibirPedidoAction,
  recibirParcialAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CheckCircle2, PackageCheck, ClipboardCheck, Loader2 } from "lucide-react";

export interface LineaPedido {
  id: number;
  producto: string;
  cantidad: number;
  unidad: string;
}

interface Props {
  id: number;
  estado: string;
  lineas: LineaPedido[];
}

export function PedidoAcciones({ id, estado, lineas }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  // Per-line received quantities (default = ordered quantity)
  const [cantidades, setCantidades] = useState<Record<number, number>>(
    () => Object.fromEntries(lineas.map((l) => [l.id, l.cantidad])),
  );

  function confirmar() {
    start(async () => {
      await confirmarPedidoAction(id);
      router.refresh();
    });
  }

  function recibir() {
    start(async () => {
      const r = await recibirPedidoAction(id);
      if (r?.error) toast.error(r.error);
      else toast.success("Pedido recibido. Inventario actualizado.");
      router.refresh();
    });
  }

  function abrirVinoDiferente() {
    // Reset to ordered quantities each time the modal opens
    setCantidades(Object.fromEntries(lineas.map((l) => [l.id, l.cantidad])));
    setModalOpen(true);
  }

  function recibirParcial() {
    start(async () => {
      const r = await recibirParcialAction(id, cantidades);
      if (r?.error) {
        toast.error(r.error);
      } else {
        toast.success("Recibido");
        setModalOpen(false);
        router.refresh();
      }
    });
  }

  const puedeRecibir = ["borrador", "confirmado", "parcial"].includes(estado);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {estado === "borrador" && (
          <Button variant="outline" onClick={confirmar} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Confirmar
          </Button>
        )}

        {puedeRecibir && (
          <>
            <Button onClick={recibir} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PackageCheck className="size-4" />
              )}
              Recibí todo
            </Button>

            <Button variant="outline" onClick={abrirVinoDiferente} disabled={pending}>
              <ClipboardCheck className="size-4" />
              Vino diferente
            </Button>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="¿Qué llegó?"
        description="Ajusta las cantidades que realmente llegaron."
      >
        <div className="space-y-3 py-2">
          {lineas.map((linea) => (
            <div key={linea.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{linea.producto}</div>
                <div className="text-xs text-muted-foreground">
                  Pedido: {linea.cantidad} {linea.unidad}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={cantidades[linea.id] ?? linea.cantidad}
                  onChange={(e) =>
                    setCantidades((prev) => ({
                      ...prev,
                      [linea.id]: Number(e.target.value),
                    }))
                  }
                  className="w-24"
                  disabled={pending}
                />
                <span className="text-xs text-muted-foreground">{linea.unidad}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setModalOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={recibirParcial} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar recepción
          </Button>
        </div>
      </Modal>
    </>
  );
}
