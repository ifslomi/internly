'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Clock } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  category: string;
  completed?: boolean;
}

interface TaskCardProps {
  task: Task;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const isHigh = task.priority === 'High';

  return (
    <AnimatePresence mode="wait">
      {!task.completed ? (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ 
            opacity: 0, 
            scale: 0.95, 
            filter: "blur(10px)",
            transition: { duration: 0.3 }
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={`relative group p-5 rounded-2xl border glass-obsidian glass-shine-top
            ${isHigh ? 'border-red-200 bg-red-50 aura-high' : 'border-green-200 bg-green-50 aura-green'}`}
        >
          {isHigh && (
            <div className="absolute -inset-px bg-red-500/10 blur-sm rounded-2xl -z-10 aura-glow-pulse" />
          )}

          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => onComplete?.(task.id)}
                className="mt-1 w-6 h-6 rounded-full border-2 border-emerald-500/50 hover:bg-emerald-500/20 flex items-center justify-center transition-all group-hover:scale-110 shrink-0"
              >
                <Check className="w-4 h-4 text-emerald-400 opacity-0 hover:opacity-100" />
              </button>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 tracking-tight group-hover:text-gray-900 transition-colors">
                  {task.name}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 font-light">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {task.dueDate}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 uppercase tracking-widest text-[10px]">
                    {task.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button 
                onClick={() => onDelete?.(task.id)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="p-4 rounded-2xl bg-gray-50 border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-gray-500 line-through">{task.name}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
