import React from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type LinksFunction,
} from 'react-router';
import { Layout } from './components/Layout';
import { MarketplaceProvider } from './context/MarketplaceContext';
import './index.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    type: 'image/svg+xml',
    href: '/assets/aistudio/zenxusbay-favicon_a28e4c2d.svg',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  },
];

const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('zenxusbay_theme')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body className="bg-[#F7F9FC] text-slate-900 dark:bg-[#090D16] dark:text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        <MarketplaceProvider>
          <Layout>{children}</Layout>
        </MarketplaceProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <LayoutWrapper>
      <Outlet />
    </LayoutWrapper>
  );
}
