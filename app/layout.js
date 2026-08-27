import './globals.css';

export const metadata = {
  title: 'duee. — AI-Powered Student Planner',
  description: 'Track classes, assignments, and deadlines with an AI assistant.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
  },
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
      </head>
      <body>{children}</body>
    </html>
  );
}
