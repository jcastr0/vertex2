import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifica correctamente una contraseña con su hash", async () => {
    const hash = await hashPassword("S3cret!2026");
    expect(hash).not.toBe("S3cret!2026");
    expect(await verifyPassword("S3cret!2026", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("S3cret!2026");
    expect(await verifyPassword("incorrecta", hash)).toBe(false);
  });

  it("genera hashes distintos para la misma contraseña (salt)", async () => {
    const a = await hashPassword("misma");
    const b = await hashPassword("misma");
    expect(a).not.toBe(b);
  });
});
