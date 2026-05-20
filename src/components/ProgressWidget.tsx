'use client';

import { motion } from 'framer-motion';

interface ProgressWidgetProps {
  percentage: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressWidget({ percentage, label = 'Done', size = 'md' }: ProgressWidgetProps) {
  const radius = size === 'sm' ? 28 : size === 'lg' ? 48 : 36;
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const viewBox = (radius + strokeWidth + 8);

  const isBreathing = percentage < 50;

  return (
    <div className={`relative flex flex-col items-center justify-center p-${size === 'sm' ? '4' : size === 'lg' ? '10' : '8'} bg-slate-900/55 rounded-[2rem] border border-white/5 aura-green glass-obsidian`}>
      <svg 
        className={`transform -rotate-90 ${isBreathing ? 'breathe-slow' : ''}`}
        width={viewBox * 2}
        height={viewBox * 2}
        viewBox={`0 0 ${viewBox * 2} ${viewBox * 2}`}
      >
        <defs>
          <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <circle 
          cx={viewBox} 
          cy={viewBox} 
          r={radius} 
          stroke="currentColor" 
          strokeWidth={strokeWidth} 
          fill="transparent" 
          className="text-white/5" 
        />
        
        <motion.circle
          cx={viewBox}
          cy={viewBox}
          r={radius}
          stroke="url(#green-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
          filter="url(#glow)"
          style={{
            transition: 'stroke-dashoffset 1s ease-out'
          }}
        />
      </svg>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <span className={`${size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-4xl' : 'text-2xl'} font-bold text-white leading-none`}>
          {percentage}%
        </span>
        <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{label}</p>
      </div>
    </div>
  );
}
