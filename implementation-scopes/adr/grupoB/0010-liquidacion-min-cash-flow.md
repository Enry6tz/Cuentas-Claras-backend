# ADR-0010 — Algoritmo de liquidación (min-cash-flow)

- **Estado:** Aceptada
- **Grupo:** B
- **Features afectadas:** balances (B).

## Contexto

El endpoint `GET /trips/:tripId/balances/settlement` debe devolver una lista de transferencias sugeridas que minimice el número de pagos para saldar todas las deudas.

## Decisión

**Algoritmo greedy min-cash-flow:**

1. Se obtienen los balances netos de cada participante (desde `Participation.currentBalance`, que ya está actualizado).
2. Se separan en dos listas:
   - **Deudores** (balance < 0): deben dinero. Se ordenan por monto descendente (mayor deuda primero).
   - **Acreedores** (balance > 0): les deben dinero. Se ordenan por monto descendente (mayor crédito primero).
3. Se recorren ambas listas simultáneamente con dos punteros:
   - Por cada par (deudor, acreedor), la transferencia es por `min(|deuda|, crédito)`.
   - Se resta ese monto de ambos lados.
   - Si el deudor queda en 0, avanza el puntero de deudores.
   - Si el acreedor queda en 0, avanza el puntero de acreedores.
4. Se ignoran montos < $0.01 (residuales por redondeo).

### Formato de respuesta

```typescript
SettlementSuggestion[] {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: string    // Decimal como string, 2 decimales
}
```

### Determinismo

- En caso de empate en montos, se ordena alfabéticamente por `userName` (estable).
- El algoritmo siempre produce la misma salida para los mismos balances.

## Consecuencias

- La fuente de verdad son `ExpenseDetail` + `Payment` (ambos con `deletedAt: null`), cacheados en `Participation.currentBalance`.
- No se modifican datos de la DB al consultar settlement; solo lectura.
- El frontend puede mostrar "X le debe $Y a Z" con un botón para registrar el pago sugerido.
