# Canal de WhatsApp para el bot — Diseño

**Fecha:** 2026-06-03
**Estado:** Aprobado (modo autónomo), construir el código; pruebas reales con Meta del usuario.
**Depende de:** cerebro del bot (`src/lib/bot/`), cotizaciones (vx39/40), config + secretos cifrados (vx41 + crypto).

## Objetivo

Recibir pedidos de clientes por **WhatsApp**: un webhook que reciba mensajes (texto e imagen), resuelva **número entrante → empresa** y **remitente → cliente registrado**, llame al **cerebro** (interpretarPedido), responda por WhatsApp y, al confirmar, cree la **cotización pendiente**. Política **solo clientes registrados** (desconocido → mensaje de registro 24 h + se guarda la solicitud). Las **credenciales se configuran desde la base de datos** (UI), no hardcodeadas.

## Decisiones

1. **Proveedor:** Meta WhatsApp Cloud API **directo**. El envío y la descarga de media se aíslan en un **adaptador** (`src/lib/whatsapp/`) para poder cambiar a un intermediario (Twilio/360dialog) después sin tocar la lógica del bot.
2. **Credenciales en BD (configurable por el usuario):** por empresa, en la tabla config (vx41):
   - `whatsapp.phoneNumberId` (texto, no secreto) — el ID del número de esa empresa en Meta.
   - `whatsapp.token` (**secreto**, cifrado con el mecanismo AES) — el access token de Meta.
   - El **verify token** del webhook va en env `WHATSAPP_VERIFY_TOKEN` (handshake de una sola vez, a nivel app). Documentado.
3. **número entrante → empresa:** el webhook trae el `phone_number_id` (el número de la empresa que recibió). Se busca la fila config `whatsapp.phoneNumberId == ese id` → empresaId. (`empresaPorPhoneNumberId`.)
4. **remitente → cliente:** el `from` (número del cliente) se normaliza y se busca un tercero (cliente/ambos) de esa empresa por `telefono`/`celular`. Si no hay → no registrado.
5. **Solo registrados:** desconocido → responder `bot.mensajeNoRegistrado` + insertar **solicitud de registro** (vx42, pendiente). Autorizar+avisar = fase 2.
6. **Conversación con estado** (WhatsApp es sin estado entre mensajes): tabla `conversaciones_bot` (vx43) guarda el **borrador** del pedido por (empresa, teléfono) + estado. Cada mensaje: cargar borrador → interpretar → si completo y el cliente confirma → crear cotización y limpiar; si no, guardar borrador y pedir lo que falta / confirmación.
7. **Confirmación por texto:** cuando el pedido está completo, el bot pregunta "¿confirmo?"; si el siguiente mensaje es afirmativo (sí/dale/confirmo/listo…) → crea la cotización (`origen=bot`, requiereRevision) y responde el número de cotización.
8. **Imágenes:** Meta manda un `media id`; se obtiene la URL y se descarga el binario con el token → data URL → al cerebro (visión).
9. **Audio:** fuera de alcance (transcripción, después).

## Componentes

**Schema (migración):**
- `solicitudesRegistro` (vx42): id, empresaId, telefono, mensaje, estado ('pendiente'|'autorizada'|'rechazada' default pendiente), createdAt. Índice (empresaId, estado).
- `conversacionesBot` (vx43): id, empresaId, telefono, borrador jsonb, estado varchar (ej. 'recolectando'|'esperando_confirmacion'), updatedAt. Único (empresaId, telefono).
- Registrar ambas en vx00.

**Config / servicios:**
- `configuracion.ts`: `empresaPorPhoneNumberId(phoneNumberId): Promise<number|null>` (busca fila clave='whatsapp.phoneNumberId' con ese valor). Helpers `whatsappToken(empresaId)` (= obtenerSecreto), `whatsappPhoneNumberId(empresaId)`.
- `terceros.ts`: `buscarClientePorTelefono(empresaId, telefono)` — normaliza (solo dígitos, ignora prefijo país) y compara contra telefono/celular.
- `src/lib/domain/whatsapp.ts` (**puro, testeable**): `normalizarTelefono(n)`, `esAfirmacion(texto)` (sí/dale/listo/confirmo/ok…), `parsearMensajeEntrante(payload)` → `{ phoneNumberId, from, texto?, imagenMediaId? } | null`.
- `src/lib/services/conversaciones.ts`: `cargarConversacion(empresaId, telefono)`, `guardarBorrador(...)`, `limpiarConversacion(...)`.
- `src/lib/services/solicitudes-registro.ts`: `registrarSolicitud(empresaId, telefono, mensaje)`, `listarSolicitudes(empresaId)`.

**Adaptador WhatsApp (`src/lib/whatsapp/`):**
- `enviar.ts`: `enviarTexto(empresaId, to, texto)` → POST a `graph.facebook.com/v21.0/{phoneNumberId}/messages` con el token (de config). Aislado para cambiar de proveedor.
- `media.ts`: `descargarImagen(empresaId, mediaId)` → resuelve URL + descarga → data URL base64.

**Orquestación del turno:** `src/lib/bot/turno-whatsapp.ts` (server): dado (empresaId, clienteId, telefono, entrada) carga conversación, llama `interpretarPedido` con borradorPrevio + contexto del cliente, decide (pedir más / confirmar / crear), persiste estado, y devuelve el texto a responder.

**Webhook (público, fuera de (app)):** `src/app/api/whatsapp/route.ts`
- `GET`: verificación de Meta (`hub.mode==subscribe` && `hub.verify_token==WHATSAPP_VERIFY_TOKEN`) → responde `hub.challenge`.
- `POST`: parsea el payload → resuelve empresa (phoneNumberId) → resuelve cliente (from). Registrado → orquesta turno → responde por WhatsApp. Desconocido → responde mensaje no-registrado + guarda solicitud. Siempre responde 200 rápido a Meta (procesa y envía respuesta vía API). Verifica `botActivo(empresaId)`.

**UI (Configuración):**
- Sección "WhatsApp" en `/configuracion`: campos `phone_number_id` (texto) y `token` (secreto, write-only) por empresa.
- Página "Solicitudes de registro" (Administración) que lista vx42 pendientes (autorizar = fase 2; por ahora solo verlas).

## Pruebas

- **Puras (vitest):** `whatsapp.ts` — `normalizarTelefono` (varios formatos +57/sin prefijo), `esAfirmacion` (positivos/negativos), `parsearMensajeEntrante` (payload de texto, de imagen, y basura→null). Y la lógica de decisión del turno donde sea pura.
- **Integración/E2E real:** requiere el **Meta Business del usuario** (token + phone_number_id + URL pública del webhook en Vercel + `WHATSAPP_VERIFY_TOKEN`). Se hará cuando esté listo: verificar webhook, enviar "mándame 10 de tomate" desde WhatsApp y recibir respuesta; mandar una foto; mandar desde un número no registrado.

## Fuera de alcance

- **Autorizar solicitudes + aviso saliente de confirmación** (fase 2).
- **Audio** (transcripción).
- Proveedor intermediario (solo se deja el seam del adaptador).
- Reintentos/colas/idempotencia avanzada de webhooks (se hace un manejo básico: responder 200 y best-effort).

## Operativo

Variables nuevas en env (Vercel + local): `WHATSAPP_VERIFY_TOKEN` (string que inventas, va también en la config del webhook en Meta). El `phone_number_id` y el `token` se cargan **desde la UI** (Configuración), el token cifrado. La URL del webhook a registrar en Meta: `https://www.appvertex.shop/api/whatsapp`.
