import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <img src="/chancelogo.png" alt="ChanceSHS Logo" className="h-16 w-auto object-contain" />
            </Link>
            <p className="text-gray-400 max-w-sm">
              Empowering Ghanaian students and parents with data-driven insights for BECE placement. 
              Our mission is to reduce stress and uncertainty during the transition to Senior High School.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link href="/calculator" className="hover:text-[#F5A623]">Aggregate Calculator</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-[#F5A623]">How It Works</Link></li>
              <li><Link href="/#pricing" className="hover:text-[#F5A623]">Pricing</Link></li>
              <li><Link href="/#faq" className="hover:text-[#F5A623]">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-6">Support</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-[#F5A623]">WhatsApp Support</a></li>
              <li><a href="#" className="hover:text-[#F5A623]">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#F5A623]">Terms of Service</a></li>
              <li><a href="mailto:hello@chanceshs.com" className="hover:text-[#F5A623]">Email Us</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ChanceSHS. All rights reserved. Built for Ghana's future leaders.
        </div>
      </div>
    </footer>
  );
}
