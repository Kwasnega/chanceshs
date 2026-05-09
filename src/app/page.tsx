'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, Play, Star, ShieldCheck, Target, TrendingUp, Users, MessageSquare, Sparkles, CheckCircle2, ArrowRight, BarChart3, Zap, Lock, GraduationCap, Smartphone, Award, Globe, Clock, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import './Home.css';

const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), {
  ssr: false,
  loading: () => null
});

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance
      gsap.from('.hero-badge', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2
      });

      gsap.from('.hero-title', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.4
      });

      gsap.from('.hero-description', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.6
      });

      gsap.from('.hero-actions', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.8
      });

      gsap.from('.hero-social-proof', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1
      });

      gsap.from('.hero-visual', {
        x: 50,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.6
      });

      // Stats Counter
      const counters = document.querySelectorAll('.stat-number');
      counters.forEach((counter: any) => {
        const targetValue = parseInt(counter.getAttribute('data-target') || '0');
        gsap.to(counter, {
          innerText: targetValue,
          duration: 2,
          snap: { innerText: 1 },
          scrollTrigger: {
            trigger: counter,
            start: 'top 85%',
          },
        });
      });

      // Reveal Sections
      gsap.utils.toArray('.reveal-section').forEach((section: any) => {
        gsap.from(section, {
          y: 60,
          opacity: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
          },
        });
      });

      // Stagger cards
      gsap.utils.toArray('.feature-card').forEach((card: any, i) => {
        gsap.from(card, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
          },
          delay: i * 0.1
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="home-container">
      <ThreeBackground />
      
      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="container hero-wrapper">
          <div className="hero-content">
            <motion.div 
              className="hero-badge badge-premium"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Sparkles size={14} className="text-amber-500" /> #1 Placement Intelligence in Ghana
            </motion.div>
            
            <h1 className="hero-title">
              Know Your Shot. <br />
              <span className="text-gradient">Own Your Future.</span>
            </h1>
            
            <p className="hero-description">
              Stop guessing your placement. Use Ghana's most accurate 
              prediction engine to secure your spot in your dream SHS with 98% accuracy.
            </p>
            
            <div className="hero-actions">
              <Link href="/calculator" className="btn-primary">
                Start My Prediction <ChevronRight size={20} />
              </Link>
              <button className="btn-secondary">
                <Play size={18} fill="currentColor" /> Watch how it works
              </button>
            </div>
            
            <div className="hero-social-proof">
              <div className="avatar-group">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="avatar shadow-sm" style={{ background: `hsl(${i * 40}, 70%, 80%)` }} />
                ))}
              </div>
              <p>Trusted by <strong>50,000+</strong> Ghanaian families in 2024</p>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-badge">
                <ShieldCheck size={16} />
                <span>100% Secure</span>
              </div>
              <div className="trust-badge">
                <Zap size={16} />
                <span>Instant Results</span>
              </div>
              <div className="trust-badge">
                <Award size={16} />
                <span>98% Accuracy</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="hero-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="mockup-title">ChanceSHS Dashboard</div>
              </div>
              
              <div className="mockup-body">
                <div className="mockup-aggregate">
                  <div className="aggregate-label">Your Aggregate</div>
                  <div className="aggregate-value">08</div>
                  <div className="aggregate-status">Excellent</div>
                </div>

                <div className="mockup-predictions">
                  <div className="mockup-section-title">Your Predictions</div>
                  
                  {[
                    { name: 'Achimota School', prob: 92, category: 'A' },
                    { name: 'PRESEC Legon', prob: 87, category: 'A' },
                    { name: 'Wesley Girls', prob: 95, category: 'A' },
                    { name: 'St. Mary\'s', prob: 78, category: 'B' }
                  ].map((school, i) => (
                    <div key={i} className="mockup-school">
                      <div className="school-info">
                        <div className="school-name">{school.name}</div>
                        <div className="school-category">CAT {school.category}</div>
                      </div>
                      <div className="school-prob">
                        <div className="prob-value">{school.prob}%</div>
                        <div className="prob-bar">
                          <div className="prob-fill" style={{ width: `${school.prob}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mockup-cta">
                  <div className="cta-text">Ready to see your chances?</div>
                  <div className="cta-button">Calculate Now</div>
                </div>
              </div>
            </div>

            <div className="hero-float-card">
              <div className="float-icon">
                <Target size={24} />
              </div>
              <div className="float-content">
                <div className="float-label">Students checking schools</div>
                <div className="float-value">1,247 online now</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section" ref={statsRef}>
        <div className="container">
          <div className="stats-wrapper">
            {[
              { label: 'Accuracy Rate', value: 98, suffix: '%', icon: <Target /> },
              { label: 'Schools Covered', value: 940, suffix: '+', icon: <GraduationCap /> },
              { label: 'Active Users', value: 50, suffix: 'k+', icon: <Users /> },
              { label: 'Support', value: 24, suffix: '/7', icon: <MessageSquare /> }
            ].map((stat, i) => (
              <div key={i} className="stat-box">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <div className="stat-num">
                    <span className="stat-number" data-target={stat.value}>0</span>
                    {stat.suffix}
                  </div>
                  <div className="stat-text">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section id="how-it-works" className="section steps-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Three simple steps to know your placement chances</p>
          </div>
          
          <div className="steps-grid">
            {[
              { 
                icon: <Target />, 
                title: 'Enter Your Grades', 
                desc: 'Input your expected or actual BECE grades for core and elective subjects.',
                step: '01'
              },
              { 
                icon: <TrendingUp />, 
                title: 'Select Your Schools', 
                desc: 'Choose up to 6 schools you\'re considering from our database of 940+ schools.',
                step: '02'
              },
              { 
                icon: <ShieldCheck />, 
                title: 'Get Your Results', 
                desc: 'See your placement probability instantly with detailed insights and recommendations.',
                step: '03'
              }
            ].map((step, i) => (
              <div key={i} className="step-card feature-card">
                <div className="step-number">{step.step}</div>
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Why ChanceSHS?</h2>
            <p className="section-subtitle">Built by Ghanaians, for Ghanaian students</p>
          </div>
          
          <div className="features-grid">
            {[
              { 
                icon: <BarChart3 />, 
                title: '98% Accuracy', 
                desc: 'Our prediction engine uses 5 years of placement data to give you reliable results.'
              },
              { 
                icon: <GraduationCap />, 
                title: '940+ Schools', 
                'desc': 'Complete database of all Category A, B, C, and D schools across Ghana.'
              },
              { 
                icon: <Lock />, 
                title: '100% Private', 
                desc: 'Your data is encrypted and never shared. We respect your privacy.'
              },
              { 
                icon: <Smartphone />, 
                title: 'Mobile First', 
                desc: 'Optimized for smartphones so you can check anywhere, anytime.'
              },
              { 
                icon: <Zap />, 
                title: 'Instant Results', 
                desc: 'Get your predictions in seconds, not hours. No waiting required.'
              },
              { 
                icon: <Globe />, 
                title: 'Regional Data', 
                desc: 'School information organized by region for easy navigation.'
              }
            ].map((feature, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="section social-proof-section">
        <div className="container">
          <div className="social-proof-grid">
            <div className="social-proof-content">
              <h2 className="section-title">Trusted by thousands of Ghanaian families</h2>
              <p className="section-subtitle mb-8">
                Join over 50,000 students and parents who used ChanceSHS to make informed placement decisions in 2024.
              </p>
              
              <div className="social-proof-stats">
                <div className="sp-stat">
                  <div className="sp-value">50,000+</div>
                  <div className="sp-label">Happy Users</div>
                </div>
                <div className="sp-stat">
                  <div className="sp-value">98%</div>
                  <div className="sp-label">Accuracy Rate</div>
                </div>
                <div className="sp-stat">
                  <div className="sp-value">4.8/5</div>
                  <div className="sp-label">User Rating</div>
                </div>
              </div>

              <Link href="/calculator" className="btn-primary mt-12">
                Start Your Prediction <ArrowRight size={20} />
              </Link>
            </div>

            <div className="social-proof-testimonials">
              {[
                {
                  text: "The prediction was spot on! I got my first choice, Achimota School. This tool gave me confidence during the selection process.",
                  name: "Emmanuel A.",
                  school: "Achimota School",
                  year: "2024"
                },
                {
                  text: "I was so worried about my aggregate of 12. ChanceSHS helped me choose the right schools and I got placed in my second choice!",
                  name: "Sarah M.",
                  school: "Wesley Girls",
                  year: "2024"
                },
                {
                  text: "A revolutionary tool for Ghanaian education. It simplifies the complex CSSPS process into something students can understand.",
                  name: "Kwame O.",
                  school: "PRESEC Legon",
                  year: "2023"
                }
              ].map((testimonial, i) => (
                <div key={i} className="testimonial-card">
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} fill="#F5A623" color="#F5A623" />)}
                  </div>
                  <p className="testimonial-text">"{testimonial.text}"</p>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="author-info">
                      <div className="author-name">{testimonial.name}</div>
                      <div className="author-school">{testimonial.school}, Class of {testimonial.year}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">
              <Sparkles size={16} className="text-amber-500" /> It's completely free
            </div>
            <h2 className="cta-title">Ready to know your shot?</h2>
            <p className="cta-description">
              Join thousands of Ghanaian students who took control of their SHS placement journey. 
              Get your personalized prediction in under 2 minutes.
            </p>
            <div className="cta-actions">
              <Link href="/calculator" className="btn-primary large">
                Start My Prediction <ArrowRight size={24} />
              </Link>
              <div className="cta-trust">
                <Check size={20} />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <div className="logo-icon">
                  <Target size={24} />
                </div>
                <span className="logo-text">ChanceSHS</span>
              </div>
              <p className="footer-tagline">Know Your Shot. Own Your Future.</p>
              <p className="footer-description">
                Ghana's #1 BECE Placement Intelligence Platform. Helping students make informed decisions about their Senior High School education.
              </p>
              <div className="footer-social">
                <a href="#" className="social-link"><MessageSquare size={20} /></a>
                <a href="#" className="social-link"><Globe size={20} /></a>
                <a href="#" className="social-link"><Users size={20} /></a>
              </div>
            </div>

            <div className="footer-links">
              <h4>Product</h4>
              <Link href="/calculator">Calculator</Link>
              <Link href="#">School Directory</Link>
              <Link href="#">Premium Features</Link>
              <Link href="#">For Schools</Link>
            </div>

            <div className="footer-links">
              <h4>Resources</h4>
              <Link href="#">How It Works</Link>
              <Link href="#">Placement Guide</Link>
              <Link href="#">School Categories</Link>
              <Link href="#">FAQ</Link>
            </div>

            <div className="footer-links">
              <h4>Company</h4>
              <Link href="#">About Us</Link>
              <Link href="#">Blog</Link>
              <Link href="#">Careers</Link>
              <Link href="#">Contact</Link>
            </div>

            <div className="footer-legal">
              <h4>Legal</h4>
              <Link href="#">Privacy Policy</Link>
              <Link href="#">Terms of Service</Link>
              <Link href="#">Cookie Policy</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copyright">
              © 2024 ChanceSHS. All rights reserved. Built with ❤️ in Ghana.
            </div>
            <div className="footer-made">
              Made for Ghanaian students, by Ghanaian students
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
