# Diagrama de Entidad-Relación - Cuentas Claras

## Modelo de Datos

```mermaid
erDiagram
    USER ||--o{ PARTICIPATION : ""
    TRIP ||--o{ PARTICIPATION : ""
    USER ||..o{ EXPENSE : "crea"
    TRIP ||--o{ EXPENSE : ""
    EXPENSE ||--|{ EXPENSE_DETAIL : ""
    USER ||..o{ EXPENSE_DETAIL : ""
    USER ||..o{ PAYMENT : "deudor"
    USER ||..o{ PAYMENT : "acreedor"
    TRIP ||..o{ PAYMENT : ""

    USER {
        uuid id "PK"
        string clerkId "UK"
        string name
        string email "UK"
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }

    TRIP {
        uuid id "PK"
        string name
        string description
        date startDate
        date endDate
        string baseCurrency
        enum status
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    PARTICIPATION {
        uuid id "PK"
        uuid userId "FK"
        uuid tripId "FK"
        enum role
        decimal currentBalance
        datetime joinedAt
    }

    EXPENSE {
        uuid id "PK"
        uuid creatorId "FK"
        uuid tripId "FK"
        string description
        decimal originalAmount
        string originalCurrency
        decimal exchangeRate
        decimal baseAmount
        enum splitType
        date date
        string category
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    EXPENSE_DETAIL {
        uuid id "PK"
        uuid expenseId "FK"
        uuid userId "FK"
        decimal amountPaid
        decimal amountOwed
    }

    PAYMENT {
        uuid id "PK"
        uuid debtorId "FK"
        uuid creditorId "FK"
        uuid tripId "FK"
        decimal amount
        string note
        date date
        datetime createdAt
        datetime deletedAt
    }
```

## Leyenda de Relaciones

- **||--o{** → Uno a muchos (línea sólida - relación identificadora)
- **||..o{** → Uno a muchos (línea punteada - relación no identificadora)
- **||--|{** → Uno a muchos (línea sólida - relación identificadora)

## Claves y Restricciones

- **PK** → Primary Key (Clave Primaria)
- **FK** → Foreign Key (Clave Foránea)
- **UK** → Unique Key (Clave Única)

## Descripción del Modelo

### Flujos principales de datos:

1. **Viajes y Participantes**: Un `USER` participa en múltiples `TRIP`s mediante `PARTICIPATION`. Cada participación tiene un rol (CREATOR, SUPERVISOR, MEMBER) y un balance actual.

2. **Gastos Compartidos**: Dentro de cada `TRIP`, se registran `EXPENSE`s. Cada gasto tiene un creador (`USER`), monto original en moneda local, y puede convertirse a la moneda base del viaje.

3. **División de Gastos**: Cada `EXPENSE` tiene múltiples `EXPENSE_DETAIL`s que definen cómo se divide entre los participantes (amountPaid vs amountOwed).

4. **Liquidación de Deudas**: Los `PAYMENT`s representan transacciones entre usuarios para liquidar deudas generadas por los gastos compartidos.
