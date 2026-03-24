/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Sidebar from './components/Sidebar';
import Waves from './components/Waves';
import Dashboard from './components/Dashboard';
import Cases from './components/Cases';
import CriteriaExplorer from './components/CriteriaExplorer';
import CopilotChat from './components/CopilotChat';
import Compliance from './components/Compliance';
import Threads from './components/Threads';
import LineWaves from './components/LineWaves';
import SettingsModal from './components/SettingsModal';
import Auth from './components/Auth';
import Pricing from './components/Pricing';
import GlobalSearch from './components/GlobalSearch';
import TeamManagement from './components/TeamManagement';
import LockedFeature from './components/LockedFeature';
import ProUnlockedNotification from './components/ProUnlockedNotification';
import { Bell, Search, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { supabase } from './lib/supabase';
import { UserProfile, UserPlan, UserRole, MortgageCase } from './types';
import { getUserProfile, updatePlan } from './services/pricingService';
import { 
  playHoverSound, 
  playClickSound, 
  playModalOpenSound, 
  playModalCloseSound, 
  playTypeSound,
  playSuccessSound,
  playCelebrationSound,
  getMuteStatus,
  toggleMute
} from './lib/sounds';

import Onboarding from './components/Onboarding';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [showProUnlockedNotification, setShowProUnlockedNotification] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    plan: 'free',
    company_id: null,
    role: 'broker',
    daily_message_count: 0,
    weekly_message_count: 0,
    last_message_date: null,
    full_name: 'Guest User',
    email: '',
    onboarding_completed: true // Default to true for guest, but we'll check auth
  });

  const [isKeyUnlocked, setIsKeyUnlocked] = useState(false);
  const [typedKey, setTypedKey] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(getMuteStatus());
  const [selectedCase, setSelectedCase] = useState<MortgageCase | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Only play sound for character keys, backspace, and delete when in an input
      if (isInput && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
        playTypeSound();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const hasProAccess = userProfile.plan !== 'free' || isKeyUnlocked;

  const triggerProUnlocked = () => {
    setShowProUnlockedNotification(true);
    playCelebrationSound();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#8B732E', '#B59410', '#F5F5F0'],
    });
  };

  const handleSecretKeySubmit = (key: string) => {
    if (key.includes('Aftrbirth')) {
      setIsKeyUnlocked(true);
      setTypedKey('');
      triggerProUnlocked();
      console.log('Pro Access Unlocked via Secret Key!');
    }
  };

  const handleBypassAuth = () => {
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    setUserProfile({
      id: 'demo-user',
      plan: 'pro',
      company_id: null,
      role: 'broker',
      daily_message_count: 0,
      weekly_message_count: 0,
      last_message_date: null,
      full_name: 'Demo Broker',
      email: 'demo@archo.ai',
      onboarding_completed: true
    });
    setShowOnboarding(false);
    localStorage.setItem('archo_onboarding_dismissed', 'true');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const newKey = (typedKey + e.key).slice(-20);
      setTypedKey(newKey);
      
      if (newKey.includes('Aftrbirth')) {
        handleSecretKeySubmit('Aftrbirth');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [typedKey]);

  useEffect(() => {
    if (isSettingsOpen || isAuthModalOpen || isGlobalSearchOpen || showOnboarding) {
      playModalOpenSound();
    }
  }, [isSettingsOpen, isAuthModalOpen, isGlobalSearchOpen, showOnboarding]);

  const handleToggleMute = () => {
    const newState = toggleMute();
    setIsSoundEnabled(newState);
    playClickSound();
  };

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      callback();
    }
  };

  const fetchProfile = async (userId: string, email: string) => {
    const profile = await getUserProfile(userId);
    if (profile) {
      setUserProfile({
        ...profile,
        email,
        full_name: profile.full_name || 'Hassan Hamidi'
      });
      
      if (profile.onboarding_completed === false) {
        setShowOnboarding(true);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await fetchProfile(user.id, user.email || '');
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // If not authenticated, check if we should show onboarding for guest
        const onboardingStep = localStorage.getItem('archo_onboarding_step');
        if (onboardingStep || !localStorage.getItem('archo_onboarding_dismissed')) {
          setShowOnboarding(true);
        }
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchProfile(session.user.id, session.user.email || '');
        setIsAuthenticated(true);
        setIsAuthModalOpen(false);
      }
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserProfile({
          id: '',
          plan: 'free',
          company_id: null,
          role: 'broker',
          daily_message_count: 0,
          weekly_message_count: 0,
          last_message_date: null,
          full_name: 'Guest User',
          email: '',
          onboarding_completed: true
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResetOnboarding = async () => {
    try {
      if (userProfile.id && userProfile.id !== 'demo-user') {
        const { error } = await supabase
          .from('user_profiles')
          .update({ onboarding_completed: false })
          .eq('id', userProfile.id);
        
        if (error) throw error;
      }
      
      // Clear all possible onboarding related storage
      localStorage.removeItem('archo_onboarding_dismissed');
      localStorage.setItem('archo_onboarding_step', '1');
      localStorage.removeItem('archo_onboarding_data');
      
      // Force reload to trigger initAuth with clean state and default tab
      window.location.href = window.location.origin;
    } catch (err) {
      console.error('Error resetting onboarding:', err);
      alert('Failed to reset onboarding. Please try again.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserProfile({
      id: '',
      plan: 'free',
      company_id: null,
      role: 'broker',
      daily_message_count: 0,
      weekly_message_count: 0,
      last_message_date: null,
      full_name: 'Guest User',
      email: ''
    });
  };

  const handleUpgrade = async (plan: UserPlan) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    const success = await updatePlan(userProfile.id, plan);
    if (success) {
      setUserProfile(prev => ({ ...prev, plan }));
      if (plan === 'pro' || plan === 'company') {
        triggerProUnlocked();
      }
      setActiveTab('dashboard');
    }
  };

  const renderContent = () => {
    const proTabs = ['cases', 'copilot', 'criteria', 'compliance', 'team'];
    
    if (proTabs.includes(activeTab) && !hasProAccess) {
      return (
        <div className="relative h-full flex items-center justify-center">
          {activeTab === 'dashboard' && (
            <Dashboard 
              requireAuth={requireAuth} 
              userProfile={userProfile}
              onUpgrade={() => setActiveTab('pricing')}
              hasProAccess={hasProAccess}
            />
          )}
          <LockedFeature 
            featureName={activeTab === 'copilot' ? 'Archo Chat' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            onUpgrade={() => setActiveTab('pricing')}
            onClose={() => setActiveTab('dashboard')}
            show={true}
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          requireAuth={requireAuth} 
          userProfile={userProfile}
          onUpgrade={() => setActiveTab('pricing')}
          hasProAccess={hasProAccess}
        />;
      case 'cases':
        return <Cases 
          requireAuth={requireAuth} 
          userProfile={userProfile}
          onUpgrade={() => setActiveTab('pricing')}
          hasProAccess={hasProAccess}
          onSelectCase={setSelectedCase}
          selectedCase={selectedCase}
        />;
      case 'criteria':
        return <CriteriaExplorer 
          requireAuth={requireAuth} 
          userPlan={userProfile.plan} 
          onUpgrade={() => setActiveTab('pricing')} 
          hasProAccess={hasProAccess}
        />;
      case 'copilot':
        return <CopilotChat 
          requireAuth={requireAuth} 
          userProfile={userProfile} 
          onUpgrade={() => setActiveTab('pricing')} 
          hasProAccess={hasProAccess}
          currentCase={selectedCase}
          onSessionEnd={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await fetchProfile(user.id, user.email || '');
            }
          }}
        />;
      case 'compliance':
        return <Compliance 
          isAuthenticated={isAuthenticated} 
          userProfile={userProfile}
          onUpgrade={() => setActiveTab('pricing')}
          hasProAccess={hasProAccess}
        />;
      case 'team':
        return <TeamManagement userProfile={userProfile} />;
      case 'pricing':
        return <Pricing 
          currentPlan={userProfile.plan} 
          onUpgrade={handleUpgrade} 
          onSecretKeySubmit={handleSecretKeySubmit}
          isKeyUnlocked={isKeyUnlocked}
        />;
      case 'settings':
        return <Compliance 
          isAuthenticated={isAuthenticated} 
          userProfile={userProfile}
          onUpgrade={() => setActiveTab('pricing')}
        />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-archo-slate relative z-10">
            <p className="text-lg font-medium">This section is under development.</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 text-archo-gold font-bold hover:underline"
            >
              Return to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex">
      {showOnboarding && (
        <Onboarding 
          onComplete={() => {
            setShowOnboarding(false);
            setActiveTab('dashboard');
            localStorage.setItem('archo_onboarding_dismissed', 'true');
          }}
          onSignIn={() => {
            setShowOnboarding(false);
            setIsAuthModalOpen(true);
          }}
        />
      )}
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onProfileClick={() => setIsSettingsOpen(true)}
        onSignInClick={() => setIsAuthModalOpen(true)}
        userProfile={userProfile}
        hasProAccess={hasProAccess}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <main className={`flex-1 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} min-h-screen flex flex-col relative transition-all duration-300 ease-in-out`}>
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Warm Gold Radial Gradient */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)] -translate-y-1/4 translate-x-1/4 blur-3xl" />
          
          {/* Background Threads - Only on non-LineWaves pages */}
          {!(activeTab === 'cases' || activeTab === 'criteria' || activeTab === 'team') && (
            <div className="absolute inset-0 opacity-30">
              <Threads
                amplitude={3.6}
                distance={0.9}
                enableMouseInteraction={false}
                color={[0.54, 0.45, 0.18]} // Archo Brass color normalized
              />
            </div>
          )}

          {/* Background Waves - Only on non-LineWaves pages */}
          {!(activeTab === 'cases' || activeTab === 'criteria' || activeTab === 'team') && (
            <div className="absolute inset-0 opacity-[0.15]">
              <Waves
                lineColor="#D4AF37"
                backgroundColor="transparent"
                waveAmpX={40}
                waveAmpY={25}
                waveSpeedX={0.01}
                waveSpeedY={0.004}
                xGap={12}
                yGap={36}
              />
            </div>
          )}

          {/* Line Waves for specific pages */}
          {(activeTab === 'cases' || activeTab === 'criteria' || activeTab === 'team') && (
            <div className="absolute inset-0 opacity-60">
              <LineWaves
                speed={0.3}
                innerLineCount={32}
                outerLineCount={36}
                warpIntensity={1}
                rotation={-45}
                edgeFadeWidth={0}
                colorCycleSpeed={1}
                brightness={0.4}
                color1="#8B732E" // Archo Brass
                color2="#B59410" // Archo Brass Light
                color3="#D4AF37" // Archo Brass Pale
                enableMouseInteraction
                mouseInfluence={5}
              />
            </div>
          )}
        </div>

        {/* Top Header Bar */}
        <header className="h-16 bg-archo-paper/80 backdrop-blur-md border-b border-archo-brass/10 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4 text-archo-slate">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search cases, documents, or criteria..." 
              className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-archo-muted cursor-pointer"
              readOnly
              onClick={() => setIsGlobalSearchOpen(true)}
            />
            <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-archo-brass/5 border border-archo-brass/10 rounded text-[10px] font-bold text-archo-brass">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={handleToggleMute}
              onMouseEnter={playHoverSound}
              className="text-archo-slate hover:text-archo-brass transition-colors"
              title={isSoundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button 
              onClick={() => {
                playClickSound();
                alert('Notifications panel coming soon!');
              }}
              onMouseEnter={playHoverSound}
              className="text-archo-slate hover:text-archo-brass transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-archo-brass rounded-full border-2 border-archo-paper"></span>
            </button>
            <button 
              onClick={() => {
                playClickSound();
                alert('Help center opening...');
              }}
              onMouseEnter={playHoverSound}
              className="text-archo-slate hover:text-archo-brass transition-colors"
            >
              <HelpCircle size={20} />
            </button>
            <div className="h-8 w-[1px] bg-archo-brass/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-archo-brass uppercase tracking-widest">
                {hasProAccess ? (userProfile.plan === 'company' ? 'Company Plan' : 'Pro Plan') : 'Solo Plan'}
              </span>
              <div className="px-2 py-0.5 bg-archo-brass text-archo-cream rounded text-[10px] font-bold uppercase tracking-tighter">
                {hasProAccess ? (userProfile.plan === 'company' ? 'Enterprise' : 'Pro') : 'Free'}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto relative z-10">
          {renderContent()}
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        userProfile={userProfile}
        onUpdateProfile={(full_name, role) => setUserProfile(prev => ({ ...prev, full_name, role: role as UserRole }))}
        onResetOnboarding={handleResetOnboarding}
      />

      {isAuthModalOpen && (
        <Auth 
          onClose={() => setIsAuthModalOpen(false)} 
          userProfile={isAuthenticated ? userProfile : null}
          onLogout={handleLogout}
          onBypass={handleBypassAuth}
        />
      )}

      <GlobalSearch 
        isOpen={isGlobalSearchOpen} 
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectCase={(id) => setActiveTab('cases')}
        onSelectLender={(id) => setActiveTab('criteria')}
      />

      <ProUnlockedNotification 
        isVisible={showProUnlockedNotification} 
        onClose={() => setShowProUnlockedNotification(false)} 
      />
    </div>
  );
}
