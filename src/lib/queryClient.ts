import { QueryClient } from '@tanstack/react-query';

// Cliente compartido: permite refrescar datos desde cualquier sitio sin eventos globales.
export const queryClient = new QueryClient();

export const refreshCompanies = () => queryClient.invalidateQueries({ queryKey: ['companies'] });
export const refreshLeads = () => queryClient.invalidateQueries({ queryKey: ['leads'] });
