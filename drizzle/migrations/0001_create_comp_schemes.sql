CREATE TABLE public.comp_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT false,
  target_units integer NOT NULL,
  target_payout_eur numeric NOT NULL,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comp_schemes TO anon, authenticated;
GRANT ALL ON public.comp_schemes TO service_role;
ALTER TABLE public.comp_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read compensation schemes" ON public.comp_schemes FOR SELECT TO anon, authenticated USING (true);
CREATE UNIQUE INDEX comp_schemes_one_active ON public.comp_schemes (active) WHERE active;
COMMENT ON TABLE public.comp_schemes IS 'Shared compensation configuration; client read-only, maintained by privileged service. At most one active scheme.';
COMMENT ON COLUMN public.quarterly_kpis.altas_target IS 'DEPRECATED: compensation target now comes from the active public.comp_schemes row; retained for historical records.';