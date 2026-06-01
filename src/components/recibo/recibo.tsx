import type { DatosReciboVenta } from "@/lib/domain/recibo";

const money = (n: number) => "$" + Math.round(n).toLocaleString("es-CO");
const ANCHOS: Record<string, string> = { carta: "max-w-[148mm]", "80": "max-w-[80mm]", "58": "max-w-[58mm]" };

export function Recibo({ datos, formato }: { datos: DatosReciboVenta; formato: "carta" | "80" | "58" }) {
  return (
    <div
      className={`recibo relative isolate overflow-hidden bg-white p-4 font-mono text-[12px] leading-snug text-black shadow-sm ring-1 ring-black/5 mx-auto ${ANCHOS[formato]}`}
    >
      {datos.anulada && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex select-none items-center justify-center [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
        >
          <span className="-rotate-[30deg] whitespace-nowrap rounded border-4 border-red-600/40 px-3 py-1 text-[34px] font-black uppercase tracking-[0.2em] text-red-600/35">
            Anulada
          </span>
        </div>
      )}
      <div className="text-center text-[13px] font-bold uppercase tracking-[0.18em]">{datos.empresa}</div>
      <div className="text-center text-[10px] tracking-wide text-black/70">NIT {datos.nit}</div>
      <hr className="my-2 border-0 border-t border-dashed border-black/40" />
      <div className="flex justify-between"><span className="text-black/60">Factura</span><span className="tabular font-semibold">{datos.numero}</span></div>
      <div className="flex justify-between"><span className="text-black/60">Fecha</span><span className="tabular">{datos.fecha}</span></div>
      <div className="flex justify-between gap-2"><span className="text-black/60">Cliente</span><span className="truncate text-right">{datos.cliente}</span></div>
      <hr className="my-2 border-0 border-t border-dashed border-black/40" />
      {datos.lineas.map((l, i) => (
        <div key={i} className="mb-1">
          <div className="truncate">{l.producto}</div>
          <div className="flex justify-between tabular text-black/80">
            <span>{l.cantidad} × {money(l.precio)}</span>
            <span>{money(l.subtotal)}</span>
          </div>
        </div>
      ))}
      <hr className="my-2 border-0 border-t border-dashed border-black/40" />
      <div className="flex items-baseline justify-between text-[14px] font-bold tabular">
        <span className="uppercase tracking-wide">Total</span>
        <span>{money(datos.total)}</span>
      </div>
      <div className="mt-0.5 flex justify-between text-[11px]"><span className="text-black/60">Pago</span><span className="capitalize">{datos.formaPago}</span></div>
      <hr className="my-2 border-0 border-t border-dashed border-black/40" />
      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-black/70">¡Gracias por su compra!</div>
    </div>
  );
}
