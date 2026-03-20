import React from 'react';
import { LayoutDashboard, Briefcase, MessageSquare, Search, Settings, ShieldCheck, Gem, Crown, Building2, LogOut, Users } from 'lucide-react';
import ArchoLogo from './Logo';
import BorderGlow from './BorderGlow';
import { UserProfile, UserPlan } from '../types';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onProfileClick: () => void;
  onSignInClick: () => void;
  userProfile: UserProfile;
}

export default function Sidebar({ activeTab, setActiveTab, onProfileClick, onSignInClick, userProfile }: SidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Cases', icon: Briefcase },
    { id: 'copilot', label: 'Archo Chat', icon: MessageSquare },
    { id: 'criteria', label: 'Criteria Explorer', icon: Search },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
    { id: 'pricing', label: 'Pricing', icon: Gem },
  ];

  if (userProfile.plan === 'company') {
    navItems.splice(5, 0, { id: 'team', label: 'Team Management', icon: Users });
  }

  const getPlanBadge = (plan: UserPlan) => {
    switch (plan) {
      case 'pro':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-archo-brass text-archo-cream rounded text-[8px] font-bold uppercase tracking-tighter shadow-sm">
            <Crown size={8} /> Pro
          </div>
        );
      case 'company':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-archo-ink text-archo-cream rounded text-[8px] font-bold uppercase tracking-tighter shadow-sm border border-archo-brass/30">
            <Building2 size={8} /> Company
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-archo-slate/10 text-archo-slate rounded text-[8px] font-bold uppercase tracking-tighter border border-archo-slate/20">
            Free
          </div>
        );
    }
  };

  return (
    <div className="w-64 bg-archo-ink h-screen flex flex-col text-archo-cream fixed left-0 top-0 border-r border-archo-brass/20 z-30">
      <div className="p-8 flex items-center gap-3">
        <div className="bg-archo-cream p-1 rounded-full shadow-lg border border-archo-brass/20">
          <ArchoLogo className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight italic leading-none text-archo-brass-pale">ARCHO</h1>
          <p className="text-[9px] text-archo-muted uppercase tracking-[0.2em] mt-1.5 leading-none font-bold">Mortgage Specialised AI</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-3">
        {navItems.map((item) => (
          <BorderGlow
            key={item.id}
            glowColor="45 50 50"
            colors={['#8B732E', '#B59410', '#D4AF37']}
            backgroundColor={activeTab === item.id ? '#1A1A1A' : 'transparent'}
            borderRadius={24}
            glowRadius={20}
            glowIntensity={activeTab === item.id ? 1.0 : 0.3}
            className="w-full"
          >
            <button
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all text-sm font-medium ${
                activeTab === item.id
                  ? 'text-archo-cream'
                  : 'text-archo-muted hover:text-archo-brass-pale hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-archo-cream' : 'text-archo-brass/60'} />
              <span className="font-serif tracking-wide">{item.label}</span>
            </button>
          </BorderGlow>
        ))}
      </nav>

      <div className="p-6 border-t border-archo-brass/10">
        {!userProfile.email ? (
          <BorderGlow
            glowColor="45 50 50"
            colors={['#8B732E', '#B59410', '#D4AF37']}
            backgroundColor="rgba(139, 115, 46, 0.1)"
            borderRadius={12}
            glowRadius={20}
            glowIntensity={0.5}
            className="w-full"
          >
            <button 
              onClick={onSignInClick}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left border border-archo-brass/20 group"
            >
              <div className="w-9 h-9 rounded-full border border-archo-brass/30 bg-archo-brass/20 flex items-center justify-center text-archo-brass-pale font-serif font-bold text-xs flex-shrink-0 group-hover:bg-archo-brass group-hover:text-archo-cream transition-colors">
                ?
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-serif font-bold truncate text-archo-cream">Not signed in</p>
                <p className="text-[10px] text-archo-brass truncate uppercase tracking-wider font-bold">Click to Sign In</p>
              </div>
            </button>
          </BorderGlow>
        ) : (
          <div className="flex flex-col gap-4">
            <button 
              onClick={onProfileClick}
              className="w-full flex items-center gap-3 hover:bg-white/5 p-2 -m-2 rounded-xl transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full border border-archo-brass/30 bg-archo-brass/10 flex items-center justify-center text-archo-brass-pale font-serif font-bold text-xs flex-shrink-0 group-hover:bg-archo-brass group-hover:text-archo-cream transition-colors">
                {userProfile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || userProfile.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-serif font-bold truncate text-archo-cream">{userProfile.full_name || 'Hassan Hamidi'}</p>
                  {getPlanBadge(userProfile.plan)}
                </div>
                <p className="text-[10px] text-archo-muted truncate uppercase tracking-wider font-bold">{userProfile.role}</p>
              </div>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
