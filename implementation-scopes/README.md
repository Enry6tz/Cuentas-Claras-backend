# Documentación de features — Cuentas Claras

App de gastos compartidos. Backend **NestJS + Prisma + PostgreSQL** (`Cuentas-Claras-backend/`) y frontend **Next.js 16 (App Router) + Clerk + TanStack Query + shadcn/ui** (`Cuentas-Claras-frontend/`).

Esta carpeta reparte el trabajo entre **dos grupos** para que implementen sin pisarse. Cada feature tiene su propio `.md` con **alcance, requerimientos y restricciones**. El detalle fino (flujos, DTOs, endpoints definitivos) lo cierra cada grupo en su **plan mode por feature** al momento de implementar.

## Altitud de estos documentos

Estos docs **acotan**, no implementan. Fijan lo que tiene que quedar firme (reglas de negocio, permisos por rol, decisiones de arquitectura) y dejan **orientativos** los endpoints y flujos. Cuando un grupo arranque una feature:

1. Lee el doc de la feature + las ADRs enlazadas + `transversal.md`.
2. Hace un **plan mode** para esa feature y vuelve con la especificación fina (flujos, DTOs, contratos de respuesta, casos borde).
3. Implementa respetando lo transversal (sobre `{data}`, auth, Swagger como Definición de Hecho).

## Índice

### Transversal (leer SIEMPRE antes de implementar)
- [transversal.md](transversal.md) — convenciones comunes a ambos grupos.

### ADRs (decisiones de arquitectura ya debatidas)
- [adr/0001-roles-y-admin-global.md](adr/0001-roles-y-admin-global.md)
- [adr/0002-calculo-y-almacenamiento-de-balances.md](adr/0002-calculo-y-almacenamiento-de-balances.md)
- [adr/0003-simplificacion-de-deudas.md](adr/0003-simplificacion-de-deudas.md)
- [adr/0004-conversion-de-moneda.md](adr/0004-conversion-de-moneda.md)
- [adr/0005-gestion-de-integrantes.md](adr/0005-gestion-de-integrantes.md)
- [adr/0006-tipos-de-division-de-gasto.md](adr/0006-tipos-de-division-de-gasto.md)

### Grupo A — Núcleo global / gestión de viajes ("el cascarón")
Todo lo que rodea a un viaje: identidad, el viaje como contenedor y quién está dentro.
- [features/grupo-a/auth-y-perfil.md](features/grupo-a/auth-y-perfil.md) — *(mayormente hecho)*
- [features/grupo-a/viajes.md](features/grupo-a/viajes.md) — *(hecho)*
- [features/grupo-a/integrantes.md](features/grupo-a/integrantes.md) — **a construir**
- [features/grupo-a/dashboard-y-admin.md](features/grupo-a/dashboard-y-admin.md) — **a construir**

### Grupo B — Operaciones internas del viaje
Todo lo que ocurre *dentro* de un viaje ya creado y con integrantes.
- [features/grupo-b/gastos.md](features/grupo-b/gastos.md) — **stub → a construir**
- [features/grupo-b/pagos.md](features/grupo-b/pagos.md) — **stub → a construir**
- [features/grupo-b/balances.md](features/grupo-b/balances.md) — **a construir**
- [features/grupo-b/moneda.md](features/grupo-b/moneda.md) — **a construir**

## Dependencia entre grupos

```
Grupo A (cascarón)                 Grupo B (interno)
─────────────────                  ─────────────────
auth/perfil ─┐
viajes ──────┼──► integrantes ───► gastos ──► balances
             │    (Participation)   │  ▲         ▲
dashboard ◄──┘                      │  └── moneda ┘
   ▲                                │
   └──────── balances ◄─────────────┘  (pagos también alimenta balances)
```

- **Grupo B depende de Grupo A**: no hay gastos/pagos sin `Participation`. Integrantes (A) es prerrequisito.
- La regla "no se puede salir/quitar de un viaje con balance ≠ 0" cruza **integrantes** (A) y **balances** (B).

## Plantilla de cada feature

1. **Grupo / responsable** y **estado actual** (hecho / stub / a construir).
2. **Alcance** — qué entra y qué NO entra.
3. **Requerimientos funcionales** (RF-x) — a nivel de capacidad, no de flujo.
4. **Restricciones y reglas de negocio** — permisos por rol, reglas BR0x, validaciones. *(Esto queda FIRME.)*
5. **Endpoints orientativos** — superficie tentativa; se confirma en el plan mode del grupo.
6. **Checklist de Swagger** — Definición de Hecho transversal.
7. **Frontend** — páginas/rutas y componentes (a grandes rasgos).
8. **ADRs relacionadas**.
9. **Definición de Hecho (DoD)**.
10. **Pendiente de definir en plan mode del grupo**.

## Estado real del código (base de partida)

| Área | Estado |
|---|---|
| Auth (Clerk JWT + webhook), Users (`/users/me`, `/users/search`) | ✅ Implementado |
| Trips CRUD (soft-delete, solo CREATOR edita/borra) | ✅ Implementado (back + front) |
| Integrantes / participations | ❌ No existe endpoint |
| Expenses (`/trips/:tripId/expenses`) | ⚠️ Stub |
| Payments (`/trips/:tripId/payments`) | ⚠️ Stub |
| Balances | ❌ No existe |
| Currency / Exchange Rate API | ❌ No existe |
| Frontend Dashboard / Expenses / Payments | ⚠️ Placeholders |
| Cross-cutting (`{data}`, filtros, guard, validación, Swagger en `/api`) | ✅ Implementado |
