'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, TrendingUp, Target, Zap, Brain, 
  Sparkles, CheckCircle2, ArrowRight, BarChart3,
  PieChart, Gauge, Award, Star, Clock
} from 'lucide-react';
import './ModernResults.css';

interface ModernResultsProps {
  aggregate: number;
  rawScore: number;
  course: string;
  schoolCount: number;
  isGenerating: boolean;
  onComplete?: () => void;
}

export default function ModernResults({
  aggregate,
  rawScore,
  course,
  schoolCount,
  isGenerating,
  onComplete
}: ModernResultsProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Brain, label: 'Analyzing Academic Profile', duration: 1500 },
    { icon: BarChart3, label: 'Processing Historical Data', duration: 1500 },
    { icon: Target, label: 'Evaluating School Match', duration: 1500 },
    { icon: Sparkles, label: 'Generating Intelligence', duration: 1500 },
    { icon: CheckCircle2, label: 'Finalizing Predictions', duration: 1500 }
  ];

  useEffect(() => {
    if (!isGenerating) return;

    let currentProgress = 0;
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const increment = 100 / (totalDuration / 100);

    const interval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 500);
      }
      setProgress(currentProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating, onComplete]);

  useEffect(() => {
    if (!isGenerating) return;

    const stepDuration = 1500;
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isGenerating]);

  return (
    <div className="modern-results">
      {/* Background Elements */}
      <div className="bg-gradient"></div>
      <div className="bg-particles">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{ 
              x: Math.random() * 100, 
              y: Math.random() * 100,
              opacity: 0
            }}
            animate={{ 
              opacity: [0, 0.6, 0],
              y: [0, -20, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="results-container">
        {/* Header */}
        <motion.div 
          className="results-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-icon">
            <GraduationCap size={48} />
          </div>
          <h1 className="header-title">Analyzing Your Placement Potential</h1>
          <p className="header-subtitle">AI-powered intelligence engine processing your data</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="stat-card">
            <div className="stat-icon primary">
              <Award size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{aggregate < 10 ? `0${aggregate}` : aggregate}</span>
              <span className="stat-label">Aggregate</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <Star size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{rawScore}</span>
              <span className="stat-label">Raw Score</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{schoolCount}</span>
              <span className="stat-label">Schools</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon info">
              <Brain size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{course}</span>
              <span className="stat-label">Program</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Section */}
        <motion.div 
          className="progress-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="progress-header">
            <span className="progress-label">Processing Progress</span>
            <span className="progress-percentage">{Math.round(progress)}%</span>
          </div>
          
          <div className="progress-bar-container">
            <motion.div 
              className="progress-bar"
              style={{ width: `${progress}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="progress-glow"
                animate={{ 
                  x: ['-100%', '100%'],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Steps Timeline */}
        <motion.div 
          className="steps-timeline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <motion.div
                key={index}
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isActive ? 1.05 : 1
                }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
              >
                <div className="step-icon-wrapper">
                  {isCompleted ? (
                    <CheckCircle2 size={24} className="step-icon completed" />
                  ) : (
                    <StepIcon size={24} className="step-icon" />
                  )}
                  {isActive && (
                    <motion.div 
                      className="step-pulse"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="step-label">{step.label}</span>
                {isActive && (
                  <motion.div 
                    className="step-indicator"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Intelligence Features */}
        <motion.div 
          className="intelligence-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="features-grid">
            {[
              { icon: TrendingUp, label: 'Raw Score Analysis', desc: 'Academic strength evaluation' },
              { icon: Gauge, label: 'Confidence Scoring', desc: 'Model reliability metrics' },
              { icon: PieChart, label: 'School Tier Logic', desc: 'Elite to low-tier mapping' },
              { icon: Zap, label: 'Competition Simulation', desc: 'Rank-based modeling' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <feature.icon size={24} className="feature-icon" />
                <span className="feature-label">{feature.label}</span>
                <span className="feature-desc">{feature.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Loading Animation */}
        {isGenerating && (
          <motion.div 
            className="loading-animation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="loading-spinner">
              <motion.div
                className="spinner-ring"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="spinner-ring-inner"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <motion.p 
              className="loading-text"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Generating personalized predictions...
            </motion.p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
