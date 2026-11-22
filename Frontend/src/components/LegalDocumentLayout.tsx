import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronRight, ShieldCheck, FileText } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

interface LegalDocumentLayoutProps {
  docType: 'privacy' | 'terms';
  title: string;
  subtitle: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export const LegalDocumentLayout: React.FC<LegalDocumentLayoutProps> = ({
  docType,
  title,
  subtitle,
  effectiveDate,
  sections,
}) => {
  const Icon = docType === 'privacy' ? ShieldCheck : FileText;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6"
      >
        <Link to="/" className="hover:text-cyan-600 dark:hover:text-cyan-300 transition">
          Marketplace
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-900 dark:text-slate-200 font-medium">{title}</span>
      </nav>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <header className="border-b border-slate-200 pb-6 mb-6 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300 mb-4">
            <Icon className="h-3.5 w-3.5" />
            <span>ZenxusBay Legal</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {subtitle}
          </p>
          <p className="mt-3 text-xs font-mono text-slate-500 dark:text-slate-400">
            Last updated: {effectiveDate}
          </p>
        </header>

        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-2.5">
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {section.title}
              </h2>
              {section.paragraphs.map((p, idx) => (
                <p
                  key={idx}
                  className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  {section.bullets.map((item, bIdx) => (
                    <li key={bIdx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Marketplace</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/privacy-policy"
              className={`transition ${
                docType === 'privacy'
                  ? 'font-semibold text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms-of-service"
              className={`transition ${
                docType === 'terms'
                  ? 'font-semibold text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Terms of Service
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
};
