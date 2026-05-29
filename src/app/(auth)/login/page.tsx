import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { VertexMark, VertexWordmark } from "@/components/vertex-mark";

export const metadata: Metadata = { title: "Ingresar — Vertex" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        {/* Retícula geométrica de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-sidebar-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-sidebar-foreground) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl"
        />

        <VertexWordmark className="relative" />

        <div className="relative max-w-md space-y-6">
          <VertexMark className="size-14" />
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            El control total de tu operación, en un solo vértice.
          </h1>
          <p className="text-sidebar-foreground/70">
            Compras, inventario con costo promedio, facturación y cartera — multiempresa,
            trazable y auditado de extremo a extremo.
          </p>
        </div>

        <div className="relative flex gap-8 text-sm text-sidebar-foreground/60">
          {[
            ["18", "módulos"],
            ["30", "entidades"],
            ["Multi", "empresa"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="tabular text-2xl font-semibold text-primary">{n}</div>
              <div>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <VertexWordmark />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Bienvenido de vuelta</h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema.
            </p>
          </div>
          <LoginForm />
          <p className="text-center text-xs text-muted-foreground">
            Vertex ERP · acceso restringido a personal autorizado
          </p>
        </div>
      </section>
    </main>
  );
}
