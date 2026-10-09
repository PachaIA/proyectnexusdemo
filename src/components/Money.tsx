import type { ReactNode } from 'react';

/** Financial text has a distinct foreground/accent policy in each theme. */
export function Money({ children }: { children: ReactNode }) {
  if (children === '—') return <span className="text-muted-foreground">—</span>;
  return <span className="nexus-money">{children}</span>;
}