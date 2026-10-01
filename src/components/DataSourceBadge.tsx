import { FileText, Linkedin, Globe, Newspaper } from 'lucide-react';
import { DataSource } from '@/data/companies';

interface DataSourceBadgeProps {
  source: DataSource;
  size?: 'sm' | 'md';
}

const getSourceConfig = (type: string) => {
  switch (type) {
    case 'datoscif':
      return {
        icon: FileText,
        label: 'DatosCIF',
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30'
      };
    case 'linkedin':
      return {
        icon: Linkedin,
        label: 'LinkedIn',
        bg: 'bg-sky-500/20',
        text: 'text-sky-400',
        border: 'border-sky-500/30'
      };
    case 'web':
      return {
        icon: Globe,
        label: 'Web',
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30'
      };
    case 'noticias':
      return {
        icon: Newspaper,
        label: 'Noticias',
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500/30'
      };
    default:
      return {
        icon: FileText,
        label: type,
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30'
      };
  }
};

const DataSourceBadge = ({ source, size = 'sm' }: DataSourceBadgeProps) => {
  const config = getSourceConfig(source.type);
  const IconComponent = config.icon;
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-3 py-1 gap-1.5';
  
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}>
      <IconComponent className={iconSize} />
      <span>{source.name}</span>
    </span>
  );
};

interface DataSourcesListProps {
  sources: DataSource[];
}

export const DataSourcesList = ({ sources }: DataSourcesListProps) => {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        Fuentes de datos
      </h4>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <DataSourceBadge key={index} source={source} />
        ))}
      </div>
    </div>
  );
};

export default DataSourceBadge;
