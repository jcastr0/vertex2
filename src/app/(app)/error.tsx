"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Ocurrió un error al cargar esta sección. Puedes reintentar; si persiste, vuelve al
          dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/60">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RotateCw className="size-4" /> Reintentar
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Ir al dashboard
        </Button>
      </div>
    </div>
  );
}
