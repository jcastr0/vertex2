# Central de Reportes — Diseño

**Fecha:** 2026-05-31
**Proyecto:** Vertex 2 (ERP mercado de verduras, Next.js 15 + Drizzle + Supabase)

## Objetivo
Una central de reportes donde cada reporte, al entrar, presenta un **dashboard**
(KPIs, tortas, líneas, barras, dispersión, filtros dinámicos) y permite **exportar
el detalle** que sustenta lo mostrado a **CSV** y a **Excel (.xlsx) con formato
elegante**. Se construye un **motor reutilizable** + un **primer lote de 4 reportes
estrella**, y luego se agregan más reportes sobre el motor.

## Alcance de este spec
- **Motor de reportes** (framework reutilizable).
- **4 reportes**: Ventas, Cartera por cobrar (aging), Inventario y rentabilidad,
  Recaudo/Ruta.
- Export CSV + Excel con formato.
- **Fuera de alcance** (siguientes iteraciones sobre el mismo motor): Compras,
  Cartera por pagar, Tesorería/Flujo de caja, dashboard de Factura electrónica.

## Decisiones aprobadas
- Enfoque: **motor + primer lote estrella, luego iterar**.
- Reportes del primer lote: los **cuatro** listados arriba.
- Export: **Excel con formato (ExcelJS) + CSV**.
- Gráficos: **Recharts**. Export Excel: **ExcelJS**. (dependencias nuevas)

## Arquitectura
**Dashboards en servidor + gráficos cliente + export por route handler.**
- Cada reporte es una página **server component** en `/reportes/[slug]` que lee los
  filtros de `searchParams`, corre las consultas agregadas y pasa los datos a:
  - componentes de **gráfico cliente** (Recharts), y
  - una **tabla de detalle**.
- Los botones **Exportar** son enlaces a un **route handler**
  `/reportes/[slug]/export?fmt=csv|xlsx&<filtros>` que re-corre la consulta de
  **detalle** con los mismos filtros y devuelve el archivo.
- Filtros viven en la **URL** (compartibles; cambio de filtro = re-render server).
- Por qué no “todo en cliente”: más superficie de API, más datos al navegador,
  menos alineado con el patrón RSC + route handlers ya usado (export F.E.).

### Estructura de archivos
```
src/lib/reportes/
  registry.ts            # catálogo de reportes (slug, título, desc, icono, grupo)
src/lib/services/reportes/
  ventas.ts              # { kpis, series, detalle } de Ventas
  cartera-cobrar.ts      # aging CxC
  inventario.ts          # inventario + rentabilidad
  recaudo.ts             # recaudo/ruta
src/lib/xlsx.ts          # helper ExcelJS (formato elegante)  [+ csv.ts ya existe]
src/components/reportes/
  kpi.tsx                # tarjeta KPI (server-safe)
  chart-linea.tsx        # "use client" (Recharts)
  chart-barras.tsx       # "use client"
  chart-torta.tsx        # "use client"
  chart-dispersion.tsx   # "use client"
  tabla-detalle.tsx      # tabla del detalle (server-safe)
  filtro-reporte.tsx     # "use client" filtros → URL (rango fechas + dims)
  export-botones.tsx     # enlaces a /export?fmt=csv|xlsx con filtros
src/app/(app)/reportes/
  page.tsx               # portada con tarjetas (reemplaza/expande la actual)
  [slug]/page.tsx        # dashboard del reporte (despacha por slug)
  [slug]/export/route.ts # genera CSV/xlsx del detalle con filtros
```
Cada servicio expone una forma común:
```ts
interface Filtros { desde: string; hasta: string; [dim: string]: string | undefined }
interface DatosReporte {
  kpis: { label: string; valor: number; formato: "money" | "num" | "pct" }[];
  series: Record<string, { x: string|number; y: number; etiqueta?: string }[]>;
  detalle: { columnas: ColumnaExport[]; filas: (string|number|null)[][] };
}
```
`ColumnaExport = { header: string; tipo: "texto"|"money"|"num"|"fecha"; total?: boolean }`
— la misma definición alimenta la tabla en pantalla y el export (CSV/Excel).

### Filtros
- Comunes: **rango de fechas** (`desde`,`hasta`; default: mes actual).
- Por reporte (selects que escriben a la URL): categoría, cliente, proveedor,
  bodega, recaudador, tipo de venta, fecha de corte (según el reporte).
- `filtro-reporte.tsx` arma la query y navega; el route handler de export lee los
  mismos parámetros.

## Los 4 reportes
### 1. Ventas  (`/reportes/ventas`)
- Filtros: fechas, categoría, cliente, bodega, contado/crédito.
- KPIs: Ventas totales · # facturas · Ticket promedio · % a crédito.
- Gráficos: **línea** ventas por día · **barras** top 10 productos · **torta**
  contado vs crédito · **barras** top 10 clientes.
- Detalle (export): líneas de venta — Fecha, Factura, Cliente, Producto, Cantidad,
  Precio, Total. (origen: facturas vx21 + facturaDetalles vx22 + terceros + productos)

### 2. Cartera por cobrar — aging  (`/reportes/cartera-cobrar`)
- Filtros: fecha de corte (default hoy), recaudador, cliente.
- KPIs: Por cobrar total · Vencido · Por vencer · # clientes con saldo.
- Gráficos: **barras** por tramo (corriente · 1-30 · 31-60 · 61-90 · +90) · **torta**
  vencido vs por vencer · **barras** top 10 deudores.
- Detalle: Cliente, Factura, Fecha, Vence, Días vencido, Saldo, Tramo.
  (origen: cuentasPorCobrar vx28 + facturas + terceros; tramo calculado en dominio)
- Lógica pura testeable: `tramoAging(diasVencido)` → etiqueta de tramo.

### 3. Inventario y rentabilidad  (`/reportes/inventario`)
- Filtros: bodega, categoría, (rango fechas para “vendido/margen” del periodo).
- KPIs: Inventario valorizado · # productos · Bajo mínimo · Margen promedio %.
- Gráficos: **barras** valor por categoría · **barras** margen por categoría ·
  **dispersión** margen% (y) vs unidades vendidas (x) por producto.
- Detalle: Producto, Categoría, Existencia, Costo prom., Valor, Vendido (periodo),
  Margen $, Margen %. (origen: inventario vx16 + productos + facturaDetalles para
  ventas/costo del periodo)

### 4. Recaudo / Ruta  (`/reportes/recaudo`)
- Filtros: fechas, recaudador.
- KPIs: Recaudado · # recaudos · # visitas · % efectividad (visitas con pago/abono).
- Gráficos: **línea** recaudado por día · **barras** recaudado por recaudador ·
  **torta** resultados de visita (pagó/abonó/no estaba/no quiso).
- Detalle: Fecha, Cliente, Recaudador, Valor, Método. (origen: recaudosClientes
  vx29 + visitasRecaudo vx30 + terceros + usuarios)

## Export elegante (ExcelJS)
`src/lib/xlsx.ts` — `construirXlsx(titulo, filtrosTexto, columnas, filas): Buffer`:
- Fila de **título** (nombre del reporte) + fila con **filtros aplicados** + **fecha
  de generación**.
- **Encabezado con estilo** (negrita, fondo de color, texto blanco).
- **Formato por tipo**: moneda (`$#,##0`), fecha, número.
- **Fila de totales** para columnas marcadas `total`.
- **Congelar** fila de encabezado, **autofiltro**, **anchos** de columna automáticos.
- Una hoja (detalle). Route handler responde con
  `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  y `Content-Disposition: attachment`.
- CSV: usa `toCsv`/`csvResponse` existentes (`;` + BOM).

## Permisos
- Ver/usar reportes y export: `reportes.ver`.

## Pruebas
- Unit (vitest): `tramoAging`, y helpers puros de cálculo (margen %, ticket
  promedio, % efectividad) extraídos a dominio.
- Integración (gitignored): cada servicio de reporte corre contra la BD demo y
  devuelve `kpis/series/detalle` coherentes; el route handler de export produce un
  archivo no vacío con encabezados correctos.

## No-objetivos
- No se rehace el cálculo de saldos/costos: se reusan los ya existentes
  (saldoPendiente, costoPromedio, costoUnitario de la factura).
- Sin programación/*scheduling* de reportes ni envío por correo (futuro).
