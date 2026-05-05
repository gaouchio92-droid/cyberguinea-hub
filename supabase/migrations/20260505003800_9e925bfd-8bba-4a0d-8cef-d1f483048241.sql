-- Sprint 5: Compliance module (ANSSI / NIS2)
CREATE TYPE public.compliance_framework AS ENUM ('ANSSI','NIS2','ISO27001','PCIDSS');
CREATE TYPE public.compliance_status AS ENUM ('compliant','partial','non_compliant','not_applicable');

CREATE TABLE public.compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework public.compliance_framework NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  weight integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(framework, code)
);

CREATE TABLE public.compliance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL,
  requirement_id uuid NOT NULL REFERENCES public.compliance_requirements(id) ON DELETE CASCADE,
  status public.compliance_status NOT NULL DEFAULT 'non_compliant',
  evidence text,
  remediation_due date,
  assessed_by uuid,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operator_id, requirement_id)
);

ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req_read" ON public.compliance_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "req_write" ON public.compliance_requirements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "req_update" ON public.compliance_requirements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "req_delete" ON public.compliance_requirements FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ass_read" ON public.compliance_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ass_write" ON public.compliance_assessments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ass_update" ON public.compliance_assessments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ass_delete" ON public.compliance_assessments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER compliance_assessments_updated BEFORE UPDATE ON public.compliance_assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime for incidents & tasks
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Seed ANSSI & NIS2 requirements
INSERT INTO public.compliance_requirements (framework, code, title, description, category, weight) VALUES
('ANSSI','HSO-01','Hygiène — Authentification forte','MFA pour comptes à privilèges','Hygiène',3),
('ANSSI','HSO-02','Hygiène — Cartographie SI','Inventaire à jour des actifs critiques','Hygiène',2),
('ANSSI','HSO-03','Hygiène — Sauvegardes','Sauvegardes hors-ligne testées trimestriellement','Hygiène',3),
('ANSSI','HSO-04','Hygiène — Cloisonnement réseau','Segmentation OT/IT et zones sensibles','Réseau',3),
('ANSSI','HSO-05','Hygiène — Journalisation','Centralisation et conservation 12 mois','Logs',2),
('ANSSI','HSO-06','Hygiène — Mise à jour','Patch management documenté','Maintenance',2),
('ANSSI','HSO-07','Hygiène — Sensibilisation','Formation annuelle utilisateurs','RH',1),
('NIS2','GOV-01','Gouvernance — Responsabilité dirigeants','Comité cybersécurité validé direction','Gouvernance',3),
('NIS2','GOV-02','Gouvernance — Politique SSI','PSSI formalisée et révisée annuellement','Gouvernance',2),
('NIS2','RM-01','Risques — Analyse','Analyse risques EBIOS RM à jour','Risques',3),
('NIS2','IM-01','Incident — Notification 24h','Procédure notification ARPT < 24h','Incident',3),
('NIS2','IM-02','Incident — Plan crise','PCA/PRA testés annuellement','Incident',3),
('NIS2','SC-01','Supply chain — Évaluation fournisseurs','Audit sous-traitants critiques','Supply',2),
('NIS2','TR-01','Formation — Conseil d''administration','Formation cyber dirigeants','RH',1),
('NIS2','VM-01','Vulnérabilités — Divulgation coordonnée','Procédure CVD publiée','Vulnérabilités',2);
