-- ───── Indexes sur colonnes fréquemment filtrées/triées ─────
CREATE INDEX IF NOT EXISTS idx_incidents_status        ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity      ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_operator      ON public.incidents(operator_id);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at   ON public.incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_created_by    ON public.incidents(created_by);

CREATE INDEX IF NOT EXISTS idx_operations_status       ON public.operations(status);
CREATE INDEX IF NOT EXISTS idx_operations_type         ON public.operations(type);
CREATE INDEX IF NOT EXISTS idx_operations_operator     ON public.operations(operator_id);

CREATE INDEX IF NOT EXISTS idx_map_markers_type        ON public.map_markers(type);
CREATE INDEX IF NOT EXISTS idx_map_markers_created_by  ON public.map_markers(created_by);
CREATE INDEX IF NOT EXISTS idx_map_markers_created_at  ON public.map_markers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fiber_links_operator    ON public.fiber_links(operator_id);
CREATE INDEX IF NOT EXISTS idx_fiber_links_status      ON public.fiber_links(status);

CREATE INDEX IF NOT EXISTS idx_audits_operator         ON public.audits(operator_id);
CREATE INDEX IF NOT EXISTS idx_audits_date             ON public.audits(audit_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user         ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role         ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_system_logs_actor       ON public.system_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at  ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level       ON public.system_logs(level);

CREATE INDEX IF NOT EXISTS idx_intel_published_at      ON public.intel_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_severity          ON public.intel_items(severity);

-- ───── Trigger d'audit automatique ─────
-- SECURITY DEFINER : permet d'écrire dans system_logs même si l'utilisateur courant
-- n'a plus la permission INSERT directe (politique restreinte aux admins).
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_target_id text;
  v_action text := lower(TG_OP) || '_' || TG_TABLE_NAME;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_id := COALESCE(OLD.id::text, '');
  ELSE
    v_target_id := COALESCE(NEW.id::text, '');
  END IF;

  -- Récupère l'email si dispo (best effort, ne bloque jamais)
  BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  INSERT INTO public.system_logs (actor_id, actor_email, action, target, level, metadata)
  VALUES (
    v_actor,
    v_email,
    v_action,
    TG_TABLE_NAME || ':' || v_target_id,
    CASE WHEN TG_OP = 'DELETE' THEN 'warning'::log_level ELSE 'info'::log_level END,
    jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_table_change() FROM anon, authenticated, public;

-- Attache le trigger aux tables sensibles
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['incidents','operators','audits','user_roles','map_markers','fiber_links','operations']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_table_change()',
      t, t
    );
  END LOOP;
END $$;