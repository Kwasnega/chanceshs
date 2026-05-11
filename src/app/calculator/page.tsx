'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, Lock, ShieldCheck, Share2, TrendingUp, Target, Clock, X, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import PremiumReport from '@/components/PremiumReport';
import ModernResults from '@/components/ModernResults';
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
  const [step, setStep] = useState(1);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results,              setResults]              = useState<any[]>([]);
  const [hiddenOpportunities,   setHiddenOpportunities]   = useState<any[]>([]);
  const [predDataManifest,      setPredDataManifest]      = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [initializePayment, setInitializePayment] = useState<any>(null);
  const [rawScore, setRawScore] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

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
  
  // Check for user ID from localStorage on mount
  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('chanceshs_user_id');
      if (storedUserId) {
        setUserId(storedUserId);
        checkPremiumAccess(storedUserId);
      } else {
        // Generate new user ID
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setUserId(newUserId);
        try {
          localStorage.setItem('chanceshs_user_id', newUserId);
        } catch (e) {
          console.warn('localStorage not available, using session state only');
        }
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setUserId(newUserId);
    }

    // Bundle post-purchase prompt
    const params = new URLSearchParams(window.location.search);
    if (params.get('bundle') === 'true') {
      setBundleRef(params.get('ref') || '');
      setTimeout(() => setShowBundleAlert(true), 1200);
    }
  }, []);

  // Check premium access
  const checkPremiumAccess = async (uid: string) => {
    try {
      const response = await fetch(`/api/entitlements/check?userId=${uid}&featureType=premium_report`);
      if (!response.ok) {
        // API route may not exist yet — silently default to no access
        setHasPremiumAccess(false);
        return;
      }
      const data = await response.json();
      setHasPremiumAccess(data.hasAccess);
      if (data.hasAccess) {
        setPremium(true);
      }
    } catch (error) {
      console.error('Error checking premium access:', error);
      setHasPremiumAccess(false);
    }
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

    // Admin/Test Mode Bypass
    if (email.toLowerCase() === 'admin@test.com') {
      setPremium(true);
      setShowPremiumModal(false);
      alert('Test Mode: Premium features unlocked!');
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
      return;
    }
    if (selectedSchools.length >= 6) {
      alert('You can only pick up to 6 schools.');
      return;
    }
    // First choice must be a Category A school
    if (selectedSchools.length === 0 && school.category !== 'A') {
      alert('Your 1st choice must be a Category A school. In Ghana, only Category A schools can be your first choice.');
      return;
    }
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
            course: course
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
    if (!userId) return;
    
    setSelectedProduct('premium_report');
    setShowPaymentModal(true);
  };

  const handlePayment = async (productId: string) => {
    if (!userId || !email) {
      alert('Please enter your email to proceed with payment');
      return;
    }

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          email,
          userId,
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
                <p className="step-subtitle">Choose up to 6 schools. Your 1st choice must be a Category A school.</p>
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
                  {/* Results Hero */}
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
                  </motion.div>

                  {/* Prediction Cards */}
                  <div className="results-list">
                {results.map((res, i) => (
                  <motion.div 
                    key={i}
                    className={`result-card ${isPremium ? 'premium' : 'free'}${!isPremium && res.locked ? ' fully-locked' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    {!isPremium && res.locked && (
                      <div className="full-lock-overlay" onClick={() => setShowPremiumModal(true)}>
                        <div className="lock-overlay-inner">
                          <Lock size={28} className="lock-overlay-icon" />
                          <span className="lock-overlay-school">{res.schoolName}</span>
                          <span className="lock-overlay-sub">Unlock to see all {results.length} school predictions</span>
                          <button className="lock-overlay-btn">🔓 Unlock Premium — GHS 20</button>
                        </div>
                      </div>
                    )}
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
                        <span className={`match-badge match-${res.category}`}>
                          {res.category === 'safe' ? '✅ Good Match' :
                           res.category === 'competitive' ? '⚡ Competitive' :
                           '🎯 Dream School'}
                        </span>
                        {res.safeBet && <span className="badge-safe-bet">🏆 Safe Bet</span>}
                        {res.highRisk && !res.safeBet && <span className="badge-high-risk">⚠️ High Risk</span>}
                      </div>
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
                    </div>

                    {/* Confidence Score */}
                    <div className="confidence-display">
                      <span className="confidence-label">How sure we are</span>
                      <div className="confidence-bar-wrapper">
                        <motion.div 
                          className="confidence-bar"
                          style={{ 
                            background: `linear-gradient(90deg, #8B5CF6, #6366F1)` 
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${res.confidence}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 + 0.3, ease: "easeOut" }}
                        />
                        <span className="confidence-value">{res.confidence}%</span>
                      </div>
                    </div>


                    {/* Premium Insights */}
                    {isPremium ? (
                      <motion.div 
                        className="premium-insights"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: i * 0.1 + 0.5 }}
                      >
                        <div className="insight-grid">
                          <div className="insight-item">
                            <TrendingUp size={16} className="insight-icon" />
                            <div>
                              <span className="insight-label">Course Fit</span>
                              <span className="insight-value">{res.programCompatibility}%</span>
                            </div>
                          </div>
                          <div className="insight-item">
                            <Target size={16} className="insight-icon" />
                            <div>
                              <span className="insight-label">School Level</span>
                              <span className="insight-value">
                                {res.tier === 'elite_a' ? 'Cat A' :
                                 res.tier === 'elite_b' ? 'Cat B' :
                                 res.tier === 'elite_c' ? 'Cat C' :
                                 res.tier === 'mid_tier' ? 'Cat D' : 'Cat E'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="reasoning-box">
                          <ShieldCheck size={16} className="rec-icon" />
                          <p className="reasoning-text">{res.reasoning}</p>
                        </div>
                      </motion.div>
                    ) : (
                      res.locked && (
                        <motion.div 
                          className="premium-lock-section"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          {/* Blurred Preview */}
                          <div className="locked-preview">
                            <div className="preview-blur">
                              <div className="insight-grid">
                                <div className="insight-item">
                                  <TrendingUp size={16} className="insight-icon" />
                                  <div>
                                    <span className="insight-label">Course Fit</span>
                                    <span className="insight-value-blur">85%</span>
                                  </div>
                                </div>
                                <div className="insight-item">
                                  <Target size={16} className="insight-icon" />
                                  <div>
                                    <span className="insight-label">School Level</span>
                                    <span className="insight-value-blur">Cat A</span>
                                  </div>
                                </div>
                              </div>
                              <div className="reasoning-box">
                                <ShieldCheck size={16} className="rec-icon" />
                                <p className="recommendation-text-blur">Strong candidate with...</p>
                              </div>
                            </div>
                            <div className="lock-overlay">
                              <div className="lock-badge">
                                <Lock size={20} />
                                <span>Premium</span>
                              </div>
                            </div>
                          </div>

                          {/* Teaser Content */}
                          <div className="premium-teaser">
                            <div className="teaser-header">
                              <Sparkles size={16} className="teaser-icon" />
                              <span className="teaser-title">See your full report</span>
                            </div>
                            <div className="teaser-features">
                              <div className="teaser-feature">
                                <Check size={14} className="teaser-check" />
                                <span>Cut-off scores from past 5 years</span>
                              </div>
                              <div className="teaser-feature">
                                <Check size={14} className="teaser-check" />
                                <span>Tips to improve your chances</span>
                              </div>
                              <div className="teaser-feature">
                                <Check size={14} className="teaser-check" />
                                <span>Download your report as PDF</span>
                              </div>
                            </div>
                            <motion.button
                              onClick={() => setShowPremiumModal(true)}
                              className="unlock-cta"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <span className="cta-main">Unlock Full Report</span>
                              <span className="cta-sub">GHS 20 – pay once</span>
                              <ChevronRight size={18} />
                            </motion.button>
                          </div>
                        </motion.div>
                      )
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Results Actions */}
              <div className="results-actions">
                <motion.button
                  onClick={() => {
                    const topResult = results[0];
                    const text = `🎯 *My SHS Placement Prediction*%0A%0A📊 Aggregate: ${liveAggregate < 10 ? '0'+liveAggregate : liveAggregate}%0A📚 Course: ${course}%0A%0A${topResult ? `✨ Top Choice: ${topResult.schoolName}%n📈 ${topResult.probability}% chance (${topResult.matchType} match)%0A%0A` : ''}Check your placement chances too! 👇%0Ahttps://chanceshs.com%0A%0A#ChanceSHS #BECE2024 #GhanaEducation`;
                    if (typeof window !== 'undefined') {
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }
                  }}
                  className="share-whatsapp-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Share2 size={20} />
                  <div className="btn-content">
                    <span className="btn-label">Share on WhatsApp</span>
                    <span className="btn-sub">Tell your friends about ChanceSHS</span>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setShowPremiumModal(true)}
                  className="unlock-premium-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles size={20} />
                  <div className="btn-content">
                    <span className="btn-label">Unlock Full Report</span>
                    <span className="btn-sub">See past cut-offs & tips — GHS 20</span>
                  </div>
                </motion.button>
                
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
