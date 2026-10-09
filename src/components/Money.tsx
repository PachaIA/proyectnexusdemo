import type { ReactNode } from 'react';

/** Financial text has a distinct foreground/accent policy in each theme. */
export function Money({ children }: { children: ReactNode }) {
  return <span className="nexus-money">{children}</span>;
}