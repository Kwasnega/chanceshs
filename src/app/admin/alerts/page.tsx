'use client';

import { useState, useEffect } from 'react';
import { Bell, Users, CheckCircle2, Clock, AlertTriangle, Send, RefreshCw, ShieldOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertStats {
  total: number;
  active: number;
  dispatched: number;
  pending: number;
  logs: any[];
}

export default function AdminAlertsPage() {
  const [secret,      setSecret]      = useState('');
  const [authed,      setAuthed]      = useState(false);
  const [authError,   setAuthError]   = useState('');
  const [stats,       setStats]       = useState<AlertStats | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [error,       setError]       = useState('');

  const fetchStats = async (s: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/alerts/dispatch', {
        headers: { 'x-admin-secret': s },
      });
      if (res.status === 401) { setAuthError('Invalid admin secret'); setAuthed(false); return; }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStats(data);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(secret);
  };

  const fireAlerts = async () => {
    if (!confirm('Are you sure you want to fire alerts to ALL eligible registered users? This cannot be undone.')) return;
    setDispatching(true);
    setDispatchResult(null);
    setError('');
    try {
      const res = await fetch('/api/admin/alerts/dispatch', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDispatchResult(data);
      fetchStats(secret);
    } catch (e: any) {
      setError(e.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <ShieldOff size={28} color="#DC2626" />
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>Admin Access</h1>
          </div>
          <form onSubmit={handleAuth}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>
              Admin Secret
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter admin secret…"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              required
            />
            {authError && <p style={{ color: '#DC2626', fontSize: '0.875rem', margin: '0 0 12px' }}>{authError}</p>}
            <button
              type="submit"
              style={{ width: '100%', background: '#0F172A', color: 'white', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 800, fontSize: '0.9375rem', cursor: 'pointer' }}
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', background: '#FEF3C7', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={24} color="#D97706" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 900, color: '#0F172A' }}>Alert Dispatch Centre</h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B' }}>Manage and fire Early Placement Alerts</p>
            </div>
          </div>
          <button
            onClick={() => fetchStats(secret)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '2px solid #E2E8F0', borderRadius: '10px', padding: '10px 16px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', color: '#334155' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats grid */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Registered', value: stats.total,      icon: <Users size={20} />,        bg: '#EEF2FF', color: '#4F46E5' },
              { label: 'Active',           value: stats.active,     icon: <CheckCircle2 size={20} />, bg: '#F0FDF4', color: '#16A34A' },
              { label: 'Pending Dispatch', value: stats.pending,    icon: <Clock size={20} />,        bg: '#FFFBEB', color: '#D97706' },
              { label: 'Already Sent',     value: stats.dispatched, icon: <Send size={20} />,         bg: '#FDF4FF', color: '#9333EA' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #E2E8F0', padding: '18px' }}>
                <div style={{ width: '36px', height: '36px', background: s.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, marginBottom: '10px' }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Dispatch result banner */}
        <AnimatePresence>
          {dispatchResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <CheckCircle2 size={22} color="#16A34A" />
              <div>
                <strong style={{ color: '#15803D', fontSize: '0.9375rem' }}>Alerts dispatched successfully</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#166534' }}>
                  {dispatchResult.message} • {dispatchResult.failed} failed
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div style={{ background: '#FFF1F2', border: '1.5px solid #FCA5A5', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', color: '#DC2626', fontSize: '0.875rem' }}>
            <strong>Error: </strong>{error}
          </div>
        )}

        {/* Fire button */}
        <div style={{ background: 'white', borderRadius: '18px', border: '2px solid #E2E8F0', padding: '28px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', background: '#FFF1F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={22} color="#DC2626" />
            </div>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.0625rem', fontWeight: 800, color: '#0F172A' }}>🚨 Fire Alerts Now</h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
                Sends SMS + WhatsApp to all <strong>{stats?.pending || 0} pending</strong> registered users simultaneously.
                This action is logged and cannot be undone. Previously dispatched users will not receive duplicate alerts.
              </p>
            </div>
          </div>
          <button
            onClick={fireAlerts}
            disabled={dispatching || !stats || stats.pending === 0}
            style={{
              width: '100%',
              background: stats?.pending === 0 ? '#F1F5F9' : 'linear-gradient(135deg, #DC2626, #EF4444)',
              color: stats?.pending === 0 ? '#94A3B8' : 'white',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: stats?.pending === 0 ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: dispatching ? 0.7 : 1,
            }}
          >
            {dispatching ? '⏳ Sending alerts…' : stats?.pending === 0 ? 'No pending alerts to send' : `🚨 Send Alerts to ${stats?.pending} Users Now`}
          </button>
        </div>

        {/* Dispatch log */}
        {stats && stats.logs && stats.logs.length > 0 && (
          <div style={{ background: 'white', borderRadius: '18px', border: '1.5px solid #E2E8F0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Dispatch Log</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...stats.logs].reverse().map((log: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', fontSize: '0.875rem', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    {new Date(log.dispatchedAt).toLocaleString()}
                  </span>
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ {log.sent} sent</span>
                  {log.failed > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>✗ {log.failed} failed</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
