# Feature — Balances y liquidación

- **Grupo:** B (operaciones internas del viaje)
- **Estado actual:** ❌ A construir. No existe módulo de balances; solo el campo denormalizado `Participation.currentBalance`.

## Alcance

Calcular cuánto debe/le deben a cada participante y sugerir cómo saldar minimizando transacciones.

**Entra:** cálculo del balance neto por participante (desde `ExpenseDetail` + `Payment`), recálculo (tras escrituras y en batch), exposición de "quién debe a quién" y de la liquidación simplificada.
**No entra:** crear gastos/pagos (features propias); esta feature lee y agrega.

## Requerimientos funcionales

- RF-1: Calcular el balance neto de cada participante del viaje en moneda base (BR03).
- RF-2: Mantener `Participation.currentBalance` como caché derivada, recalculada tras crear/borrar gastos o pagos.
- RF-3: Recálculo **batch** como red de seguridad (BR01), vía `ScheduleModule`.
- RF-4: Exponer la lista de saldos por participante.
- RF-5: Exponer la **liquidación simplificada** (transferencias sugeridas que minimizan el número de pagos, ADR-0003).

## Restricciones y reglas de negocio (FIRME)

- **Fuente de verdad (ADR-0002):** `ExpenseDetail` + `Payment`; `currentBalance` es caché, no autoritativa. Considerar solo `deletedAt: null`.
- **Recálculo:** tras cada escritura relevante de gasto/pago, y en batch. Borrar un gasto/pago obliga a recalcular.
- **Liquidación (ADR-0003):** algoritmo greedy min-cash-flow; determinismo en empates; sin saldos fantasma por redondeo.
- La regla **BR04/BR05** (no salir/quitar con balance ≠ 0) depende de que el balance esté consistente; el endpoint de balances es la fuente que consulta integrantes.
- Requiere pertenencia al viaje (lectura); admin global puede leer (ADR-0001).

## Endpoints orientativos (a confirmar en plan mode)

| Método | Ruta (tentativa) | Notas |
|---|---|---|
| GET | `/trips/:tripId/balances` | Saldo por participante. |
| GET | `/trips/:tripId/balances/settlement` | Transferencias sugeridas (ADR-0003). |

> Superficie orientativa; el grupo decide rutas y forma de respuesta en su plan mode.

## Checklist de Swagger

- [ ] `@ApiTags('Balances')`, `@ApiBearerAuth()`.
- [ ] `@ApiOperation` + `@Api*Response` con sobre `{data}`: 403, 404.
- [ ] `@ApiProperty` en los DTOs de saldo y de transferencia sugerida.

## Frontend

- Sección de balances en `trips/[id]`: lista de saldos por integrante y bloque de "liquidación sugerida" (deudor → acreedor, monto). Botón para registrar el pago sugerido (enlaza con feature pagos). Montos con `formatCurrency()`.

## ADRs relacionadas

- [ADR-0002](../../adr/0002-calculo-y-almacenamiento-de-balances.md) (cálculo/almacenamiento).
- [ADR-0003](../../adr/0003-simplificacion-de-deudas.md) (algoritmo de liquidación).
- [ADR-0006](../../adr/0006-tipos-de-division-de-gasto.md) (de dónde salen `amountOwed/amountPaid`).

## Definición de Hecho

- Cálculo correcto (suma de saldos = 0). Recálculo tras escrituras + job batch. Liquidación determinista sin saldos fantasma. Swagger completo. Front con saldos y sugerencias.

## Pendiente de definir en plan mode del grupo

- Convención de signo del balance (positivo/negativo).
- Recálculo por viaje completo vs incremental, y frecuencia del job batch.
- Forma exacta de la respuesta de saldos y de settlement; manejo de empates y centavo residual.
