"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { MODULOS, ACCIONES, MODULO_LABEL } from "@/lib/auth/roles";
import { guardarPermisosAction, crearRolAction, type RolState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, Check } from "lucide-react";

const ACC_LABEL: Record<string, string> = {
  ver: "Ver",
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
};

function Guardar({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {label}
    </Button>
  );
}

export function MatrizPermisos({
  rolId,
  permisosIniciales,
  modoCrear,
}: {
  rolId?: number;
  permisosIniciales: string[];
  modoCrear?: boolean;
}) {
  const router = useRouter();
  const action = modoCrear ? crearRolAction : guardarPermisosAction.bind(null, rolId!);
  const [state, formAction] = useActionState<RolState, FormData>(action, {});
  const [sel, setSel] = useState<Set<string>>(new Set(permisosIniciales));
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const tiene = (p: string) => sel.has(p);
  const toggle = (p: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  const toggleFila = (m: string) =>
    setSel((s) => {
      const n = new Set(s);
      const todos = ACCIONES.every((a) => n.has(`${m}.${a}`));
      ACCIONES.forEach((a) => (todos ? n.delete(`${m}.${a}`) : n.add(`${m}.${a}`)));
      return n;
    });
  const toggleCol = (a: string) =>
    setSel((s) => {
      const n = new Set(s);
      const todos = MODULOS.every((m) => n.has(`${m}.${a}`));
      MODULOS.forEach((m) => (todos ? n.delete(`${m}.${a}`) : n.add(`${m}.${a}`)));
      return n;
    });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="permisosJson" value={JSON.stringify([...sel])} />
      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" /> {state.error}
        </div>
      )}
      {modoCrear && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre del rol</label>
          <Input name="nombre" required maxLength={50} placeholder="Ej. Cajero" />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium">Módulo</th>
              {ACCIONES.map((a) => (
                <th key={a} className="px-2 py-2 text-center font-medium">
                  <button
                    type="button"
                    className="underline-offset-2 hover:text-primary hover:underline"
                    aria-label={`Activar o desactivar ${ACC_LABEL[a]} en todos los módulos`}
                    title={`Activar/desactivar ${ACC_LABEL[a]} en todos`}
                    onClick={() => toggleCol(a)}
                  >
                    {ACC_LABEL[a]}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MODULOS.map((m) => (
              <tr key={m} className="hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-background px-3 py-2">
                  <button
                    type="button"
                    className="text-left font-medium underline-offset-2 hover:text-primary hover:underline"
                    aria-label={`Activar o desactivar todos los permisos de ${MODULO_LABEL[m]}`}
                    title={`Activar/desactivar toda la fila ${MODULO_LABEL[m]}`}
                    onClick={() => toggleFila(m)}
                  >
                    {MODULO_LABEL[m]}
                  </button>
                </td>
                {ACCIONES.map((a) => {
                  const perm = `${m}.${a}`;
                  return (
                    <td key={a} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        aria-pressed={tiene(perm)}
                        onClick={() => toggle(perm)}
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-md border",
                          tiene(perm)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {tiene(perm) && <Check className="size-3.5" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Guardar label={modoCrear ? "Crear rol" : "Guardar permisos"} />
    </form>
  );
}
