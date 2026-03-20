import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, User, Shield, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PrimaryButton from './PrimaryButton';
import { UserProfile, UserRole } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (full_name: string, role: string) => void;
}

export default function SettingsModal({ isOpen, onClose, userProfile, onUpdateProfile }: SettingsModalProps) {
  const [fullName, setFullName] = useState(userProfile.full_name || '');
  const [role, setRole] = useState(userProfile.role);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Simple redirect/reload to trigger auth state change
  };

  const handleSave = () => {
    onUpdateProfile(fullName, role);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-archo-cream w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-archo-brass/20"
          >
            <div className="p-8 border-b border-archo-brass/10 flex justify-between items-center bg-archo-paper">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-archo-brass rounded-xl flex items-center justify-center text-archo-cream">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-archo-ink">User Settings</h3>
                  <p className="text-[10px] text-archo-muted uppercase tracking-widest font-bold">Manage your Archo profile</p>
                </div>
              </div>
              <button onClick={onClose} className="text-archo-muted hover:text-archo-ink transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Email Address</label>
                  <div className="w-full bg-archo-brass/5 border border-archo-brass/10 rounded-xl p-3 text-archo-slate text-sm font-mono">
                    {userProfile.email}
                  </div>
                  <p className="text-[9px] text-archo-muted mt-1 italic">Email cannot be changed in this version.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Display Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 text-archo-ink font-serif font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Professional Role</label>
                  <input 
                    type="text" 
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 text-archo-ink font-serif font-bold"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-archo-brass/10 flex flex-col gap-4">
                <PrimaryButton 
                  onClick={handleSave}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Changes
                </PrimaryButton>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full py-4 border border-red-200 text-red-600 rounded-2xl font-serif font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
