import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, ArrowRight, AlertCircle, X, LogOut, User, Shield, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PrimaryButton from './PrimaryButton';
import ArchoLogo from './Logo';
import { UserProfile } from '../types';

interface AuthProps {
  onClose?: () => void;
  userProfile?: UserProfile | null;
  onLogout?: () => void;
  onBypass?: () => void;
}

export default function Auth({ onClose, userProfile, onLogout, onBypass }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data?.user) {
          // No need to redirect, App.tsx onAuthStateChange will handle it
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: 'New Broker',
              role: 'Independent Broker'
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data?.user) {
          setSuccess('Check your email for the confirmation link!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  if (userProfile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-archo-ink/60 backdrop-blur-sm p-4 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-archo-brass blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-archo-brass blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-archo-cream rounded-3xl p-8 shadow-2xl border border-archo-brass/20 relative z-10"
        >
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-archo-slate hover:text-archo-brass transition-colors p-2 hover:bg-archo-brass/5 rounded-full"
            >
              <X size={20} />
            </button>
          )}

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-archo-brass/10 rounded-full flex items-center justify-center text-archo-brass mx-auto mb-4 border-2 border-archo-brass/20 relative">
              <User size={40} />
              <div className="absolute -bottom-1 -right-1 bg-archo-brass text-archo-cream p-1.5 rounded-full border-2 border-archo-cream shadow-sm">
                {userProfile.plan === 'free' ? <Shield size={12} /> : <Crown size={12} />}
              </div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-archo-ink">
              {userProfile.full_name}
            </h2>
            <p className="text-archo-slate mt-1 font-serif italic text-sm">
              {userProfile.email}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-archo-brass/10 rounded-full border border-archo-brass/20 text-archo-brass text-[10px] font-bold uppercase tracking-widest">
              {userProfile.plan.toUpperCase()} Plan
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-archo-paper border border-archo-brass/10 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-archo-muted font-bold uppercase tracking-widest">Role</span>
                <span className="text-archo-ink font-serif font-bold">{userProfile.role}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-archo-muted font-bold uppercase tracking-widest">Daily Messages</span>
                <span className="text-archo-ink font-serif font-bold">{userProfile.daily_message_count} / 5</span>
              </div>
              <div className="w-full h-1.5 bg-archo-brass/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-archo-brass transition-all duration-500" 
                  style={{ width: `${Math.min((userProfile.daily_message_count / 5) * 100, 100)}%` }}
                />
              </div>
            </div>

            <PrimaryButton 
              onClick={() => {
                if (onLogout) onLogout();
                if (onClose) onClose();
              }}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
            >
              <LogOut size={18} /> Sign Out
            </PrimaryButton>
          </div>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-archo-ink/60 backdrop-blur-sm p-4 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-archo-brass blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-archo-brass blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-archo-cream rounded-3xl p-8 shadow-2xl border border-archo-brass/20 relative z-10"
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-archo-slate hover:text-archo-brass transition-colors p-2 hover:bg-archo-brass/5 rounded-full"
          >
            <X size={20} />
          </button>
        )}

        <div className="text-center mb-10">
          <ArchoLogo className="w-56 mx-auto" />
          <p className="text-archo-slate mt-4 font-serif italic">
            {isLogin ? 'Sign in to manage your mortgage pipeline.' : 'Start your professional broker journey today.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass/40" size={18} />
              <input 
                required
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 pl-12 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif"
                placeholder="broker@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass/40" size={18} />
              <input 
                required
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 pl-12 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif"
                placeholder="••••••••"
              />
            </div>
          </div>

          <PrimaryButton 
            disabled={loading}
            type="submit"
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={18} />}
          </PrimaryButton>
        </form>

        <div className="mt-8 pt-6 border-t border-archo-brass/10 text-center space-y-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-serif font-bold text-archo-slate hover:text-archo-brass transition-colors block w-full"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>

          {onBypass && (
            <button 
              type="button"
              onClick={onBypass}
              className="w-full py-3 rounded-xl bg-rose-600/10 text-rose-600 text-[10px] font-bold uppercase tracking-widest border border-rose-600/20 hover:bg-rose-600 hover:text-white transition-all"
            >
              Temporary Bypass (Demo Mode)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
