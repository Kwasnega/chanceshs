'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldCheck, Clock, Check, ArrowRight, Smartphone, Mail, User, MessageCircle, BookOpen, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import './Alerts.css';

function isValidGhanaPhone(p: string) {
  const d = p.replace(/\D/g, '');
  return (d.startsWith('0') && d.length === 10) || (d.startsWith('233') && d.length === 12);
}

export default function AlertsPage() {
  const [userId,        setUserId]        = useState<string | null>(null);
  const [hasAccess,     setHasAccess]     = useState(false);
  const [paymentRef,    setPaymentRef]    = useState('');
  const [confirmed,     setConfirmed]     = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [formError,     setFormError]     = useState('');

  // Form fields
  const [name,          setName]          = useState('');
  const [phone,         setPhone]         = useState('');
  const [sameAsPhone,   setSameAsPhone]   = useState(true);
  const [whatsapp,      setWhatsapp]      = useState('');
  const [email,         setEmail]         = useState('');
  const [schools,       setSchools]       = useState<string[]>([]);
  const [schoolInput,   setSchoolInput]   = useState('');
  const [payEmail,      setPayEmail]      = useState('');

  useEffect(() => {
    let uid = localStorage.getItem('chanceshs_user_id');
    if (!uid) {
      uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      try { localStorage.setItem('chanceshs_user_id', uid); } catch {}
    }
    setUserId(uid);
    checkAccess(uid);

    // Pre-populate schools from session
    try {
      const saved = localStorage.getItem('chanceshs_selected_schools');
      if (saved) setSchools(JSON.parse(saved));
    } catch {}

    // Handle URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment_success') === 'true') setHasAccess(true);
    if (params.get('ref')) setPaymentRef(params.get('ref') || '');
  }, []);

  const checkAccess = async (uid: string) => {
    try {
      const res = await fetch(`/api/entitlements/check?userId=${uid}&featureType=early_alert`);
      const d   = await res.json();
      setHasAccess(d.hasAccess);
    } catch {}
  };

  const addSchool = () => {
    const s = schoolInput.trim();
    if (s && !schools.includes(s)) setSchools(prev => [...prev, s]);
    setSchoolInput('');
  };

  const removeSchool = (s: string) => setSchools(prev => prev.filter(x => x !== s));

  const handleSubscribe = async () => {
    setFormError('');
    if (!name.trim())               { setFormError('Please enter your full name'); return; }
    if (!isValidGhanaPhone(phone))  { setFormError('Enter a valid Ghana phone number (e.g. 0241234567)'); return; }
    if (!userId)                    { setFormError('Session error — please refresh'); return; }

    setIsLoading(true);
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, name, phone,
          whatsapp: sameAsPhone ? phone : whatsapp,
          email, schools, paymentRef,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Registration failed');
      setConfirmed(true);
    } catch (e: any) {
      setFormError(e.message || 'Something went wrong — please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!userId || !payEmail) return;
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'early_alert', email: payEmail, userId, phone: '' }),
      });
      const data = await res.json();
      if (data.success && data.authorizationUrl) window.location.href = data.authorizationUrl;
      else alert('Payment initialization failed. Please try again.');
    } catch { alert('Payment initialization failed. Please try again.'); }
  };

  if (confirmed) {
    return (
      <div className="alerts-page">
        <div className="alerts-container">
          <motion.div className="alerts-confirmed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="confirmed-icon">✅</div>
            <h2 className="confirmed-title">You're on the list!</h2>
            <p className="confirmed-text">
              We'll message you the moment BECE placement results drop — via SMS and WhatsApp.
              No refreshing, no waiting — just a notification straight to your phone.
            </p>
            <div className="confirmed-details">
              <div className="confirmed-detail"><Smartphone size={15} /><span>{phone}</span></div>
              {!sameAsPhone && whatsapp && <div className="confirmed-detail"><MessageCircle size={15} /><span>{whatsapp} (WhatsApp)</span></div>}
            </div>
            <Link href="/calculator" className="confirmed-cta">
              <span>Back to Calculator</span><ChevronRight size={18} />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="alerts-container">
        <motion.div className="alerts-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="header-icon"><Bell size={48} /></div>
          <h1 className="alerts-title">Early Placement Alert</h1>
          <p className="alerts-subtitle">Get instant SMS + WhatsApp the moment your BECE placement results drop</p>
        </motion.div>

        {!hasAccess ? (
          <motion.div className="alerts-locked" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="locked-content">
              <div className="locked-features">
                {[
                  { icon: <Smartphone size={18} />, text: 'Instant SMS notification' },
                  { icon: <MessageCircle size={18} />, text: 'WhatsApp notification' },
                  { icon: <Clock size={18} />, text: 'Zero stress on results day' },
                  { icon: <Check size={18} />, text: 'One-time payment' },
                ].map(f => (
                  <div key={f.text} className="locked-feature">
                    <span className="feature-icon">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
              <div className="locked-price">
                <span className="price-label">One-time</span>
                <span className="price-amount">GHS 15</span>
              </div>
              <div className="locked-email">
                <label>Email for payment receipt</label>
                <input type="email" value={payEmail} onChange={e => setPayEmail(e.target.value)} placeholder="you@example.com" className="email-input" />
              </div>
              <button onClick={handlePayment} className="locked-cta" disabled={!payEmail}>
                <span>Purchase Alert Service</span><ArrowRight size={20} />
              </button>
              <div className="locked-trust">
                <div className="trust-item"><ShieldCheck size={15} /><span>Secure payment via Paystack</span></div>
                <div className="trust-item"><Clock size={15} /><span>Instant access after payment</span></div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div className="alerts-setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="setup-content">
              <div className="setup-header">
                <div className="setup-icon"><Bell size={40} /></div>
                <h2 className="setup-title">Register Your Alert</h2>
                <p className="setup-description">Fill in your details below — we'll notify you the instant results drop.</p>
              </div>

              <div className="setup-form">
                {/* Full name */}
                <div className="form-group">
                  <label><User size={15} /> Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kwame Mensah" className="form-input" />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label><Smartphone size={15} /> Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0241234567" className="form-input" />
                  <span className="form-hint">Ghana number — MTN, Telecel, AirtelTigo</span>
                </div>

                {/* WhatsApp */}
                <div className="form-group">
                  <label><MessageCircle size={15} /> WhatsApp Number</label>
                  <div className="same-phone-check">
                    <input type="checkbox" id="same-phone" checked={sameAsPhone} onChange={e => setSameAsPhone(e.target.checked)} />
                    <label htmlFor="same-phone" style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>
                      Same as phone number
                    </label>
                  </div>
                  {!sameAsPhone && (
                    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="0551234567" className="form-input" style={{ marginTop: '8px' }} />
                  )}
                </div>

                {/* Email (optional) */}
                <div className="form-group">
                  <label><Mail size={15} /> Email <span className="optional-tag">(optional)</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="form-input" />
                </div>

                {/* Schools */}
                <div className="form-group">
                  <label><BookOpen size={15} /> Schools Selected</label>
                  <div className="schools-chips">
                    {schools.map(s => (
                      <span key={s} className="school-chip">
                        {s}
                        <button type="button" onClick={() => removeSchool(s)} className="chip-remove"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="school-add-row">
                    <input
                      type="text"
                      value={schoolInput}
                      onChange={e => setSchoolInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSchool()}
                      placeholder="Type a school name and press Enter"
                      className="form-input"
                    />
                    <button type="button" onClick={addSchool} className="add-school-btn">Add</button>
                  </div>
                </div>

                {formError && (
                  <div className="form-error">{formError}</div>
                )}

                <button onClick={handleSubscribe} className="setup-cta" disabled={isLoading}>
                  {isLoading ? 'Registering…' : <><span>Activate My Alert</span><Bell size={18} /></>}
                </button>
              </div>

              <div className="setup-info">
                <div className="info-item"><Clock size={15} /><span>Notified within minutes of results release</span></div>
                <div className="info-item"><ShieldCheck size={15} /><span>Your data is private and never shared</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
