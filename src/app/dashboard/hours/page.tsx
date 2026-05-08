"use client";
import React from "react";
import { Clock3, Target, TrendingUp, CalendarDays, BarChart3 } from 'lucide-react';

export default function HoursPage() {
  const tiles = [
    { label: 'Hours to Render', value: '--', icon: Target, tone: 'amber', hint: 'Target requirement' },
    { label: 'Rendered This Week', value: '--', icon: CalendarDays, tone: 'emerald', hint: 'Current week progress' },
    { label: 'Total Rendered', value: '--', icon: TrendingUp, tone: 'cyan', hint: 'All logged hours' },
    { label: 'Total Remaining', value: '--', icon: Clock3, tone: 'rose', hint: 'Left to complete' },
  ];

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>OJT Hours</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Track hours rendered, weekly progress, and what remains.</p>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        {tiles.map(({ label, value, icon: Icon, tone, hint }) => (
          <div key={label} className={`stat-tile stat-tile-${tone}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                <Icon size={20} />
              </div>
              <span className="badge badge-primary">{hint}</span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Rendered Hours Log</h3>
            <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>A timeline of approved hours will appear here.</p>
          </div>
        </div>

        <div style={{ borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)', padding: 28, textAlign: 'center', color: 'var(--slate-400)' }}>
          No hours entries yet.
        </div>
      </div>
    </div>
  );
}
