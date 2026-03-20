import React from 'react';
import { Lock, ArrowRight, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PrimaryButton from './PrimaryButton';
import { UserPlan } from '../types';

interface LockedFeatureProps {
  featureName: string;
  onUpgrade: () => void;
  onClose?: () => void;
  planRequired?: UserPlan;
  show?: boolean;
}

export default function LockedFeature({ featureName, onUpgrade, onClose, planRequired = 'pro', show = true }: LockedFeatureProps) {
  return (
    <AnimatePresence>
      {show && (
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
            className="relative bg-archo-cream border border-archo-brass/20 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-6"
          >
            {onClose && (
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-archo-muted hover:text-archo-ink hover:bg-archo-brass/10 rounded-full transition-all"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
            
            <div className="w-16 h-16 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass mx-auto">
              <Lock size={32} />
            </div>
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-archo-brass/20 rounded-full border border-archo-brass/30 text-archo-brass text-[10px] font-bold uppercase tracking-widest mb-2">
                <Star size={10} /> {planRequired.toUpperCase()} Feature
              </div>
              <h3 className="text-2xl font-serif font-bold text-archo-ink">{featureName} is Locked</h3>
              <p className="text-archo-slate text-sm leading-relaxed">
                Upgrade to the {planRequired.charAt(0).toUpperCase() + planRequired.slice(1)} plan to unlock this feature and supercharge your mortgage brokerage.
              </p>
            </div>

            <div className="space-y-4">
              <PrimaryButton 
                onClick={onUpgrade}
                className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 bg-archo-ink text-archo-cream hover:bg-archo-ink/90 shadow-lg shadow-archo-ink/20"
              >
                Upgrade to {planRequired.charAt(0).toUpperCase() + planRequired.slice(1)} <ArrowRight size={18} />
              </PrimaryButton>
              
              {onClose && (
                <button 
                  onClick={onClose}
                  className="w-full py-2 text-[10px] text-archo-muted uppercase font-bold tracking-widest hover:text-archo-ink transition-colors"
                >
                  Maybe Later
                </button>
              )}
              
              {!onClose && (
                <p className="text-[10px] text-archo-muted uppercase font-bold tracking-widest">
                  Starting from $35 / month
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
