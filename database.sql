
-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.postes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    objectif_dechet_percent NUMERIC DEFAULT 2.0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE,
    role TEXT CHECK (role IN ('admin', 'viewer')) DEFAULT 'viewer',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    poste_id UUID REFERENCES public.postes(id) ON DELETE CASCADE,
    s1_dechets NUMERIC DEFAULT 0,
    s1_produit NUMERIC DEFAULT 0,
    s2_dechets NUMERIC DEFAULT 0,
    s2_produit NUMERIC DEFAULT 0,
    s3_dechets NUMERIC DEFAULT 0,
    s3_produit NUMERIC DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date, poste_id)
);

-- 2. Seed Postes
INSERT INTO public.postes (nom, objectif_dechet_percent) VALUES
('Plaques Métal déployé', 1.5),
('Plaques Empateuse', 2.0),
('Oxyde 1', 1.2),
('Oxyde 2', 1.2),
('Plaques TBS', 2.5),
('Empochteuse DAGA', 3.0),
('Empochteuse COSMEC', 3.0),
('Empochteuse BATEK 1', 2.8),
('Empochteuse BATEK 2', 2.8),
('COS 1', 1.8),
('COS 2', 1.8),
('COS BATEK', 2.0),
('Formation', 1.0),
('HRD', 2.2),
('Fardelage', 0.5),
('Batteries Montage / Assemblage', 1.5)
ON CONFLICT (nom) DO NOTHING;

-- 3. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read, only user can update own profile
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Postes: Anyone authenticated can read, only admin can update/insert
CREATE POLICY "Postes are viewable by all" ON public.postes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can modify postes" ON public.postes FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Daily Entries: Anyone authenticated can read, only admin can update/insert
CREATE POLICY "Entries are viewable by all" ON public.daily_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can modify entries" ON public.daily_entries FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Trigger for Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'viewer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
