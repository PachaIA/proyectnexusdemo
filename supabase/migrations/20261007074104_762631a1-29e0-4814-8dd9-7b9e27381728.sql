CREATE TYPE public.opportunity_stage AS ENUM ('lead','contactado','propuesta','negociacion','ganada','perdida');

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_estado_check;
ALTER TABLE public.leads ALTER COLUMN estado DROP DEFAULT;
ALTER TABLE public.leads ALTER COLUMN estado TYPE public.opportunity_stage USING (
  CASE estado
    WHEN 'sin_empezar' THEN 'lead'
    WHEN 'contactado' THEN 'contactado'
    WHEN 'cualificado' THEN 'contactado'
    WHEN 'propuesta' THEN 'propuesta'
    WHEN 'negociacion' THEN 'negociacion'
    WHEN 'ganado' THEN 'ganada'
    WHEN 'perdido' THEN 'perdida'
    ELSE 'lead'
  END
)::public.opportunity_stage;
ALTER TABLE public.leads ALTER COLUMN estado SET DEFAULT 'lead';
ALTER TABLE public.leads ALTER COLUMN estado SET NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS fecha_cierre_prevista date,
  ADD COLUMN IF NOT EXISTS importe_mensual_eur numeric(12,2),
  ADD COLUMN IF NOT EXISTS margen_estimado_eur numeric(12,2);

ALTER TABLE public.leads
  ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);

CREATE OR REPLACE FUNCTION public.validate_lead_required()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.company_id IS NULL OR NEW.company_id = '' THEN RAISE EXCEPTION 'Falta el cliente'; END IF;
    IF NEW.fecha_cierre_prevista IS NULL THEN RAISE EXCEPTION 'Falta la fecha prevista de cierre'; END IF;
    IF NEW.importe_mensual_eur IS NULL THEN RAISE EXCEPTION 'Falta el importe mensual recurrente'; END IF;
    IF NEW.margen_estimado_eur IS NULL THEN RAISE EXCEPTION 'Falta el margen estimado'; END IF;
  ELSE
    IF OLD.fecha_cierre_prevista IS NOT NULL AND NEW.fecha_cierre_prevista IS NULL THEN RAISE EXCEPTION 'Falta la fecha prevista de cierre'; END IF;
    IF OLD.importe_mensual_eur IS NOT NULL AND NEW.importe_mensual_eur IS NULL THEN RAISE EXCEPTION 'Falta el importe mensual recurrente'; END IF;
    IF OLD.margen_estimado_eur IS NOT NULL AND NEW.margen_estimado_eur IS NULL THEN RAISE EXCEPTION 'Falta el margen estimado'; END IF;
  END IF;
  IF NEW.importe_mensual_eur IS NOT NULL AND NEW.importe_mensual_eur < 0 THEN RAISE EXCEPTION 'El importe mensual no puede ser negativo'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_validate_required BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.validate_lead_required();