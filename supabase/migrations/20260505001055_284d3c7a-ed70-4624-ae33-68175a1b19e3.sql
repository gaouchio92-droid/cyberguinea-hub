-- #2 Attach guard trigger on profiles.operator_id (function already exists)
DROP TRIGGER IF EXISTS trg_guard_profile_operator_id ON public.profiles;
CREATE TRIGGER trg_guard_profile_operator_id
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_operator_id();

-- #3 Restrict system_logs inserts to admins only (edge functions use service role and bypass RLS)
DROP POLICY IF EXISTS system_logs_insert_any ON public.system_logs;
CREATE POLICY system_logs_insert_admin
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- #4 Harden map_markers UPDATE: keep created_by immutable
CREATE OR REPLACE FUNCTION public.guard_map_markers_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_map_markers_update ON public.map_markers;
CREATE TRIGGER trg_guard_map_markers_update
BEFORE UPDATE ON public.map_markers
FOR EACH ROW EXECUTE FUNCTION public.guard_map_markers_update();

-- Tighten UPDATE policy WITH CHECK so role escalation paths are blocked
DROP POLICY IF EXISTS map_markers_update ON public.map_markers;
CREATE POLICY map_markers_update
ON public.map_markers
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid())
  OR public.has_role(auth.uid(), 'analyst')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (created_by = auth.uid())
  OR public.has_role(auth.uid(), 'analyst')
  OR public.has_role(auth.uid(), 'admin')
);