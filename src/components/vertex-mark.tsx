import { cn } from "@/lib/utils";

/** Marca de Vertex: un vértice/ápice geométrico. */
export function VertexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <path
        d="M16 2 30 27H2L16 2Z"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M16 11 23 24H9L16 11Z" className="fill-primary" />
    </svg>
  );
}

export function VertexWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <VertexMark className="size-7" />
      <span
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Vertex
      </span>
    </span>
  );
}
