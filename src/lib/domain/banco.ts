/** Genera un código slug único para un banco a partir de su nombre. */
export function slugBanco(nombre: string, tomados: string[] = []): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // no alfanumérico → guion
    .replace(/^-+|-+$/g, "") // recorta guiones de los extremos
    .slice(0, 30)
    .replace(/-+$/g, "");

  if (!tomados.includes(base)) return base;
  for (let i = 2; ; i++) {
    const candidato = `${base.slice(0, 30 - String(i).length - 1)}-${i}`;
    if (!tomados.includes(candidato)) return candidato;
  }
}
