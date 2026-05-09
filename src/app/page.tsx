'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, Play, Star, ShieldCheck, Target, TrendingUp, Users, MessageSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import './Home.css';

const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), {
  ssr: false,
  loading: () => null
});

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance
      gsap.from('.hero-content > *', {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power4.out',
      });

      gsap.from('.hero-visual', {
        scale: 0.8,
        opacity: 0,
        duration: 1.5,
        ease: 'power4.out',
        delay: 0.5,
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
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="home-container">
      <ThreeBackground />
      

      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-wrapper">
          <div className="hero-content">
            <div className="badge-premium">
              <Sparkles size={14} className="text-amber-500" /> #1 Placement Intelligence in Ghana
            </div>
            <h1 className="hero-title">
              Know Your Shot. <br />
              <span className="text-gradient">Own Your Future.</span>
            </h1>
            <p className="hero-description">
              Stop guessing your placement. Use Ghana's most accurate 
              prediction engine to secure your spot in your dream SHS.
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
              <p>Trusted by <strong>50,000+</strong> families in 2024</p>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="prediction-demo-card">
              <div className="demo-header">
                <div className="pulse-dot"></div>
                <span>Live Intelligence</span>
              </div>
              <div className="demo-list">
                {[
                  { name: 'Achimota School', prob: '88%', status: 'Safe' },
                  { name: 'PRESEC Legon', prob: '74%', status: 'Competitive' },
                  { name: 'Wesley Girls', prob: '92%', status: 'Safe' }
                ].map((item, i) => (
                  <div key={i} className="demo-item">
                    <div className="demo-info">
                      <span className="demo-name">{item.name}</span>
                      <span className="demo-tag">Category A</span>
                    </div>
                    <div className={`demo-prob ${item.status.toLowerCase()}`}>
                      {item.prob}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-strip" ref={statsRef}>
        <div className="container stats-wrapper">
          {[
            { label: 'Accuracy Rate', value: 98, suffix: '%' },
            { label: 'Schools Covered', value: 940, suffix: '+' },
            { label: 'Active Users', value: 50, suffix: 'k+' },
            { label: 'Support', value: 24, suffix: '/7' }
          ].map((stat, i) => (
            <div key={i} className="stat-box">
              <div className="stat-num">
                <span className="stat-number" data-target={stat.value}>0</span>
                {stat.suffix}
              </div>
              <div className="stat-text">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps Section */}
      <section id="how-it-works" className="reveal-section py-32">
        <div className="container">
          <div className="text-center mb-20">
            <h2 className="section-title">How it Works</h2>
            <p className="section-subtitle">Simplified placement for a brighter future.</p>
          </div>
          <div className="steps-grid">
            {[
              { icon: <Target />, title: 'Enter Grades', desc: 'Input your expected or actual BECE grades.' },
              { icon: <TrendingUp />, title: 'Select Schools', desc: 'Choose up to 6 schools you are considering.' },
              { icon: <ShieldCheck />, title: 'Get Results', desc: 'See your placement chance instantly.' }
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className="step-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="reveal-section py-32 bg-slate-50">
        <div className="container grid lg:grid-cols-2 gap-20 items-center">
          <div className="why-visual">
             <div className="relative rounded-3xl overflow-hidden shadow-2xl">
               <img src="https://images.unsplash.com/photo-1523240715630-19d7bb1d331b?q=80&w=2070&auto=format&fit=crop" alt="Students" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
             </div>
          </div>
          <div className="why-content">
            <h2 className="section-title mb-12">Why Choose ChanceSHS?</h2>
            <div className="space-y-6">
              {[
                'Official 2024 placement data trends',
                'Access info for every Category A, B, and C school',
                'Your data is 100% encrypted and private',
                'Optimized for mobile with fast load times'
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-4">
                  <CheckCircle2 className="text-green-500" size={24} />
                  <span className="font-bold text-slate-700">{f}</span>
                </div>
              ))}
            </div>
            <Link href="/calculator" className="btn-primary mt-12 inline-flex">
              Start Now <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="reveal-section py-32 overflow-hidden">
        <div className="container">
          <h2 className="text-center text-4xl font-black mb-20">Loved by Thousands</h2>
          <div className="testimonials-marquee">
            {[
              "The prediction was spot on for my placement in Prempeh College!",
              "I was so worried about my grades, but the aggregate calculator helped me choose the right schools.",
              "A revolutionary tool for Ghanaian education. It simplifies the complex CSSPS process."
            ].map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="stars flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="#F5A623" color="#F5A623" />)}
                </div>
                <p className="text-lg font-medium italic opacity-80">"{t}"</p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200" />
                  <div>
                    <div className="font-bold">Bechem Student</div>
                    <div className="text-xs text-slate-400">Class of 2023</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="reveal-section py-32 bg-slate-900 text-white text-center">
        <div className="container">
          <h2 className="text-5xl font-black mb-8">Ready to secure your spot?</h2>
          <p className="text-xl opacity-60 mb-12 max-w-2xl mx-auto">Join over 50,000 Ghanaian families who use ChanceSHS to take the stress out of school placement.</p>
          <Link href="/calculator" className="btn-primary large inline-flex">
            Get Started Now — It's Free
          </Link>
        </div>
      </section>

    </div>
  );
}
