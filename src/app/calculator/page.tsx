'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, Lock, ShieldCheck, Share2, TrendingUp, Target, Clock, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import './CalculatorFlow.css';

export default function CalculatorFlow() {
  const { grades, setGrades, selectedSchools, setSelectedSchools, course, setCourse, isPremium, setPremium } = useCalculatorStore();
  const [step, setStep] = useState(1);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [initializePayment, setInitializePayment] = useState<any>(null);

  const liveAggregate = Object.values(grades).reduce((acc, curr) => acc + parseInt(curr as any), 0);

  // Dynamically import Paystack
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-paystack').then(({ usePaystackPayment }) => {
        const config = {
          reference: (new Date()).getTime().toString(),
          email: email || 'user@chanceshs.com',
          amount: 2000, // GHS 20.00 in kobo/pesewas
          publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
          currency: 'GHS'
        };
        setInitializePayment(() => usePaystackPayment(config));
      });
    }
  }, [email]);

  const handlePayment = () => {
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
    } else {
      if (selectedSchools.length >= 6) return;
      setSelectedSchools([...selectedSchools, school]);
    }
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
    if (step === 2) {
      if (selectedSchools.length === 0) return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggregate: liveAggregate,
            schools: selectedSchools,
            course: course
          })
        });
        const data = await res.json();
        setResults(data.results);
        setStep(3);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => setStep(step - 1);

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
              <h2 className="step-title">Enter your expected grades</h2>
              <p className="step-subtitle">We'll use this to calculate your aggregate accurately.</p>

              <div className="subject-group">
                <h3><TrendingUp size={16} /> Course Selection</h3>
                <div className="input-row">
                  <label className="flex items-center gap-2">
                    <Target size={18} className="text-amber-500" /> Intended Course
                  </label>
                  <select 
                    value={course} 
                    onChange={(e) => setCourse(e.target.value)}
                  >
                    {['General Science', 'General Arts', 'Business', 'Agriculture', 'Visual Arts'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="subject-group">
                <h3><ShieldCheck size={16} /> Core Subjects</h3>
                {['Mathematics', 'English Language', 'Integrated Science', 'Social Studies'].map((sub, i) => {
                  const key = ['math', 'english', 'science', 'social'][i];
                  return (
                    <div className="input-row" key={sub}>
                      <label>{sub}</label>
                      <select 
                        value={grades[key as keyof typeof grades]} 
                        onChange={(e) => setGrades({...grades, [key]: parseInt(e.target.value)})}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="subject-group">
                <h3><Sparkles size={16} /> Best 2 Electives</h3>
                {['Elective 1', 'Elective 2'].map((sub, i) => {
                  const key = ['el1', 'el2'][i];
                  return (
                    <div className="input-row" key={sub}>
                      <label>{sub}</label>
                      <select 
                        value={grades[key as keyof typeof grades]} 
                        onChange={(e) => setGrades({...grades, [key]: parseInt(e.target.value)})}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-col gap-6">
                <button 
                  onClick={handleNext}
                  className="btn-primary w-full shadow-2xl shadow-amber-200/50"
                >
                  Next: Choose Schools
                </button>
                
                <div className="flex justify-center">
                  <motion.div 
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl flex items-center gap-6 shadow-xl"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Your Score</span>
                      <span className="text-xs font-bold opacity-80">BECE Aggregate</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <strong className="text-4xl font-black text-amber-400">{liveAggregate < 10 ? `0${liveAggregate}` : liveAggregate}</strong>
                  </motion.div>
                </div>
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
              className="step-schools max-w-2xl mx-auto"
            >
              <h2 className="step-title text-center">Select your schools</h2>
              <p className="step-subtitle text-center">Choose up to 6 schools to calculate your placement shot.</p>

              <div className="search-container relative mb-12">
                <div className="search-input-wrapper">
                  <Search size={24} className="search-icon" />
                  <input 
                    type="text" 
                    className="search-bar"
                    placeholder="Search school name (e.g. Achimota)..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent" />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {searchTerm.length >= 2 && (
                    <motion.div 
                      className="search-results-list"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      {searchResults.length > 0 ? (
                        searchResults.map((school) => (
                          <div 
                            key={school.id} 
                            className="search-result-item"
                            onClick={() => {
                              toggleSchool(school);
                              setSearchTerm('');
                              setSearchResults([]);
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm cat-${school.category}`}>
                                {school.category}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{school.name}</div>
                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{school.region} Region</div>
                              </div>
                            </div>
                            {selectedSchools.find(s => s.id === school.id) ? (
                              <div className="bg-amber-500 text-white p-1 rounded-full"><Target size={14} /></div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-slate-100 rounded-full" />
                            )}
                          </div>
                        ))
                      ) : !isSearching && (
                        <div className="p-8 text-center text-slate-400">No schools found</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="selected-schools-section">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Selected Schools ({selectedSchools.length}/6)
                  </h3>
                  {selectedSchools.length > 0 && (
                    <button 
                      onClick={() => setSelectedSchools([])}
                      className="text-xs font-bold text-amber-500 hover:text-amber-600"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="selected-schools-chips">
                  {selectedSchools.map((school) => (
                    <motion.div 
                      key={school.id} 
                      className="selected-school-chip"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <span>{school.name}</span>
                      <button onClick={() => toggleSchool(school)}><X size={14} /></button>
                    </motion.div>
                  ))}
                  {selectedSchools.length === 0 && (
                    <p className="text-slate-400 font-medium text-sm py-4">No schools selected yet. Start typing above.</p>
                  )}
                </div>
              </div>

              <div className="mt-12">
                <button 
                  onClick={handleNext}
                  disabled={selectedSchools.length === 0}
                  className={`btn-primary w-full ${selectedSchools.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'shadow-2xl shadow-amber-200/50'}`}
                >
                  Generate Predictions
                </button>
              </div>
            </motion.div>
          )}

          {isLoading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="loading-overlay"
            >
              <div className="shimmer-card">
                <h3>Generating Predictions...</h3>
                <p>Analyzing historical cut-off trends for 2023/24</p>
                <div className="shimmer-bar"></div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <motion.div 
              key="step3"
              id="report-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="step-results bg-white p-8 rounded-[40px] shadow-2xl"
            >
              <div className="results-hero text-center mb-8 border-b pb-8">
                <div className="agg-circle mb-4">
                  <span className="agg-label">Aggregate</span>
                  <span className="agg-value">{liveAggregate < 10 ? `0${liveAggregate}` : liveAggregate}</span>
                </div>
                <h2 className="step-title">Placement Analysis</h2>
                <p className="step-subtitle">For {course} Candidate</p>
                {isPremium && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1 rounded-full text-xs font-bold uppercase">
                    <Sparkles size={12} /> Premium Report Unlocked
                  </div>
                )}
              </div>

              <div className="prediction-list space-y-6">
                {results.map((res, i) => (
                  <motion.div 
                    key={i}
                    className="school-card border-none bg-slate-50 shadow-none p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-xl text-slate-900">{res.schoolName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded cat-${res.category}`}>CAT {res.category}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.matchType} Match</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{res.probability}%</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-30">Probability</div>
                      </div>
                    </div>

                    <div className="prob-bar-bg mb-6">
                      <motion.div 
                        className={`prob-bar-fill match-${res.matchType}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${res.probability}%` }}
                      />
                    </div>

                    {isPremium ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="premium-insight-box border-t pt-4 mt-4 grid grid-cols-2 gap-4 text-left"
                      >
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Historical Cut-off</span>
                          <p className="text-sm font-bold text-slate-700">{res.cutoffRange}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Placement Trend</span>
                          <p className="text-sm font-bold text-slate-700">{res.trend}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Recommendation</span>
                          <p className="text-xs font-medium text-slate-600 italic leading-relaxed">"{res.recommendation}"</p>
                        </div>
                      </motion.div>
                    ) : (
                      res.locked && (
                        <div 
                          className="bg-slate-900/5 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between cursor-pointer"
                          onClick={() => setShowPremiumModal(true)}
                        >
                          <div className="flex items-center gap-3">
                            <Lock size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 italic">Advanced analysis locked...</span>
                          </div>
                          <button className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 underline">
                            Unlock Now
                          </button>
                        </div>
                      )
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 space-y-4">
                <button 
                  onClick={() => {
                    const text = `🎯 *ChanceSHS Placement Prediction*%0A%0AI just checked my SHS placement chances!%0A%0A📊 *Aggregate:* ${liveAggregate < 10 ? '0'+liveAggregate : liveAggregate}%0A📚 *Course:* ${course}%0A%0A✅ *Results:*%0A${results.slice(0,3).map(r => `• ${r.schoolName}: ${r.locked && !isPremium ? '🔒 Locked' : r.probability + '% (' + r.matchType + ')'}`).join('%0A')}%0A%0ACheck yours now: https://chanceshs.com`;
                    if (typeof window !== 'undefined') {
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }
                  }}
                  className="whatsapp-btn"
                >
                  <Share2 size={20} /> Share Result on WhatsApp
                </button>

                {isPremium ? (
                  <button 
                    onClick={downloadPDF}
                    className="btn-primary flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800"
                  >
                    <ShieldCheck size={20} /> Download PDF Report
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowPremiumModal(true)}
                    className="btn-primary"
                  >
                    <ShieldCheck size={20} className="inline-block mr-2" /> Unlock Full Report
                  </button>
                )}
                
                <button 
                  onClick={() => setStep(1)}
                  className="w-full py-4 text-gray-400 font-bold hover:text-gray-600"
                >
                  Recalculate
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="modal-backdrop" onClick={() => setShowPremiumModal(false)}>
            <motion.div 
              className="bottom-sheet"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Unlock Premium Analysis</h3>
              <p className="text-gray-500 mb-6">Get access to historical cut-offs, choice recommendations, and an official PDF report.</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-3">
                  <div className="text-amber-500"><TrendingUp size={20}/></div>
                  <p className="text-sm">5-Year Historical Cut-off data</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-amber-500"><Target size={20}/></div>
                  <p className="text-sm">Alternative choice recommendations</p>
                </div>
              </div>

              {isPremium ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-2xl font-bold text-center mb-6">
                  ✨ Premium Unlocked
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Email Address</label>
                    <input 
                      type="email"
                      placeholder="Enter email for receipt"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-amber-500 transition-all font-bold"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handlePayment}
                    className="btn-primary mt-0 w-full"
                  >
                    Unlock for GHS 20.00
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="w-full mt-4 text-gray-400 font-bold"
              >
                {isPremium ? 'Close' : 'Maybe later'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
