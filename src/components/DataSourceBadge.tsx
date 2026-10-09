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
        bg: 'bg-primary/20',
        text: 'text-primary',
        border: 'border-primary/30'
      };
    case 'linkedin':
      return {
        icon: Linkedin,
        label: 'LinkedIn',
        bg: 'bg-primary/20',
        text: 'text-primary',
        border: 'border-primary/30'
      };
    case 'web':
      return {
        icon: Globe,
        label: 'Web',
        bg: 'bg-success/20',
        text: 'text-success',
        border: 'border-success/30'
      };
    case 'noticias':
      return {
        icon: Newspaper,
        label: 'Noticias',
        bg: 'bg-primary/20',
        text: 'text-primary',
        border: 'border-primary/30'
      };
    default:
      return {
        icon: FileText,
        label: type,
        bg: 'bg-muted-foreground/20',
        text: 'text-muted-foreground',
        border: 'border-muted-foreground/30'
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
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
