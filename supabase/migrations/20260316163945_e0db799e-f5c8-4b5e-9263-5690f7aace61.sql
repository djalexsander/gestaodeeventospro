ALTER TABLE public.events 
  ADD COLUMN departure_date date,
  ADD COLUMN departure_time text NOT NULL DEFAULT '',
  ADD COLUMN staff_notes text NOT NULL DEFAULT '';