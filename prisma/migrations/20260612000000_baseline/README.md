# Baseline migration — 2026-06-12

## Що це таке

Це **одноразове технічне вирівнювання** migration history, а не нова фіча.

Проєкт розроблявся з `prisma db push` без формальної migration history.
До цього коміту в `prisma/migrations/` були 15 неповних incremental-міграцій,
які не відображали реальний стан БД (значний schema drift).

## Що зроблено

1. Згенерований повний SQL baseline (`migration.sql`) — знімок поточного стану БД:
   `prisma migrate diff --from-empty --to-config-datasource --script`

2. Міграція позначена як застосована **без запуску**:
   `prisma migrate resolve --applied 20260612000000_baseline`
   (БД вже містить всі ці зміни після db push)

3. Старі 15 migration folders видалені.
   Старі записи з `_prisma_migrations` очищені.

4. `prisma migrate status` → `Database schema is up to date!` ✅

## Зміни схеми, включені в baseline (найважливіші)

- `student_elective_selections` — повністю перебудована:
  - було: `block_id + selected_at + @@unique([blockId, studentId])`
  - стало: `season_id + academic_year + method + status + confirmed_by_id + @@unique([studentId, seasonId])`
- Нові таблиці: `elective_block_seasons`, `elective_offerings`
- Deprecated таблиці (збережені): `elective_components`, `elective_registrations`
- `confirmed_by_id` → FK до `users` (named relation `ElectiveSelectionConfirmedBy`)

## Правило на майбутнє

**Будь-яка зміна schema — тільки через:**
```
npx prisma migrate dev --name <назва_зміни>
```

`db push` — заборонений для будь-яких змін, що мають потрапити в production або
потребують відтворюваної migration history.
