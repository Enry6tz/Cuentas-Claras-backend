# Feature — Moneda (Currency / Exchange Rate)

- **Grupo:** B (operaciones internas del viaje)
- **Estado actual:** ❌ A construir. No existe `CurrencyService` ni integración externa, aunque el esquema soporta `exchangeRate` y `baseAmount`.

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

- [ ] Si se expone endpoint: `@ApiTags('Currency')`, `@ApiBearerAuth()`, `@ApiQuery`, `@Api*Response` con sobre `{data}` y errores (502/400 si la API falla).
- [ ] `@ApiProperty` en cualquier DTO de respuesta de tasa.

## Frontend

- En el formulario de gasto: al elegir moneda distinta de la base, previsualizar la conversión (consumiendo el endpoint opcional o calculando al enviar). Mostrar `baseAmount` resultante con `formatCurrency()`.

## ADRs relacionadas

- [ADR-0004](../../adr/0004-conversion-de-moneda.md) (decisión principal).

## Definición de Hecho

- `CurrencyService` que devuelve tasa + `baseAmount`, con caché y fallback. Config por env. Integrado con la creación de gastos. Swagger completo si se expone endpoint.

## Pendiente de definir en plan mode del grupo

- **Proveedor** concreto de la API y formato de su respuesta.
- Estrategia de caché (por día/moneda) y TTL.
- Política exacta del fallback (manual vs error) y el timeout.
- Si se expone endpoint público de consulta de tasa.
