'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Lock, ShieldCheck, Share2, TrendingUp, Target, Clock, X, Sparkles, Check, ArrowLeft, FileText, Award, AlertTriangle, BarChart3, Zap, Brain, BookOpen, Download, Users, Star, Lightbulb, PieChart, Gauge, MapPin, GraduationCap, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import PremiumReport from '@/components/PremiumReport';
import ModernResults from '@/components/ModernResults';
import EmailLogin from '@/components/EmailLogin';
import { useAuth, getUserIdentifier } from '@/contexts/AuthContext';
import './CalculatorFlow.css';

// Mobile-friendly Framer Motion variants
const mobileVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export default function CalculatorFlow() {
  const { grades, setGrades, selectedSchools, setSelectedSchools, course, setCourse, isPremium, setPremium } = useCalculatorStore();
  const { user, email: authEmail, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results,              setResults]              = useState<any[]>([]);
  const [hiddenOpportunities,   setHiddenOpportunities]   = useState<any[]>([]);
  const [predDataManifest,      setPredDataManifest]      = useState<any>(null);
  const [suggestions,           setSuggestions]           = useState<any[]>([]);
  const [isSuggesting,          setIsSuggesting]          = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [initializePayment, setInitializePayment] = useState<any>(null);
  const [rawScore, setRawScore] = useState(0);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  // F1: Per-school region flags (true = home district, false = out-of-region)
  const [regionFlags, setRegionFlags] = useState<Record<string, boolean>>({});

  // Bundle alert prompt
  const [showBundleAlert, setShowBundleAlert]     = useState(false);
  const [bundleRef,       setBundleRef]           = useState('');
  const [bundleAlertDone, setBundleAlertDone]     = useState(false);
  const [bName,           setBName]               = useState('');
  const [bPhone,          setBPhone]              = useState('');
  const [bWaSame,         setBWaSame]             = useState(true);
  const [bWa,             setBWa]                 = useState('');
  const [bEmail,          setBEmail]              = useState('');
  const [bLoading,        setBLoading]            = useState(false);
  const [bError,          setBError]              = useState('');

  const liveAggregate = Object.values(grades).reduce((acc, curr) => acc + parseInt(curr as any), 0);
  
  // Get user identifier (email-based for authenticated users, legacy fallback for others)
  const userId = getUserIdentifier(authEmail);
  
  // Check premium access when auth state changes
  useEffect(() => {
    if (authEmail) {
      checkPremiumAccess(authEmail);
    }
  }, [authEmail]);

  // Handle post-payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Bundle post-purchase prompt
    if (params.get('bundle') === 'true') {
      setBundleRef(params.get('ref') || '');
      setTimeout(() => setShowBundleAlert(true), 1200);
    }

    // C4 fix: Poll for premium access after payment return
    const paymentSuccess = params.get('success') === 'true';
    const paymentProduct = params.get('product');
    if (paymentSuccess && paymentProduct === 'premium_report' && authEmail) {
      console.log('Payment return detected - starting entitlement polling');
      pollForPremiumAccess(authEmail);
    }
  }, [authEmail]);

  // Check premium access (C3 fix - now uses email for cross-device persistence)
  const checkPremiumAccess = async (emailToCheck: string) => {
    try {
      const response = await fetch(`/api/entitlements/check?email=${encodeURIComponent(emailToCheck)}&featureType=premium_report`);
      if (!response.ok) {
        setHasPremiumAccess(false);
        return false;
      }
      const data = await response.json();
      setHasPremiumAccess(data.hasAccess);
      if (data.hasAccess) {
        setPremium(true);
      }
      return data.hasAccess;
    } catch (error) {
      console.error('Error checking premium access:', error);
      setHasPremiumAccess(false);
      return false;
    }
  };

  // Poll for entitlements after payment return (C4 fix - handles webhook race condition)
  const pollForPremiumAccess = async (emailToCheck: string, attempts = 0): Promise<boolean> => {
    const hasAccess = await checkPremiumAccess(emailToCheck);
    if (hasAccess) {
      console.log('Premium access confirmed after payment');
      return true;
    }
    if (attempts >= 10) {
      console.log('Premium access poll timeout - manual refresh may be needed');
      alert('Payment processing... If your report is not unlocked in 30 seconds, please refresh the page.');
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    return pollForPremiumAccess(emailToCheck, attempts + 1);
  };
  
  // Calculate completion percentage
  const totalSubjects = 6; // 4 core + 2 electives
  const filledSubjects = Object.values(grades).filter(g => g !== 0).length;
  const completionPercent = (filledSubjects / totalSubjects) * 100;
  
  // Get aggregate status
  const getAggregateStatus = (agg: number) => {
    if (agg <= 9) return { label: 'Excellent', color: '#10B981', confidence: 95 };
    if (agg <= 15) return { label: 'Very Good', color: '#F5A623', confidence: 85 };
    if (agg <= 24) return { label: 'Good', color: '#3B82F6', confidence: 70 };
    if (agg <= 30) return { label: 'Fair', color: '#8B5CF6', confidence: 55 };
    return { label: 'Needs Improvement', color: '#EF4444', confidence: 40 };
  };
  
  const aggregateStatus = getAggregateStatus(liveAggregate);
  
  // Get probability color based on percentage
  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return '#10B981'; // Green
    if (prob >= 60) return '#F5A623'; // Gold
    if (prob >= 40) return '#3B82F6'; // Blue
    return '#EF4444'; // Red
  };

  // Compute average probability and confidence from results
  const getAverageProbability = () => {
    if (!results || results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + (r.probability || 0), 0) / results.length);
  };

  const getAverageConfidence = () => {
    if (!results || results.length === 0) return 0;
    return Math.round(results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length);
  };

  // Generate social proof number based on aggregate
  const getSocialProofNumber = () => {
    // Generate a realistic number based on aggregate (lower aggregate = more students checking)
    const baseNumber = 150 + Math.floor(Math.random() * 100);
    if (liveAggregate <= 9) return baseNumber + 150; // 300-400
    if (liveAggregate <= 15) return baseNumber + 80;  // 230-330
    if (liveAggregate <= 24) return baseNumber;       // 150-250
    return Math.max(50, baseNumber - 50);            // 100-200
  };

  // Get card styling based on position and result type
  const getCardStyle = (index: number, result: any) => {
    const styles: string[] = [];
    if (index === 0) styles.push('first-choice');
    if (result.safeBet) styles.push('safe-bet');
    if (result.highRisk) styles.push('high-risk');
    if (result.locked) styles.push('locked-card');
    return styles.join(' ');
  };

  // Dynamically import Paystack
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      import('react-paystack').then(({ usePaystackPayment }) => {
        const config = {
          reference: (new Date()).getTime().toString(),
          email: email || 'user@chanceshs.com',
          amount: 2000, // GHS 20.00 in kobo/pesewas
          publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
          currency: 'GHS'
        };
        setInitializePayment(() => usePaystackPayment(config));
      }).catch(err => {
        console.warn('Paystack import failed:', err);
      });
    }
  }, [email]);

  const handleLegacyPayment = () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email to continue.');
      return;
    }

    if (initializePayment) {
      initializePayment({
        onSuccess: (reference: any) => {
          console.log('Payment Successful:', reference);
          setPremium(true);
          setShowPremiumModal(false);
          alert('Payment Successful! Premium features unlocked.');
        },
        onClose: () => {
          console.log('Payment closed');
        }
      });
    } else {
      alert('Payment system is initializing. Please try again in a moment.');
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { schoolService } = await import('@/services/schoolService');
      const results = await schoolService.searchSchools(term);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSchool = (school: any) => {
    if (selectedSchools.find(s => s.id === school.id)) {
      setSelectedSchools(selectedSchools.filter(s => s.id !== school.id));
      // F1: Clean up region flag when school is removed
      setRegionFlags(prev => { const next = { ...prev }; delete next[school.id]; return next; });
      return;
    }
    if (selectedSchools.length >= 6) {
      alert('You can only pick up to 6 schools.');
      return;
    }
    // F2: Removed incorrect 'Cat A must be 1st choice' constraint — CSSPS does not require this
    // Only one Category A school allowed
    if (school.category === 'A' && selectedSchools.some(s => s.category === 'A')) {
      alert('You can only choose one Category A school.');
      return;
    }
    setSelectedSchools([...selectedSchools, school]);
  };

  const downloadPDF = async () => {
    const element = document.getElementById('report-container');
    if (!element) return;
    
    setIsLoading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`ChanceSHS_Report_${liveAggregate}.pdf`);
    } catch (err) {
      console.error('PDF Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Validate that raw score is entered
      if (rawScore === 0 || rawScore < 0 || rawScore > 600) {
        alert('Please enter your raw score (0-600) before proceeding.');
        return;
      }
    }
    
    if (step === 2) {
      if (selectedSchools.length === 0) return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregate: liveAggregate,
            rawScore: rawScore,
            grades: grades,
            schools: selectedSchools,
            course: course,
            userId: authEmail || userId, // Pass email as userId for server-side entitlement check (C2/C3)
            schoolRegionFlags: regionFlags // F1: Pass per-school region flags
          })
        });
        
        if (!res.ok) {
          console.error('API Error: Response not OK, status:', res.status);
          throw new Error('Prediction request failed');
        }
        
        const data = await res.json();
        setResults(data.results || []);
        setHiddenOpportunities(data.hiddenOpportunities || []);
        if (data.dataManifest) setPredDataManifest(data.dataManifest);
        // Store anomaly detection for premium report
        if (data.anomalyDetection) {
          (window as any).anomalyDetection = data.anomalyDetection;
        }
        setStep(3);

        // Fire suggestions in background — find OTHER qualifying schools from the full Firebase catalogue
        setIsSuggesting(true);
        setSuggestions([]);
        fetch('/api/schools/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregate:  liveAggregate,
            rawScore:   rawScore,
            grades:     grades,
            course:     course,
            excludeIds: selectedSchools.map((s: any) => s.id),
          }),
        })
          .then(r => r.json())
          .then(d => setSuggestions(d.suggestions || []))
          .catch(() => setSuggestions([]))
          .finally(() => setIsSuggesting(false));
      } catch (err: any) {
        console.error(err);
        setResults([]);
        alert(err.message || 'Failed to generate predictions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleUnlockPremium = async () => {
    // C3 fix: Require authentication before unlocking premium
    if (!isAuthenticated || !authEmail) {
      setShowEmailLogin(true);
      return;
    }
    
    setSelectedProduct('premium_report');
    setShowPaymentModal(true);
  };

  const handlePayment = async (productId: string) => {
    // C3 fix: Require authentication before payment
    if (!isAuthenticated || !authEmail) {
      setShowEmailLogin(true);
      return;
    }

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email: authEmail,
          userId: authEmail, // Use email as userId for consistency
          phone: ''
        })
      });

      const data = await response.json();

      if (data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert('Payment initialization failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment initialization failed. Please try again.');
    }
  };

  const handleBack = () => setStep(step - 1);

  // Payment Modal Component
  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <motion.div 
        className="payment-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowPaymentModal(false)}
      >
        <motion.div 
          className="payment-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="payment-modal-header">
            <h3>Unlock Premium Report</h3>
            <button onClick={() => setShowPaymentModal(false)} className="close-btn">
              <X size={24} />
            </button>
          </div>

          <div className="payment-modal-content">
            <div className="payment-modal-features">
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>15-25 school probability ranking</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Safe/Competitive/Dream breakdown</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Risk analysis for each choice</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Smart application strategy</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Parent-friendly summary</span>
              </div>
              <div className="feature-item">
                <Check size={20} className="feature-icon" />
                <span>Instant PDF download</span>
              </div>
            </div>

            <div className="payment-modal-price">
              <span className="price-label">One-time payment</span>
              <span className="price-amount">GHS 40</span>
            </div>

            <div className="payment-modal-email">
              <label htmlFor="payment-email">Email Address</label>
              <input
                id="payment-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="email-input"
              />
            </div>

            <button 
              onClick={() => handlePayment('premium_report')}
              className="payment-modal-cta"
              disabled={!email}
            >
              <span>Pay with MoMo</span>
              <ShieldCheck size={20} />
            </button>

            <div className="payment-modal-trust">
              <div className="trust-item">
                <ShieldCheck size={16} />
                <span>Secure payment</span>
              </div>
              <div className="trust-item">
                <Clock size={16} />
                <span>Instant access</span>
              </div>
              <div className="trust-item">
                <Sparkles size={16} />
                <span>One-time payment</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="calculator-flow">
      {/* Header */}
      <header className="flow-header">
        <div className="container header-container">
          {step > 1 && (
            <button onClick={handleBack} className="back-btn">
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="header-title">
            {step === 1 && "Calculate Aggregate"}
            {step === 2 && "Choose Schools"}
            {step === 3 && "Your Results"}
          </div>
          <div className="placeholder-right"></div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <motion.div 
          className="progress-bar" 
          initial={{ width: 0 }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <main className="flow-content container">
        <AnimatePresence mode="wait">
          {/* Step 1: Grades */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-grades"
            >
              <div className="grades-header">
                <h2 className="step-title">Enter your grades</h2>
                <p className="step-subtitle">Pick your grade for each subject. Your aggregate will update as you go.</p>
              </div>

              {/* Progress Indicator */}
              <div className="progress-indicator">
                <div className="progress-label">
                  <span className="progress-text">Progress</span>
                  <span className="progress-percent">{Math.round(completionPercent)}%</span>
                </div>
                <div className="progress-track">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Course Selection */}
              <div className="subject-group premium-card">
                <div className="group-header">
                  <div className="group-icon">
                    <Target size={20} />
                  </div>
                  <h3>Course Selection</h3>
                </div>
                <div className="grade-selector">
                  {['General Science', 'General Arts', 'Business', 'Agriculture', 'Visual Arts'].map((c) => (
                    <motion.button
                      key={c}
                      className={`grade-option ${course === c ? 'active' : ''}`}
                      onClick={() => setCourse(c)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {c}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Core Subjects */}
              <div className="subject-group premium-card">
                <div className="group-header">
                  <div className="group-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <h3>Core Subjects</h3>
                  <span className="group-badge">Required</span>
                </div>
                <div className="subjects-grid">
                  {['Mathematics', 'English Language', 'Integrated Science', 'Social Studies'].map((sub, i) => {
                  const key = ['math', 'english', 'science', 'social'][i];
                  const currentGrade = grades[key as keyof typeof grades];
                  return (
                    <motion.div 
                      key={sub} 
                      className="subject-card"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="subject-info">
                        <span className="subject-name">{sub}</span>
                        <span className="subject-grade">
                          {currentGrade > 0 ? `Grade ${currentGrade}` : 'Select grade'}
                        </span>
                      </div>
                      <div className="grade-picker">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <motion.button
                            key={n}
                            className={`grade-btn ${currentGrade === n ? 'active' : ''}`}
                            onClick={() => setGrades({...grades, [key]: n})}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {n}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>

              {/* Elective Subjects */}
              <div className="subject-group premium-card">
                <div className="group-header">
                  <div className="group-icon">
                    <Sparkles size={20} />
                  </div>
                  <h3>Best 2 Electives</h3>
                  <span className="group-badge">Choose 2</span>
                </div>
                <div className="subjects-grid">
                  {['Elective 1', 'Elective 2'].map((sub, i) => {
                  const key = ['el1', 'el2'][i];
                  const currentGrade = grades[key as keyof typeof grades];
                  return (
                    <motion.div 
                      key={sub} 
                      className="subject-card"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="subject-info">
                        <span className="subject-name">{sub}</span>
                        <span className="subject-grade">
                          {currentGrade > 0 ? `Grade ${currentGrade}` : 'Select grade'}
                        </span>
                      </div>
                      <div className="grade-picker">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                          <motion.button
                            key={n}
                            className={`grade-btn ${currentGrade === n ? 'active' : ''}`}
                            onClick={() => setGrades({...grades, [key]: n})}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {n}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>
              
              {/* Aggregate Display */}
              <motion.div 
                className="aggregate-display"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="aggregate-content">
                  <div className="aggregate-label">
                    <span className="label-text">BECE Aggregate</span>
                    <span className="label-sub">Your calculated score</span>
                  </div>
                  <div className="aggregate-value-wrapper">
                    <motion.div 
                      className="aggregate-circle"
                      style={{ borderColor: aggregateStatus.color }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <span className="aggregate-number">{liveAggregate < 10 ? `0${liveAggregate}` : liveAggregate}</span>
                    </motion.div>
                    <div className="aggregate-status" style={{ color: aggregateStatus.color }}>
                      <span className="status-label">{aggregateStatus.label}</span>
                      <span className="status-confidence">{aggregateStatus.confidence}% sure</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Raw Score Input */}
              <motion.div 
                className="raw-score-display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="raw-score-content">
                  <span className="raw-score-label">Your Total Score (0–600)</span>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={rawScore || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (value >= 0 && value <= 600) {
                        setRawScore(value);
                      }
                    }}
                    className="raw-score-input"
                    placeholder="Enter your raw score"
                  />
                </div>
                <span className="raw-score-hint">Add up your scores from all subjects (each out of 100)</span>
              </motion.div>

              <div className="action-buttons">
                <button 
                  onClick={handleNext}
                  disabled={completionPercent < 100}
                  className={`btn-primary ${completionPercent < 100 ? 'disabled' : ''}`}
                >
                  {completionPercent < 100 ? 'Fill in all grades first' : 'Next: Pick Your Schools'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Schools */}
          {step === 2 && !isLoading && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="step-schools"
            >
              <div className="schools-header">
                <h2 className="step-title">Pick your schools</h2>
                <p className="step-subtitle">Choose up to 6 schools in your preferred order. Only 1 Category A school allowed.</p>
              </div>

              {/* Search Section */}
              <div className="search-section">
                <div className="search-wrapper">
                  <Search size={20} className="search-icon" />
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder="Type school name (e.g. Achimota)..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="search-spinner">
                      <div className="spinner-ring"></div>
                    </div>
                  )}
                  {searchTerm && (
                    <button 
                      className="search-clear"
                      onClick={() => {
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {searchTerm.length >= 2 && searchResults.length > 0 && (
                    <motion.div 
                      className="search-results"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {searchResults.map((school) => {
                        const isSelected = selectedSchools.find(s => s.id === school.id);
                        return (
                          <motion.div 
                            key={school.id}
                            className={`search-result-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              toggleSchool(school);
                              setSearchTerm('');
                              setSearchResults([]);
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="school-preview">
                              <div className={`category-icon cat-${school.category}`}>
                                {school.category}
                              </div>
                              <div className="school-details">
                                <span className="result-school-name">{school.name}</span>
                                <span className="result-school-region">{school.region} Region</span>
                              </div>
                            </div>
                            {isSelected ? (
                              <div className="selection-indicator selected">
                                <Check size={18} />
                              </div>
                            ) : (
                              <div className="selection-indicator unselected">
                                <div className="plus-icon">+</div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <motion.div 
                    className="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Search size={32} className="no-results-icon" />
                    <span className="no-results-text">No school found</span>
                    <span className="no-results-sub">Try a different name</span>
                  </motion.div>
                )}
              </div>

              {/* Selected Schools */}
              <div className="selected-schools">
                <div className="selected-header">
                  <h3 className="selected-title">
                    Selected Schools 
                    <span className="selected-count">{selectedSchools.length}/6</span>
                  </h3>
                  {selectedSchools.length > 0 && (
                    <button 
                      onClick={() => setSelectedSchools([])}
                      className="clear-all-btn"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="schools-grid">
                  {selectedSchools.map((school) => (
                    <motion.div 
                      key={school.id} 
                      className="school-chip"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <div className={`chip-cat cat-${school.category}`}>{school.category}</div>
                      <span className="chip-name">{school.name}</span>
                      {/* F1: District/region quota toggle — only shown for boarding schools */}
                      {((school as any).type === 'boarding' || school.category === 'A' || school.category === 'B') && (
                        <button
                          className={`chip-region-btn ${regionFlags[school.id] === true ? 'region-yes' : regionFlags[school.id] === false ? 'region-no' : 'region-unset'}`}
                          title="Are you from this school's home region/district? Affects your slot pool size."
                          onClick={() => setRegionFlags(prev => {
                            const cur = prev[school.id];
                            if (cur === undefined) return { ...prev, [school.id]: true };
                            if (cur === true) return { ...prev, [school.id]: false };
                            const next = { ...prev }; delete next[school.id]; return next;
                          })}
                        >
                          {regionFlags[school.id] === true ? '🏠' : regionFlags[school.id] === false ? '🌍' : '📍'}
                        </button>
                      )}
                      <button 
                        className="chip-remove"
                        onClick={() => toggleSchool(school)}
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                  {selectedSchools.length === 0 && (
                    <div className="empty-state">
                      <Target size={32} className="empty-icon" />
                      <span className="empty-text">No schools added yet</span>
                      <span className="empty-sub">Search for a school above</span>
                    </div>
                  )}
                </div>
                {/* F1: Region toggle hint */}
                {selectedSchools.some((s: any) => s.type === 'boarding' || s.category === 'A' || s.category === 'B') && (
                  <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '10px', lineHeight: '1.5' }}>
                    📍 = region unknown &nbsp;·&nbsp; 🏠 = home district (+15% boost) &nbsp;·&nbsp; 🌍 = out-of-region (−10%). Tap the icon on boarding schools to set your region.
                  </p>
                )}
              </div>

              <div className="schools-actions">
                <button 
                  onClick={handleNext}
                  disabled={selectedSchools.length === 0}
                  className={`generate-btn ${selectedSchools.length === 0 ? 'disabled' : ''}`}
                >
                  {selectedSchools.length === 0 ? 'Add at least 1 school first' : 'Check My Chances'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <ModernResults
              aggregate={liveAggregate}
              rawScore={rawScore}
              course={course}
              schoolCount={selectedSchools.length}
              isGenerating={true}
              onComplete={() => setIsLoading(false)}
            />
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <motion.div 
              key="step3"
              id="report-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="step-results"
            >
              {/* Premium Report - Only shown for premium users */}
              {isPremium && (
                <PremiumReport
                  aggregate={liveAggregate}
                  rawScore={rawScore}
                  grades={grades}
                  course={course}
                  results={results}
                  anomalyDetection={(window as any).anomalyDetection || null}
                  hiddenOpportunities={hiddenOpportunities}
                  dataManifest={predDataManifest}
                />
              )}

              {!isPremium && (
                <>
                  {/* Results Header */}
                  <motion.div
                    className="results-page-header"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="results-header-row">
                      <button onClick={() => setStep(2)} className="results-back-btn">
                        <ArrowLeft size={18} />
                        <span>Back</span>
                      </button>
                      <h1 className="results-header-title">Your Results</h1>
                      <button 
                        onClick={() => setShowPremiumModal(true)} 
                        className="results-save-btn"
                      >
                        <Lock size={14} />
                        <FileText size={16} />
                        <span>Save PDF</span>
                      </button>
                    </div>
                    {/* Contextual banner - can be conditionally shown based on placement season */}
                    <div className="results-context-banner">
                      <span className="banner-icon">📢</span>
                      <span className="banner-text">CSSPS placement results expected in October — </span>
                      <Link href="/pricing?product=early_alert" className="banner-link">Get Early Alert →</Link>
                    </div>
                    {/* F5: Data freshness warning banner */}
                    {predDataManifest && (() => {
                      const lastUpdate = new Date(predDataManifest.lastUpdated);
                      const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
                      if (monthsOld > 26) return (
                        <div className="data-stale-banner data-stale-critical">
                          <span>⚠️ <strong>Data may be out of date:</strong> predictions are based on data from {new Date(predDataManifest.lastUpdated).getFullYear()}. Treat results as estimates only. {predDataManifest.nextUpdate && `Update expected ${predDataManifest.nextUpdate}.`}</span>
                        </div>
                      );
                      if (monthsOld > 14) return (
                        <div className="data-stale-banner data-stale-warning">
                          <span>ℹ️ Predictions are based on {new Date(predDataManifest.lastUpdated).getFullYear()} data — directionally reliable but may not reflect the latest BECE cycle.</span>
                        </div>
                      );
                      return null;
                    })()}
                  </motion.div>

                  {/* Results Hero Card */}
                  <motion.div 
                    className="results-hero-card"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className="hero-aggregate">
                      <div className="hero-agg-circle">
                        <span className="hero-agg-number">{liveAggregate < 10 ? `0${liveAggregate}` : liveAggregate}</span>
                        <span className="hero-agg-label">Aggregate</span>
                      </div>
                      <div className="hero-agg-status" style={{ color: aggregateStatus.color }}>
                        <span className="hero-status-label">{aggregateStatus.label}</span>
                        <span className="hero-status-sub">{course} Candidate</span>
                      </div>
                    </div>
                    {/* Stats divider and inline stats */}
                    <div className="hero-stats-divider" />
                    <div className="hero-inline-stats">
                      <div className="inline-stat">
                        <span className="inline-stat-label">Avg. chance across your schools:</span>
                        <span className="inline-stat-value" style={{ color: getProbabilityColor(getAverageProbability()) }}>
                          {getAverageProbability()}%
                        </span>
                      </div>
                      <div className="inline-stat">
                        <span className="inline-stat-label">Confidence level:</span>
                        <span className="inline-stat-value">{getAverageConfidence()}%</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Social Proof Element */}
                  <motion.div
                    className="social-proof-bar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Users size={16} className="social-proof-icon" />
                    <span className="social-proof-text">
                      <strong>{getSocialProofNumber()}</strong> students with an aggregate of {liveAggregate < 10 ? `0${liveAggregate}` : liveAggregate} checked their chances today
                    </span>
                  </motion.div>

                  {/* Prediction Cards */}
                  <div className="results-list">
                    {results.map((res, i) => (
                      <motion.div 
                        key={i}
                        className={`result-card ${getCardStyle(i, res)} ${res.locked ? 'locked' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {/* Card Header */}
                        <div className="result-header">
                          <div className="school-info">
                            <div className="choice-number">
                              {i === 0 ? '1st Choice' : i === 1 ? '2nd Choice' : i === 2 ? '3rd Choice' : `${i + 1}th Choice`}
                            </div>
                            <div className={`tier-badge tier-${res.tier}`}>
                              {res.tier === 'elite_a' ? 'Cat A' :
                               res.tier === 'elite_b' ? 'Cat B' :
                               res.tier === 'elite_c' ? 'Cat C' :
                               res.tier === 'mid_tier' ? 'Cat D' :
                               res.tier === 'low_tier' ? 'Cat E' :
                               `Cat ${res.tier}`}
                            </div>
                            <h3 className="school-name">{res.schoolName}</h3>
                            
                            {/* Badges row */}
                            <div className="badges-row">
                              <span className={`match-badge match-${res.category}`}>
                                {res.category === 'safe' ? '✅ Good Match' :
                                 res.category === 'competitive' ? '⚡ Competitive' :
                                 '🎯 Dream School'}
                              </span>
                              {res.safeBet && (
                                <span className="badge-safe-bet-pill">
                                  <Award size={12} />
                                  Safe Bet — Strong chance of placement
                                </span>
                              )}
                              {res.highRisk && !res.safeBet && (
                                <span className="badge-high-risk-pill">
                                  <AlertTriangle size={12} />
                                  High Risk — Below typical cutoff
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {!res.locked ? (
                            <div className="probability-display">
                              <motion.div
                                className="prob-circle"
                                style={{
                                  background: `conic-gradient(${getProbabilityColor(res.probability)} ${res.probability}%, transparent ${res.probability}%)`
                                }}
                                initial={{ rotate: -90 }}
                                animate={{ rotate: 0 }}
                                transition={{ duration: 1, delay: i * 0.1 + 0.2 }}
                              >
                                <div className="prob-inner">
                                  <span className="prob-number">{res.probability}%</span>
                                </div>
                              </motion.div>
                              <span className="prob-label">Chance</span>
                            </div>
                          ) : (
                            <div className="probability-display locked">
                              <div className="prob-circle locked">
                                <Lock size={24} className="lock-icon" />
                              </div>
                              <span className="prob-label">Locked</span>
                            </div>
                          )}
                        </div>

                        {/* Confidence Score - only for unlocked cards */}
                        {!res.locked && (
                          <div className="confidence-display">
                            <span className="confidence-label">How sure we are</span>
                            <div className="confidence-bar-wrapper">
                              <div className="confidence-bar-track">
                                <motion.div 
                                  className="confidence-bar-fill"
                                  style={{ background: '#F5A623' }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${res.confidence}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 + 0.3, ease: "easeOut" }}
                                />
                              </div>
                              <span className="confidence-value">{res.confidence}% confident</span>
                            </div>
                          </div>
                        )}

                        {/* Locked overlay for locked cards */}
                        {res.locked && (
                          <div className="card-lock-overlay" onClick={() => {
                            const el = document.getElementById('premium-upsell');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            <div className="card-lock-content">
                              <Lock size={20} />
                              <span>Unlock with Premium</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {/* "More Schools" Teaser Card - populated with real engine results */}
                    <motion.div
                      className="more-schools-teaser"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: results.length * 0.1 }}
                      onClick={() => {
                        const el = document.getElementById('premium-upsell');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <div className="teaser-lock-icon">
                        {isSuggesting ? <Loader2 size={22} className="spin" /> : <Lock size={24} />}
                      </div>
                      <div className="teaser-content">
                        <h4 className="teaser-title">
                          {isSuggesting
                            ? 'Finding other schools for you…'
                            : suggestions.length > 0
                              ? `${suggestions.length} More Schools You Could Qualify For`
                              : 'More Schools — Unlock With Premium'}
                        </h4>
                        <p className="teaser-desc">
                          {!isSuggesting && suggestions.length > 0
                            ? suggestions.slice(0, 3).map(s => s.schoolName).join(' · ')
                            : 'See your full ranked list with Premium'}
                        </p>
                      </div>
                      <div className="teaser-arrow">→</div>
                    </motion.div>
                  </div>

                  {/* Premium Upsell Block */}
                  <div id="premium-upsell" className="premium-upsell-block">
                    {/* Part A: Blurred Preview Teaser */}
                    <motion.div
                      className="blur-preview-section"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="blur-preview-header">
                        <Lock size={20} />
                        <span>UNLOCK TO SEE YOUR FULL ANALYSIS</span>
                      </div>
                      
                      <div className="blur-preview-content">
                        {/* Application Strategy - Blurred */}
                        <div className="blur-section">
                          <div className="blur-section-title">Application Strategy</div>
                          <div className="blur-placeholder">
                            <div className="blur-pill-row">
                              <span className="blur-pill safe">▓▓ Safe Bet: {results.filter(r => r.safeBet).length + suggestions.filter(s => s.category === 'safe').length} schools</span>
                              <span className="blur-pill comp">▓▓ Competitive: {results.filter(r => r.category === 'competitive').length + suggestions.filter(s => s.category === 'competitive').length} schools</span>
                            </div>
                            <div className="blur-text-line" />
                            <div className="blur-text-line short" />
                          </div>
                        </div>
                        
                        {/* Full Rankings - Blurred with real school names from engine */}
                        <div className="blur-section">
                          <div className="blur-section-title">Full Rankings ({suggestions.length > 0 ? suggestions.length : '15'}+ qualifying schools)</div>
                          <div className="blur-rankings">
                            {(suggestions.length > 0 ? suggestions.slice(0, 3) : [
                              { schoolId: 'ph1', schoolName: 'Mfantsipim School',     probability: 68 },
                              { schoolId: 'ph2', schoolName: "St. Augustine's College", probability: 55 },
                              { schoolId: 'ph3', schoolName: 'Opoku Ware School',      probability: 47 },
                            ]).map((s, idx) => (
                              <div key={s.schoolId} className="blur-ranking-row">
                                <span className="blur-rank-num">#{results.length + idx + 1}</span>
                                <span className="blur-rank-name">{s.schoolName}</span>
                                <span className="blur-rank-pct">▓▓%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Risk Analysis - Blurred */}
                        <div className="blur-section">
                          <div className="blur-section-title">Risk Analysis</div>
                          <div className="blur-risk-row">
                            <AlertTriangle size={14} />
                            <span className="blur-risk-text">▓▓▓▓▓▓▓▓ ⚠️ High Risk ▓▓▓▓▓▓▓▓</span>
                          </div>
                        </div>
                        
                        {/* Centered lock message overlay */}
                        <div className="blur-center-overlay">
                          <div className="blur-center-content">
                            <Lock size={32} />
                            <span>Unlock to reveal</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Part B: Feature List */}
                    <motion.div
                      className="premium-features-section"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="features-section-title">What's Inside Your Full Report</h3>
                      <p className="features-section-subtitle">Everything you need to walk into placement with confidence</p>
                      
                      <div className="features-grid-two-col">
                        <div className="feature-row">
                          <div className="feature-icon-box gold">
                            <Award size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Safe Bet Schools</span>
                            <span className="feature-desc">Schools where you have 70%+ chance — your backup strategy</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box red">
                            <AlertTriangle size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Risk Analysis</span>
                            <span className="feature-desc">Which schools are too ambitious and why</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box blue">
                            <Target size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Application Strategy</span>
                            <span className="feature-desc">Recommended Safe / Competitive / Dream split</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box purple">
                            <BarChart3 size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Full School Rankings</span>
                            <span className="feature-desc">All 15–25 schools ranked by your probability</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box green">
                            <Zap size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Program Competitiveness</span>
                            <span className="feature-desc">How your chosen course compares at each school</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box orange">
                            <Download size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">PDF Report</span>
                            <span className="feature-desc">Download your personalised report to share</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box teal">
                            <Share2 size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">WhatsApp Share</span>
                            <span className="feature-desc">Send your results to parents instantly</span>
                          </div>
                        </div>
                        
                        <div className="feature-row">
                          <div className="feature-icon-box pink">
                            <BookOpen size={18} />
                          </div>
                          <div className="feature-text">
                            <span className="feature-name">Parent Summary</span>
                            <span className="feature-desc">Plain-language explanation for your family</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Part C: CTA Button */}
                    <motion.div
                      className="premium-cta-section"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.button
                        onClick={() => setShowPremiumModal(true)}
                        className="premium-main-cta"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="cta-text-stack">
                          <span className="cta-line-main">Unlock My Full Report — GHS 30</span>
                          <span className="cta-line-sub">Safe bets · Risk analysis · Strategy · PDF · WhatsApp share</span>
                        </div>
                        <ChevronRight size={24} />
                      </motion.button>
                      
                      <div className="cta-trust-pills">
                        <span className="trust-pill"><CheckCircle2 size={14} /> Instant access</span>
                        <span className="trust-pill"><CheckCircle2 size={14} /> PDF download</span>
                        <span className="trust-pill"><CheckCircle2 size={14} /> Share with parents</span>
                      </div>
                      
                      <p className="cta-payment-note">Paid securely via Mobile Money or card</p>
                      
                      {/* Secondary WhatsApp share link */}
                      <button
                        onClick={() => {
                          const topResult = results[0];
                          const text = `🎯 *My SHS Placement Prediction*%0A%0A📊 Aggregate: ${liveAggregate < 10 ? '0'+liveAggregate : liveAggregate}%0A📚 Course: ${course}%0A%0A${topResult ? `✨ Top Choice: ${topResult.schoolName}%0A📈 ${topResult.probability}% chance` : ''}%0A%0ACheck your placement chances too! 👇%0Ahttps://chanceshs.com`;
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="secondary-whatsapp-link"
                      >
                        or share your free results on WhatsApp →
                      </button>
                    </motion.div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="results-bottom-actions">
                    <motion.button
                      onClick={() => setStep(1)}
                      className="recalculate-btn"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <TrendingUp size={18} />
                      <span>Start over with new grades</span>
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="premium-modal-backdrop" onClick={() => setShowPremiumModal(false)}>
            <motion.div 
              className="premium-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="premium-modal-header">
                <div className="premium-icon-wrapper">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="premium-modal-title">Unlock Full Report</h3>
                  <p className="premium-modal-subtitle">See everything about your chances — for just GHS 20</p>
                </div>
                <button 
                  className="modal-close-btn"
                  onClick={() => setShowPremiumModal(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="premium-features">
                <div className="premium-feature">
                  <div className="feature-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="feature-content">
                    <span className="feature-title">Past Cut-off Scores</span>
                    <span className="feature-desc">See real cut-offs from the last 5 years</span>
                  </div>
                </div>
                <div className="premium-feature">
                  <div className="feature-icon">
                    <Target size={20} />
                  </div>
                  <div className="feature-content">
                    <span className="feature-title">Tips for Each School</span>
                    <span className="feature-desc">Know what to do to improve your shot</span>
                  </div>
                </div>
                <div className="premium-feature">
                  <div className="feature-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="feature-content">
                    <span className="feature-title">Download as PDF</span>
                    <span className="feature-desc">Save and share your results</span>
                  </div>
                </div>
              </div>

              <div className="premium-pricing">
                <div className="price-tag">
                  <span className="price-currency">GHS</span>
                  <span className="price-amount">20.00</span>
                  <span className="price-period">pay once</span>
                </div>
                <div className="price-value">
                  <span className="value-label">Great Value</span>
                  <span className="value-desc">Cheaper than one school form</span>
                </div>
              </div>

              {isPremium ? (
                <div className="premium-unlocked">
                  <div className="unlocked-icon">
                    <Check size={24} />
                  </div>
                  <span className="unlocked-text">Premium features unlocked!</span>
                </div>
              ) : (
                <div className="premium-form">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email"
                      placeholder="you@example.com"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleLegacyPayment}
                    className="premium-cta"
                  >
                    <span className="cta-text">Unlock Premium</span>
                    <span className="cta-price">GHS 20.00</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

              <div className="premium-trust">
                <div className="trust-seal">
                  <Lock size={16} />
                  <span>Secure Payment</span>
                </div>
                <div className="trust-seal">
                  <ShieldCheck size={16} />
                  <span>Instant Access</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <PaymentModal />

      {/* Email Login Modal (C3 fix - cross-device auth) */}
      <AnimatePresence>
        {showEmailLogin && (
          <motion.div 
            className="premium-modal-backdrop" 
            style={{ zIndex: 90 }}
            onClick={() => setShowEmailLogin(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="premium-modal"
              style={{ maxWidth: '480px' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="modal-close-btn"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
                onClick={() => setShowEmailLogin(false)}
              >
                <X size={20} />
              </button>
              <EmailLogin 
                onSuccess={() => setShowEmailLogin(false)}
                redirectText="Enter your email to unlock your full report and access it on any device"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bundle Early Alert bottom sheet */}
      <AnimatePresence>
        {showBundleAlert && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              {bundleAlertDone ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>You&apos;re all set!</h3>
                  <p style={{ margin: '0 0 20px', fontSize: '0.9375rem', color: '#64748B' }}>
                    Premium report unlocked ✓ &nbsp;·&nbsp; Alert registered ✓
                  </p>
                  <button onClick={() => setShowBundleAlert(false)} style={{ background: '#0F172A', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 28px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9375rem' }}>
                    View My Report
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 900, color: '#0F172A' }}>One more thing — 🔔 Set up your Alert</h3>
                    <button onClick={() => setShowBundleAlert(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: '4px' }}>
                      <X size={20} />
                    </button>
                  </div>
                  <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748B' }}>
                    Your Bundle includes an Early Alert. Tell us where to send your notification when placements drop.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input type="text" value={bName} onChange={e => setBName(e.target.value)} placeholder="e.g. Kwame Mensah" style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                      <input type="tel" value={bPhone} onChange={e => setBPhone(e.target.value)} placeholder="0241234567" style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1.5px solid #E2E8F0' }}>
                      <input type="checkbox" id="bwa-same" checked={bWaSame} onChange={e => setBWaSame(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: '#667eea' }} />
                      <label htmlFor="bwa-same" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>WhatsApp same as phone</label>
                    </div>
                    {!bWaSame && (
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>WhatsApp Number</label>
                        <input type="tel" value={bWa} onChange={e => setBWa(e.target.value)} placeholder="0551234567" style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>Email <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></label>
                      <input type="email" value={bEmail} onChange={e => setBEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    {bError && (
                      <div style={{ background: '#FFF1F2', border: '1.5px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px', fontSize: '0.875rem', color: '#DC2626', fontWeight: 600 }}>
                        {bError}
                      </div>
                    )}

                    <button
                      disabled={bLoading}
                      onClick={async () => {
                        setBError('');
                        if (!bName.trim() || !bPhone.trim()) { setBError('Name and phone are required'); return; }
                        setBLoading(true);
                        try {
                          const schools = selectedSchools.map((s: any) => s.name || s.id || String(s));
                          const res = await fetch('/api/alerts/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, name: bName, phone: bPhone, whatsapp: bWaSame ? bPhone : bWa, email: bEmail, schools, paymentRef: bundleRef }),
                          });
                          const data = await res.json();
                          if (!data.success) throw new Error(data.error || 'Failed');
                          setBundleAlertDone(true);
                        } catch (e: any) {
                          setBError(e.message || 'Something went wrong');
                        } finally {
                          setBLoading(false);
                        }
                      }}
                      style={{ background: bLoading ? '#E2E8F0' : 'linear-gradient(135deg,#10B981,#059669)', color: bLoading ? '#94A3B8' : 'white', border: 'none', borderRadius: '14px', padding: '15px', fontWeight: 800, fontSize: '0.9375rem', cursor: bLoading ? 'not-allowed' : 'pointer', width: '100%' }}
                    >
                      {bLoading ? 'Registering…' : '🔔 Register My Alert'}
                    </button>
                    <button onClick={() => setShowBundleAlert(false)} style={{ background: 'none', border: 'none', fontSize: '0.875rem', color: '#94A3B8', cursor: 'pointer', textDecoration: 'underline' }}>
                      Skip for now
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
