'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; icon: string; label: string };
type NavGroup = { icon: string; label: string; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const navItems: NavEntry[] = [
  { href: '/admin', icon: '📊', label: 'Dashboard' },
  { href: '/admin/events', icon: '🎫', label: 'Events' },
  { href: '/admin/scan', icon: '🔍', label: 'Scanner' },
  { href: '/admin/audience', icon: '🧠', label: 'Audience' },
  { href: '/admin/promoter-applications', icon: '📝', label: 'Applications' },
  { href: '/admin/event-drafts', icon: '✏️', label: 'Drafts' },
  { href: '/admin/orders', icon: '🛒', label: 'Orders' },
  { href: '/admin/users', icon: '👥', label: 'Users' },
  { href: '/admin/groups', icon: '👥', label: 'Groups' },
  { href: '/admin/toolkit', icon: '🔧', label: 'Toolkit' },
  { href: '/admin/promo-codes', icon: '🏷️', label: 'Promo Codes' },
  { href: '/admin/invites', icon: '✉️', label: 'Invites' },
  {
    icon: '📣',
    label: 'Marketing',
    children: [{ href: '/admin/ads', icon: '📢', label: 'Ad Manager' }],
  },
  { href: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/events': 'Events',
  '/admin/scan': 'Ticket Scanner',
  '/admin/audience': 'Audience',
  '/admin/promoter-applications': 'Applications',
  '/admin/event-drafts': 'Drafts',
  '/admin/orders': 'Orders',
  '/admin/users': 'User Management',
  '/admin/groups': 'Group Management',
  '/admin/toolkit': 'Toolkit Management',
  '/admin/promo-codes': 'Promo Codes',
  '/admin/invites': 'Invites',
  '/admin/ads': 'Ad Manager',
  '/admin/settings': 'Settings',
};

interface AdminShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export function AdminShell({ children, userEmail }: AdminShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const entry of navItems) {
      if (isNavGroup(entry) && entry.children.some((c) => pathname.startsWith(c.href))) {
        initial.add(entry.label);
      }
    }
    return initial;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const pageTitle = pageTitles[pathname] ?? 'Admin';

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
            <span className="text-2xl">🛠️</span>
            <div>
              <p className="text-base font-header font-bold text-white leading-none">
                RTNY Admin
              </p>
              {userEmail && (
                <p className="text-xs text-[#7DD8E8] mt-0.5 truncate max-w-[150px]">
                  {userEmail}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            if (isNavGroup(item)) {
              const isExpanded = expandedGroups.has(item.label);

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-[#7DD8E8] hover:bg-white/8 hover:text-white"
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <svg
                      className={[
                        'w-4 h-4 shrink-0 transition-transform duration-200',
                        isExpanded ? 'rotate-180' : '',
                      ].join(' ')}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-6">
                      {item.children.map((child) => {
                        const isActive =
                          child.href === '/admin'
                            ? pathname === '/admin'
                            : pathname.startsWith(child.href);

                        return (
                          <a
                            key={child.href}
                            href={child.href}
                            className={[
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/20'
                                : 'text-[#7DD8E8] hover:bg-white/8 hover:text-white',
                            ].join(' ')}
                          >
                            <span className="text-lg shrink-0">{child.icon}</span>
                            <span>{child.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <a
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#59FFA0]/10 text-[#59FFA0] border border-[#59FFA0]/20'
                    : 'text-[#7DD8E8] hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#7DD8E8] hover:bg-white/8 hover:text-[#007BFF] transition-colors"
          >
            <span className="text-lg">←</span>
            <span>Back to Site</span>
          </a>
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
                className="md:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
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
            <span className="text-xs text-[#7DD8E8] hidden sm:inline">
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
