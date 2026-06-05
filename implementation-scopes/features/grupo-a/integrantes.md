# Feature — Integrantes (Participations)

- **Grupo:** A (núcleo global)
- **Estado actual:** ✅ **Implementado.** `ParticipantsService` con 5 métodos (listar, agregar, cambiar rol, quitar, abandonar). Validación BR04/BR05 (balance = 0). Frontend con `ParticipantsList`, `AddParticipantDialog`, `ParticipantActions`.

## Alcance

Gestionar quién está dentro de un viaje y con qué rol.

**Entra:** agregar participante (solo usuarios registrados), cambiar rol, quitar participante, abandonar el viaje, listar integrantes del viaje.
**No entra:** invitaciones por email a no registrados (fuera de alcance, ADR-0005); el cálculo del balance (Grupo B, se consume aquí como restricción).

## Requerimientos funcionales

- RF-1: Listar integrantes de un viaje con su rol y balance.
- RF-2: Agregar un integrante buscándolo por email (`GET /users/search`) y creando su `Participation` (rol inicial `MEMBER`).
- RF-3: Cambiar el rol de un integrante (`SUPERVISOR` / `MEMBER`).
- RF-4: Quitar a un integrante del viaje.
- RF-5: Que un integrante abandone el viaje por sí mismo.

## Restricciones y reglas de negocio (FIRME — ver ADR-0005)

- Solo se agregan **usuarios ya registrados** (resultado de `GET /users/search`). No hay invitaciones a no registrados.
- **Permisos:** **agregar**, **cambiar rol** y **quitar** los hace el `CREATOR` (BR02). Si el grupo decide habilitar `SUPERVISOR`, debe documentarlo explícitamente; por defecto solo `CREATOR`.
- **Abandonar:** el propio participante sobre sí mismo. El `CREATOR` no puede abandonar sin resolver la propiedad del viaje (caso a definir).
- **BR04/BR05 (regla de salida):** no se puede quitar ni abandonar si `currentBalance ≠ 0`. Requiere balance consistente (ADR-0002) → error 409/400 con mensaje claro.
- **Unicidad:** un usuario no puede participar dos veces en el mismo viaje (`@@unique([userId, tripId])`; conflicto P2002 → 409).
- Acceso a todo esto: requiere ser participante del viaje (o admin global de solo lectura).

## Endpoints orientativos (a confirmar en plan mode)

| Método | Ruta (tentativa) | Rol | Notas |
|---|---|---|---|
| GET | `/trips/:tripId/participants` | participante | Lista de integrantes. |
| POST | `/trips/:tripId/participants` | CREATOR | Body con `userId` (de search). |
| PATCH | `/trips/:tripId/participants/:userId` | CREATOR | Cambiar rol. |
| DELETE | `/trips/:tripId/participants/:userId` | CREATOR | Quitar (exige balance 0). |
| DELETE | `/trips/:tripId/participants/me` | self | Abandonar (exige balance 0). |

> Superficie orientativa; el grupo confirma rutas, DTOs y respuestas en su plan mode.

## Checklist de Swagger

- [x] `@ApiTags('Participants')`, `@ApiBearerAuth()`.
- [x] `@ApiOperation` + `@Api*Response` con sobre `{data}`: 403 (no CREATOR / no participante), 404, 409 (duplicado o balance≠0), 204 al quitar.
- [x] `@ApiParam('tripId'/'userId')`, `@ApiBody` con DTO de alta/cambio de rol.
- [x] `@ApiProperty` en los DTOs y en la entidad de participación.

## Frontend

- Sección de integrantes dentro de `(authenticated)/trips/[id]` (pestaña "Participantes"): `ParticipantsList` con roles y balance, `AddParticipantDialog` (búsqueda por nombre/email con debounce), `ParticipantActions` (cambiar rol/quitar/abandonar según rol del usuario actual).

## ADRs relacionadas

- [ADR-0005](../../adr/0005-gestion-de-integrantes.md) (decisión principal).
- [ADR-0002](../../adr/0002-calculo-y-almacenamiento-de-balances.md) (la regla de salida lee el balance).
- [ADR-0001](../../adr/0001-roles-y-admin-global.md) (roles por viaje).

## Definición de Hecho

- Endpoints con guard + chequeo de pertenencia y rol. Regla de balance=0 aplicada y testeada. Swagger completo. Front con la sección de integrantes funcional.

## Pendiente de definir en plan mode del grupo

- ~~Caso del `CREATOR` que quiere abandonar (transferir propiedad vs prohibido).~~ ✅ Resuelto: prohibido. CREATOR no puede abandonar.
- ~~Si `SUPERVISOR` puede gestionar integrantes.~~ ✅ Resuelto: no. Solo CREATOR puede agregar/cambiar rol/quitar.
- ~~Forma exacta de DTOs y respuestas.~~ ✅ Resuelto: `AddParticipantDto { userId }`, `ChangeRoleDto { role }`, `ParticipantEntity`.
- Helper reutilizable de "pertenencia + rol" (lo usa también Grupo B). — Resuelto parcialmente (cada service tiene su propio `assertIsParticipant`). Pendiente de extraer a guard common.
