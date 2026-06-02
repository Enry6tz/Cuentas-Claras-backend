# ADR-0007 — Proveedor de tasas de cambio

- **Estado:** Aceptada
- **Grupo:** B
- **Features afectadas:** moneda (B), gastos (B).

## Contexto

Necesitamos un proveedor externo de Exchange Rate API para convertir montos de gastos a la moneda base del viaje. ADR-0004 ya definió que se integrará una API externa, pero dejó pendiente elegir el proveedor concreto y la estrategia de caché.

## Opciones consideradas

1. **ExchangeRate-API** (`exchangerate-api.com`): plan free con 1500 requests/mes, endpoint `/pair/{from}/{to}`, sin API key requerida en plan gratuito anterior, pero el usuario ya posee una key.
2. **Open Exchange Rates**: requiere API key, plan free 1000 requests/mes.
3. **Frankfurter API** (`frankfurter.app`): API pública gratuita, open-source, sin API key, pero cobertura de monedas limitada.

## Decisión

**ExchangeRate-API** con la API key provista.

### Configuración

```env
EXCHANGE_RATE_API_KEY=f776fbc437e1a0a1c285df1b
EXCHANGE_RATE_BASE_URL=https://v6.exchangerate-api.com/v6
EXCHANGE_RATE_CACHE_TTL_MS=3600000
```

### Estrategia de caché

- Caché en memoria (`Map<string, { rate, timestamp }>`) dentro de `CurrencyService`.
- TTL default: 1 hora (3600000 ms), configurable vía `EXCHANGE_RATE_CACHE_TTL_MS`.
- Key del caché: `"{from}_{to}"` (ej. `USD_ARS`).
- No hay invalidación forzada; el TTL expira naturalmente.

### Fallback

- Si la API falla (timeout, error HTTP, red), se permite al usuario proveer un `exchangeRate` manual en el request de creación del gasto.
- Si no se provee tasa manual y la API falla: error 400 con mensaje claro.
- Si la API no tiene cobertura para el par de monedas: error 400.
- Si no hay API key configurada: error 400 indicando que se requiere configuración o tasa manual.

### Endpoint opcional

Se expone `GET /currency/rate?from=USD&to=ARS` para que el frontend pueda previsualizar la conversión antes de crear un gasto. Autenticado con JWT.

## Consecuencias

- Agregar `@nestjs/axios` (HttpModule) como dependencia del `CurrencyModule`.
- Las variables de entorno se configuran en `config/configuration.ts` bajo la clave `exchangeRate`.
- El servicio es interno y exportado para ser usado por `ExpenseDetailsService` y opcionalmente por el frontend via controller.
