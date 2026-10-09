import { useCallback, useEffect, useState } from 'react';
import { DAILY_INTRO_STORAGE_KEY, localCalendarDate, shouldShowDailyIntro } from '@/lib/dailyIntro';

export function DailyIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(false);
    setVisible(false);
  }, []);

  useEffect(() => {
    const today = localCalendarDate();
    let storedDate: string | null = null;
    try { storedDate = localStorage.getItem(DAILY_INTRO_STORAGE_KEY); } catch { /* Storage may be blocked. */ }
    if (!shouldShowDailyIntro(storedDate, today)) return;

    try { localStorage.setItem(DAILY_INTRO_STORAGE_KEY, today); } catch { /* Show once for this mounted session. */ }
    setVisible(true);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const displayTimer = window.setTimeout(() => {
      if (reducedMotion) dismiss();
      else setLeaving(true);
    }, reducedMotion ? 400 : 1200);
    const removeTimer = reducedMotion ? undefined : window.setTimeout(dismiss, 1400);

    return () => {
      window.clearTimeout(displayTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
    };
  }, [dismiss]);

  useEffect(() => {
    if (!visible) return;
    const skip = () => dismiss();
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [dismiss, visible]);

  if (!visible) return null;

  return (
    <div
      className={`nexus-daily-intro${leaving ? ' nexus-daily-intro--leaving' : ''}`}
      role="presentation"
      onPointerDown={dismiss}
    >
      <img className="nexus-daily-intro__logo" src="/nexus-lockup.png" alt="Nexus" />
    </div>
  );
}