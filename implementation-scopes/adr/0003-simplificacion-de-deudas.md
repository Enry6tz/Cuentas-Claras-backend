# ADR-0003 — Simplificación de deudas (BR03b)

- **Estado:** Aceptada
- **Features afectadas:** balances (B), pagos (B).

## Contexto

Con los balances netos por participante (ADR-0002), hay que sugerir cómo saldar las deudas. BR03b pide **minimizar el número de transacciones**. Si A debe a B, B debe a C, etc., un esquema ingenuo (cada deuda se paga directo) genera muchas transferencias innecesarias.

## Opciones

1. **Neteo por pares**: para cada par de usuarios, netear lo que se deben mutuamente. Reduce algo, pero no minimiza globalmente.
2. **Min-cash-flow (greedy)**: con los saldos netos del viaje, emparejar repetidamente al mayor deudor con el mayor acreedor, transfiriendo `min(|deudor|, acreedor)`, hasta que todos queden en 0. Minimiza prácticamente el número de transferencias.

## Decisión

**Opción 2 — algoritmo greedy min-cash-flow** sobre los saldos netos por participante:

1. Calcular el saldo neto de cada participante (de ADR-0002). La suma debe dar 0.
2. Separar deudores (saldo < 0) y acreedores (saldo > 0).
3. Repetir: tomar el mayor deudor y el mayor acreedor, emitir una transferencia por `min(|deudor|, acreedor)`, actualizar ambos saldos, descartar los que llegan a 0.
4. Devolver la lista de transferencias sugeridas (deudor → acreedor, monto, en moneda base del viaje, BR03).

## Consecuencias

- **A definir en el plan mode** del grupo B (balances):
  - Determinismo en empates (mismo monto entre varios deudores/acreedores) para que la salida sea estable; ordenar por un criterio fijo (p.ej. `userId`).
  - Manejo de redondeo: el "último centavo" no debe dejar saldos fantasma (alinear con ADR-0006).
  - La salida es **sugerencia**; el saldado real ocurre cuando se registran `Payment` (grupo B, pagos). Registrar un pago recalcula balances (ADR-0002).
- El resultado se expone como parte de la lectura de balances/settlement del viaje (superficie a confirmar por el grupo).
- Complejidad O(n log n) por viaje; suficiente para tamaños de grupo reales.
