'use client';

import "./globals.css";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/auth/useUser';
import { signOut } from '@/app/auth/supabase';
import Script from 'next/script';
import { Bell, Search, Wallet, Settings, LayoutDashboard, Cpu, Brain, Coins, Users, Info, LogOut, User, Sparkles, Network, Menu, Twitter, Send } from 'lucide-react';
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import { Toaster } from 'react-hot-toast';
import { Inter } from 'next/font/google';
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/page-transition";
import { useRouter } from 'next/navigation';
import { LockIcon } from '@/components/LockIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModalVisibilityManager } from "@/utils/modal-visiblity";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Compute', href: '/gpu-marketplace', icon: Cpu,  },
  { name: 'AI Models', href: '/ai-models', icon: Brain, isNew: true },
  { name: 'AI Agents', href: '#', icon: Sparkles, isLocked: true, disabled: true },
  { name: 'Earnings', href: '#', icon: Coins, isLocked: true, disabled: true },
  { name: 'Connect to Earn', href: '#', icon: Network, isLocked: true, disabled: true },
  { name: 'Wallet', href: '#', icon: Wallet, isLocked: true, disabled: true },
  { name: 'Community', href: '#', icon: Users, isLocked: true, disabled: true },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'More info', href: '/more-info', icon: Info },
];

const localInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-FQDR1HDD3K" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FQDR1HDD3K');
          `}
        </Script>
      </head>
      <body className={localInter.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            {isAuthPage ? (
              <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
                {children}
              </div>
            ) : (
              <MainLayout isSidebarCollapsed={isSidebarCollapsed} setIsSidebarCollapsed={setIsSidebarCollapsed}>
                {children}
              </MainLayout>
            )}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}

function MainLayout({ 
  children,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}: { 
  children: React.ReactNode;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const router = useRouter();
  const { user, loading } = useUser();

  const handleLogout = async () => {
    try {
      await signOut();
      ModalVisibilityManager.resetModalVisibility("all")
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Don't show sidebar and header on the sign-in page
  const isSignInPage = pathname === '/';
  if (isSignInPage) {
    return <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">{children}</div>;
  }
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black grid-background">
      {/* Header */}
      <header className="fixed top-0 z-[40] w-full border-b border-gray-800 bg-black/95">
        <div className="px-4 md:px-8 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-4 md:gap-12">
            {/* Hamburger Menu */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-white/5 rounded-lg"
            >
              <Menu className="h-6 w-6 text-gray-400" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img src="/neurolov-logo.svg" alt="Neurolov" className="h-8" />
            </Link>

            
          </div>

          <div className="flex items-center space-x-4">
            {/* Social Media Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2 hover:bg-white/5 rounded-lg">
                <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024">
                  <path fill="currentColor" d="M767.99994 585.142857q75.995429 0 129.462857 53.394286t53.394286 129.462857-53.394286 129.462857-129.462857 53.394286-129.462857-53.394286-53.394286-129.462857q0-6.875429 1.170286-19.456l-205.677714-102.838857q-52.589714 49.152-124.562286 49.152-75.995429 0-129.462857-53.394286t-53.394286-129.462857 53.394286-129.462857 129.462857-53.394286q71.972571 0 124.562286 49.152l205.677714-102.838857q-1.170286-12.580571-1.170286-19.456 0-75.995429 53.394286-129.462857t129.462857-53.394286 129.462857 53.394286 53.394286 129.462857-53.394286 129.462857-129.462857 53.394286q-71.972571 0-124.562286-49.152l-205.677714 102.838857q1.170286 12.580571 1.170286 19.456t-1.170286 19.456l205.677714 102.838857q52.589714-49.152 124.562286-49.152z" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-fit p-2 bg-black/90 backdrop-blur-xl border border-white/10 z-[50]">
                <DropdownMenuItem 
                  className="flex items-center justify-center p-3 text-gray-300 hover:text-white focus:text-white cursor-pointer"
                  onClick={() => window.open('https://twitter.com/neurolov', '_blank')}
                >
                  <Twitter className="h-8 w-8" />
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center justify-center p-3 text-gray-300 hover:text-white focus:text-white cursor-pointer"
                  onClick={() => window.open('https://t.me/neurolovcommunity', '_blank')}
                >
                  <Send className="h-8 w-8" />
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center justify-center p-3 text-gray-300 hover:text-white focus:text-white cursor-pointer"
                  onClick={() => window.open('https://instagram.com/neurolov.ai', '_blank')}
                >
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1024 1024">
                    <path fill="currentColor" d="M512 378.7c-73.4 0-133.3 59.9-133.3 133.3S438.6 645.3 512 645.3 645.3 585.4 645.3 512 585.4 378.7 512 378.7zM911.8 512c0-55.2.5-109.9-2.6-165-3.1-64-17.7-120.8-64.5-167.6-46.9-46.9-103.6-61.4-167.6-64.5-55.2-3.1-109.9-2.6-165-2.6-55.2 0-109.9-.5-165 2.6-64 3.1-120.8 17.7-167.6 64.5C132.6 226.3 118.1 283 115 347c-3.1 55.2-2.6 109.9-2.6 165s-.5 109.9 2.6 165c3.1 64 17.7 120.8 64.5 167.6 46.9 46.9 103.6 61.4 167.6 64.5 55.2 3.1 109.9 2.6 165 2.6 55.2 0 109.9.5 165-2.6 64-3.1 120.8-17.7 167.6-64.5 46.9-46.9 61.4-103.6 64.5-167.6 3.2-55.1 2.6-109.8 2.6-165zM512 717.1c-113.5 0-205.1-91.6-205.1-205.1S398.5 306.9 512 306.9 717.1 398.5 717.1 512 625.5 717.1 512 717.1zm213.5-370.7c-26.5 0-47.9-21.4-47.9-47.9s21.4-47.9 47.9-47.9 47.9 21.4 47.9 47.9c-.1 26.6-21.4 47.9-47.9 47.9z" />
                  </svg>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown - Only show when logged in */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 hover:bg-white/5 rounded-lg">
                  <User className="h-6 w-6 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-fit p-2 bg-black/90 backdrop-blur-xl border border-white/10 z-[50]">
                  <DropdownMenuItem 
                    className="flex items-center justify-center p-3 text-gray-300 hover:text-white focus:text-white cursor-pointer"
                    onClick={() => router.push('/auth/profile')}
                  >
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center justify-center p-3 text-gray-300 hover:text-white focus:text-white cursor-pointer"
                    onClick={handleLogout}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-screen pt-20">
        {/* Persistent Sidebar for Desktop */}
        <div className="hidden md:block fixed top-20 bottom-0 w-64 border-r border-gray-800 glass backdrop-blur-xl ">
          <nav className="h-full px-4 py-5">
            <div className="space-y-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault();
                        return;
                      }
                    }}
                    className={`group flex items-center justify-between px-4 py-3.5 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : item.disabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.isNew && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#06115D] animate-pulse">
                          NEW
                        </span>
                      )}
                      {item.isLocked && <LockIcon />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/20 z-40 md:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, x: -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.3 }}
                className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 border-r border-gray-800 glass z-50 backdrop-blur-xl md:hidden"
              >
                <nav className="h-full px-4 py-5">
                  <div className="space-y-1.5">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={(e) => {
                            if (item.disabled) {
                              e.preventDefault();
                              return;
                            }
                            setIsMenuOpen(false);
                          }}
                          className={`group flex items-center justify-between px-4 py-3.5 text-base font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-white/10 text-white'
                              : item.disabled
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {item.isNew && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#06115D] animate-pulse">
                                NEW
                              </span>
                            )}
                            {item.isLocked && <LockIcon />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 px-8 py-6 md:ml-64">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
