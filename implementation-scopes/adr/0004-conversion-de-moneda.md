# ADR-0004 — Conversión de moneda

- **Estado:** Aceptada
- **Features afectadas:** moneda (B), gastos (B).

## Contexto

Un viaje tiene `baseCurrency`. Un gasto puede estar en cualquier moneda (`originalCurrency`, `originalAmount`) y debe convertirse a la base mediante `exchangeRate` (`Decimal(12,6)`), guardando `baseAmount` (`Decimal(12,2)`). Hoy no existe ningún `CurrencyService` ni integración externa, aunque el esquema soporta los campos. El PDF promete una "Exchange Rate API".

## Opciones

1. **Tasa manual**: el usuario ingresa `exchangeRate` al crear el gasto; el backend solo lo guarda. Simple, sin dependencias, pero depende del usuario.
2. **Exchange Rate API externa**: el backend consulta una API y guarda el snapshot de la tasa al momento del gasto. Más fiel, requiere cliente HTTP, manejo de errores y caché.

## Decisión

**Opción 2 — integrar una Exchange Rate API externa**, con snapshot y fallback:

- Al crear un gasto cuya `originalCurrency` ≠ `baseCurrency`, el backend obtiene la tasa de la API y guarda **snapshot** de `exchangeRate` y calcula `baseAmount = originalAmount × exchangeRate`.
- El snapshot es **inmutable** para ese gasto (no se recalcula si la tasa cambia después).
- **Fallback**: si la API falla / no cubre la moneda, se acepta `exchangeRate` manual en el request (o se rechaza el gasto con un error claro — a decidir por el grupo). Si `originalCurrency == baseCurrency`, `exchangeRate = 1` y `baseAmount = originalAmount` sin llamar a la API.

## Consecuencias

- **A definir en el plan mode** del grupo B (moneda + gastos):
  - **Proveedor** concreto de la API y su config (API key vía env, como Clerk).
  - **Caché** de tasas (p.ej. por día/moneda) para no llamar a la API en cada gasto y respetar rate limits.
  - Si `CurrencyService` expone endpoint público (p.ej. consultar tasa actual) o es solo interno consumido por gastos.
  - Política exacta del fallback (manual vs error) y validación de la tasa.
  - Manejo de timeout/caída de la API sin bloquear la creación del gasto más de lo razonable.
- Los reportes y balances usan siempre `baseAmount` en moneda base (BR03).
- Documentar en Swagger los errores nuevos (p.ej. 502/400 cuando la conversión no es posible).
