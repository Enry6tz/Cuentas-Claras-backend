# ADR-0008 — Permisos en gastos y pagos

- **Estado:** Aceptada
- **Grupo:** B
- **Features afectadas:** gastos (B), pagos (B).

## Contexto

Es necesario definir quién puede crear/eliminar gastos y pagos dentro de un viaje. Existen tres roles: CREATOR, SUPERVISOR, MEMBER.

## Decisión

| Acción | CREATOR | SUPERVISOR | MEMBER |
|--------|---------|------------|--------|
| Crear gasto/pago | ✅ Sí | ❌ No | ✅ Sí |
| Ver detalle/listar | ✅ Sí | ✅ Sí | ✅ Sí |
| Editar propio | ✅ Sí (cualquiera) | ❌ No | ✅ Sí (solo propios) |
| Eliminar propio | ✅ Sí (cualquiera) | ❌ No | ✅ Sí (solo propios) |

### Reglas

- **CREATOR** del viaje: puede crear, ver y eliminar **cualquier** gasto/pago del viaje.
- **SUPERVISOR** del viaje: solo lectura. No puede crear ni eliminar gastos/pagos.
- **MEMBER** del viaje: puede crear gastos/pagos. Puede eliminar solo aquellos que él mismo creó (`creatorId === userId` para gastos; para pagos, se considera el `debtorId`).
- Para eliminar, se verifica que el usuario sea el creador del recurso O que sea CREATOR del viaje.

## Consecuencias

- El `remove()` de expenses y payments debe verificar el rol del usuario antes de permitir la operación.
- El `create()` debe rechazar a SUPERVISOR al inicio del handler.
- No hay endpoint de edición (PATCH) en esta etapa.
