import React from 'react';
import { LayoutDashboard, Briefcase, MessageSquare, Search, Settings, ShieldCheck, Gem, Crown, Building2, LogOut, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import ArchoLogo from './Logo';
import BorderGlow from './BorderGlow';
import Waves from './Waves';
import { UserProfile, UserPlan } from '../types';
import { supabase } from '../lib/supabase';
import { playHoverSound, playClickSound } from '../lib/sounds';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onProfileClick: () => void;
  onSignInClick: () => void;
  userProfile: UserProfile;
  hasProAccess: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onProfileClick, 
  onSignInClick, 
  userProfile, 
  hasProAccess,
  isCollapsed,
  setIsCollapsed
}: SidebarProps) {
  const handleLogout = async () => {
    playClickSound();
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

  if (userProfile.plan === 'company' || hasProAccess) {
    navItems.splice(5, 0, { id: 'team', label: 'Team Management', icon: Users });
  }

  const getPlanBadge = (plan: UserPlan) => {
    if (hasProAccess && plan === 'free') {
      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-archo-brass text-archo-cream rounded text-[8px] font-bold uppercase tracking-tighter shadow-sm">
          <Crown size={8} /> Pro (Key)
        </div>
      );
    }
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
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-archo-ink h-screen flex flex-col text-archo-cream fixed left-0 top-0 border-r border-archo-brass/20 z-30 overflow-hidden transition-all duration-300 ease-in-out`}>
      <Waves
        lineColor="#ffffff"
        backgroundColor="transparent"
        waveSpeedX={0.0125}
        waveSpeedY={0.01}
        waveAmpX={40}
        waveAmpY={20}
        friction={0.9}
        tension={0.01}
        maxCursorMove={120}
        xGap={12}
        yGap={36}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <ArchoLogo className="w-32" light />}
          {isCollapsed && <div className="w-8 h-8 bg-archo-brass rounded-lg flex items-center justify-center font-serif font-bold text-archo-cream">A</div>}
          <button 
            onClick={() => {
              playClickSound();
              setIsCollapsed(!isCollapsed);
            }}
            onMouseEnter={playHoverSound}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-archo-brass hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-3">
        {navItems.map((item) => (
          <BorderGlow
            key={item.id}
            glowColor="45 50 50"
            colors={['#8B732E', '#B59410', '#D4AF37']}
            backgroundColor={activeTab === item.id ? '#1A1A1A' : 'transparent'}
            borderRadius={isCollapsed ? 12 : 24}
            glowRadius={20}
            glowIntensity={activeTab === item.id ? 1.0 : 0.3}
            className="w-full"
          >
            <button
              onClick={() => {
                playClickSound();
                setActiveTab(item.id);
              }}
              onMouseEnter={playHoverSound}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-full transition-all text-sm font-medium ${
                activeTab === item.id
                  ? 'text-archo-cream'
                  : 'text-archo-muted hover:text-archo-brass-pale hover:bg-white/5'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className={activeTab === item.id ? 'text-archo-cream' : 'text-archo-brass/60'} />
              {!isCollapsed && <span className="font-serif tracking-wide">{item.label}</span>}
            </button>
          </BorderGlow>
        ))}
      </nav>

      <div className={`p-6 border-t border-archo-brass/10 ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
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
              onClick={() => {
                playClickSound();
                onSignInClick();
              }}
              onMouseEnter={playHoverSound}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 p-3'} rounded-xl transition-all text-left border border-archo-brass/20 group`}
              title={isCollapsed ? "Sign In" : undefined}
            >
              <div className="w-9 h-9 rounded-full border border-archo-brass/30 bg-archo-brass/20 flex items-center justify-center text-archo-brass-pale font-serif font-bold text-xs flex-shrink-0 group-hover:bg-archo-brass group-hover:text-archo-cream transition-colors">
                ?
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-serif font-bold truncate text-archo-cream">Not signed in</p>
                  <p className="text-[10px] text-archo-brass truncate uppercase tracking-wider font-bold">Click to Sign In</p>
                </div>
              )}
            </button>
          </BorderGlow>
        ) : (
          <div className={`flex flex-col ${isCollapsed ? 'items-center' : ''} gap-4`}>
            <button 
              onClick={() => {
                playClickSound();
                onProfileClick();
              }}
              onMouseEnter={playHoverSound}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 p-2 -m-2'} hover:bg-white/5 rounded-xl transition-all text-left group`}
              title={isCollapsed ? userProfile.full_name || userProfile.email : undefined}
            >
              <div className="w-9 h-9 rounded-full border border-archo-brass/30 bg-archo-brass/10 flex items-center justify-center text-archo-brass-pale font-serif font-bold text-xs flex-shrink-0 group-hover:bg-archo-brass group-hover:text-archo-cream transition-colors">
                {userProfile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || userProfile.email?.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-serif font-bold truncate text-archo-cream">{userProfile.full_name || 'Hassan Hamidi'}</p>
                    {getPlanBadge(userProfile.plan)}
                  </div>
                  <p className="text-[10px] text-archo-muted truncate uppercase tracking-wider font-bold">{userProfile.role}</p>
                </div>
              )}
            </button>
            <button 
              onClick={handleLogout}
              onMouseEnter={playHoverSound}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-3 py-2'} text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-lg transition-colors`}
              title={isCollapsed ? "Sign Out" : undefined}
            >
              <LogOut size={12} /> {!isCollapsed && "Sign Out"}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
