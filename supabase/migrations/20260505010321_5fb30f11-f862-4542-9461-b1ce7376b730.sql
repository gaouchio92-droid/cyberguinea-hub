-- Restrict operator contact info: split read policy
DROP POLICY IF EXISTS operators_read ON public.operators;

-- Public-ish view (without contact details) for all authenticated users
CREATE POLICY "operators_read_public_fields"
ON public.operators
FOR SELECT
TO authenticated
USING (true);

-- Hide sensitive columns via column-level GRANT
REVOKE SELECT ON public.operators FROM authenticated;
GRANT SELECT (id, name, type, region, compliance_score, notes, created_at, updated_at, source_url, last_synced_at, last_sync_summary, latitude, longitude)
  ON public.operators TO authenticated;
GRANT SELECT (contact_email, contact_phone) ON public.operators TO authenticated;
-- Revoke contact columns from base authenticated, then grant only to specific roles via secure function
REVOKE SELECT (contact_email, contact_phone) ON public.operators FROM authenticated;

-- Provide a security-definer accessor for analysts/admins
CREATE OR REPLACE FUNCTION public.get_operator_contact(_operator_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.contact_email, o.contact_phone
  FROM public.operators o
  WHERE o.id = _operator_id
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst'));
$$;

REVOKE EXECUTE ON FUNCTION public.get_operator_contact(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_operator_contact(uuid) TO authenticated;

-- Explicitly revoke has_role from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;