# Feature — Pagos (Payments)

- **Grupo:** B (operaciones internas del viaje)
- **Estado actual:** ⚠️ Stub. Existe `PaymentsController` con rutas `/trips/:tripId/payments` que devuelven "Not implemented yet". Falta el service.

## Alcance

Registrar transferencias entre integrantes para saldar deudas dentro de un viaje.

**Entra:** registrar un pago deudor→acreedor, listar pagos del viaje, borrar un pago. Cada pago afecta los balances.
**No entra:** el cálculo del neto ni la sugerencia de liquidación (feature balances); aquí solo se registran los pagos reales.

## Requerimientos funcionales

- RF-1: Registrar un `Payment` con `debtorId`, `creditorId`, `amount`, `note?`, `date`.
- RF-2: Listar los pagos del viaje.
- RF-3: Borrar un pago (soft-delete) y disparar recálculo de balances.

## Restricciones y reglas de negocio (FIRME)

- Requiere pertenencia al viaje (403 si no).
- **Deudor y acreedor deben ser participantes** del viaje; deben ser distintos; `amount > 0`.
- El pago está en la **moneda base** del viaje (BR03). Si se quisiera otra moneda, sería un cambio de alcance (no contemplado).
- **Soft-delete:** lecturas filtran `deletedAt: null`; borrar recalcula balances (ADR-0002).
- Registrar/borrar un pago **modifica el balance** de deudor y acreedor (ADR-0002): registrar reduce la deuda; borrar la revierte.
- Quién puede registrar/borrar pagos (¿el propio deudor?, ¿cualquier participante?, ¿CREATOR/SUPERVISOR?) → a fijar por el grupo.

## Endpoints orientativos (ya ruteados, a implementar)

| Método | Ruta | Notas |
|---|---|---|
| GET | `/trips/:tripId/payments` | Lista. |
| POST | `/trips/:tripId/payments` | Registra pago + recálculo. |
| DELETE | `/trips/:tripId/payments/:id` | Soft-delete + recálculo. |

## Checklist de Swagger

- [ ] `@ApiTags('Payments')`, `@ApiBearerAuth()`.
- [ ] `@ApiOperation` + `@Api*Response` con sobre `{data}`: 400 (deudor=acreedor / no participante / monto inválido), 403, 404, 204 al borrar.
- [ ] `@ApiParam('tripId'/'id')`, `@ApiBody` con el DTO de pago.
- [ ] `@ApiProperty` en DTO y entidad de pago.

## Frontend

- Página `(authenticated)/payments/` (hoy placeholder) y/o sección dentro de `trips/[id]`.
- Formulario: seleccionar deudor y acreedor (de los integrantes), monto, nota. Idealmente prellenar desde la sugerencia de liquidación (feature balances). Mostrar montos con `formatCurrency()`.

## ADRs relacionadas

- [ADR-0002](../../adr/0002-calculo-y-almacenamiento-de-balances.md) (efecto en balances).
- [ADR-0003](../../adr/0003-simplificacion-de-deudas.md) (los pagos materializan la liquidación sugerida).

## Definición de Hecho

- Registrar/listar/borrar pagos con validaciones. Recálculo de balances en cada escritura. Swagger completo. Front con formulario y listado funcionales.

## Pendiente de definir en plan mode del grupo

- Permisos de registro/borrado por rol.
- Si el formulario se prellena desde la liquidación sugerida (integración con balances).
- DTO exacto y respuestas.
