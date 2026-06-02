# ADR-0009 — Estructura del DTO de creación de gastos

- **Estado:** Aceptada
- **Grupo:** B
- **Features afectadas:** gastos (B).

## Contexto

El endpoint `POST /trips/:tripId/expenses` debe recibir un DTO que soporte:
- Múltiples pagadores (varios participantes pueden haber pagado parte del gasto)
- Tres tipos de split: EQUAL, EXACT, PERCENT
- Selección manual de participantes para EQUAL
- Los campos deben ser validables con `class-validator`

## Decisión

Un único DTO `CreateExpenseDto` con campos condicionales según `splitType`:

### Campos comunes

```typescript
{
  description?: string          // Opcional, max 500 chars
  originalAmount: number        // Monto original, > 0
  originalCurrency: string      // Código ISO 4217, 3 letras
  date?: string                 // ISO date, opcional (default: now)
  category?: string             // Opcional, max 100 chars
  splitType: 'EQUAL' | 'EXACT' | 'PERCENT'
  payers: Array<{               // Quiénes pagaron
    userId: string
    amountPaid: number          // Cuánto pagó esta persona
  }>
  manualExchangeRate?: number   // Tasa manual opcional (fallback)
}
```

### Campos por split type

- **EQUAL**: `participantIds: string[]` — lista de UUIDs de participantes a incluir en el reparto equitativo.
- **EXACT**: `exactShares: Array<{ userId: string; amountOwed: number }>` — montos exactos que debe cada uno.
- **PERCENT**: `percentShares: Array<{ userId: string; percent: number }>` — porcentajes que debe cada uno.

### Validaciones (en service, no en decorators)

- `Σ amountPaid === originalAmount`
- Todos los `userId` referenciados deben ser participantes del viaje
- `EXACT`: `Σ amountOwed === baseAmount` (post-conversión)
- `PERCENT`: `Σ percent === 100`
- Residual centavo: en EQUAL, los céntimos sobrantes se asignan uno a uno empezando por el primer participante. En PERCENT, el último participante absorbe el residual.

## Consecuencias

- La validación cross-campo se realiza en el service, no en el DTO.
- Se usa `ExpenseSplitType` enum de Prisma para `splitType`.
- Los montos se operan en `number` hasta llegar a la DB donde Prisma los convierte a Decimal.
