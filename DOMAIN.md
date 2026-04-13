# TripSplit — Dominio y Restricciones (Backend)

## Dominio

TripSplit es una app para dividir gastos de viajes entre amigos. Cada **viaje (Trip)** agrupa participantes, gastos y pagos. Al finalizar un viaje, el sistema calcula cuanto debe cada persona y sugiere la menor cantidad de transacciones posibles para saldar deudas.

---

## Entidades

### User
Representa a una persona registrada. Se sincroniza con Clerk (proveedor de auth externo).

- Se crea automaticamente cuando Clerk envia un webhook `user.created` o cuando el usuario hace su primera request autenticada (fallback por si el webhook no llego aun).
- No almacena password ni datos de sesion — eso lo maneja Clerk.
- Campos: `id` (UUID), `clerkId` (unico), `name`, `email` (unico), `avatarUrl`.

### Trip
Un viaje con una moneda base y un estado.

- Campos: `id`, `name`, `startDate?`, `endDate?`, `baseCurrency`, `status` (ACTIVE | FINALIZED).
- Un trip ACTIVE acepta gastos y pagos nuevos. Un trip FINALIZED es de solo lectura.

### Participation
Relacion entre un User y un Trip. Define el rol y almacena el balance actual.

- Campos: `id`, `userId`, `tripId`, `role` (CREATOR | SUPERVISOR | MEMBER), `currentBalance`, `joinedAt`.
- La combinacion `(userId, tripId)` es unica — un usuario no puede estar dos veces en el mismo trip.
- `currentBalance` es un **campo denormalizado** que se recalcula en batch, NO en tiempo real.

### Expense
Un gasto registrado dentro de un trip.

- Campos: `id`, `creatorId`, `tripId`, `description?`, `originalAmount`, `originalCurrency`, `exchangeRate?`, `baseAmount?`, `date`, `category?`.
- Si la moneda del gasto es distinta a la `baseCurrency` del trip, se guarda el `exchangeRate` como snapshot historico y se calcula el `baseAmount`.

### ExpenseDetail
Detalle de como se reparte un gasto entre los participantes. Cada fila dice cuanto **pago** y cuanto **debe** un usuario en un gasto especifico.

- Campos: `id`, `expenseId`, `userId`, `amountPaid`, `amountOwed`.
- La combinacion `(expenseId, userId)` es unica.
- `amountPaid` = lo que el usuario puso de su bolsillo. `amountOwed` = su parte justa del gasto.
- El balance neto de un usuario en un gasto es: `amountPaid - amountOwed`.

### Payment
Un pago directo entre dos usuarios dentro de un trip (para saldar deudas).

- Campos: `id`, `debtorId`, `creditorId`, `tripId`, `amount`, `date`.
- `debtorId` es quien paga (devuelve dinero). `creditorId` es quien recibe.

---

## Reglas de Negocio

### BR01 — Balances en batch
Los balances (`currentBalance` en Participation) se calculan en batch, no en cada operacion. El calculo recorre todos los Expenses y Payments del trip y actualiza los balances de todos los participantes de una vez.

### BR02 — Solo el creator controla el trip
Solo el usuario con rol `CREATOR` puede:
- Cerrar (finalizar) el trip.
- Agregar o remover participantes.

### BR03 — Moneda base unica por trip
Cada trip tiene una `baseCurrency`. Todos los reportes y balances se expresan en esa moneda. Si un gasto se registra en otra moneda, se convierte usando el `exchangeRate` al momento del registro.

### BR03b — Simplificacion de deudas
Al mostrar "quien le debe a quien", el sistema debe minimizar la cantidad de transacciones necesarias. Ejemplo: si A debe 10 a B y B debe 10 a C, el sistema sugiere que A pague 10 directamente a C.

### BR04 — Remover participante requiere balance 0
No se puede remover a un usuario de un trip si su `currentBalance` no es exactamente 0.

### BR05 — Salir voluntariamente requiere balance 0
Un usuario no puede abandonar un trip si su `currentBalance` no es exactamente 0.

---

## Restricciones Tecnicas

### IDs
Todos los IDs son **UUID v4** (`@default(uuid()) @db.Uuid`). Esto evita colisiones en entornos distribuidos.

### Precision numerica
Todos los campos monetarios usan **Decimal(12, 2)**. Nunca usar `float` o `number` de JavaScript para calculos financieros — siempre usar la libreria de Prisma Decimal o convertir a enteros (centavos) para operar.

El campo `exchangeRate` usa **Decimal(12, 6)** para mayor precision.

### Exchange rate como snapshot
El `exchangeRate` en Expense es un **snapshot historico** tomado al momento de registrar el gasto. Recalcular balances nunca debe alterar resultados pasados, incluso si las tasas de cambio actuales cambian.

### currentBalance es cache
`currentBalance` en Participation es un campo **denormalizado**. Se debe invalidar y recalcular cada vez que se ejecute el proceso batch de balances. Nunca confiar en este valor como fuente de verdad — la fuente de verdad son los Expenses y Payments.

### Cascade deletes
- Eliminar un Trip elimina en cascada: Participations, Expenses (y sus ExpenseDetails), y Payments.
- Eliminar un User elimina en cascada sus Participations.
- Eliminar un Expense elimina en cascada sus ExpenseDetails.

### FKs multiples a User
Payment tiene dos FKs a User (`debtorId` y `creditorId`). Al hacer JOINs que involucren ambas columnas, usar **aliases** para evitar ambiguedades.

### Auth
- JWT validado contra JWKS de Clerk (cacheado).
- Webhook verificado con firma Svix.
- Todas las rutas excepto `POST /auth/webhook` requieren JWT valido.
- El decorator `@CurrentUser()` inyecta el registro de User de la DB (no solo los claims del JWT).

### Responses
Todas las respuestas se envuelven en `{ data: ... }` via el `TransformInterceptor` global. Los errores de Prisma se mapean a HTTP status codes via `PrismaExceptionFilter`:
- P2002 (unique violation) -> 409 Conflict
- P2025 (not found) -> 404 Not Found
- P2003 (FK violation) -> 400 Bad Request

---

## Endpoints Actuales

| Metodo | Ruta | Estado | Descripcion |
|--------|------|--------|-------------|
| POST | `/auth/webhook` | Implementado | Webhook de Clerk |
| GET | `/users/me` | Implementado | Perfil del usuario autenticado |
| PATCH | `/users/me` | Implementado | Actualizar nombre |
| GET | `/users/search?q=` | Implementado | Buscar usuarios por email |
| GET | `/trips` | Placeholder | Listar trips del usuario |
| POST | `/trips` | Placeholder | Crear trip |
| GET | `/trips/:id` | Placeholder | Detalle de trip |
| PATCH | `/trips/:id` | Placeholder | Actualizar trip |
| DELETE | `/trips/:id` | Placeholder | Eliminar trip |
| GET | `/trips/:tripId/expenses` | Placeholder | Listar gastos |
| POST | `/trips/:tripId/expenses` | Placeholder | Crear gasto |
| GET | `/trips/:tripId/expenses/:id` | Placeholder | Detalle de gasto |
| DELETE | `/trips/:tripId/expenses/:id` | Placeholder | Eliminar gasto |
| GET | `/trips/:tripId/payments` | Placeholder | Listar pagos |
| POST | `/trips/:tripId/payments` | Placeholder | Registrar pago |
| DELETE | `/trips/:tripId/payments/:id` | Placeholder | Eliminar pago |
