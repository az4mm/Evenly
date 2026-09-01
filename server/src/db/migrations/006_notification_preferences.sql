-- Add per-group email notification preference to user_groups
ALTER TABLE user_groups
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;
