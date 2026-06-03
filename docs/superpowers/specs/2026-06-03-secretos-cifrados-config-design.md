# Secretos cifrados en Configuración — Diseño

**Fecha:** 2026-06-03
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.
**Depende de:** tabla `configuracion` (vx41) y el cerebro del bot (`src/lib/bot/`), ya implementados.
**Habilita:** que la API key de Claude se gestione desde la UI (no en env), y es el fundamento para guardar el token de WhatsApp en el spec del canal.

## Objetivo

Guardar **secretos** (empezando por la API key de Claude) en la tabla de configuración (vx41), **cifrados con AES-256-GCM** usando una llave maestra que vive en env. La key se administra desde **Configuración** en modo **write-only** (una vez guardada, nunca se vuelve a mostrar), es **por empresa**, y se descifra **solo al momento de llamar a Claude**. Si no hay key en config, se cae al `ANTHROPIC_API_KEY` de env (compatibilidad con lo actual).

## Decisiones (del brainstorming)

1. **Cifrado real, no base64.** AES-256-GCM (con IV y tag de autenticación). base64 se descarta por no ser protección.
2. **Llave maestra en env** (`CONFIG_SECRET`): único secreto que queda en env; ya no la API key. En BD/backups el secreto queda **cifrado e inservible** sin esta llave.
3. **Write-only en la UI:** el formulario nunca muestra el secreto guardado; muestra "•••• configurada" y un campo para reemplazarlo (vacío = no cambia).
4. **Por empresa, con fallback a env:** el bot usa `obtenerSecreto("anthropic.apiKey", empresaId)`; si no hay, usa `process.env.ANTHROPIC_API_KEY`. Permite key por empresa y cambiarla sin redeploy.
5. **Reutilizable:** el mismo mecanismo guardará el token de WhatsApp (spec del canal).

## Componentes

### 1. Cifrado puro — `src/lib/domain/crypto.ts`
- `cifrar(texto: string): string` y `descifrar(blob: string): string` con **AES-256-GCM**.
- Formato del blob: `base64(iv).base64(tag).base64(ciphertext)` (IV aleatorio de 12 bytes por cifrado).
- La clave se deriva de `process.env.CONFIG_SECRET` (p. ej. `scrypt`/`sha256` a 32 bytes). Si falta `CONFIG_SECRET`, `cifrar`/`descifrar` lanzan un error claro.
- Lógica testeable: `descifrar(cifrar(x)) === x`; dos cifrados del mismo texto dan blobs distintos (IV aleatorio); un blob alterado falla el tag (lanza).

### 2. Servicio de secretos — en `src/lib/services/configuracion.ts`
- `guardarSecreto(clave, valorPlano, empresaId, ctx)`: guarda `{ __secreto: true, cifrado: cifrar(valorPlano) }` en `valor` (vx41), auditado. **Nunca** registra el valor en claro (la auditoría guarda solo `{ clave, secreto: true }`, no el contenido).
- `obtenerSecreto(clave, empresaId): Promise<string | null>`: lee la fila, descifra y devuelve el texto; `null` si no hay.
- `secretoConfigurado(clave, empresaId): Promise<boolean>`: si existe (para mostrar "configurada" sin revelar el valor).
- El getter genérico `obtenerConfig` **no** expone secretos como texto (devuelve el objeto marcado; los secretos se leen solo por `obtenerSecreto`).

### 3. UI — `src/app/(app)/configuracion/`
- Nuevo campo en la página de Configuración: **"API key de Claude"** (input type password). Si ya hay una (`secretoConfigurado`), el placeholder dice "•••• configurada" y el campo va vacío; **solo se guarda si el usuario escribe algo** (vacío = no cambia). El valor guardado nunca se manda al cliente.
- Server action `guardarSecretoBotAction`: si el campo viene con texto, `guardarSecreto("anthropic.apiKey", texto, empresaId)`. Permiso `configuracion.editar`.

### 4. Bot — usa la key de config
- `src/lib/bot/cliente-claude.ts`: `pedirPedido(prompt, imagenes, apiKey?)` usa `createAnthropic({ apiKey })` (de `@ai-sdk/anthropic`) cuando hay `apiKey`; si no, el `anthropic` por defecto (lee env).
- `src/lib/bot/interpretar.ts`: `interpretarPedido(empresaId, ...)` resuelve la key: `apiKey = await obtenerSecreto("anthropic.apiKey", empresaId) ?? undefined` y se la pasa a `pedirPedido`. Con `undefined`, el SDK usa `ANTHROPIC_API_KEY` de env (fallback).

## Pruebas

- **Puras (vitest):** `crypto.ts` — round-trip (`descifrar(cifrar(x))===x`), IVs distintos en dos cifrados, blob alterado lanza. (Se setea `CONFIG_SECRET` en el test.)
- **Manual (con la app):** en Configuración, guardar una API key → el formulario muestra "•••• configurada" y nunca el valor; el asistente sigue respondiendo (ahora usando la key de config); borrar la de env y comprobar que sigue funcionando con la de config.
- Integración que toca BD: gitignored (convención).

## Fuera de alcance

- **Token de WhatsApp y credenciales del canal** (van en el spec del canal, usando este mismo `guardarSecreto`/`obtenerSecreto`).
- **Rotación** de la llave maestra (`CONFIG_SECRET`) — si se cambia, los secretos guardados dejan de descifrar y hay que recapturarlos; se documenta, no se automatiza.
- Cifrado de los flags no-secretos (siguen en claro; no lo necesitan).

## Nota operativa

Hay que definir `CONFIG_SECRET` en `.env.local` (local) y en **Vercel** (Production) antes de guardar secretos. Sin él, `cifrar`/`descifrar` lanzan. El bot, sin key en config y sin `ANTHROPIC_API_KEY`, devuelve el error amable ya existente.
