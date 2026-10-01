import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeritageBadgeProps {
  origen?: string | null;
  className?: string;
}

/**
 * Insignia "T" — Cartera heredada.
 * Solo se muestra cuando origen ∈ {wasp_tamara_activo, wasp_tamara_asignado}.
 * Discreto: círculo de 16px gris, letra "T" en color silenciado.
 */
export const HeritageBadge = ({ origen, className }: HeritageBadgeProps) => {
  if (origen !== 'wasp_tamara_activo' && origen !== 'wasp_tamara_asignado') return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={
              'inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold leading-none align-middle ml-1.5 ' +
              (className ?? '')
            }
            aria-label="Cartera heredada"
          >
            T
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Cartera heredada</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/** HTML estático para usar dentro del popup de Leaflet (no es React). */
export const heritageBadgeHtml = (origen?: string | null): string => {
  if (origen !== 'wasp_tamara_activo' && origen !== 'wasp_tamara_asignado') return '';
  return `<span title="Cartera heredada" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:9999px;background:#3a3a4a;color:#9ca3af;font-size:10px;font-weight:700;line-height:1;margin-left:6px;vertical-align:middle;">T</span>`;
};
