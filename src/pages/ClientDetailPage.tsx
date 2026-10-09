import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useCompanies } from '@/hooks/useCompanies';
import { DetailPanel } from '@/pages/NexusDashboard';
import { AIBriefing } from '@/pages/NexusDashboard';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companies, isLoading } = useCompanies();
  const company = useMemo(() => companies.find(item => item.id === id), [companies, id]);
  const [showAI, setShowAI] = useState(false);

  if (!id) return <Navigate to="/clientes" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="sticky top-0 z-50"><Header /></div>
      <main className="mx-auto w-full max-w-5xl px-4 py-4 md:px-6">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Volver
        </Button>
        {isLoading ? (
          <p className="py-12 text-sm text-muted-foreground">Cargando cliente…</p>
        ) : company ? (
          <DetailPanel
            company={company}
            interactions={{}}
            onUpdate={() => undefined}
            onShowAI={() => setShowAI(true)}
            onOpenArcGIS={() => window.open(`https://experience.arcgis.com/experience/e97b58724a4c4e2e84470e733bd2746d/page/Cableada?address=${encodeURIComponent(company.address)}`, '_blank')}
            routeDetail
          />
        ) : (
          <div className="border-y border-border py-12 text-center">
            <h1 className="text-xl font-semibold">Cliente no encontrado</h1>
            <Button className="mt-4" onClick={() => navigate('/clientes')}>Ver clientes</Button>
          </div>
        )}
        {showAI && company && <AIBriefing company={company} onClose={() => setShowAI(false)} />}
      </main>
    </div>
  );
}