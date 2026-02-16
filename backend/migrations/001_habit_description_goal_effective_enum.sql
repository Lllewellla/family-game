-- Add description and goal_effective_from to habits; add new enum values for HabitType and ScheduleType.
-- Run manually: psql $DATABASE_URL -f migrations/001_habit_description_goal_effective_enum.sql

-- New habit type: times_per_week
ALTER TYPE habittype ADD VALUE IF NOT EXISTS 'times_per_week';

-- New schedule type: weekly_target
ALTER TYPE scheduletype ADD VALUE IF NOT EXISTS 'weekly_target';

-- New columns on habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_effective_from DATE;
