import { motion } from 'framer-motion';
import { Phone, MapPin, Mail, Clock, FileText, ArrowRight } from 'lucide-react';
import { NextBestAction as NextBestActionType } from '@/data/companies';
import { Button } from './ui/button';

interface NextBestActionProps {
  action: NextBestActionType;
  companyName: string;
}

const getActionConfig = (type: string) => {
  switch (type) {
    case 'call':
      return {
        icon: Phone,
        label: 'Llamar',
        buttonText: 'Iniciar llamada',
        gradient: 'from-blue-500 to-blue-600',
        bgGradient: 'from-blue-500/20 to-blue-600/10'
      };
    case 'visit':
      return {
        icon: MapPin,
        label: 'Visitar',
        buttonText: 'Planificar visita',
        gradient: 'from-green-500 to-green-600',
        bgGradient: 'from-green-500/20 to-green-600/10'
      };
    case 'email':
      return {
        icon: Mail,
        label: 'Email',
        buttonText: 'Enviar email',
        gradient: 'from-purple-500 to-purple-600',
        bgGradient: 'from-purple-500/20 to-purple-600/10'
      };
    case 'follow-up':
      return {
        icon: Clock,
        label: 'Seguimiento',
        buttonText: 'Programar seguimiento',
        gradient: 'from-yellow-500 to-yellow-600',
        bgGradient: 'from-yellow-500/20 to-yellow-600/10'
      };
    case 'proposal':
      return {
        icon: FileText,
        label: 'Propuesta',
        buttonText: 'Generar propuesta',
        gradient: 'from-red-500 to-red-600',
        bgGradient: 'from-red-500/20 to-red-600/10'
      };
    default:
      return {
        icon: ArrowRight,
        label: 'Acción',
        buttonText: 'Ejecutar acción',
        gradient: 'from-slate-500 to-slate-600',
        bgGradient: 'from-slate-500/20 to-slate-600/10'
      };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'alta':
      return { label: 'Prioridad Alta', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    case 'media':
      return { label: 'Prioridad Media', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' };
    case 'baja':
      return { label: 'Prioridad Baja', color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/50' };
    default:
      return { label: priority, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/50' };
  }
};

const NextBestAction = ({ action, companyName }: NextBestActionProps) => {
  const actionConfig = getActionConfig(action.type);
  const priorityConfig = getPriorityConfig(action.priority);
  const IconComponent = actionConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border ${priorityConfig.border} bg-gradient-to-r ${actionConfig.bgGradient} p-4`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            <span className="text-xs text-slate-400">Next Best Action</span>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${actionConfig.gradient} flex items-center justify-center shadow-lg`}>
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{actionConfig.label}</p>
              <p className="text-sm text-slate-300">{companyName}</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-400 mb-3">
            💡 {action.reason}
          </p>
        </div>
        
        <Button
          className={`bg-gradient-to-r ${actionConfig.gradient} hover:opacity-90 text-white shadow-lg`}
        >
          {actionConfig.buttonText}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};

export default NextBestAction;
