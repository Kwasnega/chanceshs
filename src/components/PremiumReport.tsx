'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, ShieldCheck, Target, BookOpen, 
  GraduationCap, Award, AlertTriangle, CheckCircle2,
  ArrowRight, Lightbulb, BarChart3, Gauge,
  Calendar, MapPin, Users, Star, Zap, Brain,
  FileText, Download, Share2, Loader2, Check
} from 'lucide-react';
import './PremiumReport.css';

interface PremiumReportProps {
  aggregate: number;
  rawScore: number;
  grades: any;
  course: string;
  results: any[];
  anomalyDetection: any;
  hiddenOpportunities?: any[];  // from findHiddenOpportunities()
  dataManifest?: {
    version: string;
    lastUpdated: string;
    nextUpdate: string;
    sourceNote: string;
  };
}

const EDGE_ICONS: Record<string, string> = {
  subject_mismatch: '🧠',
  trend_window:     '📈',
  demand_gap:       '💎',
};

const EDGE_LABELS: Record<string, string> = {
  subject_mismatch: 'Subject Edge',
  trend_window:     'Trend Window',
  demand_gap:       'Hidden Gem',
};

export default function PremiumReport({
  aggregate,
  rawScore,
  grades,
  course,
  results,
  anomalyDetection,
  hiddenOpportunities,
  dataManifest,
}: PremiumReportProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startDownload = () => {
    setNameInput(studentName);
    setShowNamePrompt(true);
  };

  const confirmDownload = async () => {
    const name = nameInput.trim();
    setStudentName(name);
    setShowNamePrompt(false);
    const element = document.getElementById('premium-report');
    if (!element) return;
    setIsDownloading(true);
    const actionsEl = document.getElementById('report-footer-actions');
    if (actionsEl) actionsEl.style.visibility = 'hidden';
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowWidth: 900,
        scrollY: -window.scrollY
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let yPos = 0;
      let remainingHeight = imgHeight;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'JPEG', 0, -yPos, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
        yPos += pageHeight;
        if (remainingHeight > 0) pdf.addPage();
      }
      const safeName = name ? name.replace(/\s+/g, '_').toUpperCase() : 'STUDENT';
      pdf.save(`CHANCESHS_${safeName}_AGG${aggregate}.pdf`);
    } catch (err) {
      console.error('PDF Error:', err);
    } finally {
      if (actionsEl) actionsEl.style.visibility = '';
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const element = document.getElementById('premium-report');
    if (!element) return;
    setIsSharing(true);
    const actionsEl = document.getElementById('report-footer-actions');
    if (actionsEl) actionsEl.style.visibility = 'hidden';
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowWidth: 900,
        scrollY: -window.scrollY
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `ChanceSHS_Report_Agg${aggregate}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My ChanceSHS Report',
            text: `My SHS placement report — Aggregate: ${aggregate}, Average chance: ${averageProbability.toFixed(0)}%`,
            files: [file]
          });
        } else {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = `ChanceSHS_Report_Agg${aggregate}.png`;
          a.click();
        }
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }, 'image/png');
    } catch (err) {
      console.error('Share Error:', err);
    } finally {
      if (actionsEl) actionsEl.style.visibility = '';
      setIsSharing(false);
    }
  };

  const safeSchools = results.filter(r => r.category === 'safe');
  const competitiveSchools = results.filter(r => r.category === 'competitive');
  const dreamSchools = results.filter(r => r.category === 'dream');

  const averageProbability = results.reduce((sum, r) => sum + r.probability, 0) / results.length;
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  const topSchool = results[0];
  const backupSchools = results.slice(1, 4);

  // Dynamic confidence metrics
  const gradeValues = Object.values(grades).filter((g): g is number => typeof g === 'number' && g > 0);
  const dataCompleteness = Math.round((gradeValues.length / Object.keys(grades).length) * 100);
  const gradeAvg = gradeValues.reduce((s, g) => s + g, 0) / Math.max(1, gradeValues.length);
  const gradeVariance = gradeValues.reduce((s, g) => s + (g - gradeAvg) ** 2, 0) / Math.max(1, gradeValues.length);
  const subjectBalance = Math.round(Math.max(0, Math.min(100, 100 - (gradeVariance / 16) * 100)));
  const avgCourseFit = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.programCompatibility, 0) / results.length)
    : 0;
  const confidenceLabel = (pct: number) =>
    pct >= 85 ? 'Excellent' : pct >= 70 ? 'Strong' : pct >= 55 ? 'Good' : 'Fair';

  const safeBetSchools  = results.filter(r => r.probability >= 70);
  const highRiskSchools = results.filter(r => r.probability < 30);
  const rankedResults   = [...results].sort((a, b) => b.probability - a.probability);
  const compSchools     = results.filter(r => r.probability >= 30 && r.probability < 70);

  const strategyRationale = (() => {
    const s = safeBetSchools.length, r = highRiskSchools.length, n = results.length;
    if (s === 0 && r > 0)
      return `All your schools are competitive or high-risk. Add at least 1–2 Cat D/E schools where you have a strong chance to secure a placement.`;
    if (s >= 2 && r === 0)
      return `Your list is well-balanced with ${s} safe bets. You have a solid safety net. Consider keeping 1 dream school for ambition.`;
    if (s >= 1 && r >= 1)
      return `You have a healthy mix: ${s} safe, ${n - s - r} competitive, and ${r} high-risk school${r > 1 ? 's' : ''}. Make sure your last choice is a school you are confident about.`;
    return `Your school list looks reasonable. Aim to have at least 1 school above 70% as your safety choice.`;
  })();

  const strategyRecommendation =
    `We recommend: ${safeBetSchools.length > 0 ? `${safeBetSchools.length} Safe Bet school${safeBetSchools.length > 1 ? 's' : ''}` : '1–2 easier schools to add'}, ${compSchools.length} Competitive school${compSchools.length !== 1 ? 's' : ''}${highRiskSchools.length > 0 ? `, ${highRiskSchools.length} Dream/High-Risk school${highRiskSchools.length > 1 ? 's' : ''}` : ''}.`;

  const whatsAppMsg = encodeURIComponent(
    `Hi! I just checked my BECE school chances on ChanceSHS 🎓\n\n📊 Aggregate: ${aggregate < 10 ? `0${aggregate}` : aggregate}\n🏆 Top Choice: ${topSchool?.schoolName || 'N/A'} (${topSchool?.probability || 0}% chance)\n📈 Average Chance: ${averageProbability.toFixed(0)}%${safeBetSchools.length > 0 ? `\n✅ Safe Schools: ${safeBetSchools.slice(0, 2).map(s => s.schoolName).join(', ')}` : ''}\n\nCheck your chances at: https://chanceshs.com`
  );

  return (
    <>
      {/* Name Prompt Modal - outside report div so it won't appear in PDF */}
      {showNamePrompt && (
        <div className="name-prompt-overlay" onClick={() => setShowNamePrompt(false)}>
          <div className="name-prompt-modal" onClick={e => e.stopPropagation()}>
            <h3 className="name-prompt-title">What's your name?</h3>
            <p className="name-prompt-sub">Your name will appear on the downloaded PDF</p>
            <input
              className="name-prompt-input"
              type="text"
              placeholder="e.g. Kwame Mensah"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmDownload()}
              autoFocus
            />
            <div className="name-prompt-actions">
              <button className="name-prompt-skip" onClick={confirmDownload}>Skip</button>
              <button className="name-prompt-confirm" onClick={confirmDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="premium-report" id="premium-report">
      <div className="report-header">
        <div className="header-content">
          <div className="report-branding">
            <GraduationCap size={32} className="brand-icon" />
            <div>
              <h1 className="report-title">ChanceSHS Full Report</h1>
              <p className="report-subtitle">{studentName ? `${studentName}'s SHS Placement Results` : 'Your SHS Placement Results'}</p>
            </div>
          </div>
          <div className="report-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="meta-item">
              <FileText size={16} />
              <span>Report ID: {Date.now().toString().slice(-8)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="report-section executive-summary">
        <div className="section-header">
          <div className="section-icon">
            <Target size={24} />
          </div>
          <div>
            <h2 className="section-title">Your Summary</h2>
            <p className="section-subtitle">Here is everything about your chances at a glance</p>
          </div>
        </div>

        <div className="summary-grid">
          {/* Aggregate Card */}
          <div className="summary-card primary">
            <div className="card-header">
              <Award size={20} className="card-icon" />
              <span className="card-label">Your Aggregate</span>
            </div>
            <div className="card-value">{aggregate < 10 ? `0${aggregate}` : aggregate}</div>
            <div className="card-trend">
              <TrendingUp size={14} />
              <span>Raw Score: {rawScore}/600</span>
            </div>
          </div>

          {/* Probability Card */}
          <div className="summary-card success">
            <div className="card-header">
              <Gauge size={20} className="card-icon" />
              <span className="card-label">Average Chance</span>
            </div>
            <div className="card-value">{averageProbability.toFixed(1)}%</div>
            <div className="card-trend">
              <CheckCircle2 size={14} />
              <span>Across all your schools</span>
            </div>
          </div>

          {/* Confidence Card */}
          <div className="summary-card info">
            <div className="card-header">
              <Brain size={20} className="card-icon" />
              <span className="card-label">How Sure We Are</span>
            </div>
            <div className="card-value">{averageConfidence.toFixed(1)}%</div>
            <div className="card-trend">
              <ShieldCheck size={14} />
              <span>Overall prediction quality</span>
            </div>
          </div>

          {/* Schools Card */}
          <div className="summary-card warning">
            <div className="card-header">
              <Users size={20} className="card-icon" />
              <span className="card-label">Schools Checked</span>
            </div>
            <div className="card-value">{results.length}</div>
            <div className="card-trend">
              <Star size={14} />
              <span>{safeSchools.length} good match{safeSchools.length !== 1 ? 'es' : ''}</span>
            </div>
          </div>
        </div>

        {/* Anomaly Warning */}
        {anomalyDetection?.hasAnomaly && (
          <div className="anomaly-alert">
            <AlertTriangle size={20} className="alert-icon" />
            <div className="alert-content">
              <h4 className="alert-title">⚠️ Please Double-Check Your Scores</h4>
              <p className="alert-message">Some of your scores don't quite add up. Your results might not be 100% accurate. Check below:</p>
              <ul className="alert-list">
                {anomalyDetection.anomalies.map((anomaly: string, i: number) => (
                  <li key={i}>{anomaly}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Full Probability Rankings */}
      <div className="report-section prob-rankings">
        <div className="section-header">
          <div className="section-icon"><BarChart3 size={24} /></div>
          <div>
            <h2 className="section-title">Full Rankings</h2>
            <p className="section-subtitle">All your schools ranked by placement chance</p>
          </div>
        </div>
        <div className="rankings-list">
          {rankedResults.map((school, rank) => (
            <div key={rank} className="ranking-item">
              <div className="ranking-num">#{rank + 1}</div>
              <div className="ranking-info">
                <span className="ranking-name">{school.schoolName}</span>
                <div className="ranking-badges">
                  <span className={`tier-badge tier-${school.tier}`}>
                    {school.tier === 'elite_a' ? 'Cat A' : school.tier === 'elite_b' ? 'Cat B' :
                     school.tier === 'elite_c' ? 'Cat C' : school.tier === 'mid_tier' ? 'Cat D' : 'Cat E'}
                  </span>
                  {school.safeBet    && <span className="badge-safe-bet">🏆 Safe</span>}
                  {school.highRisk   && <span className="badge-high-risk">⚠️ Risk</span>}
                </div>
              </div>
              <div className="ranking-prob">
                <div className="ranking-bar">
                  <div className="ranking-fill" style={{ width: `${school.probability}%`, background: school.probability >= 70 ? '#22C55E' : school.probability >= 40 ? '#F59E0B' : '#EF4444' }}></div>
                </div>
                <span className="ranking-pct">{school.probability}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Strategy */}
      <div className="report-section application-strategy">
        <div className="section-header">
          <div className="section-icon"><Target size={24} /></div>
          <div>
            <h2 className="section-title">Application Strategy</h2>
            <p className="section-subtitle">How to spread your choices for the best outcome</p>
          </div>
        </div>
        <div className="strategy-dist-pills">
          <div className="dist-pill dist-safe">
            <span className="dist-num">{safeBetSchools.length}</span>
            <span className="dist-lab">Safe Bet{safeBetSchools.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="dist-pill dist-comp">
            <span className="dist-num">{compSchools.length}</span>
            <span className="dist-lab">Competitive</span>
          </div>
          <div className="dist-pill dist-risk">
            <span className="dist-num">{highRiskSchools.length}</span>
            <span className="dist-lab">High Risk</span>
          </div>
        </div>
        <p className="strategy-text">{strategyRationale}</p>
        <div className="strategy-rec">
          <strong>Our Recommendation: </strong>{strategyRecommendation}
        </div>
      </div>

      {/* Safe Bet Schools */}
      {safeBetSchools.length > 0 && (
        <div className="report-section safe-bets-section">
          <div className="section-header">
            <div className="section-icon safe-icon"><CheckCircle2 size={24} /></div>
            <div>
              <h2 className="section-title">Safe Bet Schools</h2>
              <p className="section-subtitle">Schools where your chances are strong (≥70% placement probability)</p>
            </div>
          </div>
          <div className="safe-list">
            {safeBetSchools.map((school, i) => (
              <div key={i} className="safe-bet-item">
                <div className="safe-bet-left">
                  <CheckCircle2 size={18} className="safe-icon-sm" />
                  <div>
                    <span className="safe-school-name">{school.schoolName}</span>
                    <span className={`tier-badge tier-${school.tier}`} style={{ marginLeft: 6 }}>
                      {school.tier === 'elite_a' ? 'Cat A' : school.tier === 'elite_b' ? 'Cat B' :
                       school.tier === 'elite_c' ? 'Cat C' : school.tier === 'mid_tier' ? 'Cat D' : 'Cat E'}
                    </span>
                  </div>
                </div>
                <div className="safe-bet-prob">{school.probability}% chance</div>
              </div>
            ))}
          </div>
          <p className="safe-note">✔️ Use at least one of these as your 2nd or 3rd choice to secure a placement.</p>
        </div>
      )}

      {/* Risk Analysis */}
      {highRiskSchools.length > 0 && (
        <div className="report-section risk-section">
          <div className="section-header">
            <div className="section-icon risk-icon"><AlertTriangle size={24} /></div>
            <div>
              <h2 className="section-title">Risk Analysis</h2>
              <p className="section-subtitle">Schools where placement is uncertain (below 30%)</p>
            </div>
          </div>
          <div className="risk-list">
            {highRiskSchools.map((school, i) => (
              <div key={i} className="risk-item">
                <div className="risk-header-row">
                  <span className="risk-school-name">{school.schoolName}</span>
                  <span className="risk-prob-badge">{school.probability}%</span>
                </div>
                <p className="risk-note">
                  Your aggregate of {aggregate} is above the typical cutoff for this school. Roughly {school.probability < 10 ? '1 in 10' : school.probability < 20 ? '1 in 5' : '1 in 3'} students with your profile get placed here.{school.tier === 'elite_a' ? ' This is one of Ghana’s most selective schools.' : school.tier === 'elite_b' ? ' This is a very competitive school.' : ' Consider adding an easier school as backup.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Analysis */}
      <div className="report-section confidence-analysis">
        <div className="section-header">
          <div className="section-icon">
            <Gauge size={24} />
          </div>
          <div>
            <h2 className="section-title">How Sure Are We?</h2>
            <p className="section-subtitle">This shows how reliable our predictions are for you</p>
          </div>
        </div>

        <div className="confidence-grid">
          <div className="confidence-visual">
            <div className="confidence-gauge">
              <div className="gauge-track">
                <motion.div 
                  className="gauge-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${averageConfidence}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </div>
              <div className="gauge-value">{averageConfidence.toFixed(0)}%</div>
              <div className="gauge-label">Overall Certainty</div>
            </div>
          </div>

          <div className="confidence-breakdown">
            <div className="confidence-item">
              <div className="confidence-header">
                <span className="confidence-name">Your Data</span>
                <span className="confidence-score">{dataCompleteness === 100 ? 'Complete' : `${gradeValues.length}/6`}</span>
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${dataCompleteness}%` }}></div>
              </div>
              <p className="confidence-desc">{dataCompleteness === 100 ? 'You filled in all your grades' : 'Some grades were not provided'}</p>
            </div>

            <div className="confidence-item">
              <div className="confidence-header">
                <span className="confidence-name">Past Data Match</span>
                <span className="confidence-score">{confidenceLabel(Math.round(averageConfidence))}</span>
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${Math.round(averageConfidence)}%` }}></div>
              </div>
              <p className="confidence-desc">Based on {results.length} school{results.length !== 1 ? 's' : ''} with historical cutoff data</p>
            </div>

            <div className="confidence-item">
              <div className="confidence-header">
                <span className="confidence-name">Subject Balance</span>
                <span className="confidence-score">{confidenceLabel(subjectBalance)}</span>
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${subjectBalance}%` }}></div>
              </div>
              <p className="confidence-desc">{subjectBalance >= 70 ? 'Your grades are fairly even across subjects' : 'Your grades vary significantly — some subjects much stronger than others'}</p>
            </div>

            <div className="confidence-item">
              <div className="confidence-header">
                <span className="confidence-name">Course Fit</span>
                <span className="confidence-score">{confidenceLabel(avgCourseFit)}</span>
              </div>
              <div className="confidence-bar">
                <div className="confidence-fill" style={{ width: `${avgCourseFit}%` }}></div>
              </div>
              <p className="confidence-desc">Your grades suit the {course} program{avgCourseFit >= 70 ? ' well' : ' — consider strengthening relevant subjects'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* School Strategy Breakdown */}
      <div className="report-section school-strategy">
        <div className="section-header">
          <div className="section-icon">
            <MapPin size={24} />
          </div>
          <div>
            <h2 className="section-title">Your School Choices</h2>
            <p className="section-subtitle">Here is how each of your choices looks</p>
          </div>
        </div>

        <div className="strategy-grid">
          {/* First Choice */}
          <div className="strategy-card primary">
            <div className="strategy-header">
              <div className="strategy-badge">1st Choice</div>
              <Star size={20} className="strategy-icon" />
            </div>
            <h3 className="strategy-school">{topSchool?.schoolName || 'N/A'}</h3>
            <div className="strategy-stats">
              <div className="stat-item">
                <span className="stat-label">Chance</span>
                <span className="stat-value">{topSchool?.probability || 0}%</span>
                {topSchool?.probabilityRange && (
                  <span className="stat-range">{Math.round(topSchool.probabilityRange.lower)}–{Math.round(topSchool.probabilityRange.upper)}%</span>
                )}
              </div>
              <div className="stat-item">
                <span className="stat-label">Certainty</span>
                <span className="stat-value">{topSchool?.confidence || 0}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Level</span>
                <span className="stat-value">
                  {topSchool?.tier === 'elite_a' ? 'Cat A' :
                   topSchool?.tier === 'elite_b' ? 'Cat B' :
                   topSchool?.tier === 'elite_c' ? 'Cat C' :
                   topSchool?.tier === 'mid_tier' ? 'Cat D' :
                   topSchool?.tier === 'low_tier' ? 'Cat E' : 'N/A'}
                </span>
              </div>
            </div>
            <div className="strategy-reasoning">
              <Lightbulb size={16} className="reasoning-icon" />
              <p>{topSchool?.reasoning || 'No data available'}</p>
            </div>
          </div>

          {/* Backup Schools */}
          <div className="strategy-card secondary">
            <div className="strategy-header">
              <div className="strategy-badge">Your Other Choices</div>
              <ShieldCheck size={20} className="strategy-icon" />
            </div>
            <div className="backup-list">
              {backupSchools.slice(0, 4).map((school, i) => (
                <div key={i} className="backup-item">
                  <div className="backup-choice-num">{i + 2}</div>
                  <div className="backup-info">
                    <span className="backup-name">{school.schoolName}</span>
                    <span className="backup-tier">
                      {school.tier === 'elite_a' ? 'Cat A' :
                       school.tier === 'elite_b' ? 'Cat B' :
                       school.tier === 'elite_c' ? 'Cat C' :
                       school.tier === 'mid_tier' ? 'Cat D' :
                       school.tier === 'low_tier' ? 'Cat E' : school.tier}
                    </span>
                  </div>
                  <div className="backup-prob">{school.probability}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Recommendations */}
        <div className="strategy-recommendations">
          <h4 className="recommendations-title">Quick Tips</h4>
          <div className="recommendation-list">
            <div className="recommendation-item">
              <CheckCircle2 size={16} className="rec-icon" />
              <div>
                <span className="rec-title">1st Choice</span>
                <p className="rec-desc">{topSchool?.schoolName || 'Your top school'} is your 1st choice — that's correct since it's a Cat A school</p>
              </div>
            </div>
            <div className="recommendation-item">
              <CheckCircle2 size={16} className="rec-icon" />
              <div>
                <span className="rec-title">Have Backup Schools</span>
                <p className="rec-desc">Make sure you have 2-3 Cat C or D schools in your list — these give you a safety net</p>
              </div>
            </div>
            <div className="recommendation-item">
              <CheckCircle2 size={16} className="rec-icon" />
              <div>
                <span className="rec-title">Course Match</span>
                <p className="rec-desc">Your {course} program is a good fit for the schools you picked</p>
              </div>
            </div>
            {averageProbability < 60 && (
              <div className="recommendation-item warning">
                <AlertTriangle size={16} className="rec-icon" />
                <div>
                  <span className="rec-title">Add Easier Schools</span>
                  <p className="rec-desc">Your chances are a bit low overall — try adding some Cat D or E schools to be safe</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed School Analysis */}
      <div className="report-section school-analysis">
        <div className="section-header">
          <div className="section-icon">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="section-title">School Breakdown</h2>
            <p className="section-subtitle">A closer look at each school you picked</p>
          </div>
        </div>

        <div className="school-list">
          {results.map((school, index) => (
            <div key={index} className="school-detail-card">
              <div className="school-detail-header">
                <div className="school-detail-info">
                  <div className={`tier-badge tier-${school.tier}`}>
                    {school.tier === 'elite_a' ? 'Cat A' :
                     school.tier === 'elite_b' ? 'Cat B' :
                     school.tier === 'elite_c' ? 'Cat C' :
                     school.tier === 'mid_tier' ? 'Cat D' :
                     school.tier === 'low_tier' ? 'Cat E' : school.tier}
                  </div>
                  <h3 className="school-detail-name">{school.schoolName}</h3>
                  <span className={`category-badge category-${school.category}`}>
                    {school.category.toUpperCase()}
                  </span>
                </div>
                <div className="school-detail-metrics">
                  <div className="metric">
                    <span className="metric-value">{school.probability}%</span>
                    {school.probabilityRange && school.probabilityRange.lower !== school.probabilityRange.upper && (
                      <span className="metric-range">{Math.round(school.probabilityRange.lower)}%–{Math.round(school.probabilityRange.upper)}%</span>
                    )}
                    <span className="metric-label">Chance</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{school.confidence}%</span>
                    <span className="metric-label">Certainty</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{school.programCompatibility}%</span>
                    <span className="metric-label">Course Fit</span>
                  </div>
                </div>
              </div>

              <div className="school-detail-body">
                <div className="program-comp-insight">
                  <Brain size={14} className="comp-icon" />
                  <p>{course} at <strong>{school.schoolName}</strong> — {school.programCompatibility >= 80 ? 'your grades are a strong match for this programme' : school.programCompatibility >= 60 ? 'your grades are reasonably aligned with this programme' : 'this programme is highly competitive — consistent high grades are usually required'}. <em>Course Fit: {school.programCompatibility}%</em></p>
                </div>
                <div className="detail-section">
                  <h4 className="detail-title">What Affected Your Score</h4>
                  <div className="factor-grid">
                    <div className="factor-item">
                      <span className="factor-label">Your Aggregate</span>
                      <div className="factor-bar">
                        <div className="factor-fill" style={{ width: `${school.factors.aggregateScore || 0}%` }}></div>
                      </div>
                      <span className="factor-value">{school.factors.aggregateScore?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="factor-item">
                      <span className="factor-label">Total Score Boost</span>
                      <div className="factor-bar">
                        <div className={`factor-fill ${(school.factors.rawScoreAdjustment || 0) > 0 ? 'positive' : 'negative'}`} 
                             style={{ width: `${Math.abs(school.factors.rawScoreAdjustment || 0) * 10}%` }}></div>
                      </div>
                      <span className={`factor-value ${(school.factors.rawScoreAdjustment || 0) > 0 ? 'positive' : 'negative'}`}>
                        {(school.factors.rawScoreAdjustment || 0) > 0 ? '+' : ''}{(school.factors.rawScoreAdjustment || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="factor-item">
                      <span className="factor-label">Subject Grades</span>
                      <div className="factor-bar">
                        <div className={`factor-fill ${(school.factors.subjectStrengthAdjustment || 0) > 0 ? 'positive' : 'negative'}`} 
                             style={{ width: `${Math.abs(school.factors.subjectStrengthAdjustment || 0) * 10}%` }}></div>
                      </div>
                      <span className={`factor-value ${(school.factors.subjectStrengthAdjustment || 0) > 0 ? 'positive' : 'negative'}`}>
                        {(school.factors.subjectStrengthAdjustment || 0) > 0 ? '+' : ''}{(school.factors.subjectStrengthAdjustment || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="factor-item">
                      <span className="factor-label">Course Competition</span>
                      <div className="factor-bar">
                        <div className={`factor-fill ${(school.factors.programCompetitivenessAdjustment || 0) > 0 ? 'positive' : 'negative'}`} 
                             style={{ width: `${Math.abs(school.factors.programCompetitivenessAdjustment || 0) * 10}%` }}></div>
                      </div>
                      <span className={`factor-value ${(school.factors.programCompetitivenessAdjustment || 0) > 0 ? 'positive' : 'negative'}`}>
                        {(school.factors.programCompetitivenessAdjustment || 0) > 0 ? '+' : ''}{(school.factors.programCompetitivenessAdjustment || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-title">Why We Say This</h4>
                  <p className="reasoning-text">{school.reasoning}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Action Plan */}
      <div className="report-section action-plan">
        <div className="section-header">
          <div className="section-icon">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="section-title">What To Do Next</h2>
            <p className="section-subtitle">Follow these steps after getting your BECE results</p>
          </div>
        </div>

        <div className="action-timeline">
          <div className="timeline-item">
            <div className="timeline-marker">
              <div className="marker-number">1</div>
            </div>
            <div className="timeline-content">
              <h4 className="timeline-title">Check your school list</h4>
              <p className="timeline-desc">Look at the schools you picked and make sure you are happy with them. Your 1st choice must be a Cat A school. Add a Cat D or E school as your last choice — just to be safe.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-marker">
              <div className="marker-number">2</div>
            </div>
            <div className="timeline-content">
              <h4 className="timeline-title">Enter your choices on the CSSPS website</h4>
              <p className="timeline-desc">Go to the official <a href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="cssps-link">CSSPS portal (cssps.gov.gh)</a> and enter your school choices in order. Make sure the order is correct — you cannot change it after submitting.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-marker">
              <div className="marker-number">3</div>
            </div>
            <div className="timeline-content">
              <h4 className="timeline-title">Wait for your placement</h4>
              <p className="timeline-desc">After submitting, wait for the Ministry of Education to release placements. You can check the <a href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="cssps-link">CSSPS website</a> or ask your school. This usually happens a few weeks after BECE results come out.</p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-marker">
              <div className="marker-number">4</div>
            </div>
            <div className="timeline-content">
              <h4 className="timeline-title">Get your documents ready</h4>
              <p className="timeline-desc">Once you are placed, gather these: your BECE result slip, birth certificate, 2 passport-size photos, and any other document your school asks for. Report on time!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parent-Friendly Summary */}
      <div className="report-section parent-summary">
        <div className="section-header">
          <div className="section-icon">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="section-title">For Parents</h2>
            <p className="section-subtitle">A simple overview of your child's results</p>
          </div>
        </div>

        <div className="parent-grid">
          <div className="parent-card">
            <div className="parent-icon success">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="parent-title">Your Child's Grades</h3>
            <p className="parent-desc">Your child has an aggregate of {aggregate} and a total score of {rawScore}/600. This shows how they performed across all their subjects.</p>
          </div>

          <div className="parent-card">
            <div className="parent-icon info">
              <Target size={32} />
            </div>
            <h3 className="parent-title">School Chances</h3>
            <p className="parent-desc">On average, your child has a {averageProbability.toFixed(0)}% chance of getting into their chosen schools. {averageProbability >= 60 ? 'This is looking good!' : 'Consider adding some easier schools to the list.'}</p>
          </div>

          <div className="parent-card">
            <div className="parent-icon warning">
              <Lightbulb size={32} />
            </div>
            <h3 className="parent-title">What To Focus On</h3>
            <p className="parent-desc">Pick schools where your child has at least 50% chance as their 1st and 2nd choices. Add easier schools as backup. Make sure the schools offer {course}.</p>
          </div>

          <div className="parent-card">
            <div className="parent-icon primary">
              <GraduationCap size={32} />
            </div>
            <h3 className="parent-title">What To Do</h3>
            <p className="parent-desc">Sit with your child and go through the school choices together. Then submit on the <a href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="cssps-link">CSSPS website</a> before the deadline. Check back for placement results.</p>
          </div>
        </div>

        <div className="parent-cta">
          <div className="cta-content">
            <h4 className="cta-title">Need Help?</h4>
            <p className="cta-desc">Chat with us on WhatsApp. We reply fast and will help you understand your results.</p>
          </div>
          <button className="cta-button">
            <span>Chat on WhatsApp</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Contingency Planning */}
      <div className="report-section">
        <div className="contingency-plan">
          <h4 className="contingency-title">If Things Don't Go As Planned</h4>
          <div className="contingency-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <span className="step-title">Keep checking CSSPS</span>
                <p className="step-desc">Check the <a href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="cssps-link">CSSPS website</a> often so you don't miss any deadlines or updates</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <span className="step-title">Know your backup schools</span>
                <p className="step-desc">Think of 2-3 other schools you would still be okay with, in case your first choices don't work out</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <span className="step-title">Know about private schools</span>
                <p className="step-desc">If you are not placed in a government school, find out about private SHS options in your area as a last resort</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Opportunities Section */}
      {hiddenOpportunities && hiddenOpportunities.length > 0 && (
        <div className="report-section hidden-opps-section">
          <div className="section-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg,#7C3AED,#A855F7)' }}>
              <Brain size={20} />
            </div>
            <div>
              <h3 className="section-title">Hidden Opportunities</h3>
              <p className="section-subtitle">Schools where your profile gives you an edge most students miss</p>
            </div>
          </div>
          <div className="hidden-opps-list">
            {hiddenOpportunities.map((opp: any, i: number) => (
              <div key={opp.schoolId} className="hidden-opp-card">
                <div className="opp-rank">#{i + 1}</div>
                <div className="opp-body">
                  <div className="opp-header">
                    <span className="opp-icon">{EDGE_ICONS[opp.edgeType] ?? '✨'}</span>
                    <span className="opp-label">{EDGE_LABELS[opp.edgeType] ?? 'Opportunity'}</span>
                    <span className="opp-school">{opp.schoolName}</span>
                    <span className="opp-score">{Math.round(opp.hiddenScore)}/100</span>
                  </div>
                  <p className="opp-explanation">{opp.edgeExplanation}</p>
                  <div className="opp-stats">
                    <span className="opp-stat">
                      <strong>{Math.round(opp.probability)}%</strong> probability
                    </span>
                    <span className="opp-stat">
                      <strong>{Math.round(opp.confidence)}%</strong> confidence
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Footer */}
      <div className="report-footer">
        <div className="footer-content">
          <div className="footer-branding">
            <GraduationCap size={24} />
            <div>
              <span className="footer-title">ChanceSHS Full Report</span>
              <span className="footer-sub">Your SHS Placement Results</span>
            </div>
          </div>
          <div className="footer-actions" id="report-footer-actions">
            <button className="footer-action" onClick={startDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button className="footer-action" onClick={handleShare} disabled={isSharing}>
              {isSharing ? <Loader2 size={18} className="spin" /> : shareSuccess ? <Check size={18} /> : <Share2 size={18} />}
              <span>{isSharing ? 'Preparing...' : shareSuccess ? 'Shared!' : 'Share Report'}</span>
            </button>
            <a href={`https://wa.me/?text=${whatsAppMsg}`} target="_blank" rel="noopener noreferrer" className="footer-action whatsapp-action">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <span>Share on WhatsApp</span>
            </a>
          </div>
        </div>
        <div className="footer-legal">
          <p>This report is based on past BECE placement data and is meant to guide you — not to guarantee anything. Your actual placement is decided by <a href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="cssps-link">CSSPS</a> and the Ministry of Education.</p>
          {dataManifest && (
            <p className="data-provenance-note">
              📊 <strong>Data:</strong> {dataManifest.sourceNote} &nbsp;·&nbsp;
              <strong>Version {dataManifest.version}</strong>, last updated {new Date(dataManifest.lastUpdated).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.
              Next update expected after {new Date(dataManifest.nextUpdate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} BECE results.
            </p>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
