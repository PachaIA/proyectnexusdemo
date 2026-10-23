CREATE TABLE public.deleted_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  name text NOT NULL,
  cif text,
  archive_reason text,
  delete_reason text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid
);
GRANT SELECT ON public.deleted_companies TO authenticated;
GRANT ALL ON public.deleted_companies TO service_role;
ALTER TABLE public.deleted_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read deleted companies" ON public.deleted_companies FOR SELECT TO authenticated USING (public.is_owner());

CREATE OR REPLACE FUNCTION public.delete_company_permanently(_company_id text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF NOT public.is_owner() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'Falta el motivo de eliminación'; END IF;
  SELECT id, name, cif, archive_reason, archived_at INTO c FROM public.companies WHERE id = _company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;
  IF c.archived_at IS NULL THEN RAISE EXCEPTION 'Solo se pueden eliminar clientes archivados'; END IF;
  INSERT INTO public.deleted_companies(company_id, name, cif, archive_reason, delete_reason, deleted_by)
    VALUES (c.id, c.name, c.cif, c.archive_reason, btrim(_reason), auth.uid());
  DELETE FROM public.opportunity_lines WHERE lead_id IN (SELECT id FROM public.leads WHERE company_id = _company_id);
  DELETE FROM public.leads WHERE company_id = _company_id;
  DELETE FROM public.company_activities WHERE company_id = _company_id;
  DELETE FROM public.sedes WHERE company_id = _company_id;
  DELETE FROM public.sales WHERE company_id = _company_id;
  DELETE FROM public.companies WHERE id = _company_id;
END $$;
REVOKE ALL ON FUNCTION public.delete_company_permanently(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_company_permanently(text, text) TO authenticated;