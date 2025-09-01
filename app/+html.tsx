import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  const swScript = `
    (function(){
      try {
        const isProd = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : true;
        if (isProd && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const registerSW = async () => {
            const candidates = ['/sw.js', '/service-worker.js'];
            for (const url of candidates) {
              try {
                console.log('[PWA] Probing SW URL', url);
                const probe = await fetch(url, { cache: 'no-store' });
                if (!probe.ok) {
                  console.warn('[PWA] Probe failed for', url, probe.status, probe.statusText);
                  continue;
                }
                const reg = await navigator.serviceWorker.register(url);
                console.log('[PWA] Service Worker registered:', reg.scope);
                try { await reg.update(); } catch (err) { console.log('[PWA] SW update skipped', err); }
                return;
              } catch (e) {
                console.warn('[PWA] Registration attempt failed for candidate', url, e);
              }
            }
            console.error('[PWA] No Service Worker could be registered. Skipping.');
            try {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister()));
              console.log('[PWA] Unregistered existing service workers');
            } catch (uErr) {
              console.warn('[PWA] Unregister failed', uErr);
            }
          };
          window.addEventListener('load', registerSW);
        }
      } catch (err) {
        console.error('[PWA] SW bootstrap error', err);
      }
    })();
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
