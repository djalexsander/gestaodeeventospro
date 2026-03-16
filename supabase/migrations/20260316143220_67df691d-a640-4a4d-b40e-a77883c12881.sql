-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are publicly accessible" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Cities can be inserted" ON public.cities FOR INSERT WITH CHECK (true);
CREATE POLICY "Cities can be updated" ON public.cities FOR UPDATE USING (true);
CREATE POLICY "Cities can be deleted" ON public.cities FOR DELETE USING (true);
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Artists table
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  musical_style TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  rider_file_name TEXT,
  rider_file_url TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists are publicly accessible" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Artists can be inserted" ON public.artists FOR INSERT WITH CHECK (true);
CREATE POLICY "Artists can be updated" ON public.artists FOR UPDATE USING (true);
CREATE POLICY "Artists can be deleted" ON public.artists FOR DELETE USING (true);
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Technical Riders table
CREATE TABLE public.technical_riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  equipment TEXT NOT NULL DEFAULT '',
  sound_system TEXT NOT NULL DEFAULT '',
  microphones TEXT NOT NULL DEFAULT '',
  monitors TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.technical_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders are publicly accessible" ON public.technical_riders FOR SELECT USING (true);
CREATE POLICY "Riders can be inserted" ON public.technical_riders FOR INSERT WITH CHECK (true);
CREATE POLICY "Riders can be updated" ON public.technical_riders FOR UPDATE USING (true);
CREATE POLICY "Riders can be deleted" ON public.technical_riders FOR DELETE USING (true);
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.technical_riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  venue TEXT NOT NULL DEFAULT '',
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE RESTRICT,
  rider_id UUID REFERENCES public.technical_riders(id) ON DELETE SET NULL,
  setup_time TEXT NOT NULL DEFAULT '',
  show_time TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Confirmado', 'Pendente', 'Cancelado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are publicly accessible" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events can be inserted" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Events can be updated" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Events can be deleted" ON public.events FOR DELETE USING (true);
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for rider PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('riders', 'riders', true);
CREATE POLICY "Rider PDFs are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'riders');
CREATE POLICY "Anyone can upload rider PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'riders');
CREATE POLICY "Anyone can update rider PDFs" ON storage.objects FOR UPDATE USING (bucket_id = 'riders');
CREATE POLICY "Anyone can delete rider PDFs" ON storage.objects FOR DELETE USING (bucket_id = 'riders');

-- Insert sample cities
INSERT INTO public.cities (name, state) VALUES ('São Paulo', 'SP'), ('Rio de Janeiro', 'RJ'), ('Belo Horizonte', 'MG');