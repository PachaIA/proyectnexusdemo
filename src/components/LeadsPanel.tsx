import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Target, TrendingUp, DollarSign, Phone, Mail, 
  MapPin, Clock, FileText, MoreVertical, Trash2, Edit,
  CheckCircle, XCircle, Filter
} from 'lucide-react';
import { useLeads, Lead } from '@/hooks/useLeads';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';

const estadoConfig: Record<string, { label: string; color: string; bg: string }> = {
  lead: { label: 'Lead', color: 'text-muted-foreground', bg: 'bg-muted-foreground/20' },
  contactado: { label: 'Contactado', color: 'text-primary', bg: 'bg-primary/20' },
  propuesta: { label: 'Propuesta', color: 'text-warning', bg: 'bg-warning/20' },
  negociacion: { label: 'Negociación', color: 'text-warning', bg: 'bg-warning/20' },
  ganada: { label: 'Ganada', color: 'text-primary', bg: 'bg-primary/20' },
  perdida: { label: 'Perdida', color: 'text-destructive', bg: 'bg-destructive/20' },
};

const actionConfig: Record<string, { icon: any; label: string }> = {
  call: { icon: Phone, label: 'Llamar' },
  visit: { icon: MapPin, label: 'Visitar' },
  email: { icon: Mail, label: 'Email' },
  'follow-up': { icon: Clock, label: 'Seguimiento' },
  proposal: { icon: FileText, label: 'Propuesta' },
};

const LeadsPanel = () => {
  const { leads, isLoading, updateLead, archiveLead, getLeadStats } = useLeads();
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const stats = getLeadStats();

  const filteredLeads = filterEstado === 'todos' 
    ? leads 
    : leads.filter(l => l.estado === filterEstado);

  const handleEstadoChange = (leadId: string, newEstado: string) => {
    updateLead({ id: leadId, updates: { estado: newEstado } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted-foreground/50 rounded-xl p-4 border border-muted-foreground/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-muted-foreground/50 rounded-xl p-4 border border-muted-foreground/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.ganada}</p>
              <p className="text-xs text-muted-foreground">Ganados</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-muted-foreground/50 rounded-xl p-4 border border-muted-foreground/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.avgScore}</p>
              <p className="text-xs text-muted-foreground">Score Medio</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-muted-foreground/50 rounded-xl p-4 border border-muted-foreground/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.pipelineValue > 0 ? `${stats.propuesta + stats.negociacion}` : '0'}</p>
              <p className="text-xs text-muted-foreground">En Pipeline Activo</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-foreground">Pipeline de Leads</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40 bg-muted-foreground border-muted-foreground">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {Object.entries(estadoConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12 bg-muted-foreground/30 rounded-xl border border-muted-foreground/50">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay leads en el pipeline</p>
          <p className="text-sm text-muted-foreground mt-1">
            Convierte empresas en leads desde el mapa
          </p>
        </div>
      ) : (
        <div className="bg-muted-foreground/30 rounded-xl border border-muted-foreground/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted-foreground/50">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Empresa
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Sector
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Score
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Líneas
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Estado
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Próxima Acción
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <AnimatePresence>
                  {filteredLeads.map((lead, index) => {
                    const estado = estadoConfig[lead.estado] || estadoConfig.lead;
                    const action = lead.next_action ? actionConfig[lead.next_action] : null;
                    
                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted-foreground/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-primary-foreground">{lead.empresa}</p>
                            <p className="text-xs text-muted-foreground">{lead.cif}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground capitalize">{lead.sector}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            lead.opportunity_score >= 80 ? 'text-success' :
                            lead.opportunity_score >= 60 ? 'text-warning' :
                            'text-warning'
                          }`}>
                            {lead.opportunity_score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {lead.tamano || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={lead.estado}
                            onValueChange={(value) => handleEstadoChange(lead.id, value)}
                          >
                            <SelectTrigger className={`w-32 h-7 text-xs ${estado.bg} ${estado.color} border-0`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(estadoConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className={config.color}>{config.label}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          {action && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <action.icon className="w-4 h-4" />
                              <span>{action.label}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Edit className="w-4 h-4" />
                                Editar notas
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2 text-destructive"
                                onClick={() => archiveLead(lead.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Archivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPanel;
