ALTER TABLE public.companies
  ADD COLUMN geocode_status text,
  ADD COLUMN geocoded_at timestamptz;