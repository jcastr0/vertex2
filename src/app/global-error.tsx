"use client";

import "./globals.css";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <h2 className="text-xl font-bold">Error inesperado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          La aplicación encontró un problema. Intenta recargar la página.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Recargar
        </button>
      </body>
    </html>
  );
}
