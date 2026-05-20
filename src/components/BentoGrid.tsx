'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoTileProps {
  children: ReactNode;
  colSpan?: 1 | 2;
  rowSpan?: 1 | 2;
  className?: string;
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function BentoTile({ children, colSpan = 1, rowSpan = 1, className = '' }: BentoTileProps) {
  const colClasses = {
    1: '',
    2: 'md:col-span-2',
  };
  
  const rowClasses = {
    1: '',
    2: 'row-span-2',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`glass-obsidian glass-shine-top p-6 ${colClasses[colSpan]} ${rowClasses[rowSpan]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
