import { describe, it, expect } from "vitest";
import {
  MAX_INTENTOS,
  MINUTOS_BLOQUEO,
  estaBloqueado,
  registrarFallo,
  registrarExito,
} from "./lockout";

const T0 = new Date("2026-05-29T10:00:00.000Z");

describe("estaBloqueado", () => {
  it("no está bloqueado cuando bloqueadoHasta es null", () => {
    expect(estaBloqueado({ bloqueadoHasta: null }, T0)).toBe(false);
  });

  it("está bloqueado cuando bloqueadoHasta es futuro", () => {
    const futuro = new Date(T0.getTime() + 60_000);
    expect(estaBloqueado({ bloqueadoHasta: futuro }, T0)).toBe(true);
  });

  it("no está bloqueado cuando bloqueadoHasta ya pasó", () => {
    const pasado = new Date(T0.getTime() - 60_000);
    expect(estaBloqueado({ bloqueadoHasta: pasado }, T0)).toBe(false);
  });
});

describe("registrarFallo", () => {
  it("incrementa intentos sin bloquear antes del máximo", () => {
    const r = registrarFallo({ intentosFallidos: 0 }, T0);
    expect(r.intentosFallidos).toBe(1);
    expect(r.bloqueadoHasta).toBeNull();
  });

  it("bloquea por 10 minutos al alcanzar el máximo de intentos", () => {
    // dos fallos previos -> el tercero debe bloquear
    const r = registrarFallo({ intentosFallidos: MAX_INTENTOS - 1 }, T0);
    expect(r.bloqueadoHasta).not.toBeNull();
    expect(r.bloqueadoHasta!.getTime()).toBe(T0.getTime() + MINUTOS_BLOQUEO * 60_000);
  });

  it("reinicia el contador de intentos tras bloquear", () => {
    const r = registrarFallo({ intentosFallidos: MAX_INTENTOS - 1 }, T0);
    expect(r.intentosFallidos).toBe(0);
  });
});

describe("registrarExito", () => {
  it("limpia intentos y bloqueo", () => {
    const r = registrarExito();
    expect(r.intentosFallidos).toBe(0);
    expect(r.bloqueadoHasta).toBeNull();
  });
});
