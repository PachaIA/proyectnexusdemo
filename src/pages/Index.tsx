import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CompanyMap } from '@/components/CompanyMap';
import { MapFilterBar } from '@/components/MapFilterBar';
import { BucketFilter } from '@/components/BucketFilter';
import { HotToggle } from '@/components/HotToggle';
import { OrigenFilter } from '@/components/OrigenFilter';
import { ProposalModal } from '@/components/ProposalModal';
import { SpeechModal } from '@/components/SpeechModal';
import { UnifiedCompanyPanel, UnifiedCompany } from '@/components/UnifiedCompanyPanel';
import { AddCompanyModal } from '@/components/AddCompanyModal';
import { GeocodePendingButton } from '@/components/GeocodePendingButton';
import { Company, DecisionMaker, Origen, ORIGEN_DEFAULT_SELECTED } from '@/data/companies';
import { useCompanies } from '@/hooks/useCompanies';
import { useScoredLeads, ScoredCompany } from '@/hooks/useScoredLeads';
import { Bucket } from '@/lib/ncsScoring';
import { useLeads } from '@/hooks/useLeads';
import { useCsvCompanies, CsvCompany } from '@/hooks/useCsvCompanies';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [operatorFilter, setOperatorFilter] = useState<string[]>([]);
  const [scoreFilter, setScoreFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<Bucket | 'all'>('all');
  const [onlyHot, setOnlyHot] = useState(false);
  const [origenSelected, setOrigenSelected] = useState<Origen[]>(ORIGEN_DEFAULT_SELECTED);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);
  const [selectedContact, setSelectedContact] = useState<DecisionMaker | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [unifiedPanelCompany, setUnifiedPanelCompany] = useState<UnifiedCompany | null>(null);
  const [showUnifiedPanel, setShowUnifiedPanel] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);

  const { companies, isLoading: companiesLoading, totalCompanies, refetch: refetchCompanies } = useCompanies();
  const { leads: scoredLeads, counts: bucketCounts, originCounts, isLoading: scoredLoading } = useScoredLeads();
  const { leads, createLead, getLeadByCompanyId } = useLeads();
  const { data: csvCompanies = [] } = useCsvCompanies();
  const [searchParams] = useSearchParams();

  // Abrir "Nueva Empresa" al llegar desde el buscador global (state del router).
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if ((location.state as { openAddCompany?: boolean } | null)?.openAddCompany) {
      setShowAddCompany(true);
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.state]);

  // Deep-link desde /leads → ?company=<id> abre el detalle y centra el mapa
  useEffect(() => {
    const id = searchParams.get('company');
    if (!id || companies.length === 0) return;
    const c = companies.find((x) => x.id === id);
    if (c) {
      setSelectedCompany(c);
      navigate(`/clientes/${encodeURIComponent(c.id)}`, { replace: true });
    }
  }, [searchParams, companies]);

  useEffect(() => {
    if (!companiesLoading && companies.length === 0 && !seeding) {
      seedCompanies();
    }
  }, [companiesLoading, companies.length]);

  const seedCompanies = async () => {
    setSeeding(true);
    try {
      const { companies: staticCompanies } = await import('@/data/companies');
      const response = await supabase.functions.invoke('seed-companies', {
        body: { companies: staticCompanies },
      });
      if (response.error) throw response.error;
      toast.success(`${staticCompanies.length} empresas sincronizadas`);
      window.location.reload();
    } catch (err: any) {
      console.error('Seed error:', err);
      toast.error('Error al sincronizar empresas');
    } finally {
      setSeeding(false);
    }
  };

  // Count wasp companies
  const waspCount = useMemo(() => companies.filter(c => c.locationType === 'wasp').length, [companies]);
  const placesCount = useMemo(() => companies.filter(c => c.locationType !== 'wasp').length, [companies]);

  const filteredCompanies = useMemo(() => {
    // Partimos de scoredLeads (ya enriquecidos con ncs) en lugar de companies.
    let filtered = scoredLeads.filter(c => !c.archivedAt && c.lat !== 0 && c.lng !== 0);

    // Solo calientes (is_hot). NULL → false.
    if (onlyHot) filtered = filtered.filter(c => c.isHot === true);

    if (bucketFilter !== 'all') {
      filtered = filtered.filter(c => c.ncs.bucket === bucketFilter);
    }

    // Filtro por origen (AND con el resto). Si selected vacío → no muestra ninguno.
    {
      const set = new Set(origenSelected);
      filtered = filtered.filter(c => c.origen && set.has(c.origen as Origen));
    }

    if (sourceFilter.length > 0) {
      filtered = filtered.filter(c => {
        if (sourceFilter.includes('wasp') && c.locationType === 'wasp') return true;
        if (sourceFilter.includes('places') && c.locationType !== 'wasp') return true;
        return false;
      });
    }

    if (operatorFilter.length > 0) {
      filtered = filtered.filter(c => {
        if (!c.operadorActual) {
          return operatorFilter.includes('otros');
        }
        const op = c.operadorActual.toLowerCase();
        if (operatorFilter.includes('orange') && op.includes('orange')) return true;
        if (operatorFilter.includes('movistar') && op.includes('movistar')) return true;
        if (operatorFilter.includes('vodafone') && op.includes('vodafone')) return true;
        if (operatorFilter.includes('otros') && !op.includes('orange') && !op.includes('movistar') && !op.includes('vodafone')) return true;
        return false;
      });
    }

    if (scoreFilter.length > 0) {
      filtered = filtered.filter(c =>
        scoreFilter.some(level => {
          if (level === 'alta') return c.opportunityScore >= 80;
          if (level === 'media') return c.opportunityScore >= 60 && c.opportunityScore < 80;
          return c.opportunityScore < 60;
        })
      );
    }

    return filtered;
  }, [scoredLeads, sourceFilter, operatorFilter, scoreFilter, bucketFilter, onlyHot, origenSelected]);

  // Also filter CSV companies by source filter
  const filteredCsvCompanies = useMemo(() => {
    if (sourceFilter.length === 0) return csvCompanies;
    if (sourceFilter.includes('places')) return csvCompanies;
    return []; // If source filter active but 'places' not selected, hide CSV
  }, [csvCompanies, sourceFilter]);

  const handleClearFilters = () => {
    setSourceFilter([]);
    setOperatorFilter([]);
    setScoreFilter([]);
  };

  const hasActiveFilters = sourceFilter.length > 0 || operatorFilter.length > 0 || scoreFilter.length > 0;

  const handleCompanySelect = (company: Company) => {
    navigate(`/clientes/${encodeURIComponent(company.id)}`);
  };

  const handleCsvCompanySelect = (csv: CsvCompany) => {
    const unified: UnifiedCompany = {
      id: csv.id, name: csv.name, sector: csv.sector, address: csv.address,
      phone: csv.phone, website: csv.website, score: csv.ncsScore,
      rating: csv.rating, totalReviews: csv.totalReviews,
      tipoNegocio: csv.tipoNegocio, horario24h: csv.horario24h,
      estado: csv.estado, source: 'csv',
    };
    setUnifiedPanelCompany(unified);
    setShowUnifiedPanel(true);
  };

  const handleCreateLead = async () => {
    if (!selectedCompany) return;
    try {
      await createLead({
        company_id: selectedCompany.id, empresa: selectedCompany.name,
        cif: selectedCompany.cif, sector: selectedCompany.sector,
        tamano: selectedCompany.employees, opportunity_score: selectedCompany.opportunityScore,
        arpu_estimado: selectedCompany.estimatedARPU, necesidades_detectadas: selectedCompany.detectedNeeds,
        servicios_recomendados: selectedCompany.recommendedProducts, decision_makers: selectedCompany.decisionMakers,
        next_action: selectedCompany.nextBestAction.type, next_action_date: null, notas: null, estado: 'lead',
        digitalizationLevel: selectedCompany.digitalizationLevel, companyName: selectedCompany.name,
        detectedNeedsRaw: selectedCompany.detectedNeeds, recommendedProductsRaw: selectedCompany.recommendedProducts,
      });
      toast.success(`Lead creado: ${selectedCompany.name}`);
    } catch (error: any) {
      if (error?.message === 'CANCELLED') return;
      if (error?.message === 'DUPLICATE') toast.warning('Este lead ya existe');
      else toast.error('Error al crear el lead');
    }
  };


  // Filter bar config
  const filterGroups = [
    {
      label: 'Fuente',
      chips: [
        { id: 'wasp', label: 'Wasp', color: 'var(--interactive)' },
        { id: 'places', label: 'Places', color: 'var(--success-text)' },
      ],
      active: sourceFilter,
      onChange: setSourceFilter,
    },
    {
      label: 'Operador',
      chips: [
        { id: 'orange', label: 'Orange', color: 'var(--alert-text)' },
        { id: 'movistar', label: 'Movistar', color: 'var(--interactive)' },
        { id: 'vodafone', label: 'Vodafone', color: 'var(--alert-text)' },
        { id: 'otros', label: 'Otros', color: 'var(--muted-text-accessible)' },
      ],
      active: operatorFilter,
      onChange: setOperatorFilter,
    },
    {
      label: 'Score',
      chips: [
        { id: 'alta', label: 'Alto ≥80', color: 'var(--alert-text)' },
        { id: 'media', label: 'Medio 60-79', color: 'var(--alert-text)' },
        { id: 'baja', label: 'Bajo <60', color: 'var(--success-text)' },
      ],
      active: scoreFilter,
      onChange: setScoreFilter,
    },
  ];

  const handleArchiveCompany = async () => {
    if (!selectedCompany) return;
    const ds = selectedCompany.dataSources as any;
    const defaultReason = ds?.wasp?.tamanio === 'GG.CC.' ? 'GG.CC.' : 'Descartado';
    const reason = prompt('Motivo del archivo:', defaultReason);
    if (reason === null) return;
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ archived_at: new Date().toISOString(), archive_reason: reason || defaultReason })
        .eq('id', selectedCompany.id);
      if (error) throw error;
      refetchCompanies();
      toast.success(`${selectedCompany.name} archivada`);
    } catch {
      toast.error('Error al archivar');
    }
  };

  return (
    <MainLayout
      rightPanel={null}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onAddCompany={() => setShowAddCompany(true)}
    >
      <div className="w-full h-full relative">
        {companiesLoading || seeding ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {seeding ? 'Sincronizando empresas...' : 'Cargando mapa...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <CompanyMap
              companies={filteredCompanies}
              selectedCompany={selectedCompany ? (filteredCompanies.find(c => c.id === selectedCompany.id) ?? null) : null}
              onCompanySelect={handleCompanySelect}
              leads={leads}
              csvCompanies={filteredCsvCompanies}
              onCsvCompanySelect={handleCsvCompanySelect}
              onAddCompany={() => setShowAddCompany(true)}
            />
            {/* Stack de barras de filtros: evita solapes entre barra operativa y MapFilterBar */}
            <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center gap-2 flex-wrap bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-1.5 shadow-lg pointer-events-auto self-start max-w-full overflow-x-auto">
                <HotToggle active={onlyHot} onChange={setOnlyHot} />
                <BucketFilter
                  active={bucketFilter}
                  counts={bucketCounts}
                  isLoading={scoredLoading}
                  onChange={setBucketFilter}
                />
                <OrigenFilter
                  selected={origenSelected}
                  counts={originCounts}
                  onChange={setOrigenSelected}
                />
                <GeocodePendingButton />
              </div>
              <div className="relative">
                <MapFilterBar
                  groups={filterGroups}
                  onClearAll={handleClearFilters}
                  hasActive={hasActiveFilters}
                  companyCount={filteredCompanies.length + filteredCsvCompanies.length}
                  totalCount={totalCompanies + csvCompanies.length}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <ProposalModal company={selectedCompany} isOpen={showProposal} onClose={() => setShowProposal(false)} />
      <SpeechModal company={selectedCompany} selectedContact={selectedContact} isOpen={showSpeech} onClose={() => setShowSpeech(false)} />
      <UnifiedCompanyPanel
        company={unifiedPanelCompany}
        isOpen={showUnifiedPanel}
        onClose={() => setShowUnifiedPanel(false)}
        onAddToPipeline={async (uc) => {
          try {
            await createLead({
              company_id: uc.id, empresa: uc.name, cif: null, sector: uc.sector || 'Otros',
              tamano: 0, opportunity_score: uc.score || 50, arpu_estimado: null,
              necesidades_detectadas: [], servicios_recomendados: [], decision_makers: [],
              next_action: 'call', next_action_date: null, notas: null, estado: 'lead',
            });
            toast.success(`${uc.name} añadida al pipeline`);
          } catch (error: any) {
            if (error?.message === 'CANCELLED') return;
      if (error?.message === 'DUPLICATE') toast.warning('Lead ya existe');
            else toast.error('Error al añadir');
          }
        }}
      />
      <AddCompanyModal isOpen={showAddCompany} onClose={() => setShowAddCompany(false)} onCompanyAdded={() => refetchCompanies()} />
    </MainLayout>
  );
};

export default Index;
