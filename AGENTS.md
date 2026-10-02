
- Auth is temporarily disabled: routes are unguarded, `getEffectiveUser()` falls back to a shared open user ID, and "TEMP open" anon RLS policies grant access — remove all three together when login returns. Why: owner wants the app usable without login for now.
- Map tiles use keyless Esri basemaps. Why: CARTO tiles now require an API key.
- Dashboard views are URL routes (/, /clientes, /informes, /agenda, /briefing?company=<id>, /archivo) derived via useLocation; never switch views with global events. Why: survives F5, back button and deep links.
- Cross-component data refresh uses the shared queryClient helpers (refreshCompanies/refreshLeads) and router state, not window CustomEvents. Why: no lost events or mount races.
