-- 1. Restreindre l'accès colonnes sensibles operators (RLS ne fait pas le filtrage colonne)
REVOKE SELECT (contact_email, contact_phone) ON public.operators FROM authenticated;
REVOKE SELECT (contact_email, contact_phone) ON public.operators FROM anon;
-- Réautoriser via la fonction sécurisée get_operator_contact (déjà existante, restreinte admin/analyst)

-- 2. Retirer tasks du flux Realtime pour éviter fuite cross-user
ALTER PUBLICATION supabase_realtime DROP TABLE public.tasks;

-- 3. Restreindre l'exécution des fonctions SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_operator_contact(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_bulletin_reference(bulletin_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_operator_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_bulletin_reference(bulletin_type) TO authenticated;