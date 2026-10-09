// Vistas del dashboard Nexus mapeadas a URLs propias (fuente de verdad: la ruta).
export type NexusView = 'hoy' | 'clientes' | 'archivo';

export const NEXUS_VIEW_PATHS: Record<NexusView, string> = {
  hoy: '/hoy',
  clientes: '/clientes',
  archivo: '/archivo',
};

export const nexusViewFromPath = (pathname: string): NexusView | null => {
  const entry = (Object.entries(NEXUS_VIEW_PATHS) as [NexusView, string][]).find(([, p]) => p === pathname);
  return entry ? entry[0] : null;
};
