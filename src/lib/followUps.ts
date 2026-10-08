// Seguimiento: clasifica próximas acciones en vencidas / hoy / próximos 7 días.
export interface FollowUpLead {
  id: string;
  estado?: string | null;
  archived_at?: string | null;
  next_action_date?: string | null;
}

const CLOSED = new Set(['ganada', 'perdida', 'ganado', 'perdido']);

export const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function bucketFollowUps<T extends FollowUpLead>(leads: T[], now: Date = new Date()) {
  const today = localDateStr(now);
  const in7 = new Date(now); in7.setDate(in7.getDate() + 7);
  const limit = localDateStr(in7);
  const open = leads
    .filter((l) => !l.archived_at && !CLOSED.has(l.estado || '') && l.next_action_date)
    .sort((a, b) => a.next_action_date!.localeCompare(b.next_action_date!));
  return {
    overdue: open.filter((l) => l.next_action_date! < today),
    today: open.filter((l) => l.next_action_date === today),
    upcoming: open.filter((l) => l.next_action_date! > today && l.next_action_date! <= limit),
  };
}

// Códigos heredados de next_action → texto legible.
const CODES: Record<string, string> = { call: 'Llamar', visit: 'Visitar', email: 'Enviar email', 'follow-up': 'Seguimiento', proposal: 'Enviar propuesta' };
export const nextActionLabel = (v?: string | null) => (v ? CODES[v] ?? v : '—');
