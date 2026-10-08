import { useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { bucketFollowUps } from '@/lib/followUps';

export const useFollowUps = () => {
  const { leads, isLoading } = useLeads();
  const buckets = useMemo(() => bucketFollowUps(leads), [leads]);
  return { ...buckets, isLoading, urgentCount: buckets.overdue.length + buckets.today.length };
};
