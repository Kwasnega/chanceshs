'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './EmailLogin.css';

interface EmailLoginProps {
  onSuccess?: () => void;
  redirectText?: string;
}

export default function EmailLogin({ onSuccess, redirectText }: EmailLoginProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendSignInLink } = useAuth();

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await sendSignInLink(email);
      setIsSent(true);
      onSuccess?.();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to send login link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="email-login-container">
      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="email-login-form"
          >
            <div className="login-header">
              <div className="login-icon-wrapper">
                <Mail size={24} />
              </div>
              <h3 className="login-title">Save Your Results</h3>
              <p className="login-subtitle">
                {redirectText || 'Enter your email to access your report on any device'}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="login-error"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label htmlFor="email" className="input-label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="email-input"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || !email}
                className="submit-button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Login Link</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </form>

            <p className="login-note">
              We'll send you a secure link to verify your email. No password needed!
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="login-success"
          >
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h3 className="success-title">Check Your Email!</h3>
            <p className="success-message">
              We've sent a secure login link to <strong>{email}</strong>
            </p>
            <div className="success-instructions">
              <p>Click the link in your email to:</p>
              <ul>
                <li>Access your full report</li>
                <li>Download your PDF</li>
                <li>Share results with family</li>
                <li>Return anytime on any device</li>
              </ul>
            </div>
            <p className="success-note">
              Didn't receive it? Check your spam folder or try again.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
