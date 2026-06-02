# Feature — Viajes (Trips)

- **Grupo:** A (núcleo global)
- **Estado actual:** ✅ Implementado (backend + frontend). Tarea: documentar restricciones, verificar **Swagger** completo.

## Alcance

El viaje como contenedor: crearlo, listarlo, ver su detalle, editarlo, finalizarlo y borrarlo (soft-delete).

**Entra:** CRUD de `Trip`, cambio de `status` (`ACTIVE → FINALIZED`), soft-delete, listado de los viajes del usuario.
**No entra:** integrantes (feature aparte), gastos/pagos/balances (Grupo B).

## Requerimientos funcionales

- RF-1: Crear viaje con `name` (req), `description?`, `startDate?`, `endDate?`, `baseCurrency` (req, ISO 3 letras). Al crear, el creador queda como `Participation` con rol `CREATOR`.
- RF-2: Listar los viajes donde el usuario es participante, con `_count` de participaciones y gastos.
- RF-3: Ver detalle del viaje con sus participaciones (y datos públicos de cada usuario). 403 si no es participante.
- RF-4: Editar el viaje (incluye `status` para finalizar).
- RF-5: Borrar el viaje (soft-delete, `deletedAt`), respuesta 204.

## Restricciones y reglas de negocio

- Todas las rutas bajo `ClerkAuthGuard`.
- **BR02:** solo el `CREATOR` puede **editar**, **finalizar** y **borrar** el viaje (`assertIsCreator` en `TripsService`). Otros roles → 403.
- Acceso al detalle: solo participantes (o admin global por bypass de lectura, ADR-0001) → si no, 403.
- Soft-delete: las consultas filtran `deletedAt: null`.
- **BR03:** `baseCurrency` define la moneda de todos los reportes/balances del viaje.

## Endpoints orientativos (ya existentes)

| Método | Ruta | Rol | Notas |
|---|---|---|---|
| GET | `/trips` | participante | Lista del usuario. |
| POST | `/trips` | autenticado | Crea + registra CREATOR. |
| GET | `/trips/:id` | participante | Detalle + participaciones. |
| PATCH | `/trips/:id` | CREATOR | Incluye `status`. |
| DELETE | `/trips/:id` | CREATOR | Soft-delete, 204. |

## Checklist de Swagger

- [ ] `@ApiTags('Trips')`, `@ApiBearerAuth()`.
- [ ] `@ApiOperation` + `@Api*Response` (con sobre `{data}`) incluyendo 403 (no CREATOR / no participante), 404, 204.
- [ ] `@ApiParam('id')`, `@ApiBody` en create/update.
- [ ] `@ApiProperty` en `CreateTripDto`, `UpdateTripDto` y `TripEntity` (`@ApiExtraModels`).

## Frontend

- Páginas: `(authenticated)/trips/` (lista) y `(authenticated)/trips/[id]` (detalle).
- Componente: `trips/trip-form-dialog.tsx` (crear/editar). API client: `lib/api/trips.ts`.

## ADRs relacionadas

- [ADR-0001](../../adr/0001-roles-y-admin-global.md) (acceso de admin global de solo lectura).

## Definición de Hecho

- Swagger completo. Restricciones de rol verificadas (CREATOR-only para mutaciones). Soft-delete respetado en lecturas.

## Pendiente de definir en plan mode del grupo

- Reglas al **finalizar** un viaje (¿bloquea nuevos gastos/pagos?, coordinar con Grupo B).
- Qué pasa con un viaje finalizado en el dashboard y en balances.
