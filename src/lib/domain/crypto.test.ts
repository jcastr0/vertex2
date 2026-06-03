import { describe, it, expect, beforeAll } from "vitest";
import { cifrar, descifrar } from "./crypto";

beforeAll(() => {
  process.env.CONFIG_SECRET = "prueba-llave-maestra-suficientemente-larga-123";
});

describe("crypto (AES-256-GCM)", () => {
  it("descifrar(cifrar(x)) === x", () => {
    const x = "sk-ant-api03-secreto-de-prueba";
    expect(descifrar(cifrar(x))).toBe(x);
  });
  it("dos cifrados del mismo texto dan blobs distintos (IV aleatorio)", () => {
    expect(cifrar("hola")).not.toBe(cifrar("hola"));
  });
  it("un blob alterado falla (lanza)", () => {
    const blob = cifrar("dato");
    const partes = blob.split(".");
    partes[2] = Buffer.from("manipulado").toString("base64url"); // ciphertext alterado
    expect(() => descifrar(partes.join("."))).toThrow();
  });
});
