import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { MANUALES, getManual, ORDEN_MANUALES, manualesOrdenados, vecinosManual } from "./manuales";
import { MODULOS } from "./auth/roles";

describe("getManual", () => {
  it("devuelve el manual por slug", () => {
    expect(getManual("vender")?.titulo).toBe("Cómo vender");
  });
  it("devuelve null si no existe", () => {
    expect(getManual("inexistente")).toBeNull();
  });
});

describe("catálogo de manuales", () => {
  it("slugs únicos", () => {
    const slugs = MANUALES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("cada manual tiene módulo válido, metadatos y contenido con encabezado", () => {
    for (const m of MANUALES) {
      expect(MODULOS).toContain(m.modulo);
      expect(m.titulo.length).toBeGreaterThan(0);
      expect(m.descripcion.length).toBeGreaterThan(0);
      expect(m.contenido.trimStart().startsWith("# ")).toBe(true);
      expect(m.contenido.length).toBeGreaterThan(50);
    }
  });
  it("existen los manuales narrativos nuevos", () => {
    for (const slug of ["ciclo-negocio", "recaudo", "pagar-proveedor", "retenciones"]) {
      expect(getManual(slug), `falta el manual ${slug}`).not.toBeNull();
    }
  });
  it("el manual de recaudo documenta las DOS formas (computador y celular)", () => {
    const c = getManual("recaudo")!.contenido.toLowerCase();
    expect(c).toMatch(/computador|escritorio/);
    expect(c).toMatch(/celular|m[oó]vil/);
  });
  it("'vender' incluye la sección de factura electrónica", () => {
    expect(getManual("vender")!.contenido.toLowerCase()).toContain("electrónica");
  });
  it("no hay enlaces internos a manuales inexistentes", () => {
    const slugs = new Set(MANUALES.map((m) => m.slug));
    for (const m of MANUALES) {
      const refs = [...m.contenido.matchAll(/\]\(\/manuales\/([a-z0-9-]+)\)/g)].map((x) => x[1]);
      for (const ref of refs) {
        expect(slugs.has(ref), `${m.slug} enlaza a /manuales/${ref} que no existe`).toBe(true);
      }
    }
  });
  it("ORDEN_MANUALES cubre exactamente todos los manuales (ninguno queda fuera del recorrido)", () => {
    expect([...ORDEN_MANUALES].sort()).toEqual(MANUALES.map((m) => m.slug).sort());
  });
  it("toda imagen referenciada existe en /public", () => {
    let total = 0;
    for (const m of MANUALES) {
      const imgs = [...m.contenido.matchAll(/!\[[^\]]*\]\((\/[^)]+\.(?:png|jpg|jpeg|webp|svg))\)/g)].map((x) => x[1]);
      for (const ruta of imgs) {
        total++;
        expect(existsSync(join(process.cwd(), "public", ruta)), `falta la imagen ${ruta} (manual ${m.slug})`).toBe(true);
      }
    }
    expect(total).toBeGreaterThan(0); // hay manuales con imágenes
  });
});

describe("navegación entre manuales", () => {
  const todos = MANUALES.map((m) => m.slug);

  it("manualesOrdenados respeta ORDEN_MANUALES y filtra por visibilidad", () => {
    const visibles = ["vender", "ciclo-negocio", "compras"];
    const orden = manualesOrdenados(visibles).map((m) => m.slug);
    expect(orden).toEqual(["ciclo-negocio", "compras", "vender"]);
  });

  it("el primero no tiene anterior y el último no tiene siguiente", () => {
    const primero = ORDEN_MANUALES[0];
    const ultimo = ORDEN_MANUALES[ORDEN_MANUALES.length - 1];
    expect(vecinosManual(primero, todos).anterior).toBeNull();
    expect(vecinosManual(primero, todos).siguiente?.slug).toBe(ORDEN_MANUALES[1]);
    expect(vecinosManual(ultimo, todos).siguiente).toBeNull();
  });

  it("conecta cada paso con el siguiente en orden", () => {
    expect(vecinosManual("compras", todos).siguiente?.slug).toBe("inventario");
    expect(vecinosManual("inventario", todos).anterior?.slug).toBe("compras");
  });

  it("salta los manuales no visibles al calcular vecinos", () => {
    // Sin 'inventario' visible, el siguiente de 'compras' es 'vender'.
    const visibles = todos.filter((s) => s !== "inventario");
    expect(vecinosManual("compras", visibles).siguiente?.slug).toBe("vender");
  });
});
