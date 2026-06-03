# Configuración (KV) + interruptor del bot + chat de prueba — Diseño

**Fecha:** 2026-06-02
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.
**Depende de:** el cerebro del bot (`src/lib/bot/`) y el módulo de cotizaciones (vx39/vx40), ya implementados.

## Objetivo

Hacer el bot de pedidos **configurable y probable desde la app**, sin WhatsApp:
1. Una **tabla de configuración key-value** en la BD (values JSON) para flags/ajustes, en vez de `.env.local`.
2. Un **interruptor** para activar/desactivar el bot **por empresa**.
3. Un **chat de prueba conversacional** en la página, que reúsa el cerebro, saluda al cliente por su nombre, entiende *"lo mismo de la vez pasada"*, lleva memoria solo si el pedido queda incompleto, y atiende **solo a clientes registrados**.

## Decisiones (del brainstorming)

1. **Secretos:** la `ANTHROPIC_API_KEY` **sigue en env** (.env.local/Vercel). La tabla KV es **solo para flags/ajustes no sensibles** (nunca secretos).
2. **Alcance de la config:** **por empresa con default global** — fila sin empresa = valor global por defecto; fila con empresa = override.
3. **Chat:** memoria **solo si el pedido queda incompleto** (se lleva un **borrador JSON** entre mensajes para completarlo). Siempre se le pasan los **datos básicos del cliente** (nombre + su último pedido) para cercanía y para resolver *"lo mismo de la vez pasada"*.
4. **Solo clientes registrados (seguridad):** el bot solo atiende a un cliente registrado. A un desconocido le responde un mensaje configurable de "primera compra → registro de 24 h → confirmación al autorizar" y **no procesa pedidos**. El **filtro real por número** y el **flujo de autorización (24 h, bandeja, confirmación saliente)** son del **canal WhatsApp (spec futuro)**; aquí dejamos la **política** y el mensaje configurable, con un "simular no registrado" en el chat de prueba.
5. **Precio:** por línea, **precio del cliente** (último vendido a ese cliente) → si no hay, **precio global** del catálogo. (Ya implementado en el cerebro; se mantiene.)

## Componentes

### 1. Tabla `configuracion` (vx41) — KV
| Campo | Tipo | Notas |
|---|---|---|
| `id` | bigserial PK | |
| `empresaId` | bigint → vx04, **nullable** | null = valor global por defecto |
| `clave` | varchar(80) | ej. `bot.activo` |
| `valor` | **jsonb** | texto/número/bool/objeto/array |
| `updatedAt` | timestamptz | |

Unicidad: índice único parcial por `(empresaId, clave)` y un único parcial para `clave` cuando `empresaId IS NULL` (evita dos filas globales con la misma clave). Registrada en vx00.

**Claves conocidas (v1):**
- `bot.activo` → boolean (default **false**).
- `bot.mensajeNoRegistrado` → texto (default: "Para tomar tu pedido primero debemos registrarte. Al ser tu primera compra, hacemos un proceso de registro de 24 horas; recibirás una confirmación cuando sea autorizado. ¡Gracias!").

### 2. Servicio `src/lib/services/configuracion.ts`
- `obtenerConfig<T>(clave, empresaId, porDefecto): Promise<T>` — fila de la empresa → fila global → `porDefecto`. Parsea el jsonb.
- `guardarConfig(clave, valor, empresaId, ctx)` — upsert (auditado).
- Helpers tipados: `botActivo(empresaId): Promise<boolean>` y `mensajeNoRegistrado(empresaId): Promise<string>`.

### 3. UI de configuración
- Página **Administración → Configuración** (`/configuracion`): **Switch "Asistente de pedidos activo"** (empresa activa) + textarea del mensaje "no registrado". Gating: `requirePermiso` (módulo nuevo `configuracion`, o reusar `empresas.editar` para no crear módulo; **decisión: módulo nuevo `configuracion`** para que Admin lo maneje). Guarda con `guardarConfig`.

### 4. Gating del bot
- La página del Asistente y sus server actions verifican `botActivo(empresaId)`. Si está apagado → bloque "El asistente está desactivado para esta empresa" y el ítem del menú se atenúa (o se oculta).

### 5. Extensión del cerebro (memoria + cercanía + "lo mismo")
- Nuevo servicio `ultimoPedidoCliente(empresaId, clienteId)` → `{ productoId, nombre, cantidad }[]` de la **última factura no anulada** del cliente (para "lo mismo de la vez pasada").
- `interpretarPedido(...)` recibe un `contexto` opcional: `{ clienteNombre?, ultimoPedido?, borradorPrevio? }`. El prompt incluye: nombre del cliente (para saludar), su último pedido (para "lo de siempre"), y el borrador previo (si la conversación venía incompleta).
- El **esquema de salida de Claude** gana: `mensajeAsistente: string` (lo que responde al cliente, cálido y por su nombre) y `completo: boolean` (si el pedido está completo o falta info). Sigue devolviendo `items`.
- Resultado del turno: `{ mensajeAsistente, propuesta, completo }`. Si `completo` y hay líneas → listo para confirmar; si no → el chat conserva la propuesta/items como **borrador JSON** para el siguiente mensaje.

### 6. Chat de prueba (evoluciona la pantalla Asistente)
- `/cotizaciones/asistente` pasa de formulario a **chat de burbujas** (estado de conversación en el cliente: mensajes + borrador JSON; sin persistencia en servidor).
- Cada envío (texto/imagen) → `enviarMensajeAction(clienteId, texto, imagenDataUrl?, borradorJson?)` → `interpretarPedido` con contexto → pinta la burbuja del bot (`mensajeAsistente`). Si `completo` con líneas → muestra la propuesta + **Confirmar y crear** (crea la cotización pendiente, `origen=bot`, `requiereRevision`). Si incompleto → guarda el borrador para el próximo turno.
- Botón **"simular no registrado"** → muestra `bot.mensajeNoRegistrado` y no procesa (valida la política sin canal).

## Pruebas

- **Servicio `configuracion`:** override por empresa vs global vs default (integración, gitignored, como las demás que tocan BD).
- **Política registered-only:** función pura/guard que, sin cliente registrado, devuelve el mensaje de no-registrado y no procesa — testeable.
- **`ultimoPedidoCliente`:** integración (devuelve las líneas de la última factura no anulada).
- **`mapear`** ya cubierto por pruebas puras; el `mensajeAsistente`/`completo` se valida con salida de Claude **simulada** (fixture) en la lógica de turno.
- **Manual (con la API key del usuario):** chat — saludo por nombre; "lo mismo de la vez pasada" repite el último pedido; pedido incompleto pide el dato faltante y luego completa; "simular no registrado" muestra el mensaje; interruptor off bloquea el asistente.

## Fuera de alcance (este spec)

- **Canal WhatsApp**: webhook, número, resolución **teléfono → cliente** (el filtro real de "solo registrados"), y el **flujo de autorización de 24 h** (bandeja de solicitudes, aprobar, enviar confirmación saliente).
- **Audio** (transcripción).
- Persistencia de la conversación en el servidor (el chat de prueba mantiene el estado en el cliente).
- Cifrado de secretos en BD (no aplica: los secretos siguen en env).
