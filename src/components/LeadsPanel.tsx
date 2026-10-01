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
  sin_empezar: { label: 'Sin empezar', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  contactado: { label: 'Contactado', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  cualificado: { label: 'Cualificado', color: 'text-green-400', bg: 'bg-green-500/20' },
  propuesta: { label: 'Propuesta', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  negociacion: { label: 'Negociación', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  ganado: { label: 'Ganado', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  perdido: { label: 'Perdido', color: 'text-red-400', bg: 'bg-red-500/20' },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-slate-400">Total Leads</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.ganado}</p>
              <p className="text-xs text-slate-400">Ganados</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.avgScore}</p>
              <p className="text-xs text-slate-400">Score Medio</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pipelineValue > 0 ? `${stats.propuesta + stats.negociacion}` : '0'}</p>
              <p className="text-xs text-slate-400">En Pipeline Activo</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Pipeline de Leads</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
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
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No hay leads en el pipeline</p>
          <p className="text-sm text-slate-500 mt-1">
            Convierte empresas en leads desde el mapa
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Empresa
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Sector
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Score
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Líneas
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Estado
                  </th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Próxima Acción
                  </th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                <AnimatePresence>
                  {filteredLeads.map((lead, index) => {
                    const estado = estadoConfig[lead.estado] || estadoConfig.sin_empezar;
                    const action = lead.next_action ? actionConfig[lead.next_action] : null;
                    
                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{lead.empresa}</p>
                            <p className="text-xs text-slate-400">{lead.cif}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300 capitalize">{lead.sector}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            lead.opportunity_score >= 80 ? 'text-green-400' :
                            lead.opportunity_score >= 60 ? 'text-yellow-400' :
                            'text-orange-400'
                          }`}>
                            {lead.opportunity_score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-300">
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
                            <div className="flex items-center gap-2 text-sm text-slate-300">
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
                                className="gap-2 text-red-400"
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
