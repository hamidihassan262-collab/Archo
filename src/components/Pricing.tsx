import React from 'react';
import { Check, Shield, Zap, Users, ArrowRight, Star } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import { UserPlan } from '../types';

interface PricingProps {
  currentPlan: UserPlan;
  onUpgrade: (plan: UserPlan) => void;
  onSecretKeySubmit?: (key: string) => void;
  isKeyUnlocked?: boolean;
}

export default function Pricing({ currentPlan, onUpgrade, onSecretKeySubmit, isKeyUnlocked }: PricingProps) {
  const [secretKey, setSecretKey] = React.useState('');
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      description: 'Perfect for individual brokers starting out.',
      features: [
        '5 AI chat messages per day',
        'Up to 3 active cases',
        'Basic criteria search',
        'Standard support',
      ],
      buttonText: currentPlan === 'free' ? 'Current Plan' : 'Get Started',
      buttonDisabled: currentPlan === 'free',
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$35',
      period: '/mo',
      description: 'Unlimited power for high-performing brokers.',
      features: [
        'Unlimited AI chat messages',
        'Unlimited cases',
        'AI-powered criteria search',
        'Document upload in chat',
        'Full compliance monitoring',
        'Detailed case analytics',
        'Priority response speed',
      ],
      buttonText: currentPlan === 'pro' ? 'Current Plan' : 'Subscribe for $35/mo',
      buttonDisabled: currentPlan === 'pro',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      id: 'company',
      name: 'Company',
      price: '$500',
      period: '/mo',
      description: 'Scale your brokerage with team collaboration.',
      features: [
        'Everything in Pro',
        'Up to 20 team members',
        'Team management dashboard',
        'Shared case pipeline',
        'Team-wide analytics',
        'Admin permission controls',
        'Case assignment features',
        'Centralized company billing',
      ],
      buttonText: currentPlan === 'company' ? 'Current Plan' : 'Subscribe for $500/mo',
      buttonDisabled: currentPlan === 'company',
      highlight: false,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-serif font-bold text-archo-ink">Simple, Transparent Pricing</h1>
        <p className="text-archo-slate max-w-2xl mx-auto leading-relaxed">
          Choose the plan that fits your brokerage's needs. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
              plan.highlight 
                ? 'bg-archo-ink text-archo-cream border-archo-brass shadow-xl scale-105 z-10' 
                : 'bg-archo-cream border-archo-brass/10 text-archo-ink shadow-sm hover:shadow-md'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-archo-brass text-archo-cream text-[10px] font-bold uppercase tracking-widest rounded-full">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <h3 className={`text-xl font-serif font-bold mb-2 ${plan.highlight ? 'text-archo-brass-pale' : 'text-archo-ink'}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-serif font-bold">{plan.price}</span>
                {plan.period && <span className={`text-sm ${plan.highlight ? 'text-archo-muted' : 'text-archo-slate'}`}>{plan.period}</span>}
              </div>
              <p className={`text-sm leading-relaxed ${plan.highlight ? 'text-archo-muted' : 'text-archo-slate'}`}>
                {plan.description}
              </p>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <Check size={18} className={plan.highlight ? 'text-archo-brass-pale' : 'text-emerald-600'} />
                  <span className={plan.highlight ? 'text-archo-cream/90' : 'text-archo-slate'}>{feature}</span>
                </li>
              ))}
            </ul>

            <PrimaryButton
              onClick={() => onUpgrade(plan.id as UserPlan)}
              disabled={plan.buttonDisabled}
              className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                plan.highlight 
                  ? 'bg-archo-brass text-archo-cream hover:bg-archo-brass-pale' 
                  : 'bg-archo-ink text-archo-cream hover:bg-archo-ink/90'
              } ${plan.buttonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {plan.buttonText}
              {!plan.buttonDisabled && <ArrowRight size={16} />}
            </PrimaryButton>
          </div>
        ))}
      </div>

      <div className="bg-archo-paper border border-archo-brass/10 rounded-3xl p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass mx-auto">
          <Shield size={32} />
        </div>
        <h3 className="text-2xl font-serif font-bold text-archo-ink">Enterprise Custom Solutions</h3>
        <p className="text-archo-slate max-w-xl mx-auto">
          Need more than 20 users or custom integrations? We offer tailored solutions for large mortgage networks and banks.
        </p>
        <button className="text-archo-brass font-bold hover:underline flex items-center gap-2 mx-auto">
          Contact Sales <ArrowRight size={16} />
        </button>
      </div>

      {/* Secret Key Section */}
      <div className="max-w-md mx-auto bg-archo-ink/5 border border-archo-brass/10 rounded-2xl p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-archo-brass mb-2">
          <Zap size={18} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Have a Referral Key?</h4>
        </div>
        <p className="text-xs text-archo-slate font-serif italic">
          Enter your special access key below to unlock premium features instantly.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter key..."
            disabled={isKeyUnlocked}
            className="flex-1 bg-archo-cream border border-archo-brass/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-archo-brass/10 disabled:opacity-50 disabled:cursor-not-allowed font-serif"
          />
          <button 
            onClick={() => {
              if (onSecretKeySubmit) onSecretKeySubmit(secretKey);
              setSecretKey('');
            }}
            disabled={isKeyUnlocked || !secretKey.trim()}
            className="bg-archo-ink text-archo-cream px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-archo-ink/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isKeyUnlocked ? 'Unlocked' : 'Apply'}
          </button>
        </div>
        {isKeyUnlocked && (
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter animate-pulse">
            ✓ Pro Access Active via Referral Key
          </p>
        )}
      </div>
    </div>
  );
}
