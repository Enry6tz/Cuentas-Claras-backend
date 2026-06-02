# Feature — Gastos (Expenses)

- **Grupo:** B (operaciones internas del viaje)
- **Estado actual:** ⚠️ Stub. Existe `ExpensesController` con rutas `/trips/:tripId/expenses` que devuelven "Not implemented yet". Falta el service y la lógica.

## Alcance

Registrar y consultar gastos dentro de un viaje, con división entre participantes y soporte multimoneda.

**Entra:** crear gasto (split `EQUAL/EXACT/PERCENT`), multimoneda con snapshot de tipo de cambio, listar, detalle, borrar (soft-delete). Genera `ExpenseDetail` por participante.
**No entra:** el cálculo del balance neto del viaje (feature balances), la obtención de la tasa (feature moneda; se consume aquí).

## Requerimientos funcionales

- RF-1: Crear un gasto con `description?`, `originalAmount`, `originalCurrency`, `date`, `category?`, `splitType`, y el reparto entre participantes (quién pagó y cuánto, quién debe y cuánto).
- RF-2: Si `originalCurrency ≠ baseCurrency`, convertir vía feature **moneda** y guardar snapshot `exchangeRate` + `baseAmount` (ADR-0004).
- RF-3: Generar los `ExpenseDetail` según `splitType` (ADR-0006).
- RF-4: Listar los gastos del viaje y ver el detalle de uno.
- RF-5: Borrar un gasto (soft-delete) y disparar recálculo de balances.

## Restricciones y reglas de negocio (FIRME)

- Requiere pertenencia al viaje (403 si no). Todos los `userId` del reparto deben ser participantes del viaje.
- **División y validación (ADR-0006):** `Σ amountPaid` = total; `Σ amountOwed` = `baseAmount`; `EXACT` debe sumar `baseAmount`; `PERCENT` debe sumar 100; asignación determinista del centavo residual.
- **Moneda (ADR-0004):** snapshot inmutable de la tasa al crear; si `originalCurrency == baseCurrency` → `exchangeRate = 1`. Fallback manual/error si la API falla.
- **Dinero:** operar en `Decimal`, nunca `number` (transversal §4).
- **Soft-delete:** lecturas filtran `deletedAt: null`; borrar recalcula balances (ADR-0002).
- Quién puede crear/borrar gastos (¿cualquier participante?, ¿solo el creador del gasto?, ¿CREATOR/SUPERVISOR?) → a fijar por el grupo (ver pendientes).

## Endpoints orientativos (ya ruteados, a implementar)

| Método | Ruta | Notas |
|---|---|---|
| GET | `/trips/:tripId/expenses` | Lista. |
| POST | `/trips/:tripId/expenses` | Crea + genera `ExpenseDetail`. |
| GET | `/trips/:tripId/expenses/:id` | Detalle con reparto. |
| DELETE | `/trips/:tripId/expenses/:id` | Soft-delete + recálculo. |

## Checklist de Swagger

- [ ] `@ApiTags('Expenses')`, `@ApiBearerAuth()`.
- [ ] `@ApiOperation` + `@Api*Response` con sobre `{data}`: 400 (reparto inválido), 403, 404, 502/400 si la conversión falla.
- [ ] `@ApiParam('tripId'/'id')`, `@ApiBody` con el DTO de creación (incluye `splitType` y reparto).
- [ ] `@ApiProperty` en DTOs y en la entidad de gasto + `ExpenseDetail`.

## Frontend

- Página `(authenticated)/expenses/` (hoy placeholder) y/o sección de gastos dentro de `trips/[id]`.
- Formulario de gasto (Zod + React Hook Form recomendado): monto, moneda, categoría, tipo de split y reparto entre integrantes. Mostrar montos con `formatCurrency()`.

## ADRs relacionadas

- [ADR-0006](../../adr/0006-tipos-de-division-de-gasto.md) (división y validación).
- [ADR-0004](../../adr/0004-conversion-de-moneda.md) (snapshot de tasa).
- [ADR-0002](../../adr/0002-calculo-y-almacenamiento-de-balances.md) (recálculo al crear/borrar).

## Definición de Hecho

- CRUD de gastos con validación de reparto y conversión. Recálculo de balances tras crear/borrar. Swagger completo. Front con formulario y listado funcionales.

## Pendiente de definir en plan mode del grupo

- DTO exacto por cada `splitType` (estructura del reparto y de "quién pagó").
- Permisos de creación/borrado de gastos por rol.
- Si se permite **editar** un gasto (y entonces el recálculo correspondiente).
- Asignación precisa del centavo residual.
