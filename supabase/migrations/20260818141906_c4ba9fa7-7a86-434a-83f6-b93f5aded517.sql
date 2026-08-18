ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON public.staff_members(user_id);

CREATE TABLE public.user_push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  device_name text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_devices TO authenticated;
GRANT ALL ON public.user_push_devices TO service_role;
ALTER TABLE public.user_push_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own devices" ON public.user_push_devices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_push_devices_user ON public.user_push_devices(user_id) WHERE enabled;
CREATE TRIGGER update_push_devices_updated_at BEFORE UPDATE ON public.user_push_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.user_push_devices(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  company_id uuid,
  status text NOT NULL DEFAULT 'sent',
  error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  event_created boolean NOT NULL DEFAULT true,
  event_updated boolean NOT NULL DEFAULT true,
  event_cancelled boolean NOT NULL DEFAULT true,
  event_date_changed boolean NOT NULL DEFAULT true,
  event_time_changed boolean NOT NULL DEFAULT true,
  event_location_changed boolean NOT NULL DEFAULT true,
  event_assignment_added boolean NOT NULL DEFAULT true,
  event_assignment_removed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification prefs" ON public.notification_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_notif_prefs_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;