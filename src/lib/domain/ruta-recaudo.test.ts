import { describe, it, expect } from "vitest";
import { diaSemana, ordenarRuta, type ParadaRuta, DIAS_COBRO } from "./ruta-recaudo";

describe("diaSemana", () => {
  it("lunes=1 … sábado=6, domingo=7 (ISO)", () => {
    expect(diaSemana(new Date(2026, 4, 25))).toBe(1); // 2026-05-25 lunes
    expect(diaSemana(new Date(2026, 4, 30))).toBe(6); // sábado
    expect(diaSemana(new Date(2026, 4, 31))).toBe(7); // domingo
  });
});

describe("ordenarRuta", () => {
  const hoy = 1; // lunes
  const base: ParadaRuta[] = [
    { clienteId: 1, diaCobro: 2, saldo: 100, diasVencido: 0 }, // otro día, al día
    { clienteId: 2, diaCobro: 1, saldo: 50, diasVencido: 0 }, // hoy
    { clienteId: 3, diaCobro: 1, saldo: 200, diasVencido: 5 }, // hoy, vencido
    { clienteId: 4, diaCobro: null, saldo: 80, diasVencido: 10 }, // sin día, muy vencido
  ];

  it("los de hoy van primero, vencidos antes dentro del grupo", () => {
    const r = ordenarRuta(base, hoy);
    expect(r.map((p) => p.clienteId)).toEqual([3, 2, 4, 1]);
  });

  it("marca cada parada con su grupo (hoy / otros)", () => {
    const r = ordenarRuta(base, hoy);
    expect(r.find((p) => p.clienteId === 2)?.grupo).toBe("hoy");
    expect(r.find((p) => p.clienteId === 1)?.grupo).toBe("otros");
  });

  it("hay 6 días de cobro (lunes a sábado)", () => {
    expect(DIAS_COBRO).toHaveLength(6);
  });
});
