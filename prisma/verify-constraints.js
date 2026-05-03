// Verificación de constraints, índices y FKs en la DB real.
// Correr con: node prisma/verify-constraints.js (desde la raíz del backend)

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const checks = [
  {
    name: '1. UNIQUE constraints',
    expected: ['users.clerk_id', 'users.email', 'participations(user_id, trip_id)', 'expense_details(expense_id, user_id)'],
    sql: `
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
    `,
  },
  {
    name: '2. Indices',
    expected: [
      'expenses.trip_id', 'expenses.creator_id', 'expenses.deleted_at',
      'payments.trip_id', 'payments.deleted_at', 'trips.deleted_at',
    ],
    sql: `
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `,
  },
  {
    name: '3. Foreign Keys + ON DELETE policy',
    expected: [
      'CASCADE: participations->users, participations->trips, expenses->trips, expense_details->expenses, payments->trips',
      'NO ACTION: expenses->users(creator), expense_details->users, payments->users(debtor/creditor)',
    ],
    sql: `
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
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
    `,
  },
  {
    name: '4. Enums',
    expected: ['ParticipationRole', 'TripStatus', 'ExpenseSplitType (NUEVO)'],
    sql: `
      SELECT
        t.typname AS enum_name,
        string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `,
  },
  {
    name: '5. Columnas nuevas (verificar migración)',
    expected: [
      'trips.description, trips.deleted_at',
      'expenses.split_type, expenses.deleted_at',
      'payments.note, payments.deleted_at',
    ],
    sql: `
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'trips' AND column_name IN ('description', 'deleted_at')) OR
          (table_name = 'expenses' AND column_name IN ('split_type', 'deleted_at')) OR
          (table_name = 'payments' AND column_name IN ('note', 'deleted_at'))
        )
      ORDER BY table_name, column_name;
    `,
  },
];

async function main() {
  console.log('\n========================================');
  console.log(' VERIFICACIÓN DE SCHEMA — Cuentas Claras');
  console.log('========================================\n');

  for (const check of checks) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`▶ ${check.name}`);
    console.log(`Esperado: ${check.expected.join(' | ')}`);
    console.log('='.repeat(60));

    try {
      const rows = await prisma.$queryRawUnsafe(check.sql);
      if (rows.length === 0) {
        console.log('⚠️  Sin resultados — chequear manualmente');
      } else {
        console.table(rows);
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }

  console.log('\n========================================');
  console.log(' Fin de verificación');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
