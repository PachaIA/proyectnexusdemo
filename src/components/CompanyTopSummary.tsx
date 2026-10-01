import { useMemo } from 'react';
import { MapPin, User, Phone, Mail, Star } from 'lucide-react';
import { useSedes } from '@/hooks/useSedes';
import { Company } from '@/data/companies';

interface CompanyTopSummaryProps {
  company: Company;
}

/**
 * Tarjeta FIJA y NO editable estilo Liquid Glass.
 * Muestra Dirección principal (sede marcada con estrella, fallback a companies.address)
 * y Contacto principal (decision_maker con principal:true, fallback al primero).
 * La edición vive abajo (SedesSection + EditableContacts) y alimenta esta tarjeta.
 */
export const CompanyTopSummary = ({ company }: CompanyTopSummaryProps) => {
  const { sedes } = useSedes(company.id);

  const principalSede = useMemo(() => sedes.find((s) => s.principal) || sedes[0] || null, [sedes]);

  const direccionTexto = useMemo(() => {
    if (principalSede) {
      const linea1 = principalSede.direccion?.trim();
      const linea2 = [principalSede.cp, principalSede.localidad, principalSede.provincia]
        .filter(Boolean)
        .join(' · ');
      return [linea1, linea2].filter(Boolean).join(' — ') || company.address || '';
    }
    return company.address || '';
  }, [principalSede, company.address]);

  const sedeTipo = principalSede?.tipo;

  const contactos = (company.decisionMakers || []) as any[];
  const contactoPrincipal = useMemo(
    () => contactos.find((c) => c?.principal) || contactos[0] || null,
    [contactos],
  );

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl',
        'border border-white/10',
        'bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent',
        'backdrop-blur-2xl',
        'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)]',
        'before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent',
        'p-3.5',
      ].join(' ')}
    >
      <div className="grid gap-2.5 md:grid-cols-2">
        {/* Dirección principal */}
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 h-7 w-7 shrink-0 grid place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Dirección principal
              </span>
              {sedeTipo && (
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded bg-primary/10 text-primary">
                  {sedeTipo}
                </span>
              )}
              {principalSede?.principal && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              )}
            </div>
            <p className="text-sm text-foreground font-medium leading-snug break-words mt-0.5">
              {direccionTexto || <span className="text-muted-foreground italic font-normal">Sin dirección · añádela en Multisede</span>}
            </p>
          </div>
        </div>

        {/* Contacto principal */}
        <div className="flex items-start gap-2.5 md:border-l md:border-white/10 md:pl-4">
          <div className="mt-0.5 h-7 w-7 shrink-0 grid place-items-center rounded-lg bg-accent/15 ring-1 ring-accent/30">
            <User className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Contacto principal
              </span>
              {contactoPrincipal?.principal && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              )}
            </div>
            {contactoPrincipal ? (
              <div className="mt-0.5">
                <p className="text-sm text-foreground font-medium leading-snug">
                  {contactoPrincipal.name || '—'}
                  {contactoPrincipal.role && (
                    <span className="text-muted-foreground font-normal"> · {contactoPrincipal.role}</span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px]">
                  {contactoPrincipal.mobile && (
                    <a
                      href={`tel:${String(contactoPrincipal.mobile).replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {contactoPrincipal.mobile}
                    </a>
                  )}
                  {contactoPrincipal.email && (
                    <a
                      href={`mailto:${contactoPrincipal.email}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[200px]"
                    >
                      <Mail className="w-3 h-3" /> {contactoPrincipal.email}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic font-normal mt-0.5">
                Sin contacto · márcalo con ⭐ en Contactos Clave
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyTopSummary;
