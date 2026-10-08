
- Auth is temporarily disabled: routes are unguarded, `getEffectiveUser()` falls back to a shared open user ID, and "TEMP open" anon RLS policies grant access — remove all three together when login returns. Why: owner wants the app usable without login for now.
- Map tiles use keyless Esri basemaps. Why: CARTO tiles now require an API key.
- Dashboard views are URL routes (/, /clientes, /informes, /agenda, /briefing?company=<id>, /archivo) derived via useLocation; never switch views with global events. Why: survives F5, back button and deep links.
- Cross-component data refresh uses the shared queryClient helpers (refreshCompanies/refreshLeads) and router state, not window CustomEvents. Why: no lost events or mount races.
- PWA: vite-plugin-pwa generateSW (/sw.js, autoUpdate, injectRegister:null); registration only via src/lib/registerSW.ts guarded wrapper (never in dev/preview/iframe, ?sw=off kills). Data offline = React Query persister (localStorage, 7d) + NetworkFirst runtime cache for /rest/v1 GETs; offline writes queued in src/lib/offlineQueue.ts and flushed on 'online'.
- Opportunity stages live only in src/lib/opportunity.ts (STAGES, mirrors DB enum opportunity_stage); required opportunity fields are enforced both in OpportunityDialog and the leads_validate_required trigger. Why: one source of truth, no bypass.
- Opportunity margin is computed on read from opportunity_lines (revenue - cost) via src/hooks/useOpportunityLines.ts; never store margin_eur/pct. Why: no duplicated derived data.
- Follow-up bucketing (overdue/today/next 7 days, closed and archived excluded) lives only in src/lib/followUps.ts and is covered by src/test/followUps.test.ts. Why: page and nav badge must agree.
