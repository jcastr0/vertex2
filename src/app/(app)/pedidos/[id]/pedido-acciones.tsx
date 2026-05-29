"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmarPedidoAction, recibirPedidoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PackageCheck, Loader2 } from "lucide-react";

export function PedidoAcciones({ id, estado }: { id: number; estado: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

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

  return (
    <div className="flex flex-wrap gap-2">
      {estado === "borrador" && (
        <Button variant="outline" onClick={confirmar} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Confirmar
        </Button>
      )}
      {["borrador", "confirmado", "parcial"].includes(estado) && (
        <Button onClick={recibir} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
          Recibir e ingresar a inventario
        </Button>
      )}
    </div>
  );
}
