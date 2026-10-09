REVOKE ALL PRIVILEGES ON TABLE public.companies, public.leads, public.company_activities, public.user_notes, public.quarterly_kpis, public.sales, public.sedes, public.opportunity_lines FROM anon;

DROP POLICY IF EXISTS "TEMP open read companies" ON public.companies;
DROP POLICY IF EXISTS "TEMP open insert companies" ON public.companies;
DROP POLICY IF EXISTS "TEMP open update companies" ON public.companies;
DROP POLICY IF EXISTS "TEMP open all leads" ON public.leads;
DROP POLICY IF EXISTS "TEMP open all activities" ON public.company_activities;
DROP POLICY IF EXISTS "TEMP open all notes" ON public.user_notes;
DROP POLICY IF EXISTS "TEMP open all kpis" ON public.quarterly_kpis;
DROP POLICY IF EXISTS "TEMP open all sales" ON public.sales;
DROP POLICY IF EXISTS "TEMP open all sedes" ON public.sedes;
DROP POLICY IF EXISTS "TEMP open all opportunity lines" ON public.opportunity_lines;

GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads, public.company_activities, public.user_notes, public.quarterly_kpis, public.sales, public.sedes, public.opportunity_lines TO authenticated;

CREATE POLICY "Authenticated users share leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users share activities" ON public.company_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users share notes" ON public.user_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users share kpis" ON public.quarterly_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users share opportunity lines" ON public.opportunity_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);