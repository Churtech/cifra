import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  suffix?: string;
  color?: 'emerald' | 'rose' | 'amber' | 'slate' | 'primary';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  suffix = '', 
  color = 'slate',
  onClick
}) => {
  const isPositive = change && change > 0;
  
  const variants = {
    emerald: 'border-emerald-100 text-emerald-700',
    rose: 'border-rose-100 text-rose-700',
    amber: 'border-amber-100 text-amber-700',
    slate: 'border-slate-100 text-slate-700',
    primary: 'border-primary bg-primary text-white',
  };

  const isPrimary = color === 'primary';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        "relative p-4 bg-white border shadow-sm overflow-hidden rounded-xl",
        variants[color] || variants.slate,
        isPrimary && "shadow-lg shadow-primary/10",
        onClick && "cursor-pointer active:scale-95 transition-transform"
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className={cn(
            "text-[9px] font-bold uppercase tracking-widest",
            isPrimary ? "text-white/60" : "text-slate-400"
          )}>
            {label}
          </p>
          <div className={cn(
            "p-1 rounded bg-slate-50 border border-slate-100",
            isPrimary && "bg-white/10 border-white/20 text-white"
          )}>
            <Icon size={12} />
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <h3 className={cn(
            "text-2xl font-serif tracking-tight leading-none font-bold",
            isPrimary ? "text-white" : "text-primary"
          )}>
            {value}
          </h3>
          <span className={cn(
            "text-xs font-bold opacity-60",
            isPrimary ? "text-white" : "text-slate-400"
          )}>
            {suffix}
          </span>
        </div>

        {change !== undefined && (
          <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-slate-50">
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold font-mono",
              isPrimary ? "text-white" : (isPositive ? 'text-emerald-600' : 'text-rose-600')
            )}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {isPositive ? '+' : '-'}{Math.abs(change)}%
            </div>
            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">var 7d</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
