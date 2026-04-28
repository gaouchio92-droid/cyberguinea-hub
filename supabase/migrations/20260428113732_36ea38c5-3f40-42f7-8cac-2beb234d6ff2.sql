
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst');
CREATE TYPE public.incident_type AS ENUM ('phishing', 'malware', 'ddos', 'account_compromise', 'data_leak', 'other');
CREATE TYPE public.severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'contained', 'resolved', 'closed');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.operator_type AS ENUM ('telecom', 'isp');
CREATE TYPE public.intel_category AS ENUM ('cve', 'apt', 'ransomware', 'phishing_campaign', 'other');
CREATE TYPE public.report_type AS ENUM ('weekly', 'monthly', 'incident', 'audit');
CREATE TYPE public.audit_framework AS ENUM ('ISO27001', 'NIST', 'ARPT', 'PCI_DSS');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto profile + default analyst role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'analyst');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Operators
CREATE TABLE public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type operator_type NOT NULL,
  region TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  compliance_score INT DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incidents
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type incident_type NOT NULL,
  severity severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'open',
  owner_id UUID REFERENCES auth.users(id),
  operator_id UUID REFERENCES public.operators(id),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  timeline JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audits
CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  framework audit_framework NOT NULL,
  score INT CHECK (score BETWEEN 0 AND 100),
  findings TEXT,
  remediation_plan TEXT,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  auditor_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intel items
CREATE TABLE public.intel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category intel_category NOT NULL,
  severity severity NOT NULL DEFAULT 'medium',
  region_impact TEXT,
  source TEXT,
  description TEXT,
  recommendations TEXT,
  cve_id TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type report_type NOT NULL,
  content TEXT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPI snapshots
CREATE TABLE public.kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incidents_open INT DEFAULT 0,
  incidents_resolved INT DEFAULT 0,
  mttd_minutes INT DEFAULT 0,
  mttr_minutes INT DEFAULT 0,
  operator_compliance_avg INT DEFAULT 0,
  threat_level TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles policies (only admins manage)
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tasks: private per user
CREATE POLICY "tasks_own_all" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shared operational data: all authenticated read; analyst/admin write; admin delete
CREATE POLICY "operators_read" ON public.operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "operators_write" ON public.operators FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "operators_update" ON public.operators FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "operators_delete" ON public.operators FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "incidents_read" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidents_write" ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "incidents_delete" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "audits_read" ON public.audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "audits_write" ON public.audits FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "audits_update" ON public.audits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "audits_delete" ON public.audits FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "intel_read" ON public.intel_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "intel_write" ON public.intel_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "intel_update" ON public.intel_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "intel_delete" ON public.intel_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "reports_read" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "reports_write" ON public.reports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports_delete" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "kpi_read" ON public.kpi_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_write" ON public.kpi_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_operators_updated BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed Guinea operators
INSERT INTO public.operators (name, type, region, contact_email, compliance_score) VALUES
('Orange Guinée', 'telecom', 'Conakry', 'security@orange.gn', 82),
('MTN Guinée', 'telecom', 'Conakry', 'soc@mtn.gn', 78),
('Cellcom Guinée', 'telecom', 'Conakry', 'cert@cellcom.gn', 65),
('Guinée Télécom (SOTELGUI)', 'telecom', 'Conakry', 'security@sotelgui.gn', 58),
('VDC Telecom', 'telecom', 'Conakry', 'noc@vdc.gn', 70),
('Skyvision Guinea', 'isp', 'Conakry', 'noc@skyvision.gn', 72),
('ETI Guinée', 'isp', 'Conakry', 'admin@eti.gn', 68),
('Mouna Group', 'isp', 'Kindia', 'it@mouna.gn', 55),
('Afribone Guinée', 'isp', 'Conakry', 'security@afribone.gn', 75),
('GuiNet', 'isp', 'Kankan', 'noc@guinet.gn', 60),
('Bluezone Guinée', 'isp', 'Conakry', 'admin@bluezone.gn', 66),
('Orange Internet Pro', 'isp', 'Labé', 'pro@orange.gn', 80),
('Wave Guinea', 'isp', 'Boké', 'it@wave.gn', 62),
('Conectys', 'isp', 'Conakry', 'soc@conectys.gn', 71),
('Net Plus', 'isp', 'Faranah', 'admin@netplus.gn', 53),
('Sahel Networks', 'isp', 'Mamou', 'noc@sahel.gn', 58),
('GuineaLink', 'isp', 'N''Zérékoré', 'it@guinealink.gn', 64),
('FibreGn', 'isp', 'Conakry', 'security@fibregn.gn', 77),
('CityCom', 'isp', 'Kankan', 'admin@citycom.gn', 50),
('Atlantic ISP', 'isp', 'Boké', 'noc@atlantic.gn', 69),
('GN Cloud', 'isp', 'Conakry', 'cloud@gncloud.gn', 73);

-- Seed intel
INSERT INTO public.intel_items (title, category, severity, region_impact, source, description, recommendations, cve_id, published_at) VALUES
('CVE-2026-1024 - Cisco IOS XE RCE', 'cve', 'critical', 'Afrique de l''Ouest', 'NVD', 'Vulnérabilité critique d''exécution de code à distance affectant les routeurs Cisco IOS XE largement déployés chez les opérateurs.', 'Appliquer le patch Cisco IOS XE 17.12.4 en urgence. Filtrer l''accès management.', 'CVE-2026-1024', now() - interval '2 days'),
('Campagne APT BlackTech ciblant les télécoms ouest-africains', 'apt', 'high', 'Guinée, Sénégal, Côte d''Ivoire', 'Mandiant', 'Groupe APT BlackTech observé ciblant des opérateurs télécom de l''Afrique de l''Ouest via spear-phishing.', 'Renforcer MFA, surveiller IOCs publiés, sensibiliser cadres dirigeants.', NULL, now() - interval '5 days'),
('Ransomware LockBit 4.0 - vague mondiale', 'ransomware', 'critical', 'Mondial / Guinée', 'CERT-FR', 'Nouvelle variante LockBit 4.0 exploitant des VPN non patchés.', 'Patcher VPN Fortinet/Pulse, sauvegardes hors ligne, EDR à jour.', NULL, now() - interval '7 days'),
('Phishing massif "Orange Money Guinée"', 'phishing_campaign', 'high', 'Guinée', 'CERT-ARPT', 'Campagne de phishing imitant Orange Money Guinée pour voler les identifiants mobile money.', 'Bloquer domaines listés, communiquer aux abonnés, coordination avec Orange Guinée.', NULL, now() - interval '1 day'),
('CVE-2026-0987 - Fortinet FortiOS', 'cve', 'high', 'Afrique', 'Fortinet PSIRT', 'Contournement d''authentification dans FortiOS 7.4.x.', 'Mise à jour vers 7.4.6 immédiate.', 'CVE-2026-0987', now() - interval '3 days');

-- Seed incidents (after operators exist)
INSERT INTO public.incidents (title, type, severity, status, operator_id, description, notes)
SELECT 'Tentative DDoS sur infrastructure DNS', 'ddos', 'high', 'investigating', id, 'Pic de trafic UDP 53 détecté sur les résolveurs DNS principaux.', 'Mitigation BGP en cours avec Cloudflare.' FROM public.operators WHERE name='Orange Guinée' LIMIT 1;
INSERT INTO public.incidents (title, type, severity, status, operator_id, description, notes)
SELECT 'Phishing Orange Money - 1200 victimes', 'phishing', 'high', 'open', id, 'Campagne de phishing massive ciblant les utilisateurs Orange Money.', 'Coordination avec opérateur en cours.' FROM public.operators WHERE name='Orange Guinée' LIMIT 1;
INSERT INTO public.incidents (title, type, severity, status, operator_id, description) 
SELECT 'Compromission compte admin BSS', 'account_compromise', 'critical', 'contained', id, 'Compte administrateur BSS compromis détecté via logs SIEM.' FROM public.operators WHERE name='MTN Guinée' LIMIT 1;
INSERT INTO public.incidents (title, type, severity, status, operator_id, description) 
SELECT 'Malware Emotet sur poste opérateur', 'malware', 'medium', 'resolved', id, 'Détection Emotet sur poste de travail support technique.' FROM public.operators WHERE name='Cellcom Guinée' LIMIT 1;
INSERT INTO public.incidents (title, type, severity, status, operator_id, description) 
SELECT 'Fuite de données abonnés présumée', 'data_leak', 'critical', 'investigating', id, 'Données abonnés mises en vente sur forum darknet.' FROM public.operators WHERE name='Cellcom Guinée' LIMIT 1;

-- Seed audits
INSERT INTO public.audits (operator_id, framework, score, findings, remediation_plan, audit_date)
SELECT id, 'ISO27001', 82, 'Politique de sécurité conforme. Faiblesses sur la gestion des accès privilégiés.', 'Déployer PAM d''ici Q3 2026.', CURRENT_DATE - 30 FROM public.operators WHERE name='Orange Guinée' LIMIT 1;
INSERT INTO public.audits (operator_id, framework, score, findings, remediation_plan, audit_date)
SELECT id, 'NIST', 78, 'Détection (DE) à renforcer. SOC 24/7 absent.', 'Mettre en place un SOC managé.', CURRENT_DATE - 45 FROM public.operators WHERE name='MTN Guinée' LIMIT 1;
INSERT INTO public.audits (operator_id, framework, score, findings, remediation_plan, audit_date)
SELECT id, 'ARPT', 65, 'Non-conformité sur la conservation des logs (6 mois requis).', 'Mise en conformité logs sous 60 jours.', CURRENT_DATE - 15 FROM public.operators WHERE name='Cellcom Guinée' LIMIT 1;

-- Seed KPI snapshots (last 14 days)
INSERT INTO public.kpi_snapshots (snapshot_date, incidents_open, incidents_resolved, mttd_minutes, mttr_minutes, operator_compliance_avg, threat_level)
SELECT CURRENT_DATE - i, 5 + (random()*8)::int, 2 + (random()*5)::int, 25 + (random()*20)::int, 180 + (random()*120)::int, 65 + (random()*15)::int,
  CASE WHEN i % 4 = 0 THEN 'high' WHEN i % 3 = 0 THEN 'medium' ELSE 'medium' END
FROM generate_series(0, 13) i;
