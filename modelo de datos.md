# Modelo de Datos - Cuentas Claras

## Descripción General

El modelo de datos de Cuentas Claras implementa un sistema de gestión de gastos compartidos en viajes. Permite a múltiples usuarios participar en viajes, registrar gastos compartidos y realizar pagos para liquidar deudas.

## Entidades Principales

### 1. **User** (usuarios)
Almacena información de los usuarios del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| clerkId | String | UNIQUE | ID de autenticación de Clerk |
| name | String | NOT NULL | Nombre del usuario |
| email | String | UNIQUE | Email del usuario |
| avatarUrl | String | NULL | URL del avatar |
| createdAt | DateTime | DEFAULT NOW() | Fecha de creación |
| updatedAt | DateTime | AUTO UPDATE | Fecha de última actualización |

**Relaciones:**
- Participa en múltiples Viajes (vía `Participation`)
- Crea múltiples Gastos (`createdExpenses`)
- Participa en detalles de gastos (`expenseDetails`)
- Debe dinero a otros usuarios (`debtsOwed` vía `Payment`)
- Le deben dinero otros usuarios (`debtsReceived` vía `Payment`)

---

### 2. **Trip** (viajes)
Representa un viaje donde se comparten gastos.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| name | String | NOT NULL | Nombre del viaje |
| description | String | NULL | Descripción del viaje |
| startDate | Date | NULL | Fecha de inicio |
| endDate | Date | NULL | Fecha de fin |
| baseCurrency | String | NOT NULL | Moneda base del viaje |
| status | TripStatus | DEFAULT ACTIVE | Estado: ACTIVE \| FINALIZED |
| createdAt | DateTime | DEFAULT NOW() | Fecha de creación |
| updatedAt | DateTime | AUTO UPDATE | Fecha de última actualización |
| deletedAt | DateTime | NULL, INDEX | Soft delete |

**Relaciones:**
- Tiene múltiples Participantes (`participations`)
- Tiene múltiples Gastos (`expenses`)
- Tiene múltiples Pagos (`payments`)

---

### 3. **Participation** (participaciones)
Tabla de unión que registra la participación de usuarios en viajes.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| userId | UUID | FK, NOT NULL | Usuario participante |
| tripId | UUID | FK, NOT NULL | Viaje |
| role | ParticipationRole | DEFAULT MEMBER | Rol: CREATOR \| SUPERVISOR \| MEMBER |
| currentBalance | Decimal(12,2) | DEFAULT 0 | Saldo actual del usuario en el viaje |
| joinedAt | DateTime | DEFAULT NOW() | Fecha de unión |

**Restricciones:**
- UNIQUE(userId, tripId): Un usuario solo puede participar una vez por viaje
- FK userId → User (CASCADE DELETE)
- FK tripId → Trip (CASCADE DELETE)

**Relaciones:**
- Referencia a User
- Referencia a Trip

---

### 4. **Expense** (gastos)
Registra gastos compartidos en un viaje.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| creatorId | UUID | FK, NOT NULL | Usuario que registra el gasto |
| tripId | UUID | FK, NOT NULL | Viaje asociado |
| description | String | NULL | Descripción del gasto |
| originalAmount | Decimal(12,2) | NOT NULL | Monto original |
| originalCurrency | String | NOT NULL | Moneda original |
| exchangeRate | Decimal(12,6) | NULL | Tasa de cambio aplicada |
| baseAmount | Decimal(12,2) | NULL | Monto convertido a moneda base |
| splitType | ExpenseSplitType | DEFAULT EQUAL | Tipo de división: EQUAL \| EXACT \| PERCENT |
| date | DateTime | DEFAULT NOW() | Fecha del gasto |
| category | String | NULL | Categoría del gasto |
| createdAt | DateTime | DEFAULT NOW() | Fecha de creación |
| updatedAt | DateTime | AUTO UPDATE | Fecha de última actualización |
| deletedAt | DateTime | NULL, INDEX | Soft delete |

**Restricciones:**
- FK creatorId → User
- FK tripId → Trip (CASCADE DELETE)
- INDEX tripId, creatorId, deletedAt

**Relaciones:**
- Referencia a User (creador)
- Referencia a Trip
- Tiene múltiples ExpenseDetails

---

### 5. **ExpenseDetail** (detalles de gasto)
Tabla de desglose que especifica cuánto debe pagar/pagó cada usuario en un gasto.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| expenseId | UUID | FK, NOT NULL | Gasto asociado |
| userId | UUID | FK, NOT NULL | Usuario |
| amountPaid | Decimal(12,2) | DEFAULT 0 | Monto que pagó |
| amountOwed | Decimal(12,2) | DEFAULT 0 | Monto que debe |

**Restricciones:**
- UNIQUE(expenseId, userId): Un usuario solo aparece una vez por gasto
- FK expenseId → Expense (CASCADE DELETE)
- FK userId → User

**Relaciones:**
- Referencia a Expense
- Referencia a User

---

### 6. **Payment** (pagos)
Registra pagos entre usuarios para liquidar deudas.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| id | UUID | PK | Identificador único |
| debtorId | UUID | FK, NOT NULL | Usuario que debe |
| creditorId | UUID | FK, NOT NULL | Usuario que recibe |
| tripId | UUID | FK, NOT NULL | Viaje asociado |
| amount | Decimal(12,2) | NOT NULL | Monto pagado |
| note | String | NULL | Nota o referencia |
| date | DateTime | DEFAULT NOW() | Fecha del pago |
| createdAt | DateTime | DEFAULT NOW() | Fecha de creación |
| deletedAt | DateTime | NULL, INDEX | Soft delete |

**Restricciones:**
- FK debtorId → User
- FK creditorId → User
- FK tripId → Trip (CASCADE DELETE)
- INDEX tripId, deletedAt

**Relaciones:**
- Referencia a User (deudor)
- Referencia a User (acreedor)
- Referencia a Trip

---

## Enumeraciones

### TripStatus
- **ACTIVE**: Viaje activo
- **FINALIZED**: Viaje finalizado

### ParticipationRole
- **CREATOR**: Creador del viaje
- **SUPERVISOR**: Supervisor con permisos especiales
- **MEMBER**: Miembro regular

### ExpenseSplitType
- **EQUAL**: División equitativa entre todos
- **EXACT**: Montos específicos por usuario
- **PERCENT**: Porcentajes de división

---

## Análisis de Normalización (3FN)

### Cumplimiento General: Mayormente en 3FN

La mayoría del esquema cumple con la Tercera Forma Normal (3FN). Sin embargo, hay **dos campos denormalizados intencionalmente** para optimización de rendimiento:

### Denormalizaciones Detectadas

#### 1. **Participation.currentBalance**
- **Problema**: Este campo es derivado/calculado. Su valor es la suma neta de:
  - Montos que el usuario debe en `ExpenseDetail.amountOwed`
  - Montos pagados vía `Payment`
  - Menos montos que el usuario pagó en `ExpenseDetail.amountPaid`

- **Violación 3FN**: El campo tiene dependencia transitiva en `ExpenseDetail` y `Payment`
- **Razón de la denormalización**: Cache de rendimiento para evitar cálculos costosos en cada consulta de balance

#### 2. **Expense.baseAmount**
- **Problema**: Este campo es derivado. Surge de: `baseAmount = originalAmount × exchangeRate`
- **Violación 3FN**: Dependencia transitiva en `originalAmount` y `exchangeRate`
- **Razón de la denormalización**: Cache de conversión de moneda para evitar recalcularla en cada consulta
