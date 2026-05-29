import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, type SessionPayload } from "./session";

const payload: SessionPayload = {
  uid: 42,
  empresaId: 7,
  nombre: "Jhonatan",
  email: "jhonatan@vertex.co",
  rol: "Admin",
  esSuperadmin: false,
};

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-de-al-menos-32-caracteres-largo!!";
});

describe("session JWT", () => {
  it("firma y verifica un payload (ida y vuelta)", async () => {
    const token = await signSession(payload);
    const out = await verifySession(token);
    expect(out?.uid).toBe(42);
    expect(out?.empresaId).toBe(7);
    expect(out?.email).toBe("jhonatan@vertex.co");
  });

  it("devuelve null para un token manipulado", async () => {
    const token = await signSession(payload);
    const out = await verifySession(token + "x");
    expect(out).toBeNull();
  });

  it("devuelve null para basura", async () => {
    expect(await verifySession("no-es-un-jwt")).toBeNull();
  });
});
