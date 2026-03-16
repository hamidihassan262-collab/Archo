import React from 'react';
import { LayoutDashboard, Briefcase, MessageSquare, Search, Settings, ShieldCheck } from 'lucide-react';
import ArchoLogo from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onProfileClick: () => void;
  userProfile: { name: string; role: string };
}

export default function Sidebar({ activeTab, setActiveTab, onProfileClick, userProfile }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Cases', icon: Briefcase },
    { id: 'copilot', label: 'Archo Chat', icon: MessageSquare },
    { id: 'criteria', label: 'Criteria Explorer', icon: Search },
    { id: 'settings', label: 'Compliance', icon: ShieldCheck },
  ];

  return (
    <div className="w-64 bg-archo-ink h-screen flex flex-col text-archo-cream fixed left-0 top-0 border-r border-archo-brass/20">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-archo-cream p-1 rounded-full shadow-lg border border-archo-brass/20">
          <ArchoLogo className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight italic leading-none text-archo-brass-pale">ARCHO</h1>
          <p className="text-[9px] text-archo-muted uppercase tracking-[0.2em] mt-1.5 leading-none font-bold">Mortgage Specialised AI</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium ${
              activeTab === item.id
                ? 'bg-archo-brass text-archo-cream shadow-md'
                : 'text-archo-muted hover:text-archo-brass-pale hover:bg-white/5'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-archo-cream' : 'text-archo-brass/60'} />
            <span className="font-serif tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-archo-brass/10">
        <button 
          onClick={onProfileClick}
          className="w-full flex items-center gap-3 hover:bg-white/5 p-2 -m-2 rounded-xl transition-all text-left"
        >
          <div className="w-9 h-9 rounded-full border border-archo-brass/30 bg-archo-brass/10 flex items-center justify-center text-archo-brass-pale font-serif font-bold text-xs flex-shrink-0">
            {userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-serif font-bold truncate text-archo-cream">{userProfile.name}</p>
            <p className="text-[10px] text-archo-muted truncate uppercase tracking-wider">{userProfile.role}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
