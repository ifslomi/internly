"use client";
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Users, Clock3, AlertTriangle } from 'lucide-react';
import { useApp } from '@/lib/context';
import type { Sanction } from '@/lib/types';

export default function SanctionsPage() {
  const { user, getSanctionsForStudent, getDutySlots, getSanctionRenders, createSanctionRender } = useApp();
  const [activeTab, setActiveTab] = useState<'students' | 'schedule'>('students');
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [dutySlots, setDutySlots] = useState<any[]>([]);
  const [myRenders, setMyRenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [confirmEnrollSlotId, setConfirmEnrollSlotId] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string; tone: 'success' | 'error' | 'warning' } | null>(null);
  const todayDateKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const normalizeDateKey = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isPastDutySlot = (slot: { date?: string }) => {
    const dateKey = normalizeDateKey(slot.date || '');
    return !!dateKey && dateKey < todayDateKey;
  };
  const tiles = [
    { label: 'Days of Sanctions', value: useMemo(() => sanctions.reduce((sum, sanction) => sum + sanction.days, 0).toString(), [sanctions]), icon: AlertTriangle, tone: 'rose' },
    { label: 'Available Slots', value: '--', icon: Clock3, tone: 'amber' },
  ];

  const handleAvailSlot = async (slotId: string) => {
    if (enrolling) return;

    if (!user || sanctions.length === 0) {
      setFeedbackModal({
        title: 'Active Sanction Required',
        message: 'You need an active sanction to enroll in a duty slot.',
        tone: 'warning',
      });
      return;
    }

    const activeSanction = sanctions.find((s) => s.status === 'active');
    if (!activeSanction) {
      setFeedbackModal({
        title: 'Active Sanction Required',
        message: 'You need an active sanction to enroll in a duty slot.',
        tone: 'warning',
      });
      return;
    }

    const alreadyEnrolled = myRenders.some((render) => render.dutySlotId === slotId && render.status === 'availed');
    if (alreadyEnrolled) {
      setFeedbackModal({
        title: 'Already Enrolled',
        message: 'You are already enrolled in this duty slot.',
        tone: 'warning',
      });
      return;
    }

    const slot = dutySlots.find((entry) => entry.id === slotId);
    if (slot && isPastDutySlot(slot)) {
      setFeedbackModal({
        title: 'Duty Slot Closed',
        message: 'Past duty slots can no longer be enrolled in.',
        tone: 'warning',
      });
      return;
    }

    setEnrolling(slotId);
    try {
      const renderId = await createSanctionRender({
        sanctionId: activeSanction.id,
        userId: user.id,
        dutySlotId: slotId,
        status: 'availed',
      });

      setMyRenders((prev) => [
        {
          id: renderId,
          sanctionId: activeSanction.id,
          userId: user.id,
          dutySlotId: slotId,
          status: 'availed',
        },
        ...prev,
      ]);

      setFeedbackModal({
        title: 'Enrollment Successful',
        message: 'You have successfully enrolled in the duty slot.',
        tone: 'success',
      });
    } catch (err) {
      console.error('Failed to enroll in duty slot:', err);
      const code = (err as { code?: string } | null)?.code || '';
      if (code === 'sanction/already-enrolled') {
        setFeedbackModal({
          title: 'Already Enrolled',
          message: 'You are already enrolled in this duty slot.',
          tone: 'warning',
        });
      } else if (code === 'sanction/past-duty-slot') {
        setFeedbackModal({
          title: 'Duty Slot Closed',
          message: 'Past duty slots can no longer be enrolled in.',
          tone: 'warning',
        });
      } else {
        setFeedbackModal({
          title: 'Enrollment Failed',
          message: 'Failed to enroll. Please try again.',
          tone: 'error',
        });
      }
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setSanctions([]);
        setDutySlots([]);
        setLoading(false);
        return;
      }

      try {
        const [sanctionsData, slotsData, rendersData] = await Promise.all([
          getSanctionsForStudent(user.id, user.email),
          getDutySlots(),
          getSanctionRenders({ userId: user.id }),
        ]);
        setSanctions(sanctionsData);
        setDutySlots(slotsData);
        setMyRenders(rendersData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setSanctions([]);
        setDutySlots([]);
        setMyRenders([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getSanctionsForStudent, getDutySlots, getSanctionRenders, user]);

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
          background: 'rgba(24,24,27,0.72)',
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
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Issued</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                      Loading sanctions...
                    </td>
                  </tr>
                ) : sanctions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                      No sanctions found.
                    </td>
                  </tr>
                ) : (
                  sanctions.map((sanction) => (
                    <tr key={sanction.id}>
                      <td>{sanction.days} {sanction.days === 1 ? 'day' : 'days'}</td>
                      <td>{sanction.reason}</td>
                      <td style={{ textTransform: 'capitalize' }}>{sanction.status}</td>
                      <td>{new Date(sanction.issuedDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
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
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Available Duty Slots</h3>
              <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>Enroll in a duty slot to render your sanction. You must have an active sanction.</p>
            </div>
          </div>

          {sanctions.length === 0 || !sanctions.some((s) => s.status === 'active') ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--slate-500)' }}>
              <p>You don't have any active sanctions. Once sanctioned, you can enroll in available duty slots.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Slots Needed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dutySlots.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--slate-500)' }}>
                        No duty slots available.
                      </td>
                    </tr>
                  ) : (
                    dutySlots.map((slot) => {
                      const isPastSlot = isPastDutySlot(slot);
                      const alreadyEnrolled = myRenders.some((render) => render.dutySlotId === slot.id && render.status === 'availed');
                      return (
                      <tr key={slot.id}>
                        <td>{slot.title}</td>
                        <td>{new Date(slot.date).toLocaleDateString()}</td>
                        <td>{slot.startTime} - {slot.endTime}</td>
                        <td>{slot.location || '-'}</td>
                        <td>{slot.capacity}</td>
                        <td>
                          {alreadyEnrolled ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-400)' }}>Already Enrolled</span>
                          ) : isPastSlot ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>Closed</span>
                          ) : (
                          <button
                            onClick={() => setConfirmEnrollSlotId(slot.id)}
                            disabled={enrolling === slot.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'var(--primary-600)',
                              border: 'none',
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              opacity: enrolling === slot.id ? 0.7 : 1,
                            }}
                          >
                            {enrolling === slot.id ? 'Enrolling...' : 'Enroll'}
                          </button>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {confirmEnrollSlotId && (
        <div
          onClick={() => setConfirmEnrollSlotId(null)}
          className="modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content"
            style={{ maxWidth: 420, padding: 18, borderRadius: 14 }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>Confirm Enrollment</h3>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--slate-400)', lineHeight: 1.6 }}>
              Enroll in this duty slot now?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setConfirmEnrollSlotId(null)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--slate-300)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const slotToEnroll = confirmEnrollSlotId;
                  setConfirmEnrollSlotId(null);
                  if (slotToEnroll) {
                    void handleAvailSlot(slotToEnroll);
                  }
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary-600)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div
          onClick={() => setFeedbackModal(null)}
          className="modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content"
            style={{ maxWidth: 440, padding: 18, borderRadius: 14 }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color:
                  feedbackModal.tone === 'success'
                    ? '#34d399'
                    : feedbackModal.tone === 'warning'
                      ? '#fbbf24'
                      : '#f87171',
              }}
            >
              {feedbackModal.title}
            </h3>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--slate-300)', lineHeight: 1.6 }}>
              {feedbackModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setFeedbackModal(null)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary-600)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
