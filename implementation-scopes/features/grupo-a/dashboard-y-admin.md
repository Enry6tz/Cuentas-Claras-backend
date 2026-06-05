# Feature — Dashboard y admin global

- **Grupo:** A (núcleo global)
- **Estado actual:** ✅ Implementado. Dashboard del usuario con datos reales (trips activos, balance total, actividad reciente). Admin global con bypass de solo lectura (`AdminGuard`, `GET /admin/trips`, `PATCH /admin/trips/:id`, `DELETE /admin/trips/:id`). Detección de admin via `publicMetadata.role === 'admin'` del JWT de Clerk.

## Alcance

Vista de inicio del usuario (resumen de sus viajes/balances) y **bypass de administrador global** para una vista general del sistema.

**Entra:** dashboard del usuario (sus viajes activos, su balance agregado, actividad reciente); detección del admin global vía Clerk y su dashboard general.
**No entra:** la lógica de cálculo de balances (Grupo B, se consume); endpoints administrativos destructivos (por defecto el admin es solo lectura, ADR-0001).

## Requerimientos funcionales

- RF-1: Mostrar al usuario sus viajes (activos / total) y un resumen de su balance.
- RF-2: Mostrar actividad/atajos relevantes (crear viaje, ir a un viaje).
- RF-3: Detectar si el usuario es **admin global** (flag en `publicMetadata` de Clerk, leído del JWT).
- RF-4: Para el admin global, ofrecer una **vista general** (todos los viajes / métricas agregadas) haciendo bypass de la pertenencia, **solo lectura**.

## Restricciones y reglas de negocio

- **ADR-0001 (firme):** el admin global NO es un rol de DB; es metadata de Clerk validada en el JWT. El bypass aplica a **lectura/dashboard general**, no a acciones destructivas (salvo que se documente lo contrario explícitamente).
- Un usuario normal solo ve sus propios viajes y balances.
- Los datos del dashboard se derivan de features existentes (`/trips`) y de balances (Grupo B); esta feature **no recalcula**, solo agrega/presenta.

## Endpoints orientativos (a confirmar en plan mode)

- Reutiliza `GET /trips` para el dashboard del usuario.
- Para el admin: un endpoint de listado/métricas global (tentativo, p.ej. `GET /admin/trips` o `GET /trips?all=true`) protegido y que respete el flag de admin. A definir por el grupo.

## Checklist de Swagger

- [x] `@ApiTags('Dashboard'/'Admin')`, `@ApiBearerAuth()`.
- [x] `@ApiOperation` + `@Api*Response` con sobre `{data}`; documentar 403 para no-admins en endpoints admin.
- [x] `@ApiProperty` en los DTOs de respuesta agregada.

## Frontend

- Página `(authenticated)/dashboard/`: reemplazar placeholders por datos reales (viajes, balance, actividad).
- Vista/condición para admin global (mostrar la vista general solo si el flag está presente).
- Usa TanStack Query; respeta el sobre `{data}`.

## ADRs relacionadas

- [ADR-0001](../../adr/0001-roles-y-admin-global.md) (decisión principal: admin vía Clerk metadata, bypass de solo lectura).
- [ADR-0002](../../adr/0002-calculo-y-almacenamiento-de-balances.md) (fuente del balance agregado).

## Definición de Hecho

- Dashboard del usuario con datos reales. Detección de admin desde el JWT (no manipulable). Vista admin de solo lectura. Swagger completo en endpoints nuevos.

## Pendiente de definir en plan mode del grupo

- ~~Nombre exacto del claim/metadata de admin y cómo se propaga al `request.user`.~~ ✅ Resuelto: `publicMetadata.role === 'admin'` en Clerk JWT, leído por `ClerkJwtStrategy` y expuesto en `request.user.publicMetadata.admin`.
- ~~Qué métricas agregadas muestra el admin y desde qué endpoint.~~ ✅ Resuelto: `GET /admin/trips` — lista de todos los viajes del sistema con participantes y gastos.
- ~~Qué consultas alimentan el dashboard del usuario (coordinar con balances).~~ ✅ Resuelto: `GET /dashboard` — viajes del usuario, actividad reciente (últimos 10 cambios), balance total agregado.
