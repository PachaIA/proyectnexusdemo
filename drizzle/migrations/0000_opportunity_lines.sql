CREATE TABLE public.opportunity_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  producto text NOT NULL DEFAULT '',
  cantidad integer NOT NULL DEFAULT 1,
  monthly_revenue numeric(12,2) NOT NULL DEFAULT 0,
  monthly_cost numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opportunity_lines_lead_id_idx ON public.opportunity_lines(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_lines TO anon;
GRANT ALL ON public.opportunity_lines TO service_role;
ALTER TABLE public.opportunity_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage lines of their own opportunities" ON public.opportunity_lines
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.user_id = auth.uid()));
CREATE POLICY "TEMP open all opportunity lines" ON public.opportunity_lines
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE TRIGGER opportunity_lines_updated_at BEFORE UPDATE ON public.opportunity_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_leads_updated_at();