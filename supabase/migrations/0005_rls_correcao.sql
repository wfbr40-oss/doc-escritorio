-- 0005_rls_correcao.sql
-- Correções de segurança: blindagem de roles, funções internas e autoria de auditoria

-- 1) Usuário comum não pode mudar o próprio papel
DROP POLICY IF EXISTS "Cada usuário atualiza só o próprio perfil" ON public.profiles;
CREATE POLICY "Cada usuário atualiza só o próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 2) Funções internas deixam de ser chamáveis pela API pública
REVOKE EXECUTE ON FUNCTION public.purge_expired_documents(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_expired_documents(timestamptz) TO service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;
ALTER FUNCTION public.purge_expired_documents(timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

-- 3) Auditoria e autoria confiáveis
DROP POLICY IF EXISTS "Autenticados leem audit_log" ON public.audit_log;
CREATE POLICY "Admin lê audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Autenticados inserem audit_log" ON public.audit_log;
CREATE POLICY "Autenticados inserem o próprio audit_log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Autenticados inserem generated_documents" ON public.generated_documents;
CREATE POLICY "Autenticados inserem os próprios generated_documents" ON public.generated_documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
