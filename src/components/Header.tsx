import React from 'react';
import { Download, Bot, Cloud, Terminal, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDownloadWorker: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onDownloadWorker }) => {
  const navItems = [
    { id: 'generator', label: 'Worker Generator' },
    { id: 'cloudflare', label: 'Cloudflare Setup' },
    { id: 'tester', label: '3x-ui API Tester' },
    { id: 'simulator', label: 'Bot Simulator' },
    { id: 'docs', label: 'API Reference' },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveTab('generator')}
          className="text-left group flex items-center gap-2.5 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white group-hover:text-sky-400 transition-colors">
            3x-ui Telegram Cloudflare Hub
          </span>
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`transition-colors whitespace-nowrap py-1 relative ${
                  isActive
                    ? 'text-sky-400 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onDownloadWorker}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-sky-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download worker.js</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-neutral-800/80 gap-3 scrollbar-none text-xs">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md transition-colors ${
              activeTab === item.id
                ? 'bg-sky-500/15 text-sky-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
