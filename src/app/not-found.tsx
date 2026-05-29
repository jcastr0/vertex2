import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { VertexMark } from "@/components/vertex-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <VertexMark className="size-10" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La ruta que buscas no existe o aún no está disponible.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Ir al dashboard
      </Link>
    </div>
  );
}
