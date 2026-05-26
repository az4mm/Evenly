-- 005_group_simplify_debts.sql
-- Adds the simplify_debts toggle to the groups table

ALTER TABLE groups ADD COLUMN IF NOT EXISTS simplify_debts BOOLEAN DEFAULT FALSE;
