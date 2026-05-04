
CREATE TYPE public.operation_status AS ENUM ('planned', 'ongoing', 'paused', 'completed', 'cancelled');
CREATE TYPE public.operation_type AS ENUM ('investigation', 'response', 'audit', 'monitoring', 'exercise', 'other');
CREATE TYPE public.log_level AS ENUM ('info', 'warning', 'error', 'critical', 'debug');

CREATE TABLE public.operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type operation_type NOT NULL DEFAULT 'investigation',
  status operation_status NOT NULL DEFAULT 'planned',
  priority task_priority NOT NULL DEFAULT 'medium',
  operator_id uuid,
  owner_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY operations_read ON public.operations FOR SELECT TO authenticated USING (true);
CREATE POLICY operations_write ON public.operations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'analyst'));
CREATE POLICY operations_update ON public.operations FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'analyst'));
CREATE POLICY operations_delete ON public.operations FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER operations_set_updated_at BEFORE UPDATE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target text,
  level log_level NOT NULL DEFAULT 'info',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_logs_read_admin ON public.system_logs FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY system_logs_insert_any ON public.system_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_operations_status ON public.operations(status);
