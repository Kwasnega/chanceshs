'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, TrendingUp, Bell, Package, ShieldCheck, Smartphone, Clock, ArrowRight, Sparkles, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
// Note: ShieldCheck, Smartphone, Clock, Sparkles kept for sections below
import PaymentFlow from '@/components/PaymentFlow';
import './Pricing.css';

export default function Pricing() {
  return (
    <Suspense fallback={<div className="pricing-page" style={{ minHeight: '100vh' }} />}>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const storedUserId = localStorage.getItem('chanceshs_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setUserId(newUserId);
      try {
        localStorage.setItem('chanceshs_user_id', newUserId);
      } catch (e) {
        console.warn('localStorage not available, using session state only');
      }
    }
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const product = searchParams.get('product');
    if (success === 'true') {
      const productLabel = product === 'early_alert' ? 'Early Placement Alert'
        : product === 'shs_kit_bundler' ? 'SHS Kit Bundler'
        : 'your purchase';
      setToast({ type: 'success', message: `Payment successful! ${productLabel} is now unlocked.` });
      setTimeout(() => setToast(null), 6000);
    } else if (error) {
      const msg = error === 'payment_failed' ? 'Payment failed. Please try again.'
        : error === 'payment_not_successful' ? 'Payment was not completed. Please try again.'
        : error === 'no_reference' ? 'Payment reference missing. Please contact support.'
        : 'Something went wrong. Please try again or contact support.';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 8000);
    }
  }, [searchParams]);

  const handleProductClick = (productId: string, productName: string, price: number) => {
    setSelectedProduct({ id: productId, name: productName, price });
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (reference: string) => {
    setShowPaymentModal(false);
    const productId = selectedProduct?.id;
    if (productId === 'premium_report') {
      window.location.href = `/calculator?payment_success=true&userId=${userId}`;
    } else if (productId === 'bundle_complete' || productId === 'bundle_full') {
      // Bundle: unlock report AND prompt early alert registration
      window.location.href = `/calculator?payment_success=true&bundle=true&ref=${encodeURIComponent(reference)}&userId=${userId}`;
    } else if (productId === 'early_alert') {
      window.location.href = `/alerts?payment_success=true&ref=${encodeURIComponent(reference)}&userId=${userId}`;
    } else if (productId === 'shs_kit_bundler') {
      window.location.href = `/pricing?success=true&product=shs_kit_bundler`;
    } else {
      window.location.href = `/pricing?success=true`;
    }
  };
  return (
    <div className="pricing-page">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`pricing-toast pricing-toast-${toast.type}`}
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.3 }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="toast-close"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* SECTION 1 - PRICING HERO */}
      <section className="pricing-hero">
        <div className="hero-content">
          <motion.div 
            className="hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ShieldCheck size={16} />
            <span>Trusted by students across Ghana</span>
          </motion.div>
          
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Make confident SHS placement decisions
          </motion.h1>
          
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Data-driven insights to reduce anxiety and help you choose the right schools. 
            Based on historical WAEC/GES placement data.
          </motion.p>

          <motion.div 
            className="hero-summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="summary-item">
              <Check size={18} />
              <span>Full school probability analysis</span>
            </div>
            <div className="summary-item">
              <Check size={18} />
              <span>Instant placement alerts</span>
            </div>
            <div className="summary-item">
              <Check size={18} />
              <span>Complete SHS preparation kit</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 - PRODUCT BREAKDOWN */}
      <section className="pricing-products">
        <div className="products-container">
          <motion.div 
            className="products-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="products-title">Choose what helps you most</h2>
            <p className="products-subtitle">Simple, transparent pricing. Pay for what you need.</p>
          </motion.div>

          <div className="products-grid">
            {/* PREMIUM STRATEGY REPORT - PRIMARY OFFER */}
            <motion.div 
              className="product-card featured"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="card-badge featured-badge">
                <Sparkles size={14} />
                <span>Most Popular</span>
              </div>
              
              <div className="card-header">
                <div className="card-icon featured-icon">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h3 className="card-title">Premium Strategy Report</h3>
                  <p className="card-subtitle">Complete placement intelligence</p>
                </div>
              </div>

              <div className="card-price">
                <span className="price-currency">GHS</span>
                <span className="price-amount">40</span>
                <span className="price-period">one-time</span>
              </div>

              <div className="card-features">
                <div className="feature-group">
                  <span className="feature-label">Analysis includes:</span>
                  <div className="feature-list">
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>15-25 school probability ranking</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Safe/Competitive/Dream breakdown</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Risk analysis for each choice</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Smart application strategy</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Parent-friendly summary</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Instant PDF download</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleProductClick('premium_report', 'Premium Strategy Report', 40)}
                className="card-cta featured-cta"
              >
                <span>Get Strategy Report</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>

            {/* EARLY PLACEMENT ALERT */}
            <motion.div 
              className="product-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="card-header">
                <div className="card-icon">
                  <Bell size={28} />
                </div>
                <div>
                  <h3 className="card-title">Early Placement Alert</h3>
                  <p className="card-subtitle">Peace of mind during results</p>
                </div>
              </div>

              <div className="card-price">
                <span className="price-currency">GHS</span>
                <span className="price-amount">15</span>
                <span className="price-period">one-time</span>
              </div>

              <div className="card-features">
                <div className="feature-group">
                  <span className="feature-label">You get:</span>
                  <div className="feature-list">
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Instant SMS placement alert</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>WhatsApp notification</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Zero stress on results day</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>One-time payment</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleProductClick('early_alert', 'Early Placement Alert', 15)}
                className="card-cta"
              >
                <span>Add Alert Service</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>

            {/* SHS KIT BUNDLER */}
            <motion.div 
              className="product-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="card-header">
                <div className="card-icon">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="card-title">SHS Kit Bundler</h3>
                  <p className="card-subtitle">Everything after placement</p>
                </div>
              </div>

              <div className="card-price">
                <span className="price-currency">GHS</span>
                <span className="price-amount">25</span>
                <span className="price-period">commission</span>
              </div>

              <div className="card-features">
                <div className="feature-group">
                  <span className="feature-label">Includes:</span>
                  <div className="feature-list">
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Full SHS checklist</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>One-click kit bundle</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Verified local vendors</span>
                    </div>
                    <div className="feature-item">
                      <Check size={16} className="feature-check" />
                      <span>Convenience-based value</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleProductClick('shs_kit_bundler', 'SHS Kit Bundler', 25)}
                className="card-cta"
              >
                <span>Explore Kit Bundles</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3 - BUNDLE SYSTEM */}
      <section className="pricing-bundles">
        <div className="bundles-container">
          <motion.div 
            className="bundles-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="bundles-title">Save with bundles</h2>
            <p className="bundles-subtitle">Get more value when you combine services</p>
          </motion.div>

          <div className="bundles-grid">
            {/* REPORT + ALERT BUNDLE */}
            <motion.div 
              className="bundle-card primary-bundle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bundle-badge">
                <Zap size={14} />
                <span>Best Value</span>
              </div>
              
              <h3 className="bundle-title">Complete Peace of Mind</h3>
              <p className="bundle-subtitle">Strategy Report + Early Alert</p>
              
              <div className="bundle-price">
                <div className="bundle-original">GHS 55</div>
                <div className="bundle-current">
                  <span className="bundle-currency">GHS</span>
                  <span className="bundle-amount">45</span>
                </div>
                <span className="bundle-save">Save GHS 10</span>
              </div>

              <div className="bundle-features">
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>Full strategy report</span>
                </div>
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>Instant placement alerts</span>
                </div>
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>Complete peace of mind</span>
                </div>
              </div>

              <button 
                onClick={() => handleProductClick('bundle_complete', 'Complete Peace of Mind', 45)}
                className="bundle-cta"
              >
                <span>Get Bundle</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>

            {/* FULL EXPERIENCE BUNDLE */}
            <motion.div 
              className="bundle-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="bundle-title">Full Experience</h3>
              <p className="bundle-subtitle">Report + Alert + Kit Preview</p>
              
              <div className="bundle-price">
                <div className="bundle-current">
                  <span className="bundle-currency">GHS</span>
                  <span className="bundle-amount">55</span>
                </div>
                <span className="bundle-save">Save GHS 25</span>
              </div>

              <div className="bundle-features">
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>Everything in Complete bundle</span>
                </div>
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>SHS kit system preview</span>
                </div>
                <div className="bundle-feature">
                  <Check size={16} />
                  <span>Premium support</span>
                </div>
              </div>

              <button 
                onClick={() => handleProductClick('bundle_full', 'Full Experience', 55)}
                className="bundle-cta"
              >
                <span>Get Full Experience</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - VALUE COMPARISON */}
      <section className="pricing-comparison">
        <div className="comparison-container">
          <motion.div 
            className="comparison-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="comparison-title">The difference is clear</h2>
            <p className="comparison-subtitle">See what changes when you use data instead of guesswork</p>
          </motion.div>

          <div className="comparison-grid">
            <div className="comparison-side without">
              <div className="comparison-header-side">
                <X size={24} className="comparison-icon without-icon" />
                <h3 className="comparison-side-title">Without ChanceSHS</h3>
              </div>
              <div className="comparison-list">
                <div className="comparison-item">
                  <X size={16} className="comparison-item-icon" />
                  <span>Guesswork on school choices</span>
                </div>
                <div className="comparison-item">
                  <X size={16} className="comparison-item-icon" />
                  <span>High placement anxiety</span>
                </div>
                <div className="comparison-item">
                  <X size={16} className="comparison-item-icon" />
                  <span>Misinformation from others</span>
                </div>
                <div className="comparison-item">
                  <X size={16} className="comparison-item-icon" />
                  <span>Random school selection</span>
                </div>
              </div>
            </div>

            <div className="comparison-side with">
              <div className="comparison-header-side">
                <Check size={24} className="comparison-icon with-icon" />
                <h3 className="comparison-side-title">With ChanceSHS</h3>
              </div>
              <div className="comparison-list">
                <div className="comparison-item">
                  <Check size={16} className="comparison-item-icon" />
                  <span>Data-driven decisions</span>
                </div>
                <div className="comparison-item">
                  <Check size={16} className="comparison-item-icon" />
                  <span>Clear placement picture</span>
                </div>
                <div className="comparison-item">
                  <Check size={16} className="comparison-item-icon" />
                  <span>Confidence in choices</span>
                </div>
                <div className="comparison-item">
                  <Check size={16} className="comparison-item-icon" />
                  <span>Structured school strategy</span>
                </div>
                <div className="comparison-item">
                  <Check size={16} className="comparison-item-icon" />
                  <span>Reduced stress for family</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 - TRUST BUILDING */}
      <section className="pricing-trust">
        <div className="trust-container">
          <motion.div 
            className="trust-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="trust-title">Built on trust and transparency</h2>
          </motion.div>

          <div className="trust-grid">
            <div className="trust-item">
              <ShieldCheck size={32} className="trust-icon" />
              <h4 className="trust-item-title">Based on historical data</h4>
              <p className="trust-item-text">Analysis uses 5 years of WAEC/GES placement data for accuracy</p>
            </div>
            <div className="trust-item">
              <Smartphone size={32} className="trust-icon" />
              <h4 className="trust-item-title">Secure payments</h4>
              <p className="trust-item-text">MoMo supported (MTN, Telecel, AirtelTigo) with instant confirmation</p>
            </div>
            <div className="trust-item">
              <Clock size={32} className="trust-icon" />
              <h4 className="trust-item-title">Instant access</h4>
              <p className="trust-item-text">Get your report immediately after payment—no waiting</p>
            </div>
          </div>

          <div className="trust-disclaimer">
            <p className="disclaimer-text">
              <strong>Important:</strong> Our predictions are estimates based on historical data and should be used as guidance tools. 
              Actual placement results depend on WAEC/GES decisions. We provide intelligence, not guarantees.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 - PAYMENT UX */}
      <section className="pricing-payment">
        <div className="payment-container">
          <motion.div 
            className="payment-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="payment-title">Simple, local payment</h2>
            <p className="payment-subtitle">Pay securely with your mobile money</p>
          </motion.div>

          <div className="payment-methods">
            <div className="payment-method">
              <div className="payment-icon">MTN</div>
              <span className="payment-name">MoMo</span>
            </div>
            <div className="payment-method">
              <div className="payment-icon">Telecel</div>
              <span className="payment-name">Cash</span>
            </div>
            <div className="payment-method">
              <div className="payment-icon">AT</div>
              <span className="payment-name">Money</span>
            </div>
          </div>

          <div className="payment-steps">
            <div className="payment-step">
              <div className="step-number">1</div>
              <span className="step-text">Select your service</span>
            </div>
            <div className="payment-step">
              <div className="step-number">2</div>
              <span className="step-text">Enter MoMo number</span>
            </div>
            <div className="payment-step">
              <div className="step-number">3</div>
              <span className="step-text">Confirm payment</span>
            </div>
            <div className="payment-step">
              <div className="step-number">4</div>
              <span className="step-text">Instant unlock</span>
            </div>
          </div>

          <div className="payment-reassurance">
            <Check size={16} />
            <span>Instant confirmation</span>
            <Check size={16} />
            <span>No hidden fees</span>
            <Check size={16} />
            <span>Secure transaction</span>
          </div>
        </div>
      </section>

      {/* SECTION 7 - STICKY MOBILE CTA */}
      <div className="mobile-sticky-cta">
        <button className="sticky-cta">
          <span>Get Started</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <PaymentFlow
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          price={selectedProduct.price}
          userId={userId || undefined}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
