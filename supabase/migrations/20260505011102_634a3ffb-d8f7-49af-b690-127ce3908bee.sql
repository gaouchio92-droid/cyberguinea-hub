-- ============ ENUMS ============
CREATE TYPE public.tlp_level AS ENUM ('red', 'amber_strict', 'amber', 'green', 'clear');
CREATE TYPE public.ioc_type AS ENUM ('ipv4', 'ipv6', 'domain', 'url', 'md5', 'sha1', 'sha256', 'email', 'cve', 'filename', 'mutex', 'other');
CREATE TYPE public.bulletin_type AS ENUM ('alerte', 'avis', 'bulletin', 'ioc');
CREATE TYPE public.bulletin_status AS ENUM ('draft', 'published', 'archived');

-- ============ TLP columns on existing tables ============
ALTER TABLE public.incidents    ADD COLUMN IF NOT EXISTS tlp tlp_level NOT NULL DEFAULT 'amber';
ALTER TABLE public.intel_items  ADD COLUMN IF NOT EXISTS tlp tlp_level NOT NULL DEFAULT 'green';
ALTER TABLE public.reports      ADD COLUMN IF NOT EXISTS tlp tlp_level NOT NULL DEFAULT 'amber';
ALTER TABLE public.exercises    ADD COLUMN IF NOT EXISTS tlp tlp_level NOT NULL DEFAULT 'amber';

-- ============ IOCs ============
CREATE TABLE public.iocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type ioc_type NOT NULL,
  value text NOT NULL,
  confidence integer NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  tlp tlp_level NOT NULL DEFAULT 'amber',
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  description text,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  intel_id uuid REFERENCES public.intel_items(id) ON DELETE SET NULL,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, value)
);
CREATE INDEX idx_iocs_type ON public.iocs(type);
CREATE INDEX idx_iocs_tags ON public.iocs USING GIN(tags);
CREATE INDEX idx_iocs_value ON public.iocs(value);

ALTER TABLE public.iocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY iocs_read   ON public.iocs FOR SELECT TO authenticated USING (true);
CREATE POLICY iocs_write  ON public.iocs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY iocs_update ON public.iocs FOR UPDATE TO authenticated USING (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY iocs_delete ON public.iocs FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER iocs_updated_at BEFORE UPDATE ON public.iocs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BULLETINS ============
CREATE TABLE public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  type bulletin_type NOT NULL,
  status bulletin_status NOT NULL DEFAULT 'draft',
  tlp tlp_level NOT NULL DEFAULT 'amber',
  title text NOT NULL,
  summary text,
  body_md text NOT NULL,
  affected_systems text,
  recommendations text,
  cve_refs text[] NOT NULL DEFAULT '{}',
  author_id uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bulletins_status ON public.bulletins(status);
CREATE INDEX idx_bulletins_type ON public.bulletins(type);

ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
-- Lecture : auth users voient drafts si auteur/admin, et published selon TLP
CREATE POLICY bulletins_read ON public.bulletins FOR SELECT TO authenticated USING (
  status = 'published'
  OR author_id = auth.uid()
  OR has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'analyst')
);
-- Lecture publique (anon) : seulement TLP:CLEAR publiés
CREATE POLICY bulletins_public_read ON public.bulletins FOR SELECT TO anon USING (
  status = 'published' AND tlp = 'clear'
);
CREATE POLICY bulletins_write  ON public.bulletins FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY bulletins_update ON public.bulletins FOR UPDATE TO authenticated USING (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY bulletins_delete ON public.bulletins FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER bulletins_updated_at BEFORE UPDATE ON public.bulletins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Génère une référence type CERT-GN-2026-ALE-001
CREATE OR REPLACE FUNCTION public.next_bulletin_reference(_type bulletin_type)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_code text := CASE _type
    WHEN 'alerte' THEN 'ALE'
    WHEN 'avis' THEN 'AVI'
    WHEN 'bulletin' THEN 'BUL'
    WHEN 'ioc' THEN 'IOC'
  END;
  v_count int;
BEGIN
  SELECT COUNT(*)+1 INTO v_count FROM public.bulletins
   WHERE type = _type AND to_char(created_at, 'YYYY') = v_year;
  RETURN 'CERT-GN-' || v_year || '-' || v_code || '-' || lpad(v_count::text, 3, '0');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.next_bulletin_reference(bulletin_type) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.next_bulletin_reference(bulletin_type) TO authenticated;

-- ============ OPERATOR CONTACTS (24/7) ============
CREATE TABLE public.operator_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text,
  email text,
  phone text,
  on_call_24_7 boolean NOT NULL DEFAULT false,
  preferred_channel text,
  pgp_fingerprint text,
  languages text[] NOT NULL DEFAULT ARRAY['fr'],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_operator_contacts_op ON public.operator_contacts(operator_id);
CREATE INDEX idx_operator_contacts_oncall ON public.operator_contacts(on_call_24_7) WHERE on_call_24_7;

ALTER TABLE public.operator_contacts ENABLE ROW LEVEL SECURITY;
-- Strict : analystes / admins seulement (cohérent avec restriction operators.contact_email)
CREATE POLICY oc_read   ON public.operator_contacts FOR SELECT TO authenticated USING (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY oc_write  ON public.operator_contacts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY oc_update ON public.operator_contacts FOR UPDATE TO authenticated USING (has_role(auth.uid(),'analyst') OR has_role(auth.uid(),'admin'));
CREATE POLICY oc_delete ON public.operator_contacts FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER oc_updated_at BEFORE UPDATE ON public.operator_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CSIRT MATURITY (SIM3) ============
CREATE TABLE public.csirt_maturity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code text NOT NULL UNIQUE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 4),
  evidence text,
  assessed_by uuid,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.csirt_maturity ENABLE ROW LEVEL SECURITY;
CREATE POLICY mat_read   ON public.csirt_maturity FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY mat_write  ON public.csirt_maturity FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY mat_update ON public.csirt_maturity FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY mat_delete ON public.csirt_maturity FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER mat_updated_at BEFORE UPDATE ON public.csirt_maturity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed des 24 items SIM3 light
INSERT INTO public.csirt_maturity (item_code, category, title, description) VALUES
('O-1', 'Organisation', 'Mandat officiel', 'Mission CERT formalisée par texte officiel'),
('O-2', 'Organisation', 'Constituency définie', 'Périmètre des bénéficiaires documenté'),
('O-3', 'Organisation', 'Service catalog', 'Catalogue de services CERT publié'),
('O-4', 'Organisation', 'Financement pérenne', 'Budget annuel garanti'),
('O-5', 'Organisation', 'Cadre légal', 'Base légale d''intervention claire'),
('O-6', 'Organisation', 'Reporting hiérarchique', 'Lignes de reporting définies vers la DG/ministère'),
('H-1', 'Humain', 'Effectifs minimaux', 'Au moins 4 ETP dédiés'),
('H-2', 'Humain', 'Description de postes', 'Fiches de poste écrites'),
('H-3', 'Humain', 'Plan de formation', 'Formation continue documentée (SANS, ENISA…)'),
('H-4', 'Humain', 'Code de conduite', 'Charte éthique signée'),
('H-5', 'Humain', 'Gestion des compétences', 'Matrice de compétences à jour'),
('H-6', 'Humain', 'Habilitations', 'Personnels habilités confidentiel défense si requis'),
('T-1', 'Outils', 'Système de ticketing', 'Outil de suivi des incidents (présent ✓)'),
('T-2', 'Outils', 'Plateforme de partage IoC', 'MISP ou équivalent (à valider)'),
('T-3', 'Outils', 'Outils forensiques', 'Capacité d''analyse forensique'),
('T-4', 'Outils', 'Sondes / SIEM', 'Capacité de détection technique'),
('T-5', 'Outils', 'Communication sécurisée', 'PGP, Signal, ligne dédiée'),
('T-6', 'Outils', 'Site web public', 'Site de publication des avis (en cours)'),
('P-1', 'Processus', 'Procédure d''escalade', 'Règles d''escalade documentées'),
('P-2', 'Processus', 'Classification d''incidents', 'Taxonomie standard utilisée'),
('P-3', 'Processus', 'TLP', 'Politique TLP appliquée (présent ✓)'),
('P-4', 'Processus', 'Gestion des vulnérabilités', 'Procédure de divulgation responsable'),
('P-5', 'Processus', 'Exercices réguliers', 'Au moins 1 exercice/an (présent ✓)'),
('P-6', 'Processus', 'Coopération internationale', 'Membre de FIRST / TI / AfricaCERT')
ON CONFLICT (item_code) DO NOTHING;