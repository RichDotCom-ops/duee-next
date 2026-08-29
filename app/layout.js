import './globals.css';
import InstallPrompt from '../components/InstallPrompt';

export const metadata = {
  title: {
    default: 'duee. — AI-Powered Student Planner',
    template: '%s | duee.',
  },
  description: 'duee. is the AI student planner that tracks your assignments, reminds you of deadlines, and gives you a personal AI tutor. Free to start. Used by thousands of students.',
  keywords: ['student planner', 'AI tutor', 'assignment tracker', 'homework tracker', 'study app', 'grade calculator', 'college planner', 'study timer', 'duee', 'student productivity'],
  authors: [{ name: 'duee.' }],
  creator: 'duee.',
  metadataBase: new URL('https://duee.online'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'duee. — AI-Powered Student Planner',
    description: 'Track assignments, chat with your AI tutor, and never miss a deadline. Free to start.',
    url: 'https://duee.online',
    siteName: 'duee.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'duee. — AI-Powered Student Planner',
    description: 'Track assignments, chat with your AI tutor, and never miss a deadline.',
    creator: '@duee',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://duee.online/#website',
      url: 'https://duee.online',
      name: 'duee.',
      description: 'AI-Powered Student Planner',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://duee.online/blog?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://duee.online/#nav',
      name: 'Blog',
      url: 'https://duee.online/blog',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Pricing',
      url: 'https://duee.online/pricing',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'How It Works',
      url: 'https://duee.online/#how-it-works',
    },
    {
      '@type': 'SiteNavigationElement',
      name: 'Get Started Free',
      url: 'https://duee.online/login?mode=signup',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'duee.',
      applicationCategory: 'EducationApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free plan available',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '120',
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <meta name="google-site-verification" content="Id6zU6rPzbgzd6SK4ahATmmU1hVgV29zCaXp7ERXe6k" />
        <meta name="google-site-verification" content="GclvscfAwuw0vatvGskOElo2I6jg3b9PXvFtX0MxHMw" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="duee." />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
