import { motion } from 'framer-motion';
import { Target, TrendingUp, Building2, Wifi, MapPin, DollarSign } from 'lucide-react';
import { ScoreBreakdownItem } from '@/data/companies';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownItem[];
  totalScore: number;
}

const getFactorIcon = (factor: string) => {
  if (factor.includes('Tamaño')) return <Building2 className="w-4 h-4" />;
  if (factor.includes('Sector')) return <Target className="w-4 h-4" />;
  if (factor.includes('Digital')) return <Wifi className="w-4 h-4" />;
  if (factor.includes('crecimiento') || factor.includes('Señales')) return <TrendingUp className="w-4 h-4" />;
  if (factor.includes('Multi')) return <MapPin className="w-4 h-4" />;
  if (factor.includes('ARPU')) return <DollarSign className="w-4 h-4" />;
  return <Target className="w-4 h-4" />;
};

const ScoreBreakdown = ({ breakdown, totalScore }: ScoreBreakdownProps) => {
  const maxPossible = breakdown.reduce((sum, item) => sum + item.maxPoints, 0);
  const percentage = Math.round((totalScore / maxPossible) * 100);
  
  const getScoreColor = () => {
    if (totalScore >= 80) return 'text-success';
    if (totalScore >= 60) return 'text-warning';
    return 'text-warning';
  };
  
  const getProgressColor = (points: number, maxPoints: number) => {
    const pct = (points / maxPoints) * 100;
    if (pct >= 80) return 'bg-success';
    if (pct >= 50) return 'bg-warning';
    return 'bg-warning';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Score Explicable
        </h4>
        <div className="text-right">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>{totalScore}</span>
          <span className="text-muted-foreground text-sm">/{maxPossible}</span>
        </div>
      </div>
      
      {/* Barra de progreso total */}
      <div className="relative h-3 bg-muted-foreground rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute h-full rounded-full ${
            totalScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
            totalScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
            'bg-gradient-to-r from-orange-500 to-orange-400'
          }`}
        />
      </div>
      
      {/* Desglose por factor */}
      <div className="space-y-3">
        {breakdown.map((item, index) => (
          <motion.div
            key={item.factor}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {getFactorIcon(item.factor)}
                <span>{item.factor}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary-foreground font-medium">+{item.points}</span>
                <span className="text-muted-foreground text-xs">/{item.maxPoints}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted-foreground rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.points / item.maxPoints) * 100}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`h-full rounded-full ${getProgressColor(item.points, item.maxPoints)}`}
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </motion.div>
        ))}
      </div>
      
      <div className="pt-2 border-t border-muted-foreground">
        <p className="text-xs text-muted-foreground text-center">
          💡 Score calculado con datos de DatosCIF, LinkedIn y fuentes públicas
        </p>
      </div>
    </div>
  );
};

export default ScoreBreakdown;
