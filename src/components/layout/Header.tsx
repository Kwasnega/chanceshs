'use client';

import Link from 'next/link';
import { ChevronRight, Compass, CreditCard, HelpCircle, BookOpen, BarChart2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Header.css';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 60) {
        setVisible(true);
      } else if (currentY > lastScrollY + 8) {
        setVisible(false);
        setIsMenuOpen(false);
      } else if (currentY < lastScrollY - 8) {
        setVisible(true);
      }
      setLastScrollY(currentY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { href: '/#how-it-works', label: 'How it Works', icon: Compass },
    { href: '/schools', label: 'Schools', icon: BookOpen },
    { href: '/pricing', label: 'Pricing', icon: CreditCard },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/60 shadow-sm transition-transform duration-300 ease-in-out ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/chancelogo.png" 
                alt="ChanceSHS Logo" 
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105" 
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-slate-900">ChanceSHS</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
              >
                {item.label}
              </Link>
            ))}
            <Link 
              href="/calculator" 
              className="cta-button"
            >
              <BarChart2 size={16} />
              Check My Chances
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <motion.div
                animate={{
                  rotate: isMenuOpen ? 45 : 0,
                  y: isMenuOpen ? 6 : 0
                }}
                className="absolute top-0 left-0 w-full h-0.5 bg-slate-900"
              />
              <motion.div
                animate={{
                  opacity: isMenuOpen ? 0 : 1
                }}
                className="absolute top-3 left-0 w-full h-0.5 bg-slate-900"
              />
              <motion.div
                animate={{
                  rotate: isMenuOpen ? -45 : 0,
                  y: isMenuOpen ? -6 : 0
                }}
                className="absolute top-6 left-0 w-full h-0.5 bg-slate-900"
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="space-y-2">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="mobile-nav-item"
                    >
                      <div className="nav-item-icon">
                        <item.icon size={20} />
                      </div>
                      <span className="nav-item-text">{item.label}</span>
                      <ChevronRight size={16} className="nav-item-arrow" />
                    </Link>
                  </motion.div>
                ))}
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 pt-6 border-t border-gray-100"
              >
                <Link
                  href="/calculator"
                  onClick={() => setIsMenuOpen(false)}
                  className="mobile-cta"
                >
                  <div className="cta-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="cta-content">
                    <span className="cta-label">Check My Chances</span>
                    <span className="cta-sub">Free placement prediction</span>
                  </div>
                  <ChevronRight size={18} className="cta-arrow" />
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
