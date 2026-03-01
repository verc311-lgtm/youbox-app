import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50/50">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="flex z-30 h-16 shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-xl px-4 sm:px-6 sticky top-0">
          <div className="flex flex-1 items-center gap-x-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors lg:hidden rounded-lg hover:bg-slate-100/50"
            >
              <Menu className="h-6 w-6" />
            </button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-x-5">
            <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            </button>
            <div className="relative group cursor-pointer">
              <div className="h-9 w-9 overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 shadow-sm shrink-0 border border-blue-200/50 transition-transform group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                  AD
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Decorative background blur blobs for the main content area */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]" />
          <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-400/5 blur-[120px]" />
        </div>

        <main className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <div className="mx-auto max-w-7xl max-h-full p-4 sm:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
