import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import L from 'leaflet';

const DEFAULT_LAT = 36.7213;
const DEFAULT_LNG = -4.4214;

const SECTOR_OPTIONS = [
  { id: 'industria', label: 'Industria', icon: '🏭' },
  { id: 'logistica', label: 'Logística', icon: '📦' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'servicios', label: 'Servicios', icon: '💼' },
  { id: 'salud', label: 'Salud', icon: '🏥' },
  { id: 'hosteleria', label: 'Hostelería', icon: '🏨' },
  { id: 'retail', label: 'Retail', icon: '🛒' },
  { id: 'construccion', label: 'Construcción', icon: '🏗️' },
  { id: 'educacion', label: 'Educación', icon: '🎓' },
  { id: 'otros', label: 'Otros', icon: '📋' },
];

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanyAdded: () => void;
}

export const AddCompanyModal = ({ isOpen, onClose, onCompanyAdded }: AddCompanyModalProps) => {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sector, setSector] = useState('');
  const [web, setWeb] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  // Geocoding state
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mini-map refs
  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const resetForm = () => {
    setNombre('');
    setDireccion('');
    setTelefono('');
    setSector('');
    setWeb('');
    setNotas('');
    setGeocodedCoords(null);
    setGeocodeStatus('idle');
  };

  // Initialize mini-map
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!miniMapRef.current || mapInstanceRef.current) return;

      const map = L.map(miniMapRef.current, {
        center: [DEFAULT_LAT, DEFAULT_LNG],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      mapInstanceRef.current = map;
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  // Update marker on map when coords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geocodedCoords) {
      if (markerRef.current) {
        markerRef.current.setLatLng([geocodedCoords.lat, geocodedCoords.lng]);
      } else {
        markerRef.current = L.marker([geocodedCoords.lat, geocodedCoords.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        }).addTo(map);
      }
      map.setView([geocodedCoords.lat, geocodedCoords.lng], 16, { animate: true });
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.setView([DEFAULT_LAT, DEFAULT_LNG], 13, { animate: true });
    }
  }, [geocodedCoords]);

  const geocodeAddress = useCallback(async (address: string) => {
    if (address.trim().length < 5) {
      setGeocodedCoords(null);
      setGeocodeStatus('idle');
      return;
    }

    setGeocoding(true);
    try {
      const query = encodeURIComponent(address.trim() + ', Málaga, España');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'User-Agent': 'EnertelCatalyst/1.0' },
      });
      const data = await res.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setGeocodedCoords(coords);
        setGeocodeStatus('found');
      } else {
        setGeocodedCoords(null);
        setGeocodeStatus('not_found');
      }
    } catch {
      setGeocodedCoords(null);
      setGeocodeStatus('not_found');
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Debounced geocoding on address change
  const handleDireccionChange = (value: string) => {
    setDireccion(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      geocodeAddress(value);
    }, 1000);
  };

  const handleSave = async () => {
    if (!nombre.trim() || !direccion.trim()) {
      toast.error('Nombre y Dirección son obligatorios');
      return;
    }

    setSaving(true);
    try {
      // Use geocoded coords or default Málaga center
      const lat = geocodedCoords?.lat ?? DEFAULT_LAT;
      const lng = geocodedCoords?.lng ?? DEFAULT_LNG;
      const isApproximate = !geocodedCoords;

      const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const selectedSector = sector || 'servicios';

      const { error } = await supabase.from('companies').insert({
        id,
        name: nombre.trim(),
        address: direccion.trim(),
        sector: selectedSector,
        lat,
        lng,
        employees: 0,
        opportunity_score: 50,
        description: notas.trim() || null,
        website: web.trim() || null,
        contact_info: telefono.trim() ? { telefono: telefono.trim() } : null,
        data_sources: { manual: true },
        location_type: 'sede',
        digitalization_level: 'medio',
      });

      if (error) throw error;

      if (isApproximate) {
        toast.warning(`${nombre.trim()} añadida con ubicación aproximada — actualiza la dirección más tarde`);
      } else {
        toast.success(`${nombre.trim()} añadida al mapa`);
      }

      resetForm();
      onClose();
      onCompanyAdded();
    } catch (err: any) {
      console.error('Error adding company:', err);
      toast.error('Error al guardar la empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Añadir Empresa Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la empresa" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="direccion">Dirección *</Label>
            <Input
              id="direccion"
              value={direccion}
              onChange={(e) => handleDireccionChange(e.target.value)}
              placeholder="Calle, número, ciudad"
            />
            {geocoding && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Buscando ubicación...
              </p>
            )}
            {!geocoding && geocodeStatus === 'found' && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ubicación encontrada
              </p>
            )}
            {!geocoding && geocodeStatus === 'not_found' && direccion.trim().length >= 5 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No encontrada — se usará ubicación aproximada de Málaga
              </p>
            )}
          </div>

          {/* Mini map preview */}
          <div
            ref={miniMapRef}
            className="w-full h-32 rounded-lg border border-border overflow-hidden bg-muted"
          />

          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="952 000 000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sector">Sector</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sector (opcional)" />
              </SelectTrigger>
              <SelectContent className="z-[99999]">
                {SECTOR_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.icon} {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="web">Web</Label>
            <Input id="web" value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas sobre la empresa..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
