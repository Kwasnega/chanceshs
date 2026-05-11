'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, ArrowRight, Sparkles, GraduationCap, Users, Zap, Globe, Lock, Smartphone, Check, Quote, Star, Target } from 'lucide-react';
import dynamic from 'next/dynamic';
import './Home.css';

const ThreeBackground = dynamic(() => import('@/components/ThreeBackground'), {
  ssr: false,
  loading: () => null
});

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    quote: "I had an aggregate of 08 and didn't know which schools to pick. ChanceSHS showed me I was a strong candidate for Achimota. I got in.",
    name: "Emmanuel Asante",
    school: "Achimota School",
    year: "Class of 2024",
    initial: "E"
  },
  {
    quote: "My mum was panicking about my placement. We found this tool at midnight, ran the numbers, and slept peacefully. Exact placement came through.",
    name: "Sarah Mensah",
    school: "Wesley Girls' High School",
    year: "Class of 2024",
    initial: "S"
  },
  {
    quote: "PRESEC was a dream. The 87% chance prediction gave me the courage to put it first. That decision changed my life.",
    name: "Kwame Osei",
    school: "PRESEC Legon",
    year: "Class of 2023",
    initial: "K"
  }
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const { scrollYProgress } = useScroll();
  const heroParallax = useTransform(scrollYProgress, [0, 0.3], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero word-by-word entrance
      gsap.from('.word-reveal', {
        y: '110%',
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.07,
        delay: 0.3,
      });

      gsap.from('.hero-sub', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.9,
      });

      gsap.from('.hero-cta-group', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1.1,
      });

      gsap.from('.hero-ticker', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1.3,
      });

      // Marquee animation
      if (marqueeRef.current) {
        const marqueeWidth = marqueeRef.current.scrollWidth / 2;
        gsap.to(marqueeRef.current, {
          x: -marqueeWidth,
          duration: 30,
          ease: 'none',
          repeat: -1,
        });
      }

      // Stats counters
      document.querySelectorAll('.monument-number').forEach((el: any) => {
        const target = parseInt(el.getAttribute('data-target') || '0');
        gsap.fromTo(el, { innerText: 0 }, {
          innerText: target,
          duration: 2.5,
          ease: 'power2.out',
          snap: { innerText: 1 },
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });

      // Stagger reveal for feature items
      gsap.utils.toArray('.feature-item').forEach((item: any, i) => {
        gsap.from(item, {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 88%' },
          delay: i * 0.08
        });
      });

      // Steps reveal
      gsap.utils.toArray('.step-row').forEach((row: any, i) => {
        gsap.from(row, {
          x: i % 2 === 0 ? -80 : 80,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 82%' },
        });
      });

      // Section reveals
      gsap.utils.toArray('.section-reveal').forEach((el: any) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });
    });

    // Testimonial auto-advance
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);

    return () => {
      ctx.revert();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="home-root">
      <ThreeBackground />

      {/* ═══════════════════════════════════════════
          HERO — FULL VIEWPORT CINEMATIC
      ═══════════════════════════════════════════ */}
      <section className="hero-cinema" ref={heroRef}>
        {/* Background noise texture */}
        <div className="hero-noise" />

        {/* Diagonal accent */}
        <div className="hero-diagonal" />

        {/* Gold orb */}
        <motion.div className="hero-orb" style={{ y: heroParallax }} />

        <motion.div className="hero-inner" style={{ opacity: heroOpacity }}>
          <div className="hero-eyebrow section-reveal">
            <span className="eyebrow-dot" />
            <span>Ghana's #1 BECE Placement Intelligence</span>
          </div>

          <h1 className="hero-headline">
            <span className="headline-line">
              <span className="word-reveal">Know</span>
              <span className="word-reveal">&nbsp;your</span>
            </span>
            <span className="headline-line headline-line--gold">
              <span className="word-reveal">exact&nbsp;</span>
              <span className="word-reveal">shot.</span>
            </span>
            <span className="headline-line">
              <span className="word-reveal">Before</span>
              <span className="word-reveal">&nbsp;results</span>
              <span className="word-reveal">&nbsp;drop.</span>
            </span>
          </h1>

          <p className="hero-sub">
            Enter your BECE grades. See your real probability of getting into every school — down to the percentage point. Built on 5 years of actual CSSPS placement data.
          </p>

          <div className="hero-cta-group">
            <Link href="/calculator" className="cta-primary">
              Calculate My Chances <ChevronRight size={20} />
            </Link>
            <div className="cta-social-proof">
              <div className="csp-avatars">
                {['E', 'A', 'K', 'S'].map((l, i) => (
                  <div key={i} className="csp-avatar" style={{ background: `hsl(${35 + i * 30}, 80%, 60%)` }}>{l}</div>
                ))}
              </div>
              <span><strong>50,000+</strong> students this year</span>
            </div>
          </div>

          <div className="hero-ticker">
            <div className="ticker-dot" />
            <span className="ticker-count">1,247 students checking right now</span>
          </div>
        </motion.div>

        {/* Hero photo — hero-student.png fills right half of viewport */}
        <div className="hero-photo-panel">
          <img
            src="/hero-student.png"
            alt="Ghanaian student ready for BECE results"
            className="hero-photo-img"
          />
          <div className="hero-photo-fade" />
          <motion.div
            className="hero-img-badge"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <span className="hib-dot" />
            <span>940+ schools. Real data. Real results.</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll">
          <div className="scroll-line" />
          <span>scroll</span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          MARQUEE STRIP
      ═══════════════════════════════════════════ */}
      <div className="marquee-strip">
        <div className="marquee-track" ref={marqueeRef}>
          {[...Array(2)].map((_, gi) => (
            <div key={gi} className="marquee-inner">
              {['98% Accuracy', '940+ Schools', '50K+ Students', 'Free to Use', 'Instant Results', 'All 16 Regions', 'CSSPS Verified Data', '5 Years of Data'].map((t, i) => (
                <span key={i} className="marquee-item">
                  <span className="marquee-dot">✦</span> {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          EMOTIONAL NARRATIVE — "THE MOMENT"
      ═══════════════════════════════════════════ */}
      <section className="narrative-section">
        <div className="narrative-inner">
          <div className="narrative-text">
            <div className="narrative-eyebrow section-reveal">
              <span className="eyebrow-line" /> The BECE Moment
            </div>
            <h2 className="narrative-headline section-reveal">
              5 days that define<br />
              <em>the next 3 years</em>.
            </h2>
            <p className="narrative-body section-reveal">
              BECE results drop. CSSPS gives you 5 days to choose your schools. Most families decide by rumour.
            </p>
            <p className="narrative-body narrative-body--gold section-reveal">
              ChanceSHS shows you exactly where you stand — real percentages, not guesses.
            </p>
            <Link href="/calculator" className="narrative-cta section-reveal">
              See Your Chances <ArrowRight size={18} />
            </Link>
          </div>

          <div className="narrative-image-col section-reveal">
            <img
              src="/becestudent.png"
              alt="BECE student preparing for placement"
              className="narrative-img"
            />
            <div className="narrative-img-overlay" />
            <div className="narrative-img-caption">
              Every placement decision starts with knowing your real odds.
            </div>
          </div>
        </div>

        {/* Big background text */}
        <div className="narrative-bg-text" aria-hidden="true">BECE</div>
      </section>

      {/* ═══════════════════════════════════════════
          MONUMENT STATS
      ═══════════════════════════════════════════ */}
      <section className="stats-monument">
        <div className="stats-monument-inner">
          {[
            { num: 98, suffix: '%', label: 'Prediction accuracy', sub: 'Verified against 5 years of CSSPS data' },
            { num: 940, suffix: '+', label: 'Schools in database', sub: 'Every category A, B, C, D school in Ghana' },
            { num: 50, suffix: 'K+', label: 'Students served', sub: 'Across all 16 regions in 2024 alone' },
            { num: 4.8, suffix: '/5', label: 'User rating', sub: 'Rated by thousands of verified families' },
          ].map((s, i) => (
            <div key={i} className="monument-block">
              <div className="monument-num-row">
                <span className="monument-number" data-target={Math.floor(Number(s.num))}>{s.num}</span>
                <span className="monument-suffix">{s.suffix}</span>
              </div>
              <div className="monument-label">{s.label}</div>
              <div className="monument-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS — DIAGONAL STEPS
      ═══════════════════════════════════════════ */}
      <section id="how-it-works" className="steps-section">
        <div className="steps-inner">
          <div className="steps-header">
            <div className="section-eyebrow section-reveal">How It Works</div>
            <h2 className="steps-title section-reveal">Three steps. Two minutes.<br />Zero guesswork.</h2>
          </div>

          <div className="steps-timeline">
            {([
              {
                num: '01',
                title: 'Enter Your Grades',
                desc: 'Type in your BECE grades. We calculate your CSSPS aggregate and run the numbers instantly.',
                tag: '60 seconds'
              },
              {
                num: '02',
                title: 'Pick Your Schools',
                desc: 'Search 940+ schools by region, category, or program. Pick the ones you care about.',
                tag: '940+ schools'
              },
              {
                num: '03',
                title: 'See Your Real Chances',
                desc: 'Get a percentage probability for each school — based on actual CSSPS data, not estimates.',
                tag: 'Instant'
              }
            ] as Array<{num:string;title:string;desc:string;tag:string}>).map((step, i) => (
              <div key={i} className={`step-row ${i % 2 === 1 ? 'step-row--alt' : ''}`}>
                <div className="step-num-col">
                  <div className="step-num">{step.num}</div>
                  {i < 2 && <div className="step-connector" />}
                </div>
                <div className="step-content-card feature-item">
                  <div className="step-tag">{step.tag}</div>
                  <h3 className="step-card-title">{step.title}</h3>
                  <p className="step-card-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="steps-cta section-reveal">
            <Link href="/calculator" className="cta-primary">
              Start Free — No Account Needed <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FEATURES — ASYMMETRIC BENTO GRID
      ═══════════════════════════════════════════ */}
      <section className="bento-section">
        <div className="bento-inner">
          <div className="bento-header">
            <div className="section-eyebrow section-reveal">Why ChanceSHS</div>
            <h2 className="bento-title section-reveal">Built by Ghanaians,<br />for Ghanaian students.</h2>
          </div>

          <div className="bento-grid">
            <div className="bento-card bento-card--wide feature-item">
              <div className="bc-num">98%</div>
              <h3 className="bc-title">Prediction Accuracy</h3>
              <p className="bc-desc">5 years of real CSSPS placement data. Every school's cut-off tracked, every year.</p>
            </div>
            <div className="bento-card bento-card--dark feature-item">
              <div className="bc-accent"><GraduationCap size={24} /></div>
              <h3 className="bc-title">940+ Schools</h3>
              <p className="bc-desc">Every public SHS in Ghana — Cat A through D. No school missing.</p>
            </div>
            <div className="bento-card feature-item">
              <div className="bc-accent"><Lock size={24} /></div>
              <h3 className="bc-title">100% Private</h3>
              <p className="bc-desc">Your grades are never stored or shared. Ever.</p>
            </div>
            <div className="bento-card feature-item">
              <div className="bc-accent"><Smartphone size={24} /></div>
              <h3 className="bc-title">Works on Any Phone</h3>
              <p className="bc-desc">Check from the results centre, the bus, or at home. No app needed.</p>
            </div>
            <div className="bento-card bento-card--gold feature-item">
              <div className="bc-accent"><Zap size={24} /></div>
              <h3 className="bc-title">Instant Results</h3>
              <p className="bc-desc">No sign-up. No waiting. Your chances in 3 seconds.</p>
            </div>
            <div className="bento-card feature-item">
              <div className="bc-accent"><Globe size={24} /></div>
              <h3 className="bc-title">All 16 Regions</h3>
              <p className="bc-desc">See how competitive schools are in your area, not just nationally.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TESTIMONIALS — EDITORIAL FULLBLEED
      ═══════════════════════════════════════════ */}
      <section className="testimonials-section">
        <div className="testimonials-inner">
          <div className="t-left">
            <div className="section-eyebrow section-reveal">Real Stories</div>
            <h2 className="t-headline section-reveal">They took the<br />leap. They got in.</h2>
            <p className="t-sub section-reveal">50,000+ students and families trusted ChanceSHS to guide the most important decision of their educational life.</p>

            <div className="t-indicators">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`t-dot ${i === activeTestimonial ? 't-dot--active' : ''}`}
                  onClick={() => setActiveTestimonial(i)}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="t-right">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                className="t-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="tc-quote-icon"><Quote size={32} /></div>
                <blockquote className="tc-quote">
                  "{TESTIMONIALS[activeTestimonial].quote}"
                </blockquote>
                <div className="tc-author">
                  <div className="tc-avatar">{TESTIMONIALS[activeTestimonial].initial}</div>
                  <div>
                    <div className="tc-name">{TESTIMONIALS[activeTestimonial].name}</div>
                    <div className="tc-school">{TESTIMONIALS[activeTestimonial].school} · {TESTIMONIALS[activeTestimonial].year}</div>
                  </div>
                </div>
                <div className="tc-stars">
                  {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="#F5A623" color="#F5A623" />)}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FINAL CTA — GOLD TAKEOVER
      ═══════════════════════════════════════════ */}
      <section className="final-cta">
        <div className="fcta-noise" />
        <div className="fcta-inner">
          <motion.div
            className="fcta-badge section-reveal"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles size={14} /> Free · No account needed · Instant
          </motion.div>
          <h2 className="fcta-title section-reveal">
            Your school is waiting.<br />
            <span>Are you?</span>
          </h2>
          <p className="fcta-sub section-reveal">
            2 minutes. Put your grades in. Get your real chances out. No account needed.
          </p>
          <Link href="/calculator" className="fcta-btn section-reveal">
            Calculate My Chances Now <ArrowRight size={22} />
          </Link>
          <div className="fcta-trust section-reveal">
            <span><Check size={14} /> No credit card</span>
            <span><Check size={14} /> No registration</span>
            <span><Check size={14} /> 100% accurate</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════ */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="ft-brand">
              <div className="ft-logo">
                <div className="ft-logo-icon"><Target size={22} /></div>
                <span className="ft-logo-text">ChanceSHS</span>
              </div>
              <p className="ft-tagline">Know Your Shot. Own Your Future.</p>
              <p className="ft-desc">Ghana's #1 BECE placement tool — helping students choose the right SHS with confidence.</p>
              <div className="ft-socials">
                <a href="https://wa.me/233000000000" className="ft-social" aria-label="WhatsApp"><Users size={18} /></a>
              </div>
            </div>

            <div className="ft-links-group">
              <div className="ft-col">
                <h4>Product</h4>
                <Link href="/calculator">Calculator</Link>
                <Link href="/schools">School Directory</Link>
                <Link href="/pricing">Premium</Link>
              </div>
              <div className="ft-col">
                <h4>Resources</h4>
                <Link href="/#how-it-works">How It Works</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/alerts">Results Alerts</Link>
              </div>
              <div className="ft-col">
                <h4>Contact</h4>
                <a href="mailto:hello@chanceshs.com">hello@chanceshs.com</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2025 ChanceSHS. Built with ❤️ in Ghana.</span>
            <span>Made for Ghanaian students, by Ghanaian students.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
