"use client";

import React, { useMemo, useState } from 'react';
import { ActivityType, ACTIVITY_TYPES, DailyLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Search, Filter, X } from 'lucide-react';

type WeeklyReportLogModuleProps = {
  weekLogs: DailyLog[];
};

export default function WeeklyReportLogModule({ weekLogs }: WeeklyReportLogModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [filterActivity, setFilterActivity] = useState<ActivityType | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const supervisors = useMemo(() => {
    const set = new Set(weekLogs.map((l) => l.supervisor));
    return Array.from(set).sort();
  }, [weekLogs]);

  const filteredLogs = useMemo(() => {
    return weekLogs.filter((log) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          log.taskDescription.toLowerCase().includes(q) ||
          log.supervisor.toLowerCase().includes(q) ||
          log.activityType.some((a) => a.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (filterSupervisor && log.supervisor !== filterSupervisor) return false;
      if (filterActivity && !log.activityType.includes(filterActivity)) return false;
      if (filterDateFrom && log.entryDate < filterDateFrom) return false;
      if (filterDateTo && log.entryDate > filterDateTo) return false;

      return true;
    });
  }, [weekLogs, searchQuery, filterSupervisor, filterActivity, filterDateFrom, filterDateTo]);

  const filteredTotal = useMemo(() => {
    return filteredLogs.reduce((sum, log) => sum + log.dailyHours, 0);
  }, [filteredLogs]);

  const hasActiveFilters =
    searchQuery || filterSupervisor || filterActivity || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterSupervisor('');
    setFilterActivity('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--slate-200)' }}>
          Daily Activity Log
        </h3>
      </div>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--slate-500)',
              }}
            />
            <input
              className="input"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 44, width: '100%' }}
              id="report-preview-search"
            />
          </div>

          <button
            className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            style={showFilters ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)' } : {}}
            id="report-preview-toggle-filters"
          >
            <Filter size={16} /> Filters
            {hasActiveFilters && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--primary-400)',
                  marginLeft: 4,
                }}
              />
            )}
          </button>

          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              style={{ color: 'var(--rose-400)' }}
              id="report-preview-clear-filters"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Supervisor</label>
              <select
                className="input"
                value={filterSupervisor}
                onChange={(e) => setFilterSupervisor(e.target.value)}
                id="report-preview-filter-supervisor"
              >
                <option value="">All Supervisors</option>
                {supervisors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Activity Type</label>
              <select
                className="input"
                value={filterActivity}
                onChange={(e) => setFilterActivity(e.target.value as ActivityType | '')}
                id="report-preview-filter-activity"
              >
                <option value="">All Activities</option>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">From Date</label>
              <input
                className="input"
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                id="report-preview-filter-from"
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">To Date</label>
              <input
                className="input"
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                id="report-preview-filter-to"
              />
            </div>
          </div>
        )}
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Activity</th>
              <th>Description</th>
              <th>Supervisor</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                  No matching entries
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{format(parseISO(log.entryDate), 'EEE, MMM dd')}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {log.activityType.map((t) => (
                        <span key={t} className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ maxWidth: 300 }}>
                    <p
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        fontSize: 13,
                      }}
                    >
                      {log.taskDescription.replace(/<[^>]*>/g, '')}
                    </p>
                  </td>
                  <td>{log.supervisor}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>{log.dailyHours}h</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  color: 'white',
                  borderTop: '2px solid rgba(16,185,129,0.3)',
                }}
              >
                Total
              </td>
              <td
                style={{
                  fontWeight: 700,
                  color: 'var(--primary-300)',
                  fontSize: 16,
                  borderTop: '2px solid rgba(16,185,129,0.3)',
                }}
              >
                {filteredTotal}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
