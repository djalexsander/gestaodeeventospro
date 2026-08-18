ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP INDEX IF EXISTS public.idx_notifications_dedupe;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_dedupe_unique UNIQUE (user_id, dedupe_key);