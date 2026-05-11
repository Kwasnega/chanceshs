'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, MessageSquare, Search, BookOpen, CreditCard, School, HelpCircle, Star, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './FAQ.css';

const categories = [
  { id: 'general', label: 'General', icon: HelpCircle },
  { id: 'calculator', label: 'Calculator', icon: TrendingUp },
  { id: 'schools', label: 'Schools & Choices', icon: School },
  { id: 'results', label: 'Your Results', icon: Star },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'bece', label: 'BECE & Placement', icon: BookOpen },
];

const faqs = [
  // General
  {
    category: 'general',
    question: 'What is ChanceSHS?',
    answer: 'ChanceSHS is a free tool that helps JHS students in Ghana know their chances of getting into their chosen Senior High School. You enter your expected BECE grades and pick your schools — we tell you how likely you are to get placed.'
  },
  {
    category: 'general',
    question: 'Is ChanceSHS free to use?',
    answer: 'Yes! The basic calculator is completely free. You can check your chances for all your chosen schools at no cost. We also offer a Premium Report (GHS 20) that gives you more detailed information like past cut-off scores, tips for each school, and a downloadable PDF.'
  },
  {
    category: 'general',
    question: 'Who is ChanceSHS made for?',
    answer: 'ChanceSHS is made for JHS 3 students preparing for BECE, as well as their parents and guardians. It helps you plan which schools to apply for based on your expected performance.'
  },
  {
    category: 'general',
    question: 'How accurate is ChanceSHS?',
    answer: 'Our predictions are based on real Ghana BECE placement data from previous years. We look at your aggregate score, raw score, the subjects you are strong in, and how competitive each school is. We are always improving our system, but remember — these are predictions, not guarantees. The actual placement depends on WAEC and the Ministry of Education.'
  },
  {
    category: 'general',
    question: 'Does ChanceSHS replace the official BECE placement system?',
    answer: 'No. ChanceSHS does not replace CSSPS (the official Ghana School Placement System). We are a prediction tool only. The actual placement of students is done by the Ministry of Education through CSSPS after BECE results are released. Visit the official site at cssps.gov.gh'
  },

  // Calculator
  {
    category: 'calculator',
    question: 'How do I calculate my aggregate?',
    answer: 'Your BECE aggregate is the sum of your best 6 subject grades — 4 core subjects (English, Maths, Science, Social Studies) plus your 2 best elective subjects. Grades go from 1 (best) to 9 (lowest). So the lowest (best) possible aggregate is 6, and the highest (worst) is 54. On ChanceSHS, just select your grade for each subject and we calculate it for you automatically.'
  },
  {
    category: 'calculator',
    question: 'What is the "raw score" and why do I need it?',
    answer: 'Your raw score is the total of your actual marks from all your subjects added together — each subject is marked out of 100, so the maximum is 600. This gives us more detail about your performance beyond just the grade. For example, two students can both have Grade 3 in Maths, but one scored 65 and the other 79 — the raw score helps us tell them apart.'
  },
  {
    category: 'calculator',
    question: 'What grades should I enter if I haven\'t written BECE yet?',
    answer: 'Use your expected grades based on your mock exams, internal school assessments, or your own estimate. If you are not sure, try different grades to see how they affect your chances.'
  },
  {
    category: 'calculator',
    question: 'What does the percentage (%) next to each school mean?',
    answer: 'It shows your estimated chance of being placed in that school. For example, 80% means you have a very good chance, while 30% means it will be tough. It is based on your aggregate, raw score, and how competitive that school normally is.'
  },
  {
    category: 'calculator',
    question: 'What do "Good Match", "Competitive", and "Dream School" mean?',
    answer: '"✅ Good Match" means your scores are comfortably within the range of students who normally get placed there. "⚡ Competitive" means you are in the range but it could go either way — you might get in or not. "🎯 Dream School" means the school is very competitive and most students with your scores don\'t get placed there — but it\'s not impossible!'
  },

  // Schools
  {
    category: 'schools',
    question: 'Why must my 1st choice be a Category A school?',
    answer: 'In Ghana\'s BECE placement system, the rules require that your first choice school must be a Category A school. Category A schools are the top national secondary schools (like Achimota, PRESEC, Wesley Girls, etc.). This is an official requirement from the Ministry of Education, not something ChanceSHS decided.'
  },
  {
    category: 'schools',
    question: 'Can I choose more than one Category A school?',
    answer: 'No. You can only have one Category A school in your choices. This is also an official rule. On ChanceSHS, if you try to add a second Category A school, we will stop you and explain why.'
  },
  {
    category: 'schools',
    question: 'How many schools can I choose?',
    answer: 'You can choose up to 6 schools on ChanceSHS. In the real BECE placement system, the number of choices you can make may vary — always check the latest guidelines from the Ministry of Education or your school.'
  },
  {
    category: 'schools',
    question: 'What are the school categories (A, B, C, D, E)?',
    answer: 'Ghana\'s secondary schools are grouped into categories based on how competitive they are:\n• Category A — Top national schools (e.g. Achimota, PRESEC, Wesley Girls, Adisadel)\n• Category B — Strong national/regional schools\n• Category C — Good regional schools\n• Category D — Average regional/district schools\n• Category E — Local/district schools\n\nGenerally, Category A schools require the lowest aggregates (meaning the best grades).'
  },
  {
    category: 'schools',
    question: 'What if the school I want is not showing in the search?',
    answer: 'Try searching with a shorter part of the school name. For example, instead of "Ghana National College", try "National" or "Ghana". If your school is still not showing, it may not be in our database yet. We are always adding more schools — please contact us and we will add it.'
  },
  {
    category: 'schools',
    question: 'Can boys choose girls-only schools and vice versa?',
    answer: 'On ChanceSHS, the search will show all schools. In the real placement system, you can only be placed in a school that accepts your gender. Make sure to check whether a school is boys-only, girls-only, or mixed before choosing.'
  },

  // Results
  {
    category: 'results',
    question: 'Why are my results showing in the order I picked the schools?',
    answer: 'We show results in the same order as your choices because that is how the official Ghana placement system works — your 1st choice gets the most priority. This helps you see clearly how each of your choices looks, from your 1st to your last.'
  },
  {
    category: 'results',
    question: 'My chance percentage is very low. What should I do?',
    answer: 'Don\'t panic! A low percentage for a school just means it will be hard to get in. You can: (1) Add a school with a lower cut-off as your safety net, (2) Work harder on your weak subjects to improve your grades, (3) Use the Premium Report to get specific tips for each school you chose.'
  },
  {
    category: 'results',
    question: 'What is the "How sure we are" bar?',
    answer: 'This shows how confident our system is about the percentage we gave you. A higher bar means we have more data about that school and are more certain about the prediction. A lower bar means we have less historical data for that school, so take the prediction with a little more caution.'
  },
  {
    category: 'results',
    question: 'What extra information does the Premium Report give me?',
    answer: 'The Premium Report (GHS 20) gives you:\n• Cut-off scores from the last 5 years for each school\n• Your "Course Fit" — how well your chosen program matches your strengths\n• Tips specific to each school to improve your chances\n• A full PDF you can download, print, and share with your parents or teachers'
  },

  // Payment
  {
    category: 'payment',
    question: 'How do I pay for the Premium Report?',
    answer: 'You pay with Mobile Money (MTN MoMo, Vodafone Cash, AirtelTigo Money). When you click "Unlock Full Report", you will be asked for your email and then taken to a secure payment page. After payment, your report unlocks immediately.'
  },
  {
    category: 'payment',
    question: 'Is my payment safe?',
    answer: 'Yes. Payments are processed by Paystack, one of Africa\'s most trusted payment companies. ChanceSHS never sees your MoMo PIN or personal financial details. All transactions are encrypted and secure.'
  },
  {
    category: 'payment',
    question: 'I paid but my report is not unlocking. What do I do?',
    answer: 'This can happen if the payment confirmation was delayed. First, refresh the page and check if it unlocks. If not, please contact us on WhatsApp with your MoMo transaction ID and we will sort it out quickly for you — usually within a few minutes.'
  },
  {
    category: 'payment',
    question: 'Can I get a refund?',
    answer: 'If you paid but were unable to access your premium report due to a technical issue on our end, we will give you a full refund. However, if you simply changed your mind after accessing the report, we cannot offer a refund. Contact us and we will help you.'
  },
  {
    category: 'payment',
    question: 'I don\'t have MoMo. Can I pay another way?',
    answer: 'Right now we only support Mobile Money. If you don\'t have MoMo, you can ask a parent, older sibling, or friend to pay on your behalf. If you need help, contact us on WhatsApp.'
  },

  // BECE
  {
    category: 'bece',
    question: 'When is the BECE usually written?',
    answer: 'The BECE (Basic Education Certificate Examination) is usually written in June every year in Ghana. Results are typically released in August, and school placement follows shortly after.'
  },
  {
    category: 'bece',
    question: 'How does the Ghana school placement system work?',
    answer: 'After BECE results come out, students are placed into Senior High Schools through the Computerised School Selection and Placement System (CSSPS) at cssps.gov.gh. You select your schools in order of preference. The system then tries to place you in your first choice. If your aggregate is not good enough, it moves to your second choice, and so on. Your aggregate score is the main thing used to determine placement.'
  },
  {
    category: 'bece',
    question: 'What aggregate do I need to get into a Category A school?',
    answer: 'It depends on the specific school and the year. Category A schools (like Achimota, PRESEC, Wesley Girls) typically require an aggregate of 6–12, though this varies each year based on how many students applied and the competition. The Premium Report shows you cut-off scores from the last 5 years for your chosen schools.'
  },
  {
    category: 'bece',
    question: 'Can I still get into a good school with an aggregate of 20 or above?',
    answer: 'Yes! An aggregate of 20 or above can still get you into Category B, C, or D schools, many of which offer excellent education. Not every good school requires a single-digit aggregate. Use ChanceSHS to find schools where your aggregate gives you a real chance.'
  },
  {
    category: 'bece',
    question: 'My results are out. Can I still use ChanceSHS?',
    answer: 'Yes! Enter your actual BECE grades to get the most accurate prediction. ChanceSHS works best when you use real results because we can compare directly with past placement data.'
  },
];

function renderAnswer(text: string) {
  const csspsRegex = /(cssps\.gov\.gh)/gi;
  const parts = text.split(csspsRegex);
  return parts.map((part, i) =>
    csspsRegex.test(part)
      ? <a key={i} href="https://www.cssps.gov.gh/" target="_blank" rel="noopener noreferrer" className="faq-inline-link">{part}</a>
      : part
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchTerm.length < 2 || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayFaqs = searchTerm.length >= 2 
    ? faqs.filter(f => 
        f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filtered;

  return (
    <div className="faq-page">
      {/* Hero */}
      <section className="faq-hero">
        <motion.div
          className="faq-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="faq-hero-badge">
            <HelpCircle size={16} />
            <span>Help Centre</span>
          </div>
          <h1 className="faq-hero-title">Got questions?<br />We've got answers.</h1>
          <p className="faq-hero-subtitle">
            Everything you need to know about ChanceSHS, BECE placement, and how to use the calculator.
          </p>

          {/* Search */}
          <div className="faq-search-wrapper">
            <Search size={20} className="faq-search-icon" />
            <input
              type="text"
              className="faq-search-input"
              placeholder="Search your question..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setOpenIndex(null); }}
            />
            {searchTerm && (
              <button className="faq-search-clear" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="faq-main">
        <div className="faq-container">

          {/* Category Tabs */}
          {searchTerm.length < 2 && (
            <div className="faq-categories">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`faq-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
                >
                  <cat.icon size={16} />
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {searchTerm.length >= 2 && (
            <p className="faq-search-results-label">
              Showing {displayFaqs.length} result{displayFaqs.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          )}

          {/* FAQ Accordion */}
          <div className="faq-list">
            {displayFaqs.length === 0 ? (
              <div className="faq-empty">
                <HelpCircle size={48} className="faq-empty-icon" />
                <h3>No results found</h3>
                <p>Try a different search or browse the categories above.</p>
              </div>
            ) : (
              displayFaqs.map((faq, i) => (
                <motion.div
                  key={i}
                  className={`faq-item ${openIndex === i ? 'open' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    className="faq-question"
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  >
                    <span>{faq.question}</span>
                    <motion.div
                      animate={{ rotate: openIndex === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="faq-chevron"
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        className="faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="faq-answer-inner">
                          {faq.answer.split('\n').map((line, li) => (
                            <p key={li}>{renderAnswer(line)}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>

          {/* Still need help */}
          <motion.div
            className="faq-help-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="help-card-icon">
              <MessageSquare size={32} />
            </div>
            <div className="help-card-content">
              <h3>Still have a question?</h3>
              <p>Chat with us on WhatsApp. We reply fast — usually within minutes.</p>
            </div>
            <a
              href="https://wa.me/233000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="help-card-btn"
            >
              Chat on WhatsApp
              <ChevronRight size={18} />
            </a>
          </motion.div>

          {/* CTA */}
          <div className="faq-cta-section">
            <h2>Ready to check your chances?</h2>
            <p>It's free, fast, and built for Ghanaian students.</p>
            <Link href="/calculator" className="faq-cta-btn">
              <TrendingUp size={20} />
              Check My Chances — It's Free
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
