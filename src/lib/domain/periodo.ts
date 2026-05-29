/** Rango de fechas (ISO yyyy-mm-dd) del mes indicado. month0: 0=enero. */
export function rangoMes(year: number, month0: number): { desde: string; hasta: string } {
  const mm = String(month0 + 1).padStart(2, "0");
  const ultimoDia = new Date(year, month0 + 1, 0).getDate();
  return {
    desde: `${year}-${mm}-01`,
    hasta: `${year}-${mm}-${String(ultimoDia).padStart(2, "0")}`,
  };
}
