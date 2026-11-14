// Frontend/src/root.tsx
import React from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';
import { Layout } from './components/Layout';
import { MarketplaceProvider } from './context/MarketplaceContext';
import './index.css';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased">
        <MarketplaceProvider>
          <Layout>
            {children}
          </Layout>
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
