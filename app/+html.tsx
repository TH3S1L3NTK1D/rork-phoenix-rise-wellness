import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  const swScript = `
    try {
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          const swUrl = '/sw.js';
          navigator.serviceWorker
            .register(swUrl)
            .then((registration) => {
              console.log('[PWA] Service Worker registered:', registration.scope);
              try { registration.update(); } catch (err) { console.log('[PWA] SW update skipped', err); }
            })
            .catch((error) => {
              console.error('[PWA] Service Worker registration failed:', error);
            });
        });
      }
    } catch (err) {
      console.error('[PWA] SW bootstrap error', err);
    }
  `;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/assets/images/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
