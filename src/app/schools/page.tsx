'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, SlidersHorizontal, X, ArrowRight, GraduationCap,
  MapPin, Users, Building, Plus, Minus, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import './schools.css';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo',
  'Bono East', 'Ahafo', 'Western North', 'Savannah', 'North East', 'Oti',
];

function getProgrammes(category: string): string[] {
  switch ((category || '').toUpperCase()) {
    case 'A': return ['General Science', 'Business', 'General Arts', 'Visual Arts', 'Home Economics'];
    case 'B': return ['General Science', 'Business', 'General Arts', 'Visual Arts'];
    case 'C': return ['General Science', 'Business', 'General Arts'];
    case 'D': return ['Business', 'General Arts', 'Home Economics'];
    default:  return ['General Arts', 'Home Economics'];
  }
}

function getAggregateRange(category: string): string {
  switch ((category || '').toUpperCase()) {
    case 'A': return '6 – 14';
    case 'B': return '8 – 18';
    case 'C': return '12 – 22';
    case 'D': return '15 – 28';
    default:  return '20 – 36';
  }
}

const CAT_COLORS: Record<string, { bg: string; text: string; border: string; grad: string[] }> = {
  A: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD', grad: ['#7C3AED', '#A78BFA'] },
  B: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD', grad: ['#2563EB', '#60A5FA'] },
  C: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', grad: ['#059669', '#34D399'] },
  D: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', grad: ['#D97706', '#FCD34D'] },
  E: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', grad: ['#64748B', '#94A3B8'] },
};

function getCatColors(cat: string) {
  return CAT_COLORS[(cat || '').toUpperCase()] || CAT_COLORS['E'];
}

function SchoolAvatar({ name, category }: { name: string; category: string }) {
  const c = getCatColors(category);
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: `linear-gradient(135deg, ${c.grad[0]}, ${c.grad[1]})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'inherit',
      }}
    >
      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.05em' }}>
        {initials}
      </span>
    </div>
  );
}

export default function SchoolsPage() {
  const [schools,       setSchools]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRegion,   setFilterRegion]   = useState('');
  const [filterGender,   setFilterGender]   = useState('');
  const [filterBoarding, setFilterBoarding] = useState('');
  const [showFilters,  setShowFilters]  = useState(false);
  const [compareList,  setCompareList]  = useState<any[]>([]);
  const [showCompare,  setShowCompare]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [total,        setTotal]        = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchSchools = useCallback(async (pg: number, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '24' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCategory)  params.set('category', filterCategory);
      if (filterRegion)    params.set('region', filterRegion);
      if (filterGender)    params.set('gender', filterGender);
      if (filterBoarding)  params.set('boarding', filterBoarding);

      const res  = await fetch(`/api/schools?${params}`);
      const data = await res.json();
      setSchools(prev => append ? [...prev, ...(data.schools || [])] : (data.schools || []));
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load schools. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, filterCategory, filterRegion, filterGender, filterBoarding]);

  useEffect(() => { setPage(1); fetchSchools(1); }, [fetchSchools]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchSchools(next, true);
  };

  const clearFilters = () => {
    setFilterCategory('');
    setFilterRegion('');
    setFilterGender('');
    setFilterBoarding('');
    setSearch('');
  };

  const hasFilters = filterCategory || filterRegion || filterGender || filterBoarding || search;

  const toggleCompare = (school: any) => {
    setCompareList(prev => {
      if (prev.find((s: any) => s.id === school.id)) return prev.filter((s: any) => s.id !== school.id);
      if (prev.length >= 3) return prev;
      return [...prev, school];
    });
  };

  const isInCompare    = (id: string) => compareList.some((s: any) => s.id === id);
  const compareDisabled = (id: string) => compareList.length >= 3 && !isInCompare(id);

  return (
    <div className="schools-page">
      {/* Header */}
      <div className="schools-header">
        <div className="schools-header-content">
          <div>
            <h1 className="schools-title">School Directory</h1>
            <p className="schools-subtitle">Browse and compare every SHS in Ghana — free, no sign-up needed</p>
          </div>
          <Link href="/calculator" className="schools-predict-cta">
            <GraduationCap size={18} />
            <span>Check My Chances</span>
          </Link>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="schools-toolbar">
        <div className="search-wrapper">
          <Search size={17} className="search-icon-inner" />
          <input
            type="text"
            className="schools-search"
            placeholder="Search school name or region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')}><X size={15} /></button>
          )}
        </div>
        <button
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(f => !f)}
        >
          <SlidersHorizontal size={17} />
          <span>Filters</span>
          {hasFilters && <span className="filter-dot" />}
          <ChevronDown size={14} className={`filter-chevron ${showFilters ? 'open' : ''}`} />
        </button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div className="filter-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="filter-row">
              <div className="filter-field">
                <label>Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">All</option>
                  {['A','B','C','D','E'].map(c => <option key={c} value={c}>Category {c}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>Region</label>
                <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
                  <option value="">All Regions</option>
                  {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>Gender Type</label>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="">All</option>
                  <option value="mixed">Mixed (Co-Ed)</option>
                  <option value="boys">Boys Only</option>
                  <option value="girls">Girls Only</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Boarding</label>
                <select value={filterBoarding} onChange={e => setFilterBoarding(e.target.value)}>
                  <option value="">All</option>
                  <option value="boarding">Boarding</option>
                  <option value="day">Day School</option>
                </select>
              </div>
            </div>
            {hasFilters && (
              <button className="clear-all-btn" onClick={clearFilters}><X size={13} /> Clear all filters</button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      {!loading && (
        <div className="schools-meta">
          <span className="results-count">{total.toLocaleString()} school{total !== 1 ? 's' : ''} found</span>
          {compareList.length > 0 && (
            <span className="compare-count-pill">{compareList.length}/3 selected</span>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="schools-loading-state">
          <div className="spinner" />
          <span>Loading schools…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="schools-error-state">
          <p>{error}</p>
          <button onClick={() => fetchSchools(1)}>Try again</button>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="schools-grid">
          {schools.map((school, i) => {
            const c          = getCatColors(school.category);
            const programmes = school.programmes || getProgrammes(school.category);
            const inCompare  = isInCompare(school.id);
            const disabled   = compareDisabled(school.id);
            return (
              <motion.div
                key={school.id}
                className={`school-card ${inCompare ? 'in-compare' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.4) }}
              >
                {/* Photo / avatar */}
                <div className="school-photo-area">
                  <SchoolAvatar name={school.name} category={school.category} />
                  <span
                    className="cat-badge-overlay"
                    style={{ background: c.bg, color: c.text, borderColor: c.border }}
                  >
                    Cat {school.category || '?'}
                  </span>
                </div>

                {/* Body */}
                <div className="school-card-body">
                  <h3 className="school-card-name">{school.name}</h3>

                  <div className="school-card-meta">
                    <div className="meta-row">
                      <MapPin size={12} />
                      <span>{school.region || 'Unknown'}</span>
                    </div>
                    <div className="meta-row">
                      <Users size={12} />
                      <span>{school.gender || 'Mixed'}</span>
                    </div>
                    <div className="meta-row">
                      <Building size={12} />
                      <span>{school.status || 'Boarding'}</span>
                    </div>
                  </div>

                  <div className="programmes-row">
                    {programmes.slice(0, 3).map((p: string) => (
                      <span key={p} className="prog-chip">{p}</span>
                    ))}
                    {programmes.length > 3 && (
                      <span className="prog-chip prog-more">+{programmes.length - 3}</span>
                    )}
                  </div>

                  <div className="agg-range-row">
                    <span>Typical entry:</span>
                    <strong>{getAggregateRange(school.category)}</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="school-card-actions">
                  <button
                    className={`compare-toggle-btn ${inCompare ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && toggleCompare(school)}
                    disabled={disabled}
                    title={disabled ? 'Max 3 schools — upgrade for more' : inCompare ? 'Remove from compare' : 'Add to compare'}
                  >
                    {inCompare ? <Minus size={14} /> : <Plus size={14} />}
                    <span>{inCompare ? 'Remove' : 'Compare'}</span>
                  </button>
                  <Link
                    href={`/calculator?prefill=${encodeURIComponent(school.name)}`}
                    className="see-prediction-link"
                  >
                    <span>See Prediction</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            );
          })}

          {schools.length === 0 && !loading && (
            <div className="schools-empty">
              <GraduationCap size={52} className="empty-icon" />
              <h3>No schools found</h3>
              <p>Try adjusting your search or clearing filters</p>
              {hasFilters && <button className="clear-all-btn" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}
        </div>
      )}

      {/* Load more */}
      {!loading && page < totalPages && (
        <div className="load-more-row">
          <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load more schools (${total - schools.length} remaining)`}
          </button>
        </div>
      )}

      {/* Compare tray */}
      <AnimatePresence>
        {compareList.length > 0 && !showCompare && (
          <motion.div className="compare-tray" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}>
            <div className="tray-chips">
              {compareList.map((s: any) => (
                <div key={s.id} className="tray-chip">
                  <span className="tray-chip-cat" style={{ background: getCatColors(s.category).bg, color: getCatColors(s.category).text }}>
                    Cat {s.category}
                  </span>
                  <span className="tray-chip-name">{s.name.split(' ').slice(0, 2).join(' ')}</span>
                  <button className="tray-chip-x" onClick={() => toggleCompare(s)}><X size={11} /></button>
                </div>
              ))}
              {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                <div key={`slot-${i}`} className="tray-slot"><Plus size={13} /><span>Add school</span></div>
              ))}
            </div>
            <button className="compare-now-btn" onClick={() => setShowCompare(true)}>
              Compare Now →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {showCompare && (
          <div className="compare-backdrop" onClick={() => setShowCompare(false)}>
            <motion.div
              className="compare-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="compare-modal-head">
                <h2>Side-by-Side Comparison</h2>
                <button onClick={() => setShowCompare(false)}><X size={22} /></button>
              </div>

              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th className="compare-attr-col"> </th>
                      {compareList.map((s: any) => (
                        <th key={s.id} className="compare-school-col">
                          <span className="compare-col-cat" style={{ background: getCatColors(s.category).bg, color: getCatColors(s.category).text }}>
                            Cat {s.category}
                          </span>
                          <span className="compare-col-name">{s.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Region',         val: (s: any) => s.region || '—' },
                      { label: 'Gender Type',    val: (s: any) => s.gender || 'Mixed' },
                      { label: 'Boarding',       val: (s: any) => s.status || 'Boarding' },
                      { label: 'Entry Aggregate', val: (s: any) => getAggregateRange(s.category) },
                    ].map(row => (
                      <tr key={row.label}>
                        <td className="compare-attr-label">{row.label}</td>
                        {compareList.map((s: any) => <td key={s.id}>{row.val(s)}</td>)}
                      </tr>
                    ))}
                    <tr>
                      <td className="compare-attr-label">Programmes</td>
                      {compareList.map((s: any) => (
                        <td key={s.id}>
                          <div className="compare-progs">
                            {getProgrammes(s.category).map((p: string) => (
                              <span key={p} className="prog-chip">{p}</span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="compare-modal-actions">
                {compareList.map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/calculator?prefill=${encodeURIComponent(s.name)}`}
                    className="add-to-calc-btn"
                    onClick={() => setShowCompare(false)}
                  >
                    <span>Use {s.name.split(' ')[0]}</span>
                    <ArrowRight size={14} />
                  </Link>
                ))}
              </div>

              <p className="compare-upsell">
                💡 <strong>Premium</strong> users can compare up to 10 schools with full cutoff history.{' '}
                <Link href="/pricing" onClick={() => setShowCompare(false)}>Upgrade →</Link>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
