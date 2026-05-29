"use server";

import { redirect } from "next/navigation";
import { destruirSesion } from "./cookies";

export async function logoutAction() {
  await destruirSesion();
  redirect("/login");
}
