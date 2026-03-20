import React from 'react';
import { Lock, ArrowRight, Star } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import { UserPlan } from '../types';

interface LockedFeatureProps {
  featureName: string;
  onUpgrade: () => void;
  planRequired?: UserPlan;
}

export default function LockedFeature({ featureName, onUpgrade, planRequired = 'pro' }: LockedFeatureProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-8 backdrop-blur-sm bg-archo-ink/10 rounded-3xl border border-archo-brass/20">
      <div className="bg-archo-cream border border-archo-brass/20 p-10 rounded-3xl shadow-2xl max-w-md text-center space-y-6 transform transition-all hover:scale-[1.02]">
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
          <p className="text-[10px] text-archo-muted uppercase font-bold tracking-widest">
            Starting from $35 / month
          </p>
        </div>
      </div>
    </div>
  );
}
