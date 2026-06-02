# ADR-0002 — Cálculo y almacenamiento de balances

- **Estado:** Aceptada
- **Features afectadas:** balances (B), gastos (B), pagos (B), integrantes (A).

## Contexto

`Participation.currentBalance` (`Decimal(12,2)`, default 0) ya existe como campo denormalizado. Las fuentes primarias del saldo son `ExpenseDetail` (`amountPaid`, `amountOwed` por usuario y gasto) y `Payment` (deudor→acreedor). Hay que decidir si `currentBalance` es la fuente de verdad o una caché, y cuándo se recalcula. La regla BR01 dice que los balances pueden calcularse en batch (no tiempo real).

## Opciones

1. **`currentBalance` como fuente de verdad**: actualizarlo incrementalmente en cada escritura de gasto/pago. Rápido de leer, pero frágil ante borrados/ediciones y propenso a "deriva" (drift) si algún path no lo actualiza.
2. **Cálculo on-the-fly** siempre desde `ExpenseDetail` + `Payment`. Siempre correcto, pero más caro en lecturas frecuentes.
3. **Híbrido (caché recalculable)**: la fuente de verdad son `ExpenseDetail` + `Payment`; `currentBalance` es una caché que se recalcula (a) tras cada escritura relevante y/o (b) en batch (BR01).

## Decisión

**Opción 3 (híbrido).**
- **Fuente de verdad:** `ExpenseDetail` y `Payment`. El balance de un participante = `Σ(amountPaid − amountOwed)` de sus `ExpenseDetail` del viaje, ajustado por los `Payment` donde es deudor/acreedor.
- `currentBalance` es **caché derivada**, no autoritativa.
- **Recálculo:** se dispara tras crear/borrar un gasto o pago del viaje, y además existe un **job batch** (vía `ScheduleModule`, hoy sin jobs) como red de seguridad (BR01). El recálculo de un viaje recomputa todas sus `Participation.currentBalance`.

## Consecuencias

- **A definir en el plan mode** del grupo B (balances):
  - La fórmula exacta y el signo (¿positivo = le deben, negativo = debe?).
  - Si el recálculo es por viaje completo (simple, recomendado) o incremental.
  - Frecuencia del job batch y si corre por viaje activo.
  - Cómo se expone el balance: por participante y el "quién debe a quién" (ver ADR-0003).
- La regla **BR04/BR05** (no salir/quitar con balance ≠ 0) lee `currentBalance`; por eso debe estar recalculado y consistente antes de permitir la salida. El doc de integrantes apunta aquí.
- Borrar (soft-delete) un gasto/pago **debe** disparar recálculo; no basta con marcar `deletedAt`.
- Las lecturas de balance deben considerar solo registros con `deletedAt: null`.
