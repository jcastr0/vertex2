"use client";
import { useEffect, useState } from "react";
import { Recibo } from "./recibo";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { escposBytes, textoReciboVenta, type DatosReciboVenta } from "@/lib/domain/recibo";
import { Printer, Bluetooth } from "lucide-react";

type Formato = "carta" | "80" | "58";
const KEY = "vx_recibo_formato";

export function ReciboPrint({ datos }: { datos: DatosReciboVenta }) {
  const [formato, setFormato] = useState<Formato>("carta");
  const [btDisponible, setBtDisponible] = useState(false);
  useEffect(() => {
    const f = (localStorage.getItem(KEY) as Formato) || "carta";
    setFormato(f);
    setBtDisponible(typeof navigator !== "undefined" && "bluetooth" in navigator);
  }, []);
  function cambiarFormato(f: Formato) { setFormato(f); localStorage.setItem(KEY, f); }

  async function imprimirBluetooth() {
    try {
      // @ts-expect-error Web Bluetooth no está en los tipos por defecto
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [0xffe0, "000018f0-0000-1000-8000-00805f9b34fb"] });
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      const cols = formato === "58" ? 32 : formato === "80" ? 42 : 42;
      const bytes = escposBytes(textoReciboVenta(datos, cols), { cortar: true });
      for (const s of services) {
        const chars = await s.getCharacteristics();
        const w = chars.find((c: { properties: { write: boolean; writeWithoutResponse: boolean } }) => c.properties.write || c.properties.writeWithoutResponse);
        if (w) {
          // enviar en bloques de 180 bytes
          for (let i = 0; i < bytes.length; i += 180) await w.writeValue(bytes.slice(i, i + 180));
          return;
        }
      }
      alert("No se encontró una característica de escritura en la impresora.");
    } catch (e) {
      console.error("[bluetooth]", e);
      alert("No se pudo imprimir por Bluetooth. Usa 'Imprimir'.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <SearchSelect value={formato} onValueChange={(v) => cambiarFormato(v as Formato)} searchThreshold={99}
          options={[{ value: "carta", label: "Media carta" }, { value: "80", label: "Térmica 80mm" }, { value: "58", label: "Térmica 58mm" }]} triggerClassName="w-40" />
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
        {btDisponible && <Button type="button" variant="outline" size="sm" onClick={imprimirBluetooth}><Bluetooth className="size-4" /> Imprimir directo</Button>}
      </div>
      {/* En móvil el formato carta (≈148mm) excede el ancho: permitir scroll sin romper el layout */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 print:mx-0 print:overflow-visible print:px-0">
        <Recibo datos={datos} formato={formato} />
      </div>
    </div>
  );
}
