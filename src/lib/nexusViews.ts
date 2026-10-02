// Vistas del dashboard Nexus mapeadas a URLs propias (fuente de verdad: la ruta).
export type NexusView = 'hoy' | 'clientes' | 'briefing' | 'archivo' | 'informes' | 'agenda';

export const NEXUS_VIEW_PATHS: Record<NexusView, string> = {
  hoy: '/',
  clientes: '/clientes',
  briefing: '/briefing',
  archivo: '/archivo',
  informes: '/informes',
  agenda: '/agenda',
};

export const nexusViewFromPath = (pathname: string): NexusView | null => {
  const entry = (Object.entries(NEXUS_VIEW_PATHS) as [NexusView, string][]).find(([, p]) => p === pathname);
  return entry ? entry[0] : null;
};
