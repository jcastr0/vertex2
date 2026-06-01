"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

/**
 * Imagen de manual con lightbox. Es el renderer de `img` en ReactMarkdown:
 * la miniatura vive dentro del artículo (prose) y al tocarla se abre un
 * overlay elegante (backdrop oscuro con blur, zoom-in suave, cerrar con
 * clic / Esc / botón). Accesible y con bloqueo de scroll.
 */
export function ManualImage({ src: srcRaw, alt }: { src?: string | Blob; alt?: string }) {
  const src = typeof srcRaw === "string" ? srcRaw : undefined;
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMontado(true), []);

  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cerrarRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, cerrar]);

  if (!src) return null;

  return (
    <>
      {/* Miniatura dentro del artículo */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={alt ? `Ampliar imagen: ${alt}` : "Ampliar imagen"}
        className="group not-prose my-5 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-card shadow-sm ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary print:hidden"
      >
        <span className="relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" className="block w-full" />
          <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
            <ZoomIn className="size-3.5" /> Ampliar
          </span>
        </span>
      </button>

      {/* Versión estática para impresión (sin botón) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} className="hidden w-full rounded-lg border border-border print:block" />

      {/* Overlay / lightbox */}
      {montado && abierto &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt ?? "Imagen ampliada"}
            onClick={cerrar}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/70 p-4 backdrop-blur-md duration-200 animate-in fade-in-0 sm:p-10 print:hidden"
          >
            <button
              ref={cerrarRef}
              type="button"
              aria-label="Cerrar"
              onClick={cerrar}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-border backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-5" />
            </button>
            <figure
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-full max-w-5xl flex-col items-center gap-3 duration-300 animate-in fade-in-0 zoom-in-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt ?? ""}
                className="max-h-[82vh] w-auto max-w-full rounded-xl shadow-2xl ring-1 ring-white/15"
              />
              {alt && (
                <figcaption className="max-w-prose text-center text-sm text-background/80">{alt}</figcaption>
              )}
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
