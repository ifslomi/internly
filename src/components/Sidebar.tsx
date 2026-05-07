'use client';

import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  History, 
  FileText, 
  Settings, 
  PlusCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/log', icon: PlusCircle, label: 'Log Hours' },
  { href: '/dashboard/history', icon: History, label: 'History' },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen bg-slate-950/95 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col"
    >
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <span className="font-bold text-white tracking-tight">Internly</span>
          </motion.div>
        )}
        
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon size={20} className={isActive ? 'text-emerald-400' : ''} />
              
              {!collapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              
              {collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-full ml-2 px-2 py-1 bg-slate-800 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  {item.label}
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">User</p>
              <p className="text-xs text-slate-500 truncate">Intern</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
