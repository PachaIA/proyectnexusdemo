import { Bucket, BUCKET_STYLE } from '@/lib/ncsScoring';
import { BucketCounts } from '@/hooks/useScoredLeads';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BucketFilterProps {
  active: Bucket | 'all';
  counts: BucketCounts;
  isLoading?: boolean;
  onChange: (bucket: Bucket | 'all') => void;
  className?: string;
}

export const BucketFilter = ({
  active,
  counts,
  isLoading = false,
  onChange,
  className,
}: BucketFilterProps) => {
  const chips: { id: Bucket | 'all'; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'Todos', count: counts.total },
    { id: 'hot', label: '🔥 Hot', count: counts.hot, color: BUCKET_STYLE.hot.marker },
    { id: 'warm', label: 'Warm', count: counts.warm, color: BUCKET_STYLE.warm.marker },
    { id: 'cold', label: 'Cold', count: counts.cold, color: BUCKET_STYLE.cold.marker },
  ];

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => {
        const isActive = active === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange(chip.id)}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3 rounded-full border text-xs font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:bg-muted/50',
            )}
          >
            {chip.color && (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: chip.color }}
              />
            )}
            <span>{chip.label}</span>
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[22px] px-1.5 h-5 rounded-full text-[10px] font-bold',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted',
              )}
            >
              {isLoading ? <Skeleton className="w-3 h-3 rounded-full" /> : chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
