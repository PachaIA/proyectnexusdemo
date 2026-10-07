import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Company } from '@/data/companies';
import { Lead } from '@/hooks/useLeads';
import { CsvCompany } from '@/hooks/useCsvCompanies';
import { BUCKET_STYLE, NcsScore } from '@/lib/ncsScoring';
import { heritageBadgeHtml } from '@/components/HeritageBadge';

// Company puede venir enriquecida con scoring NCS (useScoredLeads)
type CompanyWithNcs = Company & { ncs?: NcsScore };

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface CompanyMapProps {
  companies: CompanyWithNcs[];
  selectedCompany: CompanyWithNcs | null;
  onCompanySelect: (company: CompanyWithNcs) => void;
  leads?: Lead[];
  csvCompanies?: CsvCompany[];
  onCsvCompanySelect?: (company: CsvCompany) => void;
  onAddCompany?: () => void;
}

/**
 * Pin color: si la empresa trae scoring NCS, usamos el color del bucket
 * (única fuente de verdad). Si no, fallback al esquema legacy por score
 * comercial / fuente Wasp.
 */
const getPinColor = (company: CompanyWithNcs): string => {
  if (company.ncs) return BUCKET_STYLE[company.ncs.bucket].marker;
  if (company.opportunityScore >= 80) return '#ef4444';
  if (company.opportunityScore >= 60) return '#f97316';
  if (company.locationType === 'wasp') return '#3b82f6';
  return '#22c55e';
};

const isWasp = (company: Company): boolean => company.locationType === 'wasp';

const createIcon = (score: number, color: string, isSelected: boolean = false) => {
  const size = isSelected ? 44 : score >= 80 ? 36 : 32;
  const borderWidth = isSelected ? 4 : 2;
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size + 20}px;height:${size + 20}px;">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:${isSelected ? 14 : 11}px;
          box-shadow:0 3px 12px rgba(0,0,0,0.35);
          border:${borderWidth}px solid rgba(255,255,255,0.95);
          cursor:pointer;transition:transform 0.2s;
        " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
          ${score}
        </div>
      </div>`,
    iconSize: [size + 20, size + 20],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
    popupAnchor: [0, -(size + 20) / 2],
  });
};

const createCsvIcon = (ncsScore: number) => {
  const size = 32;
  const color = 'hsl(142, 55%, 42%)';
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size + 20}px;height:${size + 20}px;">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:11px;
          box-shadow:0 3px 12px rgba(0,0,0,0.35);
          border:2px solid rgba(255,255,255,0.95);
          cursor:pointer;transition:transform 0.2s;
        " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">
          ${ncsScore}
        </div>
      </div>`,
    iconSize: [size + 20, size + 20],
    iconAnchor: [(size + 20) / 2, (size + 20) / 2],
    popupAnchor: [0, -(size + 20) / 2],
  });
};

export const CompanyMap = ({ companies, selectedCompany, onCompanySelect, leads = [], csvCompanies = [], onCsvCompanySelect, onAddCompany }: CompanyMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const csvClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const csvMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const defaultCenter: [number, number] = [36.7213, -4.4214];
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // CARTO ahora exige API key → usamos teselas Esri gratuitas sin clave.
  const LIGHT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  const DARK_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

  const isDark = () => document.documentElement.classList.contains('dark');

  // Watch for theme changes and swap tiles
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (tileLayerRef.current && mapRef.current) {
        tileLayerRef.current.setUrl(isDark() ? DARK_TILES : LIGHT_TILES);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Inject cluster styles
  useEffect(() => {
    if (document.getElementById('cluster-custom-css')) return;
    const style = document.createElement('style');
    style.id = 'cluster-custom-css';
    style.textContent = `
      .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
        background: rgba(30, 58, 138, 0.15) !important;
      }
      .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
        background: hsl(210, 70%, 50%) !important;
        color: white !important;
        font-weight: 700 !important;
        font-size: 13px !important;
        width: 36px !important;
        height: 36px !important;
        margin-left: 2px !important;
        margin-top: 2px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .marker-cluster-medium div { background: hsl(38, 85%, 50%) !important; width: 40px !important; height: 40px !important; font-size: 14px !important; }
      .marker-cluster-large div { background: hsl(0, 100%, 45%) !important; width: 44px !important; height: 44px !important; font-size: 15px !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView(defaultCenter, 11);

    tileLayerRef.current = L.tileLayer(isDark() ? DARK_TILES : LIGHT_TILES, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 16,
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Company markers with clustering
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old cluster group
    if (clusterGroupRef.current) {
      mapRef.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    markersRef.current.clear();

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 16,
    });

    const STATUS_LABELS: Record<string, string> = {
      lead: 'Lead',
      contactado: 'Contactado',
      propuesta: 'Propuesta',
      negociacion: 'Negociación',
      ganada: 'Ganada',
      perdida: 'Perdida',
    };
    const STATUS_COLORS: Record<string, string> = {
      lead: '#6b7280',
      contactado: '#3b82f6',
      propuesta: '#f59e0b',
      negociacion: '#eab308',
      ganada: '#8b5cf6',
      perdida: '#ef4444',
    };

    companies.forEach((company) => {
      const color = getPinColor(company);
      const isSelected = selectedCompany?.id === company.id;
      // Si hay scoring NCS lo usamos como número visible del pin (única
      // fuente de verdad). Fallback al opportunityScore legacy.
      const pinScore = company.ncs?.score ?? company.opportunityScore;
      const marker = L.marker([company.lat, company.lng], {
        icon: createIcon(pinScore, color, isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      const lead = leads.find(l => l.company_id === company.id);
      const statusLabel = lead ? (STATUS_LABELS[lead.estado] || lead.estado) : null;
      const statusColor = lead ? (STATUS_COLORS[lead.estado] || '#6b7280') : null;

      // NCS pill (única fuente: BUCKET_STYLE en ncsScoring.ts)
      const ncsSection = company.ncs ? `
        <div style="margin-top:6px;">
          <span style="display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:9999px;background:${BUCKET_STYLE[company.ncs.bucket].bg};color:${BUCKET_STYLE[company.ncs.bucket].fg};">
            Score NCS: ${company.ncs.score} · ${BUCKET_STYLE[company.ncs.bucket].label}
          </span>
        </div>` : '';

      // Wasp competitive intelligence popup
      const waspSection = isWasp(company) ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
          <div style="font-size:10px;color:#3b82f6;font-weight:700;text-transform:uppercase;margin-bottom:4px;">⚡ Intel Competitiva</div>
          ${company.operadorActual ? `<div style="font-size:11px;color:#475569;">Operador: <strong>${company.operadorActual}</strong></div>` : ''}
          ${company.lineasTotal > 0 ? `<div style="font-size:11px;color:#475569;">Líneas: <strong>${company.lineasTotal}</strong> (${company.lineasMovil}M + ${company.lineasFijo}F)</div>` : ''}
          ${company.permanencia > 0 ? `<div style="font-size:11px;color:#475569;">Permanencia: <strong>${company.permanencia} meses</strong></div>` : ''}
          ${company.penalizacion > 0 ? `<div style="font-size:11px;color:#ef4444;">Penalización: <strong>€${company.penalizacion.toLocaleString('es-ES')}</strong></div>` : ''}
        </div>` : '';

      const pipelineSection = lead ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;color:white;background:${statusColor};">${statusLabel}</span>
        </div>` : '';

      const popup = `
        <div style="padding:10px;min-width:240px;font-family:'Inter',system-ui,sans-serif;background:#161622;color:#e0e0e0;">
          <h3 style="font-weight:600;font-size:13px;margin-bottom:4px;color:#f0f0f0;">${company.name}${heritageBadgeHtml(company.origen)}</h3>
          ${ncsSection}
          <p style="font-size:11px;color:#8888a0;margin:6px 0;">${company.address}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:11px;color:#8888a0;">${company.employees} emp.</span>
            <span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:9999px;color:white;background:${color};">Score ${company.opportunityScore}</span>
          </div>
          ${waspSection}
          ${pipelineSection}
        </div>`;

      marker.bindPopup(popup, { className: 'custom-popup', closeButton: false });
      marker.on('click', () => onCompanySelect(company));
      cluster.addLayer(marker);
      markersRef.current.set(company.id, marker);
    });

    mapRef.current.addLayer(cluster);
    clusterGroupRef.current = cluster;
  }, [companies, onCompanySelect, selectedCompany, leads]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedCompany) return;
    
    // Invalidate size first (handles panel open/close resize)
    mapRef.current.invalidateSize();
    
    setTimeout(() => {
      if (!mapRef.current || !selectedCompany) return;
      mapRef.current.flyTo([selectedCompany.lat, selectedCompany.lng], 14, { duration: 0.5 });

      // Update selected marker icon
      markersRef.current.forEach((marker, id) => {
        const company = companies.find(c => c.id === id);
        if (company) {
          const color = getPinColor(company);
          const isSelected = selectedCompany.id === id;
          marker.setIcon(createIcon(company.ncs?.score ?? company.opportunityScore, color, isSelected));
          marker.setZIndexOffset(isSelected ? 1000 : 0);
        }
      });
    }, 100);
  }, [selectedCompany, companies]);

  // CSV markers with clustering
  useEffect(() => {
    if (!mapRef.current) return;

    if (csvClusterGroupRef.current) {
      mapRef.current.removeLayer(csvClusterGroupRef.current);
      csvClusterGroupRef.current = null;
    }
    csvMarkersRef.current.clear();

    if (csvCompanies.length === 0) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 16,
    });

    csvCompanies.forEach((csv) => {
      const marker = L.marker([csv.lat, csv.lng], {
        icon: createCsvIcon(csv.ncsScore || 0),
      });
      const popup = `
        <div style="padding:10px;min-width:200px;font-family:'Inter',system-ui,sans-serif;">
          <h3 style="font-weight:600;font-size:13px;margin-bottom:4px;color:#1a1a2e;">${csv.name}</h3>
          <p style="font-size:11px;color:#64748b;">${csv.sector}</p>
          <p style="font-size:11px;color:#64748b;">${csv.address}</p>
        </div>`;
      marker.bindPopup(popup, { className: 'custom-popup', closeButton: false });
      marker.on('click', () => onCsvCompanySelect?.(csv));
      cluster.addLayer(marker);
      csvMarkersRef.current.set(csv.id, marker);
    });

    mapRef.current.addLayer(cluster);
    csvClusterGroupRef.current = cluster;
  }, [csvCompanies, onCsvCompanySelect]);

  return (
    <div className="w-full h-full overflow-hidden bg-muted/30 relative">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top-right toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        <button
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14);
              },
              () => {},
              { enableHighAccuracy: true }
            );
          }}
          className="bg-primary text-primary-foreground border border-primary rounded-full px-3 py-2 text-xs font-bold shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 md:bg-card/95 md:text-foreground md:border-border md:font-semibold md:hover:bg-card"
          title="Centrar en mi ubicación"
        >
          📍 <span className="hidden md:inline">Cerca de mí</span>
        </button>
        {onAddCompany && (
          <button
            onClick={onAddCompany}
            className="bg-card/95 backdrop-blur-sm text-foreground border border-border rounded-full px-3 py-2 text-xs font-semibold shadow-lg hover:bg-card transition-colors flex items-center gap-1.5"
          >
            <span className="text-sm font-bold">+</span>
            <span className="hidden md:inline">Nueva Empresa</span>
          </button>
        )}
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-3 text-[11px] text-muted-foreground shadow-lg border border-border"
      >
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#3b82f6' }} />
          Wasp
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#22c55e' }} />
          Places
        </div>
        <span className="w-px h-3 bg-border inline-block" />
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ef4444' }} />
          Score alto
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#f97316' }} />
          Score medio
        </div>
      </div>
    </div>
  );
};
