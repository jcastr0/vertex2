# Bot de pedidos — el cerebro (núcleo agnóstico al canal) — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.
**Depende de:** módulo de cotizaciones (vx39/vx40) ya implementado.

## Objetivo

Sentar las **bases** de un bot de pedidos de clientes: un **cerebro agnóstico al canal** que recibe lo que un cliente pide (texto o foto), lo entiende con Claude **contra el catálogo de la empresa y el historial de precios del cliente**, le muestra al cliente lo que entendió para que **confirme**, y al confirmar crea una **cotización pendiente** (vx39) para que el vendedor la revise y facture.

El **canal (WhatsApp)** y el **audio** quedan FUERA de alcance: se enchufan después sin reescribir el cerebro.

## Decisiones (del brainstorming)

1. **Descomposición:** construir primero el **cerebro** (núcleo), no el canal. WhatsApp será un adaptador posterior que resuelve teléfono→cliente/empresa y llama a este núcleo.
2. **Entradas v1:** **texto + imagen** (Claude lee fotos con visión nativa; no requiere proveedor extra). **Audio** se agrega después (necesita transcripción = otro proveedor/clave).
3. **Flujo en dos pasos con confirmación del cliente:**
   - `interpretarPedido()` → **propuesta** (no escribe en BD).
   - se le muestra al cliente un **resumen** para que confirme.
   - `confirmarPedido()` → crea la cotización pendiente.
4. **Claude mapea, el sistema pone el precio:** Claude solo empareja **producto + cantidad** contra IDs reales del catálogo (nunca inventa producto ni precio). El **precio** lo pone el sistema con la lógica existente "último precio a ese cliente" (`ultimoPrecioPorCliente`) o, si no hay, el precio de venta del catálogo.
5. **No reconocido:** empareja lo que puede, deja los ítems dudosos + el mensaje original en **Observaciones**, y marca la cotización con `requiereRevision = true`. Nunca inventa.
6. **Inteligencia:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) con `generateObject` + esquema **Zod** (salida JSON validada). Modelo **Claude Haiku 4.5** (rápido, barato, con visión); escalable a Sonnet si la precisión lo exige.
7. **Identidad (sin canal aún):** el núcleo recibe `empresaId` (la empresa activa) + `clienteId` explícitos. Una **pantalla interna de prueba** ("Asistente de pedidos") los provee; mañana el canal los resolverá desde el teléfono.

## Arquitectura y flujo

```
entrada { texto?, imagenes: {mediaType, base64}[] } + identidad { empresaId, clienteId }
        │
        ▼
interpretarPedido(empresaId, clienteId, entrada)        ← solo LEE, no escribe
   1. carga catálogo (listarProductosVenta) + historial (ultimoPrecioPorCliente)
   2. arma prompt + bloques de imagen, llama generateObject(Claude Haiku, schema Zod)
   3. mapear(): empareja productoId, pone precio (historial→catálogo), separa noReconocidos, arma resumen
        │
        ▼
PROPUESTA { lineas:[{productoId, nombre, cantidad, precioUnitario}], noReconocidos:string[], resumen:string, total }
        │
   se muestra el resumen al cliente → ¿confirma?
        │ sí
        ▼
confirmarPedido(empresaId, clienteId, propuesta, ctx)
   → crearCotizacion({ clienteId, fecha=hoy, lineas, observaciones, origen:"bot", requiereRevision:true }, ctx)
   → cotización PENDIENTE (vx39)
```

## Componentes (archivos)

**Nuevos — `src/lib/bot/`:**
- `schema.ts` — esquema Zod de la salida de Claude:
  `{ items: { productoId: number | null, nombreLibre: string, cantidad: number }[], notas?: string }`.
  (Claude propone `productoId` del catálogo que le pasamos; `null`/no encontrado → va a noReconocidos. `nombreLibre` es lo que el cliente dijo, para el caso no reconocido.)
- `mapear.ts` — **lógica pura** `mapearPropuesta(salidaClaude, catalogo, historial)` → `{ lineas, noReconocidos, resumen, total }`. Pone precios (historial→catálogo→0), descarta items sin productoId válido a `noReconocidos`, arma el resumen legible. **Testeable sin API.**
- `interpretar.ts` — `interpretarPedido(empresaId, clienteId, entrada)`: orquesta carga de datos + llamada a Claude (`generateObject`) + `mapearPropuesta`. `server-only`.
- `cliente-claude.ts` — wrapper fino del modelo (lee `ANTHROPIC_API_KEY`, expone el modelo Haiku 4.5) para poder simularlo/cambiarlo.

**Cotizaciones (extensión mínima):**
- `confirmarPedido()` en `src/lib/services/cotizaciones.ts` (o `crearCotizacion` extendido) que acepta `origen` y `requiereRevision` y arma `observaciones` con lo no reconocido + el mensaje original.
- Esquema **vx39**: agregar `origen` varchar(10) default `'manual'` y `requiereRevision` boolean default `false`. Migración `0011` (+ nada nuevo en vx00, misma tabla).

**Pantalla de prueba:**
- `src/app/(app)/cotizaciones/asistente/page.tsx` + componente cliente: elige **cliente** (empresa = activa), pega **texto** o sube **imagen** → ve la propuesta + resumen → **"Confirmar y crear"**.
- `actions.ts`: `interpretarPedidoAction(form)` (devuelve la propuesta) y `confirmarPedidoAction(form)` (crea la cotización, redirige al detalle). Ambas con `requirePermiso("cotizaciones.crear")`.
- Permiso: reutiliza `cotizaciones.crear` (no se crea módulo nuevo).

## Secreto y costo

- `ANTHROPIC_API_KEY` en `.env.local` y en Vercel. Nunca en el código (el código `bot/` es `server-only`).
- 1 llamada a Claude por interpretación. Modelo Haiku 4.5 (con visión). Costo ≈ centavos por pedido; las imágenes suman algo.

## Pruebas

- **Puras (vitest):** `mapear.ts` con salidas de Claude **simuladas** (fixtures): empareja por `productoId`, pone precio del historial (y cae a catálogo), manda a `noReconocidos` los `productoId` nulos/inexistentes, arma `resumen` y `total`. Sin tocar la API.
- **Esquema:** `schema.ts` parsea una muestra de JSON de Claude.
- **Manual:** la pantalla "Asistente de pedidos" con un texto real y una foto de lista; verificar propuesta, confirmar, y que la cotización queda pendiente con `origen='bot'` y `requiereRevision`.
- Pruebas que tocan BD/API: gitignored (convención del proyecto). El núcleo NO se prueba contra la API real en CI; se simula la salida de Claude.

## Fuera de alcance (esta base)

- Canal **WhatsApp**: webhook (recepción/envío), número, cuenta Business/Meta o proveedor (Twilio/360dialog), verificación, y la **resolución teléfono → cliente + empresa**.
- **Audio**: transcripción (Whisper/Deepgram) → otra clave/costo.
- **Conversación multi-turno real** (correcciones iterativas, desambiguación dialogada): aquí la confirmación es un sí/no en la pantalla; el ida y vuelta conversacional es de la capa del canal.
- **Aviso/push al vendedor** cuando entra un pedido del bot (la lista ya lo resalta con `requiereRevision`).
