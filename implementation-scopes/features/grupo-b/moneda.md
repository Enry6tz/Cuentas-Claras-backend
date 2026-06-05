# Feature — Moneda (Currency / Exchange Rate)

- **Grupo:** B (operaciones internas del viaje)
- **Estado actual:** ✅ Implementado. `CurrencyService` con cliente HTTP a Exchange Rate API, caché en memoria (Map con TTL), fallback manual (acepta `manualExchangeRate`), y endpoint público `GET /currency/rate?from=&to=`. Integrado con creación de gastos.

## Alcance

Proveer la conversión de moneda que consume **gastos**: obtener el tipo de cambio de una API externa y devolver el snapshot a guardar.

**Entra:** cliente hacia la Exchange Rate API, caché de tasas, cálculo de `baseAmount`, política de fallback.
**No entra:** persistir el gasto (lo hace la feature gastos); reportes/balances (consumen `baseAmount` ya calculado).

## Requerimientos funcionales

- RF-1: Dado `originalCurrency`, `baseCurrency` y `originalAmount`, devolver `exchangeRate` y `baseAmount`.
- RF-2: Obtener la tasa desde una **Exchange Rate API externa** (ADR-0004).
- RF-3: Cachear tasas para no llamar a la API en cada gasto y respetar rate limits.
- RF-4: Si `originalCurrency == baseCurrency` → `exchangeRate = 1`, `baseAmount = originalAmount`, sin llamar a la API.
- RF-5: Fallback ante fallo de la API: aceptar `exchangeRate` manual del request o devolver error claro.

## Restricciones y reglas de negocio (FIRME — ADR-0004)

- El `exchangeRate` se toma como **snapshot inmutable** al crear el gasto (no se recalcula luego).
- Config de la API (URL, API key) por **variables de entorno** (mismo patrón que Clerk en `config/configuration.ts`).
- No bloquear la creación del gasto más de lo razonable ante timeout/caída: definir timeout y comportamiento del fallback.
- Operar montos en `Decimal` (transversal §4).

## Endpoints orientativos (a confirmar en plan mode)

- Principalmente **servicio interno** consumido por gastos.
- Opcional: un endpoint de consulta de tasa actual (p.ej. `GET /currency/rate?from=&to=`) si el front lo necesita para previsualizar la conversión. A decidir por el grupo.

## Checklist de Swagger

- [x] `@ApiTags('Currency')`, `@ApiBearerAuth()`, `@ApiQuery`, `@Api*Response` con sobre `{data}` y errores (502/400 si la API falla).
- [x] `@ApiProperty` en `CurrencyRateDto` de respuesta.

## Frontend

- En el formulario de gasto: al elegir moneda distinta de la base, previsualizar la conversión (consumiendo el endpoint opcional o calculando al enviar). Mostrar `baseAmount` resultante con `formatCurrency()`.

## ADRs relacionadas

- [ADR-0004](../../adr/0004-conversion-de-moneda.md) (decisión principal).

## Definición de Hecho

- `CurrencyService` que devuelve tasa + `baseAmount`, con caché y fallback. Config por env. Integrado con la creación de gastos. Swagger completo si se expone endpoint.

## Pendiente de definir en plan mode del grupo

- ~~**Proveedor** concreto de la API y formato de su respuesta.~~ ✅ Resuelto: Exchange Rate API (exchangerate-api.com) con respuesta JSON `{ conversion_rates: { ... } }`.
- ~~Estrategia de caché (por día/moneda) y TTL.~~ ✅ Resuelto: caché en Map<string, { rate, timestamp }> con TTL de 1 hora por par de monedas.
- ~~Política exacta del fallback (manual vs error) y el timeout.~~ ✅ Resuelto: timeout de 5s; si falla, acepta `manualExchangeRate` del DTO; si no hay manual, lanza 400.
- ~~Si se expone endpoint público de consulta de tasa.~~ ✅ Resuelto: `GET /currency/rate?from=USD&to=ARS` expuesto para previsualización en frontend.
