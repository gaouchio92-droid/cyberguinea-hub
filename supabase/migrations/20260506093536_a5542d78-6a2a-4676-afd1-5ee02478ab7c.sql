
-- SIEM/EDR Sources
CREATE TYPE siem_vendor AS ENUM ('wazuh','splunk','sentinel','crowdstrike','generic');

CREATE TABLE public.siem_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vendor siem_vendor NOT NULL,
  operator_id uuid REFERENCES public.operators(id) ON DELETE SET NULL,
  ingest_token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  enabled boolean NOT NULL DEFAULT true,
  severity_threshold severity NOT NULL DEFAULT 'high',
  endpoint_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_event_at timestamptz,
  events_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.siem_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY siem_sources_read ON public.siem_sources FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'analyst'));
CREATE POLICY siem_sources_write ON public.siem_sources FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY siem_sources_update ON public.siem_sources FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY siem_sources_delete ON public.siem_sources FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER siem_sources_updated BEFORE UPDATE ON public.siem_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Alerts
CREATE TABLE public.siem_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.siem_sources(id) ON DELETE CASCADE,
  external_id text,
  title text NOT NULL,
  description text,
  severity severity NOT NULL DEFAULT 'medium',
  category text,
  host text,
  source_ip text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.siem_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY siem_alerts_read ON public.siem_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY siem_alerts_update ON public.siem_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'analyst'));
CREATE POLICY siem_alerts_delete ON public.siem_alerts FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_siem_alerts_source ON public.siem_alerts(source_id, occurred_at DESC);
CREATE INDEX idx_siem_alerts_status ON public.siem_alerts(status);

-- Auto promote alert to incident if severity >= threshold
CREATE OR REPLACE FUNCTION public.siem_alert_auto_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_src public.siem_sources;
  v_rank int;
  v_threshold int;
  v_inc_id uuid;
BEGIN
  SELECT * INTO v_src FROM public.siem_sources WHERE id = NEW.source_id;
  IF v_src IS NULL THEN RETURN NEW; END IF;

  v_rank := CASE NEW.severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 0 END;
  v_threshold := CASE v_src.severity_threshold WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 ELSE 3 END;

  UPDATE public.siem_sources SET last_event_at = now(), events_count = events_count + 1 WHERE id = NEW.source_id;

  IF v_rank >= v_threshold THEN
    INSERT INTO public.incidents (title, description, type, severity, status, operator_id, created_by, detected_at, notes)
    VALUES (
      '[' || upper(v_src.vendor::text) || '] ' || NEW.title,
      COALESCE(NEW.description,'') || E'\n\nSource: ' || v_src.name || E'\nHost: ' || COALESCE(NEW.host,'-') || E'\nIP: ' || COALESCE(NEW.source_ip,'-'),
      'malware'::incident_type,
      NEW.severity,
      'open'::incident_status,
      v_src.operator_id,
      v_src.created_by,
      NEW.occurred_at,
      'Auto-créé depuis alerte SIEM/EDR'
    ) RETURNING id INTO v_inc_id;
    NEW.incident_id := v_inc_id;
    NEW.status := 'promoted';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER siem_alerts_auto_incident BEFORE INSERT ON public.siem_alerts
  FOR EACH ROW EXECUTE FUNCTION public.siem_alert_auto_incident();
