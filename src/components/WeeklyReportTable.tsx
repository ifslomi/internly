"use client";

import React from 'react';
import { DailyLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, History } from 'lucide-react';

type WeeklyReportTableProps = {
  weekLogs: DailyLog[];
  filteredLogs: DailyLog[];
  hasActiveFilters: boolean;
  totalFilteredHours: number;
};

export default function WeeklyReportTable({
  weekLogs,
  filteredLogs,
  hasActiveFilters,
  totalFilteredHours,
}: WeeklyReportTableProps) {
  const maxVisibleRows = 6;
  const rowHeight = 56;
  const headerHeight = 44;
  const maxTableHeight = headerHeight + rowHeight * maxVisibleRows;

  return (
    <div style={{ marginTop: 0 }}>
      {filteredLogs.length === 0 ? (
        <div className="card" style={{ padding: '64px 32px', textAlign: 'center' }}>
          <History size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: 'var(--slate-400)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--slate-300)' }}>
            {weekLogs.length === 0 ? 'No logs for this week' : 'No matching entries'}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--slate-500)' }}>
            {weekLogs.length === 0
              ? 'Start logging your daily activities to see them here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="table-scroll" style={{ maxHeight: maxTableHeight, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>Date</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>Activity</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>Description</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>Supervisor</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15, 23, 42, 0.9)' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} style={{ color: 'var(--slate-500)' }} />
                        {format(parseISO(log.entryDate), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {log.activityType.map((t) => (
                          <span key={t} className="tag" style={{ padding: '2px 8px', fontSize: 10 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <p style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        fontSize: 13,
                      }}>
                        {log.taskDescription.replace(/<[^>]*>/g, '')}
                      </p>
                    </td>
                    <td>{log.supervisor}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} style={{ color: 'var(--slate-500)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>{log.dailyHours}h</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        padding: '0 4px',
      }}>
        <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
          {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
          {hasActiveFilters ? ' (filtered)' : ''}
        </p>
        <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
          Total: <span style={{ fontWeight: 700, color: 'var(--primary-300)' }}>{totalFilteredHours}h</span>
        </p>
      </div>
    </div>
  );
}
