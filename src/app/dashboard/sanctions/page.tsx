"use client";
import React, { useState } from "react";
import { CalendarDays, Users, Clock3, AlertTriangle } from 'lucide-react';

export default function SanctionsPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'schedule'>('students');
  const tiles = [
    { label: 'Days of Sanctions', value: '--', icon: AlertTriangle, tone: 'rose' },
    { label: 'Available Slots', value: '--', icon: Clock3, tone: 'amber' },
  ];

  return (
    <div>
      <div className="dash-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>OJT Sanctions</h1>
        <p style={{ color: 'var(--slate-400)', fontSize: 14 }}>Check sanction days, available slots, and the schedule for each sanction session.</p>
      </div>

      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gap: 16,
          marginBottom: 24,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
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

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          padding: 6,
          borderRadius: 999,
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          width: '100%',
        }}
      >
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            background:
              activeTab === 'students'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                : 'transparent',
            color: activeTab === 'students' ? 'white' : 'var(--slate-400)',
            fontSize: 13,
            fontWeight: 700,
            border: activeTab === 'students' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
            boxShadow: activeTab === 'students' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 200ms',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 8,
          }}
        >
          <Users size={16} /> Sanctioned Students
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '10px 18px',
            borderRadius: 999,
            background:
              activeTab === 'schedule'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.15))'
                : 'transparent',
            color: activeTab === 'schedule' ? 'white' : 'var(--slate-400)',
            fontSize: 13,
            fontWeight: 700,
            border: activeTab === 'schedule' ? '1px solid rgba(16,185,129,0.45)' : '1px solid transparent',
            boxShadow: activeTab === 'schedule' ? '0 8px 20px rgba(16,185,129,0.2)' : 'none',
            cursor: 'pointer',
            transition: 'all 200ms',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 8,
          }}
        >
          <CalendarDays size={16} /> Dean's Schedule
        </button>
      </div>

      {activeTab === 'students' ? (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Students with Sanctions</h3>
              <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>List of students currently under sanctions.</p>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Number</th>
                  <th>Student</th>
                  <th>Total Days of Sanctions</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                    No sanctioned students found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-400)' }}>
              <Clock3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Dean's Sanction Schedule</h3>
              <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Sessions scheduled for sanction rendering.</p>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                    No scheduled sanctions found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
