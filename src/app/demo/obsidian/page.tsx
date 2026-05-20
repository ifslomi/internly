'use client';

import { useState } from 'react';
import { TaskCard } from '@/components/TaskCard';
import { ProgressWidget } from '@/components/ProgressWidget';
import { BentoGrid, BentoTile } from '@/components/BentoGrid';
import { motion } from 'framer-motion';
import { Sparkles, Target, Clock, TrendingUp } from 'lucide-react';

const sampleTasks = [
  { id: '1', name: 'Complete API Documentation', priority: 'High' as const, dueDate: 'Tomorrow', category: 'Work', completed: false },
  { id: '2', name: 'Review Pull Requests', priority: 'Medium' as const, dueDate: 'Feb 18', category: 'Development', completed: false },
  { id: '3', name: 'Update Portfolio Site', priority: 'Low' as const, dueDate: 'Feb 20', category: 'Personal', completed: false },
  { id: '4', name: 'Client Meeting', priority: 'High' as const, dueDate: 'Feb 16', category: 'Work', completed: false },
];

export default function ObsidianShowcase() {
  const [tasks, setTasks] = useState(sampleTasks);

  const handleComplete = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const nextTask = tasks.find(t => t.priority === 'High' && !t.completed);

  return (
    <div className="min-h-screen bg-obsidian p-8" style={{ background: 'var(--obsidian)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">TaskUp Dashboard</h1>
          <p className="text-slate-400">Obsidian Glass Design System</p>
        </motion.div>

        <BentoGrid>
          {/* Hero Tile - 2x2 */}
          <BentoTile colSpan={2} rowSpan={2}>
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wider text-slate-500">Today&apos;s Progress</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <ProgressWidget percentage={67} size="lg" />
              </div>
              <p className="text-center text-slate-400 text-sm mt-4">
                6 of 9 tasks completed
              </p>
            </div>
          </BentoTile>

          {/* Focus Tile - Next Priority Task */}
          <BentoTile>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-rose-400" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Focus</span>
            </div>
            {nextTask ? (
              <div className="space-y-3">
                <h3 className="text-white font-medium">{nextTask.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Due {nextTask.dueDate}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No high priority tasks</p>
            )}
          </BentoTile>

          {/* Stats Tile */}
          <BentoTile>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Weekly</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Hours</span>
                <span className="text-white font-semibold">32.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Tasks</span>
                <span className="text-white font-semibold">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Streak</span>
                <span className="text-amber-400 font-semibold">7 days</span>
              </div>
            </div>
          </BentoTile>

          {/* Task List - 2x1 */}
          <BentoTile colSpan={2}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-slate-500">Tasks</span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </BentoTile>
        </BentoGrid>
      </div>
    </div>
  );
}
