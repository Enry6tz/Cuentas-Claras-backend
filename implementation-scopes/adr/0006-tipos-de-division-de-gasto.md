# ADR-0006 — Tipos de división de gasto

- **Estado:** Aceptada
- **Features afectadas:** gastos (B), balances (B).

## Contexto

`Expense.splitType` es un enum `EQUAL | EXACT | PERCENT`. Cada gasto genera `ExpenseDetail` por participante con `amountPaid` (cuánto puso) y `amountOwed` (cuánto le corresponde pagar). Hay que fijar cómo se generan y validan esos detalles para que los balances cuadren. El monto de referencia para el reparto es `baseAmount` (en moneda base, tras conversión — ADR-0004).

## Decisión — reglas firmes de validación

Para todo gasto, sobre el conjunto de `ExpenseDetail`:

- **Invariante de pago:** `Σ amountPaid` (todos los participantes) = monto total del gasto. Normalmente uno o varios pagaron; la suma de lo pagado iguala el total.
- **Invariante de deuda:** `Σ amountOwed` = `baseAmount` (lo que se reparte). El balance individual deriva de `amountPaid − amountOwed` (ADR-0002).
- **Participantes válidos:** todo `userId` en los detalles debe tener `Participation` en el viaje del gasto.

Cómo se calcula `amountOwed` según `splitType`:
- **EQUAL:** `baseAmount` se divide en partes iguales entre los participantes incluidos.
- **EXACT:** el request trae el monto exacto que debe cada uno; se valida que sumen `baseAmount`.
- **PERCENT:** el request trae porcentajes por participante; deben sumar 100; `amountOwed = baseAmount × pct`.

**Redondeo (último centavo):** al dividir, los centavos sobrantes por redondeo a `Decimal(12,2)` se asignan de forma determinista (p.ej. al primer/último participante por orden de `userId`) para que `Σ amountOwed` cuadre exactamente con `baseAmount`. Sin esto, los balances quedan con saldos fantasma.

## Consecuencias

- **A definir en el plan mode** del grupo B (gastos):
  - Forma exacta del DTO por cada `splitType` (lista de participantes con monto/porcentaje, quién pagó y cuánto).
  - Estrategia precisa de asignación del centavo residual.
  - Si se permite que un participante quede con `amountOwed = 0` (incluido pero no le toca pagar).
  - Validaciones de error (suma incorrecta → 400) y su documentación en Swagger.
- Todas las operaciones de suma se hacen en `Decimal`, no en `number` (ver `transversal.md` §4).
- Editar un gasto (si se permite) o borrarlo (soft-delete) debe disparar recálculo de balances (ADR-0002).
