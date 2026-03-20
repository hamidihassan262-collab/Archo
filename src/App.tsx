/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Cases from './components/Cases';
import CriteriaExplorer from './components/CriteriaExplorer';
import CopilotChat from './components/CopilotChat';
import Compliance from './components/Compliance';
import Threads from './components/Threads';
import SettingsModal from './components/SettingsModal';
import Auth from './components/Auth';
import { Bell, Search, HelpCircle } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthPage, setIsAuthPage] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: 'Guest User',
    role: 'Broker',
    email: ''
  });

  useEffect(() => {
    const initAuth = async () => {
      // Check if we've already forced a logout in this session
      const hasForcedLogout = sessionStorage.getItem('archo_forced_logout');
      
      if (!hasForcedLogout) {
        await supabase.auth.signOut();
        sessionStorage.setItem('archo_forced_logout', 'true');
        setIsAuthPage(true);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserProfile({
            name: user.user_metadata?.full_name || 'Hassan Hamidi',
            role: user.user_metadata?.role || 'Independent Broker',
            email: user.email || ''
          });
          setIsAuthPage(false);
        } else {
          setIsAuthPage(true);
        }
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('Logged in as:', session.user.email);
        setUserProfile({
          name: session.user.user_metadata?.full_name || 'Hassan Hamidi',
          role: session.user.user_metadata?.role || 'Independent Broker',
          email: session.user.email || ''
        });
        setIsAuthPage(false);
      }
      if (event === 'SIGNED_OUT') {
        console.log('Logged out');
        setIsAuthPage(true);
        setUserProfile({
          name: 'Guest User',
          role: 'Broker',
          email: ''
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthPage) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cases':
        return <Cases />;
      case 'criteria':
        return <CriteriaExplorer />;
      case 'copilot':
        return <CopilotChat />;
      case 'settings':
        return <Compliance />;
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
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onProfileClick={() => setIsSettingsOpen(true)}
        userProfile={userProfile}
      />
      
      <main className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Background Threads */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
          <Threads
            amplitude={3.6}
            distance={0.9}
            enableMouseInteraction={false}
            color={[0.54, 0.45, 0.18]} // Archo Brass color normalized
          />
        </div>

        {/* Top Header Bar */}
        <header className="h-16 bg-archo-paper/80 backdrop-blur-md border-b border-archo-brass/10 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4 text-archo-slate">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search cases, documents, or criteria..." 
              className="bg-transparent border-none focus:outline-none text-sm w-64 placeholder:text-archo-muted"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => alert('Notifications panel coming soon!')}
              className="text-archo-slate hover:text-archo-brass transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-archo-brass rounded-full border-2 border-archo-paper"></span>
            </button>
            <button 
              onClick={() => alert('Help center opening...')}
              className="text-archo-slate hover:text-archo-brass transition-colors"
            >
              <HelpCircle size={20} />
            </button>
            <div className="h-8 w-[1px] bg-archo-brass/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-archo-brass uppercase tracking-widest">Solo Plan</span>
              <div className="px-2 py-0.5 bg-archo-brass text-archo-cream rounded text-[10px] font-bold uppercase tracking-tighter">Pro</div>
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
        onUpdateProfile={(name, role) => setUserProfile(prev => ({ ...prev, name, role }))}
      />
    </div>
  );
}
