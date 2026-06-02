# ADR-0001 — Modelo de roles y admin global

- **Estado:** Aceptada
- **Features afectadas:** integrantes (A), dashboard-y-admin (A), y autorización de todas las features.

## Contexto

El esquema Prisma define roles **por viaje** en `Participation.role`: `CREATOR`, `SUPERVISOR`, `MEMBER`. El PDF del entregable menciona además un rol global "Administrator" que no existe en la base. Necesitamos:
1. Confirmar el modelo de roles por viaje.
2. Resolver cómo existe un "administrador del sistema" que pueda ver un dashboard general (todos los viajes) sin ser participante de cada uno.

## Opciones

1. **Agregar un rol global en la DB** (campo `role` en `User`, o tabla aparte). Requiere migración, endpoints de administración, y mantener consistencia con Clerk.
2. **Admin global como flag en Clerk `publicMetadata`** leído en el guard/strategy. Sin migración; la fuente de verdad de "quién es admin" vive en Clerk.

## Decisión

- **Roles por viaje** se mantienen tal cual: `CREATOR / SUPERVISOR / MEMBER` en `Participation`. No hay rol global en la base.
- El **admin global** es un **flag en `publicMetadata` de Clerk** (p.ej. `{ "role": "admin" }`). El backend lo lee del JWT/usuario de Clerk en la `ClerkJwtStrategy` y lo expone (p.ej. `request.user.isAdmin` o similar).
- Ese flag habilita un **bypass de la verificación de pertenencia al viaje** (sección 3 de `transversal.md`) **solo para lectura / dashboard general**. No convierte al admin en `CREATOR` de los viajes ni le da acciones destructivas por defecto.

## Consecuencias

- **A definir en el plan mode** del grupo que implemente integrantes/dashboard:
  - El nombre exacto del claim/metadata y cómo se propaga al `request.user`.
  - Qué endpoints respetan el bypass (lectura sí; escritura/borrado → decidir explícitamente, por defecto NO).
  - Un endpoint o vista de "dashboard general" que liste/agregue todos los viajes para el admin.
- En Swagger, los endpoints que distinguen admin deben documentar el 403 para no-admins.
- Riesgo: la metadata de Clerk debe estar firmada en el token (no confiar en metadata mutable desde el cliente). Verificar que viene del JWT validado, no de una llamada aparte manipulable.
- No se toca el esquema Prisma por esta decisión.
