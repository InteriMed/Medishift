'use client';

import { useState, useEffect, useRef } from 'react';
import { ClipizyLogo } from '@/components/common/clipizy-logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  FileText,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Calendar,
  Users,
  Database,
  MessageSquare,
  BarChart3,
  Gift,
  Wrench,
  Shield,
  Download,
  TestTube,
  Network,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { AdminRoute } from '@/components/layout/admin-route';
import { AdminLayoutProvider } from '@/contexts/admin-layout-context';

const adminNavigation = [
  { name: 'Overview', href: '/admin/overview', icon: Home },
  { name: 'Metrics', href: '/admin/metrics', icon: BarChart3 },
  { name: 'Agent Analytics', href: '/admin/agent-analytics', icon: Network },
  { name: 'Missing Actions', href: '/admin/missing-actions', icon: AlertCircle },
  { name: 'Security', href: '/admin/security', icon: Shield },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Communication', href: '/admin/communication', icon: MessageSquare },
  { name: 'Referral Codes', href: '/admin/referral-codes', icon: Gift },
  { name: 'Database', href: '/admin/database', icon: Database },
  { name: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
  { name: 'Test', href: '/admin/test', icon: TestTube },
  { name: 'Calendar', href: '/admin/posts/calendar', icon: Calendar },
  { name: 'Posts', href: '/admin/posts', icon: FileText },
  { name: 'Logo', href: '/admin/logo', icon: Download },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <AdminRoute>
      <AdminLayoutProvider closeMenu={() => setSidebarOpen(false)}>
        <div className="min-h-screen">
          {/* MOBILE SIDEBAR OVERLAY */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* SIDEBAR */}
          <div
            className={`fixed inset-y-0 left-0 z-[60] ${sidebarCollapsed ? 'w-20' : 'w-72'} bg-[#0B0C15] border-r border-white/5 transform transition-all duration-300 ease-custom-ease md:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* SIDEBAR HEADER */}
              <div
                className={`flex flex-col p-6 ${sidebarCollapsed ? 'items-center' : ''}`}
              >
                <div
                  className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-4' : 'justify-between'} mb-8`}
                >
                  {sidebarCollapsed ? (
                    <>
                      <Link
                        href="/admin"
                        className="flex items-center justify-center group relative"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <ClipizyLogo className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full w-8 h-8 p-0 transition-all duration-200"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title="Expand sidebar"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 group"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <ClipizyLogo className="w-8 h-8 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                          Admin
                        </span>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full w-8 h-8 p-0 transition-all duration-200 self-end -mt-2"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title="Collapse sidebar"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden text-white/70 hover:text-white hover:bg-white/10"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* NAVIGATION */}
              <nav className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <ul className="space-y-1.5">
                  {adminNavigation.map(item => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + '/');

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? 'text-white shadow-lg shadow-primary/5'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                          title={sidebarCollapsed ? item.name : undefined}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/10 opacity-100 transition-opacity duration-300" />
                          )}
                          {isActive && !sidebarCollapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                          )}

                          <Icon
                            className={`relative z-10 transition-all duration-300 ${
                              sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                            } ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'group-hover:text-white'}`}
                          />

                          {!sidebarCollapsed && (
                            <span
                              className={`relative z-10 text-sm font-medium transition-all duration-300 ${
                                isActive
                                  ? 'translate-x-1'
                                  : 'group-hover:translate-x-1'
                              }`}
                            >
                              {item.name}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* USER PROFILE */}
              <div className="p-4 border-t border-white/5 bg-black/10">
                <div
                  className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'mb-4'}`}
                >
                  <div
                    className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/5 ring-1 ring-white/5`}
                  >
                    <User
                      className={
                        sidebarCollapsed
                          ? 'w-5 h-5 text-primary'
                          : 'w-5 h-5 text-primary'
                      }
                    />
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.email}
                      </p>
                      <p className="text-xs text-white/50 font-medium">
                        Administrator
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  className={`w-full ${sidebarCollapsed ? 'justify-center' : 'justify-start'} text-white/40 hover:text-red-400 hover:bg-red-400/10 h-10 rounded-xl transition-all duration-200`}
                  onClick={signOut}
                  title={sidebarCollapsed ? 'Sign Out' : undefined}
                >
                  <LogOut
                    className={sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}
                  />
                  {!sidebarCollapsed && (
                    <span className="ml-3 text-sm font-medium">Sign Out</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div
            className={`${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'} transition-all duration-300 ease-custom-ease`}
          >
            {/* MOBILE MENU BUTTON */}
            <div className="md:hidden fixed top-4 left-4 z-40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="bg-gray-900/80 backdrop-blur border border-gray-700 text-white hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* PAGE CONTENT */}
            <AdminContentWrapper closeMenu={() => setSidebarOpen(false)}>
              {children}
            </AdminContentWrapper>
          </div>
        </div>
      </AdminLayoutProvider>
    </AdminRoute>
  );
}

function AdminContentWrapper({
  children,
  closeMenu,
}: {
  children: React.ReactNode;
  closeMenu: () => void;
}) {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!mainRef.current) return;

      if (mainRef.current.contains(target)) {
        const tabsContent = target.closest('[role="tabpanel"]');
        if (tabsContent) {
          closeMenu();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [closeMenu]);

  return (
    <main ref={mainRef} className="flex-1 min-h-screen">
      {children}
    </main>
  );
}
