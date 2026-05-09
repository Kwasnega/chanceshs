'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-gray-100">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/chancelogo.png" alt="ChanceSHS Logo" className="h-16 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#how-it-works" className="text-gray-600 hover:text-[#F5A623] transition-colors">How it Works</Link>
          <Link href="/#pricing" className="text-gray-600 hover:text-[#F5A623] transition-colors">Pricing</Link>
          <Link href="/#faq" className="text-gray-600 hover:text-[#F5A623] transition-colors">FAQ</Link>
          <Link href="/calculator" className="bg-[#F5A623] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#E0941A] transition-all">
            Get Started
          </Link>
        </nav>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-[#0F172A]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-bottom border-gray-100 animate-slide-down">
          <nav className="flex flex-col p-4 gap-4">
            <Link href="/#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-gray-600 py-2 border-bottom border-gray-50">How it Works</Link>
            <Link href="/#pricing" onClick={() => setIsMenuOpen(false)} className="text-gray-600 py-2 border-bottom border-gray-50">Pricing</Link>
            <Link href="/#faq" onClick={() => setIsMenuOpen(false)} className="text-gray-600 py-2 border-bottom border-gray-50">FAQ</Link>
            <Link href="/calculator" onClick={() => setIsMenuOpen(false)} className="bg-[#F5A623] text-white px-6 py-3 rounded-xl font-semibold text-center">
              Check My Chances
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
