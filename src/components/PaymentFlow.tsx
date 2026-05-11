'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Lock, Sparkles, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import './PaymentFlow.css';

interface PaymentFlowProps {
  productId: string;
  productName: string;
  price: number;
  onClose: () => void;
  onSuccess: (reference: string) => void;
  userId?: string;
}

type PaymentStep = 'init' | 'processing' | 'verifying' | 'success' | 'error';

export default function PaymentFlow({
  productId,
  productName,
  price,
  onClose,
  onSuccess,
  userId
}: PaymentFlowProps) {
  const [step, setStep] = useState<PaymentStep>('init');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initializePayment = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email,
          userId,
          metadata: { phone }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      setReference(data.reference);
      setStep('processing');

      // Open Paystack payment modal
      if (typeof window !== 'undefined' && (window as any).PaystackPop) {
        const paystack = new (window as any).PaystackPop({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
          email,
          amount: data.product.price * 100, // Convert to pesewas
          currency: 'GHS',
          ref: data.reference,
          onClose: () => {
            setStep('init');
            setIsSubmitting(false);
          },
          callback: (response: any) => {
            verifyPayment(response.reference);
          }
        });
        paystack.openIframe();
      } else {
        // Fallback: redirect to Paystack
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed');
      setIsSubmitting(false);
    }
  };

  const verifyPayment = async (ref: string) => {
    setStep('verifying');

    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, userId })
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess(ref);
        }, 2000);
      } else {
        setStep('error');
        setError(data.error || 'Payment verification failed');
      }
    } catch (err) {
      setStep('error');
      setError('Payment verification failed');
    }
  };

  const handleRetry = () => {
    setStep('init');
    setError('');
    setIsSubmitting(false);
  };

  return (
    <div className="payment-flow-overlay" onClick={onClose}>
      <motion.div
        className="payment-flow-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="payment-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'init' && (
            <motion.div
              key="init"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="payment-step"
            >
              <div className="payment-header">
                <div className="payment-icon-wrapper">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="payment-title">Unlock {productName}</h3>
                  <p className="payment-subtitle">Complete your purchase to access premium features</p>
                </div>
              </div>

              <div className="payment-product-card">
                <div className="product-info">
                  <span className="product-name">{productName}</span>
                  <span className="product-price">GHS {price.toFixed(2)}</span>
                </div>
                <div className="product-features">
                  <div className="product-feature">
                    <Check size={16} />
                    <span>Instant access</span>
                  </div>
                  <div className="product-feature">
                    <Check size={16} />
                    <span>Secure payment</span>
                  </div>
                  <div className="product-feature">
                    <Check size={16} />
                    <span>MoMo supported</span>
                  </div>
                </div>
              </div>

              <div className="payment-form">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <div className="phone-input-wrapper">
                    <Smartphone size={18} className="phone-icon" />
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+233 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <span className="form-hint">For SMS alerts when results are released</span>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="payment-error"
                  >
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  className="payment-cta"
                  onClick={initializePayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      <span>Pay GHS {price.toFixed(2)}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              <div className="payment-trust">
                <div className="trust-item">
                  <Lock size={14} />
                  <span>Secure payment</span>
                </div>
                <div className="trust-item">
                  <Smartphone size={14} />
                  <span>MoMo accepted</span>
                </div>
                <div className="trust-item">
                  <Check size={14} />
                  <span>Instant access</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="payment-step processing-step"
            >
              <div className="processing-content">
                <div className="processing-spinner">
                  <Loader2 size={48} className="spinner" />
                </div>
                <h3 className="processing-title">Processing Payment</h3>
                <p className="processing-subtitle">Please complete the payment in the popup window</p>
                <div className="processing-tips">
                  <span>💡 Keep this window open</span>
                  <span>📱 Check your phone for MoMo prompt</span>
                  <span>✅ Enter your PIN to confirm</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="payment-step processing-step"
            >
              <div className="processing-content">
                <div className="processing-spinner">
                  <Loader2 size={48} className="spinner" />
                </div>
                <h3 className="processing-title">Verifying Payment</h3>
                <p className="processing-subtitle">Confirming your payment...</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="payment-step success-step"
            >
              <div className="success-content">
                <div className="success-icon-wrapper">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <Check size={48} />
                  </motion.div>
                </div>
                <h3 className="success-title">Payment Successful!</h3>
                <p className="success-subtitle">Your premium features are now unlocked</p>
                <div className="success-features">
                  <div className="success-feature">
                    <Check size={16} />
                    <span>Full access to premium report</span>
                  </div>
                  <div className="success-feature">
                    <Check size={16} />
                    <span>Historical cut-off data</span>
                  </div>
                  <div className="success-feature">
                    <Check size={16} />
                    <span>AI-powered recommendations</span>
                  </div>
                </div>
                <button className="success-cta" onClick={() => onSuccess(reference)}>
                  <span>Access Premium Features</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="payment-step error-step"
            >
              <div className="error-content">
                <div className="error-icon-wrapper">
                  <AlertCircle size={48} />
                </div>
                <h3 className="error-title">Payment Failed</h3>
                <p className="error-subtitle">{error || 'Something went wrong with your payment'}</p>
                <div className="error-tips">
                  <span>• Check your MoMo balance</span>
                  <span>• Ensure correct PIN was entered</span>
                  <span>• Try again or contact support</span>
                </div>
                <button className="error-cta" onClick={handleRetry}>
                  <ArrowRight size={18} />
                  <span>Try Again</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
