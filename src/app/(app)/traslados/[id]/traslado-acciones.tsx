"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { enviarTrasladoAction, recibirTrasladoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Send, PackageCheck, Loader2 } from "lucide-react";

export function TrasladoAcciones({ id, estado }: { id: number; estado: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function enviar() {
    start(async () => {
      const r = await enviarTrasladoAction(id);
      if (r?.error) toast.error(r.error);
      else toast.success("Traslado enviado (salida de origen).");
      router.refresh();
    });
  }
  function recibir() {
    start(async () => {
      const r = await recibirTrasladoAction(id);
      if (r?.error) toast.error(r.error);
      else toast.success("Traslado recibido (entrada a destino).");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {estado === "pendiente" && (
        <Button onClick={enviar} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Enviar
        </Button>
      )}
      {estado === "enviado" && (
        <Button onClick={recibir} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
          Recibir en destino
        </Button>
      )}
    </div>
  );
}
