# Anotaciones transversales

Convenciones comunes a **ambos grupos**. Esto NO se redefine en cada feature: se asume y se respeta. Si una feature necesita romper algo de aquí, eso es un ADR nuevo.

## 1. Sobre de respuesta `{ data: ... }`

Toda respuesta exitosa se envuelve por `TransformInterceptor` (`src/common/interceptors/transform.interceptor.ts`):

```json
{ "data": <payload real> }
```

- **Backend**: devuelve el payload "pelado"; el interceptor envuelve. Las respuestas de error (vía filtros) NO se envuelven.
- **Frontend**: desempaqueta `response.data.data` (axios `.data` + envoltura `.data`). Ya se hace así en `src/lib/api/trips.ts`.
- Al documentar Swagger, los `@Api*Response` deben reflejar la envoltura: `schema: { properties: { data: { ... } } }`.

## 2. Autenticación y usuario actual

- **Guard**: `ClerkAuthGuard` (`src/common/guards/clerk-auth.guard.ts`) sobre toda ruta protegida.
- **Strategy**: `ClerkJwtStrategy` valida el JWT contra el JWKS de Clerk y resuelve el `User` por `clerkId`. **Auto-crea el `User`** si el webhook aún no llegó (fallback con manejo de carrera).
- **Decorator**: `@CurrentUser()` inyecta el `User` completo (no solo claims) en el handler.
- **Frontend**: `AuthTokenSync` (en `providers.tsx`) captura `getToken()` de Clerk; el interceptor de axios (`src/lib/axios.ts`) inyecta `Authorization: Bearer <jwt>`. Un 401 redirige a `/sign-in`.
- **Webhook** `/auth/webhook`: público, verificado con Svix. Mantiene `users` en sync (`user.created/updated/deleted`). NO aplicarle el guard ni el throttler.

## 3. Pertenencia al viaje (autorización por recurso)

Patrón a reutilizar en **gastos, pagos, balances, integrantes**:

> Antes de operar sobre un `tripId`, verificar que `@CurrentUser()` tenga una `Participation` en ese viaje. Si no → **403 Forbidden**.

- El rol dentro del viaje (`CREATOR/SUPERVISOR/MEMBER`) decide qué puede hacer (ver cada feature + ADR-0001).
- El **admin global** (flag en `publicMetadata` de Clerk, ADR-0001) hace **bypass** de esta verificación solo para lectura/dashboard general.
- Conviene extraer este chequeo a un helper/guard reutilizable (no duplicarlo por controller). Su forma exacta la define el grupo que lo implemente primero (probablemente integrantes).

## 4. Manejo de dinero (precisión)

- Esquema Prisma: montos `Decimal(12,2)`, tasas de cambio `Decimal(12,6)`.
- **Los `Decimal` llegan como string al frontend.** No usar `parseFloat` ingenuo para operar; formatear para mostrar.
- Falta un `formatCurrency()` en el front (hoy `src/lib/utils.ts` solo tiene `cn()`). El primer grupo que toque montos lo crea ahí.
- Toda suma/validación de montos en el backend usa `Decimal` (no `number`) para evitar errores de redondeo. El redondeo del "último centavo" se trata en ADR-0006.

## 5. Manejo de errores

- `PrismaExceptionFilter` (`src/common/filters/prisma-exception.filter.ts`) ya mapea:
  - `P2002` (único) → **409 Conflict**
  - `P2025` (no encontrado) → **404 Not Found**
  - `P2003` (FK) → **400 Bad Request**
  - resto → **500**
- No relanzar a mano lo que el filtro ya cubre. Para reglas de negocio usar las excepciones de Nest (`ForbiddenException`, `BadRequestException`, `ConflictException`, etc.).

## 6. Validación de entrada

- `ValidationPipe` global con `whitelist: true` (descarta campos desconocidos → anti mass-assignment), `transform: true`, `enableImplicitConversion: true`.
- DTOs con `class-validator` / `class-transformer`. Documentar cada propiedad con `@ApiProperty`.

## 7. Swagger — estándar obligatorio (Definición de Hecho)

Swagger sirve en `/api` (`DocumentBuilder` en `main.ts`, con `addBearerAuth()`). **"Siempre completar Swagger"**: ningún endpoint se considera hecho sin esto.

Checklist por endpoint:
- [ ] `@ApiTags('<Modulo>')` en el controller.
- [ ] `@ApiBearerAuth()` si está protegido.
- [ ] `@ApiOperation({ summary, description })`.
- [ ] `@ApiOkResponse` / `@ApiCreatedResponse` / `@ApiNoContentResponse` con `schema` que refleje el sobre `{ data }`.
- [ ] `@ApiBadRequestResponse` / `@ApiUnauthorizedResponse` / `@ApiForbiddenResponse` / `@ApiNotFoundResponse` / `@ApiConflictResponse` según aplique.
- [ ] `@ApiParam` / `@ApiQuery` / `@ApiBody` documentados.
- [ ] DTOs y entidades con `@ApiProperty` en cada campo; `@ApiExtraModels` si hace falta registrar el modelo.

## 8. Otros transversales ya presentes

- **Throttler**: 100 req / 60 s global (`ThrottlerModule`). Excepción: webhook de Clerk.
- **CORS**: origen = `FRONTEND_URL` (env), con credenciales.
- **PrismaService** `@Global()`: inyectable en todo módulo.
- **ScheduleModule** importado pero **sin jobs**: es el punto de integración para el recálculo batch de balances (BR01, ver ADR-0002).
- **Soft-delete**: `Trip`, `Expense`, `Payment` tienen `deletedAt`. Las consultas deben filtrar `deletedAt: null` salvo que se quiera el histórico.

## 9. Deuda técnica / limpieza de branding (no es ADR, no bloquea)

Tareas de higiene que cualquier grupo puede tomar cuando toque la zona:
- Renombrar el módulo `src/expense-details/` → `src/expenses/` (el controller ya es `ExpensesController` y la ruta `/trips/:tripId/expenses`). Confunde a quien entra.
- Título de Swagger "Splitwise Clone API" → "Cuentas Claras API".
- `package.json` del backend: `"name": "splitwise-backend"` → `"cuentas-claras-backend"`.
- Unificar "React" / "React/Next.js" en diagramas del entregable.

## 10. Reglas de negocio (referencia rápida)

| ID | Regla |
|---|---|
| BR01 | Los balances se calculan en batch; pueden no ser tiempo real. |
| BR02 | Solo el `CREATOR` edita/cierra el viaje y gestiona ciertas operaciones (ver ADR-0005). |
| BR03 | La moneda base del viaje aplica a todos los reportes. |
| BR03b | Las liquidaciones minimizan el número de transacciones (ver ADR-0003). |
| BR04 / BR05 | No se puede abandonar/quitar a un participante si su balance ≠ 0 (ver ADR-0002 y ADR-0005). |
