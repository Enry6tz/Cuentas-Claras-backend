-- Verificación de constraints, índices y FKs en la DB real.
-- Correr con: psql $DATABASE_URL -f prisma/verify-constraints.sql
-- O pegar en el SQL editor del dashboard de la DB.

-- ============================================
-- 1. UNIQUE constraints esperados
-- ============================================
-- Esperados:
--   users.clerk_id
--   users.email
--   participations (user_id, trip_id)
--   expense_details (expense_id, user_id)
SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 2. ÍNDICES esperados
-- ============================================
-- Esperados:
--   expenses.trip_id
--   expenses.creator_id
--   expenses.deleted_at (nuevo)
--   payments.trip_id
--   payments.deleted_at (nuevo)
--   trips.deleted_at (nuevo)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 3. FOREIGN KEYS y comportamiento ON DELETE
-- ============================================
-- Esperados con ON DELETE CASCADE:
--   participations.user_id -> users
--   participations.trip_id -> trips
--   expenses.trip_id -> trips
--   expense_details.expense_id -> expenses
--   payments.trip_id -> trips
-- Esperados sin cascade (default NO ACTION):
--   expenses.creator_id -> users
--   expense_details.user_id -> users
--   payments.debtor_id -> users
--   payments.creditor_id -> users
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  rc.delete_rule AS on_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 4. ENUMS y sus valores
-- ============================================
-- Esperados:
--   ParticipationRole: CREATOR, SUPERVISOR, MEMBER
--   TripStatus: ACTIVE, FINALIZED
--   ExpenseSplitType: EQUAL, EXACT, PERCENT (nuevo)
SELECT
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================
-- 5. Columnas nuevas (verificar que la migración corrió)
-- ============================================
-- Esperadas:
--   trips.description, trips.deleted_at
--   expenses.split_type, expenses.deleted_at
--   payments.note, payments.deleted_at
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'trips' AND column_name IN ('description', 'deleted_at')) OR
    (table_name = 'expenses' AND column_name IN ('split_type', 'deleted_at')) OR
    (table_name = 'payments' AND column_name IN ('note', 'deleted_at'))
  )
ORDER BY table_name, column_name;
