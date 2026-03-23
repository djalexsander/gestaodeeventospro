
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin master can manage all notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Payment submissions table
CREATE TABLE public.payment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  receipt_url TEXT,
  receipt_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view payment submissions" ON public.payment_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert payment submissions" ON public.payment_submissions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin master can manage payment submissions" ON public.payment_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

-- Plan change requests table
CREATE TABLE public.plan_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  current_plan_id UUID REFERENCES public.plans(id),
  requested_plan_id UUID NOT NULL REFERENCES public.plans(id),
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plan change requests" ON public.plan_change_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert plan change requests" ON public.plan_change_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin master can manage plan change requests" ON public.plan_change_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_master'))
  WITH CHECK (has_role(auth.uid(), 'admin_master'));

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload receipts" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Anyone can view receipts" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-receipts');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
