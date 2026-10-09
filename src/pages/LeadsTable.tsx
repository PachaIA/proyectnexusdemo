import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { BucketFilter } from '@/components/BucketFilter';
import { HotToggle } from '@/components/HotToggle';
import { OrigenFilter } from '@/components/OrigenFilter';
import { HeritageBadge } from '@/components/HeritageBadge';
import { useScoredLeads } from '@/hooks/useScoredLeads';
import { Bucket, BUCKET_STYLE } from '@/lib/ncsScoring';
import { Origen, ORIGEN_DEFAULT_SELECTED } from '@/data/companies';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ArrowUpDown, MapPin, Phone, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortKey = 'name' | 'sector' | 'score' | 'bucket';
type SortDir = 'asc' | 'desc';

const BUCKET_ORDER: Record<Bucket, number> = { hot: 3, warm: 2, cold: 1 };

const LeadsTable = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { leads, counts, originCounts, isLoading } = useScoredLeads();

  const urlOrigen = searchParams.get('origen') as Origen | null;
  const urlHot = searchParams.get('hot') === 'true';

  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [onlyHot, setOnlyHot] = useState(urlHot);
  const [origenSelected, setOrigenSelected] = useState<Origen[]>(
    urlOrigen ? [urlOrigen] : ORIGEN_DEFAULT_SELECTED,
  );
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (urlOrigen) setOrigenSelected([urlOrigen]);
    if (urlHot) setOnlyHot(true);
  }, [urlOrigen, urlHot]);

  const filtered = useMemo(() => {
    let rows = leads;
    if (onlyHot) rows = rows.filter((l) => l.isHot === true);
    if (bucket !== 'all') rows = rows.filter((l) => l.ncs.bucket === bucket);
    {
      const set = new Set(origenSelected);
      rows = rows.filter((l) => l.origen && set.has(l.origen as Origen));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.sector.toLowerCase().includes(q) ||
          (l.cif ?? '').toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'sector':
          cmp = a.sector.localeCompare(b.sector);
          break;
        case 'score':
          cmp = a.ncs.score - b.ncs.score;
          break;
        case 'bucket':
          cmp = BUCKET_ORDER[a.ncs.bucket] - BUCKET_ORDER[b.ncs.bucket];
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [leads, bucket, onlyHot, origenSelected, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'score' || key === 'bucket' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  const goToMap = (companyId: string) => {
    navigate(`/mapa?company=${encodeURIComponent(companyId)}`);
  };

  return (
    <MainLayout searchQuery="" onSearchChange={() => {}}>
      <div className="flex flex-col h-full">
        {/* Header de la tabla */}
        <div className="px-6 py-4 border-b border-border bg-card/50 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Leads · Scoring NCS</h1>
              <p className="text-xs text-muted-foreground">
                {filtered.length} de {counts.total} leads · ordenados por {sortKey} {sortDir}
              </p>
            </div>
            <Input
              placeholder="Buscar por nombre, sector o CIF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 h-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <HotToggle active={onlyHot} onChange={setOnlyHot} />
            <BucketFilter
              active={bucket}
              counts={counts}
              isLoading={isLoading}
              onChange={setBucket}
            />
            <OrigenFilter
              selected={origenSelected}
              counts={originCounts}
              onChange={setOrigenSelected}
            />
          </div>
        </div>

        {/* Tabla */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    Nombre <SortIcon k="name" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('sector')}
                  >
                    Sector <SortIcon k="sector" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none w-24"
                    onClick={() => handleSort('score')}
                  >
                    Score <SortIcon k="score" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none w-32"
                    onClick={() => handleSort('bucket')}
                  >
                    Bucket <SortIcon k="bucket" />
                  </TableHead>
                  <TableHead className="w-40">Teléfono</TableHead>
                  <TableHead className="w-32 text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No hay leads que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => {
                    const style = BUCKET_STYLE[lead.ncs.bucket];
                    const ci = (lead.contactInfo ?? {}) as Record<string, string | undefined>;
                    const phone =
                      ci.telefono ||
                      ci.phone ||
                      lead.contactoWasp ||
                      '';
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium text-foreground">
                          <span className="inline-flex items-center">{lead.name}<HeritageBadge origen={lead.origen} /></span>
                          {lead.cif && (
                            <div className="text-[11px] text-muted-foreground font-normal">
                              {lead.cif}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.sector}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-foreground">
                            {lead.ncs.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                            style={{
                              background: style.bg,
                              color: style.fg,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: style.marker }}
                            />
                            {style.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {phone}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn('h-8 text-xs gap-1')}
                            onClick={() => goToMap(lead.id)}
                          >
                            <MapPin className="w-3 h-3" />
                            Ver en mapa
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </div>
    </MainLayout>
  );
};

export default LeadsTable;
