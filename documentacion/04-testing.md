# Testing

Esta guía explica qué tests tiene el proyecto, cómo correrlos, y —muy importante—
cuáles tocan la base de datos real de Supabase y cuáles no.

---

## TL;DR

- **`npm test`** → corre los *unit tests*. **NO tocan Supabase.** Son seguros, corré
  cuantas veces quieras. Es el comando del día a día.
- **`npm run test:e2e`** → corre el *test end-to-end*, que **SÍ se conecta a la base
  real** (la de tu `.env`). Usarlo con cuidado.
- **Siempre correr `npm test` antes de subir cambios** (push / merge).

---

## Tipos de test

### 1. Unit tests (`*.spec.ts`) — los que usamos siempre

Prueban la **lógica de un service de forma aislada**, sin base de datos, sin red y sin
levantar el servidor HTTP. Reemplazan Prisma (lo que habla con Supabase) por un objeto
**falso** (un "mock") cuyas respuestas decidimos nosotros:

```ts
// En el test, en vez del Prisma real le damos uno de mentira:
{ provide: PrismaService, useValue: prismaFalso }

// y el falso "inventa" la respuesta sin consultar nada:
prismaFalso.participation.findUnique.mockResolvedValue({ role: 'CREATOR' })
```

Como el `PrismaService` real (`src/prisma/prisma.service.ts`, el que hace `$connect()`)
**ni se carga**, estos tests **no abren ninguna conexión a Supabase**. Por eso corren en
segundos y funcionan sin internet.

> Analogía: un simulador de vuelo. Probás al piloto (tu código) sin arriesgar un avión
> real (tu base de datos).

**Archivos existentes:**

| Archivo | Qué prueba |
|---|---|
| `src/trips/trips.service.spec.ts` | Crear viaje (el creador queda como CREATOR), ver/editar/borrar con permisos |
| `src/trips/participants/participants.service.spec.ts` | Alta/baja de integrantes, cambio de rol, salir del viaje, balance en cero |
| `src/expense-details/expense-details.service.spec.ts` | Reparto de gastos (EQUAL / EXACT / PERCENT) y permisos para crear/borrar |
| `src/payments/payments.service.spec.ts` | Reglas de pagos (deudor ≠ acreedor, ambos participantes, permisos) |
| `src/balances/balances.service.spec.ts` | Cálculo de saldos y liquidación (quién le paga a quién) |
| `src/admin/admin.service.spec.ts` | Lógica del módulo admin |
| `src/dashboard/dashboard.service.spec.ts` | Lógica del dashboard |

### 2. Test end-to-end (`*.e2e-spec.ts`) — ⚠️ toca la base real

`test/app.e2e-spec.ts` levanta la **aplicación completa y real** (importa `AppModule`),
lo que incluye el `PrismaService` real → al arrancar hace `$connect()` usando el
`DATABASE_URL` de tu `.env` → **se conecta a tu Supabase de verdad**.

Hoy ese test solo hace un `GET /` (lectura, inofensivo). Pero **si en el futuro se
agregan tests e2e que creen viajes/gastos/pagos, esos datos se escribirían en la base
compartida real**. Como el proyecto usa una sola base en Supabase, evitá correr e2e con
escritura contra ella.

Si más adelante hacen falta tests e2e con escritura, lo correcto es usar una **base de
datos separada solo para tests** (un Postgres local con Docker, o un segundo proyecto
Supabase de prueba) configurada con un `.env.test` aparte. **Nunca** contra la base
principal.

---

## Comandos

```powershell
npm test            # corre TODOS los unit tests una vez (seguro, sin base)
npm run test:watch  # se queda escuchando y re-corre solo lo que cambiás (cómodo al programar)
npm run test:cov    # corre los tests y muestra el % de código cubierto

npm run test:e2e    # ⚠️ corre el test e2e — se conecta a la base real del .env
```

**Qué debería pasar al correr `npm test`:** termina con `Tests: N passed`. Si alguna
regla de negocio se rompe (ej: dejar que un MEMBER borre un viaje), el test
correspondiente se pone en **rojo** y dice exactamente qué falló.

> Nota: durante `npm test` pueden aparecer líneas `ERROR [PaymentsService]...` en la
> salida. **Son normales**: hay tests que prueban a propósito los caminos de error y el
> service loguea el error antes de rechazarlo. El veredicto real es la última línea
> (`N passed`).

---

## Regla del equipo: correr tests antes de subir

**Siempre correr `npm test` antes de hacer push o merge.** Si algo está en rojo, se
arregla antes de subir. Esto evita romper `main` y que el bug le llegue al resto del
grupo. (Lo ideal a futuro: que corran solos en CI con cada Pull Request.)
