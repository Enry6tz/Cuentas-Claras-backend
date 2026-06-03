# CLAUDE.md

Guía para Claude Code al trabajar en este repo (backend NestJS de "Cuentas Claras",
sistema de gastos compartidos en viajes — proyecto universitario).

## Testing (ver `documentacion/04-testing.md` para el detalle)

- **SIEMPRE correr `npm test` antes de subir cambios (push / merge).** Si algo está en
  rojo, arreglarlo antes de subir. Avisá al usuario de correr los tests antes de pushear.
- `npm test` = unit tests con mocks. **NO tocan la base de datos.** Seguros de correr.
- `npm run test:e2e` = ⚠️ **se conecta a la base real de Supabase** (la del `.env`). Hay
  una sola base compartida; no correr e2e con escritura contra ella. Para e2e con
  escritura, usar una base de tests aparte (`.env.test`), nunca la principal.
- Los tests viven junto al código que prueban: `src/**/*.spec.ts`.
- Líneas `ERROR [...]` durante `npm test` son normales (tests de caminos de error). El
  veredicto es la última línea (`N passed`).

## Build

- `npm run build` (compila con `nest build`). Correr antes de subir si se tocó mucho código.

## Convenciones del dominio

- **Saldos:** saldo **negativo = el usuario debe plata** (deudor); **positivo = le deben**
  (acreedor). Un pago **salda** deuda: el deudor suma hacia 0 y el acreedor resta hacia 0.
  Esta convención está en `balances.service.ts` (`recalculateTripBalances`) y en
  `participants.service.ts` (`calculateBalance`) — deben mantenerse consistentes.
- Borrado siempre **soft-delete** (`deletedAt`), nunca hard delete.
- Reglas de permisos por rol (CREATOR / MEMBER / SUPERVISOR) viven en los services, no en
  los controllers.
