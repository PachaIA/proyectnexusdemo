
- Auth is temporarily disabled: routes are unguarded, `getEffectiveUser()` falls back to a shared open user ID, and "TEMP open" anon RLS policies grant access — remove all three together when login returns. Why: owner wants the app usable without login for now.
- Map tiles use keyless Esri basemaps. Why: CARTO tiles now require an API key.
