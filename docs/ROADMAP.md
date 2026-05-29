# Roadmap de migración — Vertex (Laravel) → Vertex 2 (Next.js + Supabase)

Migración completa por fases, espejando las fases del Vertex original. Cada fase entrega
módulos funcionales con su capa de servicio, server actions, UI y **pruebas de escritorio**
(Vitest) sobre la lógica de negocio.

## Principios

- **vxNN**: se conserva la nomenclatura de tablas (`vx00`..`vx29`) del proyecto original.
- **Multitenencia**: toda consulta se filtra por `empresa_id` de la sesión en el servidor.
- **Auth custom**: bcrypt + JWT en cookie httpOnly; bloqueo por 3 intentos / 10 min.
- **Lógica con pruebas**: cada función con reglas (conversión de unidades, costo promedio,
  numeración, cartera) se implementa TDD.
- **Transaccionalidad**: las operaciones que tocan varias tablas (recepción de pedido,
  facturación, pagos/recaudos) corren dentro de transacciones Drizzle.

## Estado

| Fase | Alcance | Estado |
|------|---------|--------|
| **0 — Cimientos** | Next.js 15.5.18, Tailwind+shadcn, Drizzle+Supabase, Vitest, diseño base | ✅ |
| **1 — Núcleo** | Esquema completo (30 tablas vxNN), auth custom, sesión multiempresa, middleware, roles/permisos, auditoría, seed, layout + dashboard | ✅ |
| **2 — Maestros** | Bodegas, Terceros (proveedores/clientes) | ✅ |
| **3 — Productos** | Categorías, Productos, Unidades + servicio de conversión | ⏳ |
| **4 — Compras e inventario** | Pedidos, recepción, costo promedio ponderado, kardex, movimientos, traslados, notas de inventario | ⏳ |
| **5 — Ventas** | Facturas, validación precio<costo, devoluciones, notas crédito, CxC | ⏳ |
| **6 — Cartera** | Pagos a proveedor, recaudos de cliente, CxP | ⏳ |
| **7 — Reportes** | Dashboard con KPIs, reportes de ventas/compras/inventario/cartera | ⏳ |
| **8 — Manuales** | Manuales por rol (render Markdown) | ⏳ |
| **9 — Producción** | Hardening, RLS opcional, observabilidad, backups | ⏳ |

## Lógica de negocio clave a preservar

- **Conversión de unidades** (`vx11`): factor de conversión; precio calculado (proporcional) o manual.
- **Costo promedio ponderado** (`vx16`): recálculo en cada entrada, prorrateando costos adicionales del pedido (`vx15`).
- **Numeración por empresa**: `PED-`, `FAC-`, `PAG-`, `REC-` con secuencia por `empresa_id`.
- **Flujo de cartera**: pedido recibido → CxP; factura a crédito → CxC; pago/recaudo → actualiza saldo y cupo.
- **Trazabilidad**: `pedido_id`/`proveedor_id` en inventario, `factura_id` en CxC/CxP.
