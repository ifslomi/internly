"use client";

import React from 'react';
import { ActivityType, ACTIVITY_TYPES } from '@/lib/types';
import { Search, Filter, X } from 'lucide-react';

type WeeklyReportFiltersProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  supervisors: string[];
  filterSupervisor: string;
  setFilterSupervisor: (value: string) => void;
  filterActivity: ActivityType | '';
  setFilterActivity: (value: ActivityType | '') => void;
  filterDateFrom: string;
  setFilterDateFrom: (value: string) => void;
  filterDateTo: string;
  setFilterDateTo: (value: string) => void;
};

export default function WeeklyReportFilters({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  clearFilters,
  supervisors,
  filterSupervisor,
  setFilterSupervisor,
  filterActivity,
  setFilterActivity,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
}: WeeklyReportFiltersProps) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div id="report-preview-search-row" style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 200px', minWidth: 0, position: 'relative' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--slate-500)',
          }} />
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
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--primary-400)',
              marginLeft: 4,
            }} />
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
        <div id="report-preview-filters-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="input-group">
            <label className="input-label">Supervisor</label>
            <select
              className="input"
              value={filterSupervisor}
              onChange={(e) => setFilterSupervisor(e.target.value)}
              id="report-preview-filter-supervisor"
            >
              <option value="">All Supervisors</option>
              {supervisors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Activity Type</label>
            <select
              className="input"
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value as ActivityType | '')}
              id="report-preview-filter-activity"
            >
              <option value="">All Activities</option>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">From Date</label>
            <input
              className="input"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              id="report-preview-filter-from"
            />
          </div>
          <div className="input-group">
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
  );
}
