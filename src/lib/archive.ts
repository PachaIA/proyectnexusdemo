export const ARCHIVE_REASONS = [
  'Empresa cerrada / ya no existe',
  'GG.CC.',
  'Descartado',
  'Duplicado',
  'Se fue con la competencia',
  'Otro',
] as const;

export const buildArchiveReason = (motivo: string, nota: string) => {
  const n = nota.trim();
  return n ? `${motivo} — ${n}` : motivo;
};

export const validateArchive = (motivo: string, nota: string): string | null => {
  if (!motivo) return 'Elige un motivo';
  if (motivo === 'Otro' && !nota.trim()) return 'Escribe una nota para el motivo «Otro»';
  return null;
};
