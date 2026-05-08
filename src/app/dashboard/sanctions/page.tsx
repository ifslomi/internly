"use client";
import React from "react";
import { CalendarDays, Users, Clock3, AlertTriangle } from 'lucide-react';

export default function SanctionsPage() {
  const tiles = [
    { label: 'Days of Sanctions', value: '--', icon: AlertTriangle, tone: 'rose' },
    { label: 'Scheduled Day', value: '--', icon: CalendarDays, tone: 'emerald' },
    { label: 'Take a Slot', value: '--', icon: Clock3, tone: 'amber' },
    { label: 'Scheduled Interns', value: '--', icon: Users, tone: 'cyan' },
  ];

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>OJT Sanctions</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Check sanction days, available slots, and the schedule for each sanction session.</p>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`stat-tile stat-tile-${tone}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
                <Icon size={20} />
              </div>
              <span className="badge badge-primary">Sanctions</span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
            <CalendarDays size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Sanction Schedule</h3>
            <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Available sessions and assigned interns will show here.</p>
          </div>
        </div>

        <div style={{ borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)', padding: 28, textAlign: 'center', color: 'var(--slate-400)' }}>
          No scheduled sanctions found.
        </div>
      </div>
    </div>
  );
}
