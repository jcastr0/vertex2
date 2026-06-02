import { describe, it, expect } from "vitest";
import {
  entidadDeTabla,
  etiquetaRegistro,
  etiquetaCampo,
  formatearValor,
  describirCambios,
} from "./auditoria";

describe("entidadDeTabla", () => {
  it("mapea códigos conocidos a entidad singular con artículo", () => {
    expect(entidadDeTabla("vx21")).toEqual({ sing: "factura", art: "la" });
    expect(entidadDeTabla("vx13")).toEqual({ sing: "pedido", art: "el" });
  });
  it("cae a 'registro' si no conoce la tabla", () => {
    expect(entidadDeTabla("vx99")).toEqual({ sing: "registro", art: "el" });
  });
});

describe("etiquetaRegistro", () => {
  it("prefiere número, luego nombre/razón social, luego #id", () => {
    expect(etiquetaRegistro({ numero: "FAC-000029", id: 5 })).toBe("FAC-000029");
    expect(etiquetaRegistro({ razonSocial: "Doña Marta", id: 5 })).toBe("Doña Marta");
    expect(etiquetaRegistro({ id: 5 })).toBe("#5");
    expect(etiquetaRegistro(null)).toBeNull();
  });
});

describe("etiquetaCampo", () => {
  it("usa el diccionario y humaniza lo desconocido", () => {
    expect(etiquetaCampo("saldoPendiente")).toBe("Saldo pendiente");
    expect(etiquetaCampo("algoRaro")).toBe("Algo raro");
  });
});

describe("formatearValor", () => {
  it("formatea dinero, booleanos, fechas, día de cobro y vacíos", () => {
    expect(formatearValor("total", "1500000")).toBe("$1.500.000");
    expect(formatearValor("activo", true)).toBe("Sí");
    expect(formatearValor("activo", false)).toBe("No");
    expect(formatearValor("fecha", "2026-05-31")).toMatch(/2026/);
    expect(formatearValor("diaCobro", 3)).toBe("miércoles");
    expect(formatearValor("nombre", null)).toBeNull();
    expect(formatearValor("nombre", "")).toBeNull();
  });
});

describe("describirCambios", () => {
  it("ACTUALIZAR: lista solo lo que cambió y omite ruido (id, empresaId, fechas internas)", () => {
    const antes = { id: 1, empresaId: 2, saldoPendiente: "1500000", estado: "emitida", updatedAt: "x" };
    const nuevo = { id: 1, empresaId: 2, saldoPendiente: "1200000", estado: "emitida", updatedAt: "y" };
    const cambios = describirCambios("ACTUALIZAR", antes, nuevo);
    expect(cambios).toEqual([{ label: "Saldo pendiente", antes: "$1.500.000", despues: "$1.200.000" }]);
  });

  it("ACTUALIZAR: una anulación se lee como estado y motivo", () => {
    const antes = { estado: "emitida", motivoAnulacion: null };
    const nuevo = { estado: "anulada", motivoAnulacion: "Cliente canceló" };
    const cambios = describirCambios("ACTUALIZAR", antes, nuevo);
    const labels = cambios.map((c) => c.label);
    expect(labels).toContain("Estado");
    expect(labels).toContain("Motivo de anulación");
    expect(cambios.find((c) => c.label === "Estado")).toEqual({ label: "Estado", antes: "emitida", despues: "anulada" });
  });

  it("CREAR: destaca campos clave del registro nuevo", () => {
    const nuevo = { id: 9, numero: "FAC-000030", total: "80000", estado: "emitida", empresaId: 1 };
    const cambios = describirCambios("CREAR", null, nuevo);
    expect(cambios).toContainEqual({ label: "Número", antes: null, despues: "FAC-000030" });
    expect(cambios).toContainEqual({ label: "Total", antes: null, despues: "$80.000" });
  });

  it("ELIMINAR: muestra lo que existía (antes), sin después", () => {
    const anterior = { numero: "TR001", estado: "pendiente" };
    const cambios = describirCambios("ELIMINAR", anterior, null);
    expect(cambios[0]).toEqual({ label: "Número", antes: "TR001", despues: null });
  });
});
