"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_EMPRESA } from "./empresa";

/** Cambia la empresa activa del superadmin (cookie) y refresca. */
export async function cambiarEmpresaAction(id: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_EMPRESA, String(id), {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
