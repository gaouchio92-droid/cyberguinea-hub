-- Drop and recreate write/update policies on incidents to include operator
DROP POLICY IF EXISTS incidents_write ON public.incidents;
DROP POLICY IF EXISTS incidents_update ON public.incidents;

-- INSERT: analyst, admin, OR operator (operator must set themselves as created_by)
CREATE POLICY incidents_write ON public.incidents
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'analyst'::app_role)
  OR (has_role(auth.uid(), 'operator'::app_role) AND created_by = auth.uid())
);

-- UPDATE: analyst/admin can edit anything; operator only their own
CREATE POLICY incidents_update ON public.incidents
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'analyst'::app_role)
  OR (has_role(auth.uid(), 'operator'::app_role) AND created_by = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'analyst'::app_role)
  OR (has_role(auth.uid(), 'operator'::app_role) AND created_by = auth.uid())
);