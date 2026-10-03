import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Cliente compartido: permite refrescar datos desde cualquier sitio sin eventos globales.
// offlineFirst + persistencia = stale-while-revalidate: datos guardados al instante, refresco en segundo plano.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: 1000 * 60 * 60 * 24 * 7, networkMode: 'offlineFirst', retry: (n) => navigator.onLine && n < 2 },
    mutations: { networkMode: 'offlineFirst' },
  },
});

export const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'nexus_query_cache' });

export const LAST_SYNC_KEY = 'nexus_last_sync';
queryClient.getQueryCache().subscribe((e) => {
  if (e.type === 'updated' && e.action.type === 'success' && navigator.onLine && !(e.action as any).manual) {
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  }
});

export const refreshCompanies = () => queryClient.invalidateQueries({ queryKey: ['companies'] });
export const refreshLeads = () => queryClient.invalidateQueries({ queryKey: ['leads'] });
