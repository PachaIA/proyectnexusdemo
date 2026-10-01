import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface HotToggleProps {
  active: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}

export const HotToggle = ({ active, onChange, className }: HotToggleProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border bg-card',
        active && 'border-primary bg-primary/10',
        className,
      )}
    >
      <Switch id="hot-only" checked={active} onCheckedChange={onChange} />
      <Label htmlFor="hot-only" className="text-xs font-medium cursor-pointer whitespace-nowrap">
        Solo calientes 🔥
      </Label>
    </div>
  );
};
