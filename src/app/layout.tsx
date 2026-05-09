import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "ChanceSHS | Ghana's #1 BECE Placement Intelligence",
  description: "Calculate your aggregate and see your real chances of getting into your dream Senior High School with Ghana's most accurate prediction engine.",
  openGraph: {
    title: "ChanceSHS | Know Your Shot. Own Your Future.",
    description: "Predict your SHS placement with 98% accuracy. Used by 50,000+ Ghanaian families.",
    url: 'https://chanceshs.com',
    siteName: 'ChanceSHS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_GH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChanceSHS | SHS Placement Predictor',
    description: 'Stop guessing. Start predicting. Secure your dream SHS placement today.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Header />
        <main className="pt-16 min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
