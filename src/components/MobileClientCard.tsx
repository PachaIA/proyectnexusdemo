import { Company } from '@/data/companies';
import { Phone } from 'lucide-react';

interface MobileClientCardProps {
  company: Company;
  estado?: { label: string; color: string } | null;
  onSelect: () => void;
}

export const MobileClientCard = ({ company, estado, onSelect }: MobileClientCardProps) => {
  const tel = (company.contactInfo as any)?.telefono || company.contactInfo?.phone || '';
  const contactName = (company.contactInfo as any)?.nombre || company.contactInfo?.contactPerson || '';

  return (
    <div
      className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 active:bg-muted/50 transition-colors"
      onClick={onSelect}
    >
      {/* Score badge */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
        company.opportunityScore >= 80 ? 'bg-destructive/15 text-destructive' :
        company.opportunityScore >= 60 ? 'bg-orange-500/15 text-orange-500' :
        'bg-muted text-muted-foreground'
      }`}>
        {company.opportunityScore}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{company.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{company.operadorActual || '—'}</span>
          <span className="text-xs text-muted-foreground">📱{company.lineasMovil || 0}</span>
          <span className="text-xs text-muted-foreground">☎️{company.lineasFijo || 0}</span>
        </div>
        {estado && (
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: estado.color + '22', color: estado.color }}
          >
            {estado.label}
          </span>
        )}
      </div>

      {/* Call button */}
      {tel ? (
        <a
          href={`tel:${tel}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 w-12 h-12 rounded-xl bg-primary flex items-center justify-center active:bg-primary/80 transition-colors"
        >
          <Phone className="w-5 h-5 text-primary-foreground" />
        </a>
      ) : (
        <div className="shrink-0 w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Phone className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
