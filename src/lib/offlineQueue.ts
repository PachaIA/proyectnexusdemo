import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { refreshLeads } from './queryClient';

// Cola local de escrituras hechas sin conexión (resultados de Modo Llamada).
type QueuedOp =
  | { kind: 'insert'; table: string; values: Record<string, unknown>; at: string }
  | { kind: 'update'; table: string; values: Record<string, unknown>; id: string; at: string };

const KEY = 'nexus_offline_queue';

const read = (): QueuedOp[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};
const write = (ops: QueuedOp[]) => localStorage.setItem(KEY, JSON.stringify(ops));

export const pendingCount = () => read().length;

type QueueInput =
  | { kind: 'insert'; table: string; values: Record<string, unknown> }
  | { kind: 'update'; table: string; values: Record<string, unknown>; id: string };

export const enqueue = (op: QueueInput) => {
  write([...read(), { ...op, at: new Date().toISOString() } as QueuedOp]);
};

let flushing = false;
export async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  const ops = read();
  if (!ops.length) return;
  flushing = true;
  let done = 0;
  try {
    for (const op of ops) {
      const q = (supabase as any).from(op.table);
      const { error } = op.kind === 'insert' ? await q.insert(op.values) : await q.update(op.values).eq('id', op.id);
      if (error) break;
      done++;
    }
  } catch { /* sigue sin red */ }
  write(read().slice(done));
  flushing = false;
  if (done > 0) {
    refreshLeads();
    const calls = ops.slice(0, done).filter((o) => o.kind === 'insert').length;
    toast.success(`Sincronización completada: ${calls} resultado(s) de llamada guardados`);
  }
}

export const isNetworkError = (e: any) =>
  !navigator.onLine || /fetch|network|load failed/i.test(String(e?.message ?? e ?? ''));
