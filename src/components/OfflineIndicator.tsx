import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { LAST_SYNC_KEY } from '@/lib/queryClient';
import { flushQueue, pendingCount } from '@/lib/offlineQueue';

const age = (ts: number) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'hace menos de 1 min';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => { setOnline(true); flushQueue(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    flushQueue();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function OfflineIndicator() {
  const online = useOnline();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  if (online) return null;
  const ts = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
  const pending = pendingCount();
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap"
      title="Sin conexión: mostrando datos guardados"
    >
      <WifiOff className="w-3.5 h-3.5 text-destructive" />
      <span>Sin conexión · datos {ts ? age(ts) : 'guardados'}</span>
      {pending > 0 && <span className="text-primary">· {pending} pendiente(s)</span>}
    </div>
  );
}
