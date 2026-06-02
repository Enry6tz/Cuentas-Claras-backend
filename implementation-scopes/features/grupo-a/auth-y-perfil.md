# Feature — Autenticación y perfil

- **Grupo:** A (núcleo global)
- **Estado actual:** ✅ Mayormente implementado. Tarea principal: documentar y **completar Swagger**; no rehacer.

## Alcance

Identidad del usuario y su perfil. Login/registro delegados a Clerk; sincronización del `User` local; perfil propio y búsqueda de usuarios (insumo de integrantes).

**Entra:** sign-in/sign-up (Clerk), sesión, webhook de sync, `GET/PATCH /users/me`, `GET /users/search`, página de cuenta.
**No entra:** roles por viaje (ver integrantes), admin global (ver dashboard-y-admin / ADR-0001).

## Requerimientos funcionales

- RF-1: El usuario se registra e inicia sesión vía Clerk.
- RF-2: El backend mantiene `users` sincronizado con Clerk (webhook `user.created/updated/deleted`, Svix).
- RF-3: El backend resuelve el `User` desde el JWT; si falta, lo auto-crea (fallback).
- RF-4: El usuario consulta y edita su perfil (`GET/PATCH /users/me`; hoy editable: `name`).
- RF-5: Buscar usuarios registrados por email (`GET /users/search?q=`), insumo para agregar integrantes.

## Restricciones y reglas de negocio

- Todas las rutas de `users` requieren `ClerkAuthGuard`. El webhook es público (verificado por Svix) y queda fuera del throttler.
- `search` devuelve solo campos públicos (`id, email, name, avatarUrl`), case-insensitive, máximo 10 resultados.
- No confiar en metadata mutable del cliente; lo sensible viaja en el JWT validado (relevante para admin global, ADR-0001).

## Endpoints orientativos (ya existentes)

| Método | Ruta | Notas |
|---|---|---|
| POST | `/auth/webhook` | Público, Svix. |
| GET | `/users/me` | Perfil propio. |
| PATCH | `/users/me` | `UpdateUserDto { name? }`. |
| GET | `/users/search?q=` | Búsqueda por email. |

## Checklist de Swagger

- [ ] `@ApiTags('Auth')` / `@ApiTags('Users')`.
- [ ] `@ApiBearerAuth()` en rutas de `users`.
- [ ] `@ApiOperation` + `@Api*Response` (con sobre `{data}`) en cada endpoint.
- [ ] `@ApiQuery` en `search`; `@ApiBody` en `PATCH /users/me`.
- [ ] `@ApiProperty` en `UpdateUserDto` y en la entidad pública de usuario.

## Frontend

- Páginas: `sign-in/`, `sign-up/`, `(authenticated)/account/` (Clerk `UserProfile`).
- `AuthTokenSync` + interceptor de axios (ya implementado).

## ADRs relacionadas

- [ADR-0001](../../adr/0001-roles-y-admin-global.md) (el admin global se lee de `publicMetadata` de Clerk aquí).

## Definición de Hecho

- Swagger completo en `auth`/`users`. Sobre `{data}` reflejado. Guard presente. Sin regresiones en el flujo Clerk→axios.

## Pendiente de definir en plan mode del grupo

- Si el perfil editable crece más allá de `name`.
- Dónde y cómo se expone `isAdmin` derivado del JWT (coordinar con dashboard-y-admin).
