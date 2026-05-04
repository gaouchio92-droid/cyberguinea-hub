-- Enum pour le type de marqueur signalé sur la carte
CREATE TYPE public.map_marker_type AS ENUM ('incident', 'signalement', 'travaux', 'maintenance');

-- Table des liens fibre (tronçons)
CREATE TABLE public.fiber_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  operator_id uuid,
  coordinates jsonb NOT NULL, -- ex: [[lat,lng],[lat,lng], ...]
  color text DEFAULT '#3b82f6',
  status text DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fiber_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiber_links_read" ON public.fiber_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "fiber_links_write" ON public.fiber_links FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fiber_links_update" ON public.fiber_links FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "fiber_links_delete" ON public.fiber_links FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER fiber_links_updated_at BEFORE UPDATE ON public.fiber_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Table des marqueurs géolocalisés signalés par les utilisateurs
CREATE TABLE public.map_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.map_marker_type NOT NULL,
  title text NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  status text DEFAULT 'open',
  operator_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "map_markers_read" ON public.map_markers FOR SELECT TO authenticated USING (true);
CREATE POLICY "map_markers_write" ON public.map_markers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY "map_markers_update" ON public.map_markers FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "map_markers_delete" ON public.map_markers FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER map_markers_updated_at BEFORE UPDATE ON public.map_markers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();