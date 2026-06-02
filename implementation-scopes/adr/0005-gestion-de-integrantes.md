# ADR-0005 — Gestión de integrantes

- **Estado:** Aceptada
- **Features afectadas:** integrantes (A), balances (B).

## Contexto

Hay que poder agregar/quitar participantes de un viaje y gestionar sus roles. El modelo es `Participation (userId, tripId, role, currentBalance)` con `@@unique([userId, tripId])`. Existe `GET /users/search?q=` que busca usuarios registrados por email. No hay endpoints de participación todavía. Decisiones del usuario: **solo usuarios ya registrados** (no invitaciones por email a no registrados).

## Opciones

- **A quién se agrega:** (1) solo usuarios registrados vía búsqueda por email; (2) invitar por email a personas sin cuenta con invitaciones pendientes.
- **Quién puede gestionar integrantes:** (1) solo `CREATOR`; (2) `CREATOR` y `SUPERVISOR`.

## Decisión

- **Solo usuarios registrados.** Para agregar un integrante se busca con `GET /users/search` y se crea una `Participation` con el `userId` resultante. No hay invitaciones a no registrados (queda fuera de alcance; podría ser un ADR futuro).
- **Permisos (firme):**
  - **Agregar** integrante y **cambiar rol**: `CREATOR`. Si el grupo decide habilitar también `SUPERVISOR`, debe documentarlo y reflejarlo en Swagger; por defecto solo `CREATOR` (alineado con BR02).
  - **Quitar** integrante: `CREATOR`.
  - **Abandonar** el viaje: el propio participante sobre sí mismo. El `CREATOR` no puede abandonar sin transferir la propiedad (caso a definir por el grupo).
- **Regla de salida (BR04/BR05, firme):** no se puede quitar a un participante ni puede abandonar si su `currentBalance ≠ 0`. Requiere balances consistentes (ADR-0002) → **409 Conflict** o **400** con mensaje claro.
- **Unicidad:** re-agregar un usuario ya participante → conflicto (`@@unique`, P2002 → 409).

## Consecuencias

- **A definir en el plan mode** del grupo A (integrantes):
  - Superficie de endpoints (orientativo: `POST/PATCH/DELETE /trips/:tripId/participants...`).
  - Caso del `CREATOR` que quiere salir (transferencia de rol vs prohibido).
  - Si `SUPERVISOR` participa de la gestión.
  - Qué pasa con los `ExpenseDetail`/`Payment` históricos al quitar a alguien (se exige balance 0, así que no quedan deudas; pero el histórico de gastos donde participó permanece).
- El `CREATOR` se registra automáticamente como `Participation` con rol `CREATOR` al crear el viaje (ya ocurre hoy en `TripsService`).
