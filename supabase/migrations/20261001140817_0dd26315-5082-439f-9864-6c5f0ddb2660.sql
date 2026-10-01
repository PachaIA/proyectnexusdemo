ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_user_id_fkey;
ALTER TABLE public.quarterly_kpis DROP CONSTRAINT IF EXISTS quarterly_kpis_user_id_fkey;
ALTER TABLE public.user_notes DROP CONSTRAINT IF EXISTS user_notes_user_id_fkey;

GRANT SELECT, INSERT, UPDATE ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads, public.company_activities, public.user_notes, public.sales, public.sedes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.quarterly_kpis TO anon;

CREATE POLICY "TEMP open read companies" ON public.companies FOR SELECT TO anon USING (true);
CREATE POLICY "TEMP open insert companies" ON public.companies FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "TEMP open update companies" ON public.companies FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "TEMP open all leads" ON public.leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "TEMP open all activities" ON public.company_activities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "TEMP open all notes" ON public.user_notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "TEMP open all kpis" ON public.quarterly_kpis FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "TEMP open all sales" ON public.sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "TEMP open all sedes" ON public.sedes FOR ALL TO anon USING (true) WITH CHECK (true);