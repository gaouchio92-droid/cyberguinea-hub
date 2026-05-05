-- Sprint 6
ALTER TABLE public.incidents
  ADD COLUMN assignee_id uuid,
  ADD COLUMN sla_due_at timestamptz,
  ADD COLUMN priority public.task_priority NOT NULL DEFAULT 'medium';

CREATE TABLE public.incident_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ic_read ON public.incident_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY ic_write ON public.incident_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY ic_delete ON public.incident_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

CREATE TYPE public.exercise_status AS ENUM ('planned','running','completed','cancelled');
CREATE TYPE public.exercise_kind AS ENUM ('tabletop','simulation','pra_test','phishing_drill','red_team');

CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind public.exercise_kind NOT NULL DEFAULT 'tabletop',
  status public.exercise_status NOT NULL DEFAULT 'planned',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer DEFAULT 60,
  scenario text,
  objectives text,
  lessons_learned text,
  score integer,
  operator_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY ex_read ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY ex_write ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ex_update ON public.exercises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY ex_delete ON public.exercises FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER exercises_updated BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.exercise_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text,
  attended boolean DEFAULT false,
  UNIQUE(exercise_id, user_id)
);
ALTER TABLE public.exercise_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY exp_read ON public.exercise_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY exp_write ON public.exercise_participants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY exp_update ON public.exercise_participants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY exp_delete ON public.exercise_participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'analyst') OR public.has_role(auth.uid(),'admin'));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
