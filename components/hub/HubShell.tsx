'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type HubAccent = 'green' | 'cyan';

export interface HubNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  soon?: boolean;
}

export interface HubNavSection {
  heading?: string;
  accent: HubAccent;
  items: HubNavItem[];
}

export interface HubShellProps {
  brand: { icon: ReactNode; name: string };
  subBrand?: string;
  switcher?: ReactNode;
  sections: HubNavSection[];
  pageTitles: Record<string, string>;
  fallbackTitle: string;
  footerLink: { href: string; label: string };
  userEmail: string;
  children: ReactNode;
}

const ITEM_BASE =
  'flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors';

const ACTIVE_CLASSES: Record<HubAccent, string> = {
  green: 'bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/20',
  cyan: 'bg-[#1AC8ED]/10 text-[#1AC8ED] border border-[#1AC8ED]/20',
};

const INACTIVE_CLASSES = 'text-[#7DD8E8] hover:bg-white/8 hover:text-white';

export function HubShell({
  brand,
  subBrand,
  switcher,
  sections,
  pageTitles,
  fallbackTitle,
  footerLink,
  userEmail,
  children,
}: HubShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const pageTitle = pageTitles[pathname] ?? fallbackTitle;

  return (
    <div className="min-h-screen bg-[#121113] flex">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed left-0 top-0 h-screen w-64 z-50 flex flex-col',
          'bg-[#0E0E10] border-r border-white/10',
          'transition-transform duration-300 ease-in-out',
          'md:sticky md:translate-x-0 md:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{brand.icon}</span>
            <div className="min-w-0">
              <p className="text-base font-header font-bold text-white leading-none">
                {brand.name}
              </p>
              {subBrand && (
                <p className="font-label text-[10px] tracking-widest text-[#1AC8ED] uppercase mt-1">
                  {subBrand}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Switcher */}
        {switcher && (
          <div className="px-3 pt-3 shrink-0">{switcher}</div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sections.map((section, sectionIndex) => (
            <div key={section.heading ?? sectionIndex} className="space-y-1">
              {section.heading && (
                <div className="px-3 pt-4 pb-1">
                  <span className="font-label text-xs tracking-widest text-[#7DD8E8]/50 uppercase">
                    {section.heading}
                  </span>
                </div>
              )}
              {section.items.map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.href}
                      aria-disabled="true"
                      className={`${ITEM_BASE} text-[#7DD8E8] opacity-40 cursor-not-allowed select-none`}
                    >
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                }

                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`${ITEM_BASE} ${
                      isActive ? ACTIVE_CLASSES[section.accent] : INACTIVE_CLASSES
                    }`}
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <Link
            href={footerLink.href}
            className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-[#7DD8E8] hover:bg-white/8 hover:text-[#007BFF] transition-colors"
          >
            <span className="text-lg">←</span>
            <span>{footerLink.label}</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#121113]/90 backdrop-blur-sm border-b border-white/10 shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-base font-header font-bold text-white md:hidden">
                {pageTitle}
              </h2>
            </div>
            <span className="hidden sm:block max-w-[240px] truncate rounded-full bg-[#1a1a1a] border border-white/10 px-3 py-1 text-sm text-[#7DD8E8]">
              {userEmail}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
