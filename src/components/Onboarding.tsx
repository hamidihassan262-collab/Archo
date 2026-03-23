import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ArchoLogo from './Logo';
import { 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  User, 
  Lock, 
  Mail, 
  Building2, 
  X, 
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  Layout,
  FileText,
  Users,
  Check,
  MessageSquare,
  Plus,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchLenders, createCase } from '../services/api';
import { Lender, CaseStage } from '../types';
import Threads from './Threads';
import PrimaryButton from './PrimaryButton';
import { playHoverSound, playClickSound, playSuccessSound, playErrorSound } from '../lib/sounds';

interface OnboardingProps {
  onComplete: (profileData: any) => void;
  onSignIn: () => void;
}

const STEPS = 7;

export default function Onboarding({ onComplete, onSignIn }: OnboardingProps) {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('archo_onboarding_step');
    return saved ? parseInt(saved) : 1;
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('archo_onboarding_data');
    return saved ? JSON.parse(saved) : {
      caseManagement: '',
      painPoint: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      brokerageName: '',
      firstCase: {
        clientName: 'John Smith',
        propertyValue: 350000,
        loanAmount: 297500,
        ltv: 85,
        statusColour: 'Green',
        stage: 'Lead' as CaseStage
      }
    };
  });

  const [lenders, setLenders] = useState<Lender[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Lender[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spotlightStep, setSpotlightStep] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && step < 6) {
        setStep(6);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem('archo_onboarding_step', step.toString());
  }, [step]);

  useEffect(() => {
    localStorage.setItem('archo_onboarding_data', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (step === 4) {
      const loadLenders = async () => {
        try {
          const data = await fetchLenders();
          setLenders(data);
        } catch (err) {
          console.error('Error loading lenders:', err);
        }
      };
      loadLenders();
    }
  }, [step]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = lenders.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.selfEmployedPolicy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.adverseCreditStance.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, lenders]);

  const nextStep = () => {
    playClickSound();
    setStep(prev => Math.min(prev + 1, STEPS));
  };
  const prevStep = () => {
    playClickSound();
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        playSuccessSound();
        // Profile creation is usually handled by a trigger, but we need to update it with onboarding data
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            onboarding_case_management: formData.caseManagement,
            onboarding_pain_point: formData.painPoint,
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: 'broker',
            plan: 'free'
          })
          .eq('id', data.user.id);

        if (profileError) {
          // If update fails, maybe the row isn't there yet (trigger delay)
          // We'll try to insert if update didn't affect any rows, but usually we just wait or retry
          console.error('Error updating profile:', profileError);
        }
        
        nextStep();
      }
    } catch (err: any) {
      setError(err.message);
      playErrorSound();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFirstCase = async () => {
    playClickSound();
    setIsLoading(true);
    setError(null);
    try {
      await createCase({
        client_name: formData.firstCase.clientName,
        property_value: formData.firstCase.propertyValue,
        loan_amount: formData.firstCase.loanAmount,
        ltv: formData.firstCase.ltv,
        status_colour: formData.firstCase.statusColour,
        stage: formData.firstCase.stage.toLowerCase()
      });
      // After creating the first case, we move to the final spotlight step
      playSuccessSound();
      nextStep();
    } catch (err: any) {
      console.error('Error creating first case:', err);
      setError(err.message || 'Failed to create your first case. Please try again.');
      playErrorSound();
    } finally {
      setIsLoading(false);
    }
  };

  const spotlightPositions = [
    { top: '200px', left: '280px', right: 'auto' }, // Archo Chat
    { top: '244px', left: '280px', right: 'auto' }, // Criteria Explorer
    { top: '210px', left: 'auto', right: '40px' },  // Add Case
  ];

  const finishOnboarding = async () => {
    playClickSound();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
    }
    localStorage.removeItem('archo_onboarding_step');
    localStorage.removeItem('archo_onboarding_data');
    localStorage.setItem('archo_onboarding_dismissed', 'true');
    onComplete(formData);
  };

  const skipOnboarding = () => {
    playClickSound();
    setStep(5);
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-archo-paper flex flex-col overflow-hidden">
      {/* Background Threads */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <Threads
          amplitude={3.6}
          distance={0.9}
          enableMouseInteraction={false}
          color={[0.54, 0.45, 0.18]}
        />
      </div>

      {/* Progress Indicator */}
      {step > 1 && step < 7 && (
        <div className="absolute top-8 left-0 right-0 z-20 flex justify-center px-8">
          <div className="max-w-md w-full flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i + 2 <= step ? 'bg-archo-brass' : 'bg-archo-brass/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Skip Link */}
      {step > 1 && step < 5 && (
        <button 
          onClick={skipOnboarding}
          onMouseEnter={playHoverSound}
          className="absolute top-8 right-8 z-20 text-[10px] font-bold uppercase tracking-widest text-archo-muted hover:text-archo-brass transition-colors"
        >
          Skip Onboarding
        </button>
      )}

      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-3xl w-full text-center space-y-12"
            >
              <div className="flex justify-center">
                <ArchoLogo className="w-64" />
              </div>
              
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-serif font-bold text-archo-ink leading-tight">
                  You did not become a mortgage broker to spend hours searching lender criteria.
                </h1>
                <p className="text-xl md:text-2xl text-archo-slate font-serif italic font-light">
                  Archo handles the research, the admin, and the complexity. You handle the relationships.
                </p>
              </div>

              <div className="pt-8">
                <PrimaryButton 
                  onClick={nextStep}
                  onMouseEnter={playHoverSound}
                  className="px-12 py-5 rounded-full text-lg group"
                >
                  Let me show you something <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </PrimaryButton>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-2xl w-full space-y-10"
            >
              <h2 className="text-4xl font-serif font-bold text-archo-ink text-center">
                How do you currently manage your mortgage cases?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'excel', label: 'Spreadsheets and Excel', icon: Layout },
                  { id: 'paper', label: 'Paper and physical folders', icon: FileText },
                  { id: 'crm', label: 'Another CRM or software', icon: Building2 },
                  { id: 'none', label: 'I do not really track them formally', icon: Users }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      playClickSound();
                      setFormData({ ...formData, caseManagement: option.label });
                    }}
                    onMouseEnter={playHoverSound}
                    className={`p-6 rounded-2xl border-2 text-left transition-all group ${
                      formData.caseManagement === option.label 
                        ? 'border-archo-brass bg-archo-brass/5 shadow-lg' 
                        : 'border-archo-brass/10 bg-white hover:border-archo-brass/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      formData.caseManagement === option.label ? 'bg-archo-brass text-archo-cream' : 'bg-archo-brass/10 text-archo-brass'
                    }`}>
                      <option.icon size={20} />
                    </div>
                    <p className={`font-serif font-bold ${formData.caseManagement === option.label ? 'text-archo-ink' : 'text-archo-slate'}`}>
                      {option.label}
                    </p>
                  </button>
                ))}
              </div>

              {formData.caseManagement && (
                <div className="flex justify-center pt-4">
                  <PrimaryButton 
                    onClick={nextStep} 
                    onMouseEnter={playHoverSound}
                    className="px-12 py-4 rounded-full"
                  >
                    Next
                  </PrimaryButton>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-2xl w-full space-y-10"
            >
              <h2 className="text-4xl font-serif font-bold text-archo-ink text-center">
                What takes up most of your time as a broker?
              </h2>

              <div className="space-y-3">
                {[
                  'Searching lender criteria and policies',
                  'Writing suitability letters and notes',
                  'Chasing clients for documents',
                  'Managing cases and follow ups',
                  'All of the above'
                ].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      playClickSound();
                      setFormData({ ...formData, painPoint: option });
                    }}
                    onMouseEnter={playHoverSound}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                      formData.painPoint === option 
                        ? 'border-archo-brass bg-archo-brass/5 shadow-lg' 
                        : 'border-archo-brass/10 bg-white hover:border-archo-brass/30'
                    }`}
                  >
                    <span className={`font-serif font-bold ${formData.painPoint === option ? 'text-archo-ink' : 'text-archo-slate'}`}>
                      {option}
                    </span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.painPoint === option ? 'border-archo-brass bg-archo-brass text-archo-cream' : 'border-archo-brass/20'
                    }`}>
                      {formData.painPoint === option && <Check size={14} />}
                    </div>
                  </button>
                ))}
              </div>

              {formData.painPoint && (
                <div className="flex justify-center pt-4">
                  <PrimaryButton 
                    onClick={nextStep} 
                    onMouseEnter={playHoverSound}
                    className="px-12 py-4 rounded-full"
                  >
                    Next
                  </PrimaryButton>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-4xl w-full space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-serif font-bold text-archo-ink">
                  Let us show you what Archo can do.
                </h2>
                <p className="text-xl text-archo-slate font-serif italic">
                  Type in a scenario you are working on right now.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-archo-brass/10 space-y-8">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-archo-muted" size={24} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Self-employed 1 year accounts, Adverse credit..."
                    className="w-full pl-16 pr-8 py-6 bg-archo-paper rounded-2xl border-2 border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-lg font-serif"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {searchResults.length > 0 ? (
                    searchResults.map((lender) => (
                      <div key={lender.id} className="bg-archo-paper border border-archo-brass/10 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif font-bold text-archo-ink">{lender.name}</h4>
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase tracking-widest text-archo-muted">
                            <span>Max LTV</span>
                            <span className="font-bold text-archo-ink">{lender.maxLTV}%</span>
                          </div>
                          <p className="text-xs text-archo-slate line-clamp-3 italic">
                            {lender.selfEmployedPolicy}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 py-12 text-center text-archo-muted italic font-serif">
                      Try searching for "Nationwide" or "Self-employed" to see live results.
                    </div>
                  )}
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-archo-muted italic mb-8">
                    This search would have taken you 20 minutes manually. Archo found it in seconds.
                  </p>
                  <PrimaryButton 
                    onClick={nextStep} 
                    onMouseEnter={playHoverSound}
                    className="px-12 py-5 rounded-full text-lg"
                  >
                    I want this, create my account
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-md w-full space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif font-bold text-archo-ink">
                  You are 30 seconds away from saving hours every week.
                </h2>
              </div>

              <form onSubmit={handleSignUp} className="bg-white rounded-3xl p-8 shadow-2xl border border-archo-brass/10 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={16} />
                      <input 
                        required
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={16} />
                      <input 
                        required
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full pl-11 pr-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={16} />
                    <input 
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={16} />
                    <input 
                      required
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Brokerage Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-muted" size={16} />
                    <input 
                      required
                      type="text"
                      value={formData.brokerageName}
                      onChange={(e) => setFormData({ ...formData, brokerageName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <PrimaryButton 
                  type="submit"
                  disabled={isLoading}
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 rounded-xl mt-4"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </PrimaryButton>

                <p className="text-center text-xs text-archo-muted pt-4">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    onClick={() => {
                      playClickSound();
                      onSignIn();
                    }} 
                    onMouseEnter={playHoverSound}
                    className="text-archo-brass font-bold hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div 
              key="step6"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-md w-full space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-serif font-bold text-archo-ink">
                  Let us set up your first case together.
                </h2>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-2xl border border-archo-brass/10 space-y-6">
                <div className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Client Name</label>
                    <input 
                      type="text"
                      value={formData.firstCase.clientName}
                      onChange={(e) => setFormData({ ...formData, firstCase: { ...formData.firstCase, clientName: e.target.value }})}
                      className="w-full px-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Property Value</label>
                      <input 
                        type="number"
                        value={formData.firstCase.propertyValue}
                        onChange={(e) => setFormData({ ...formData, firstCase: { ...formData.firstCase, propertyValue: parseInt(e.target.value) }})}
                        className="w-full px-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Loan Amount</label>
                      <input 
                        type="number"
                        value={formData.firstCase.loanAmount}
                        onChange={(e) => setFormData({ ...formData, firstCase: { ...formData.firstCase, loanAmount: parseInt(e.target.value) }})}
                        className="w-full px-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">LTV %</label>
                      <input 
                        type="number"
                        value={formData.firstCase.ltv}
                        onChange={(e) => setFormData({ ...formData, firstCase: { ...formData.firstCase, ltv: parseInt(e.target.value) }})}
                        className="w-full px-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-archo-muted ml-1">Stage</label>
                      <select 
                        value={formData.firstCase.stage}
                        onChange={(e) => setFormData({ ...formData, firstCase: { ...formData.firstCase, stage: e.target.value as CaseStage }})}
                        className="w-full px-4 py-3 bg-archo-paper rounded-xl border border-archo-brass/10 focus:border-archo-brass focus:ring-0 transition-all text-sm"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Fact-Find">Fact-Find</option>
                        <option value="Sourcing">Sourcing</option>
                      </select>
                    </div>
                  </div>
                </div>

                <PrimaryButton 
                  onClick={handleCreateFirstCase}
                  disabled={isLoading}
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 rounded-xl"
                >
                  {isLoading ? 'Creating Case...' : 'Create My First Case'}
                </PrimaryButton>
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div 
              key="step7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-archo-ink/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              {/* Visual Highlight Circle */}
              <motion.div 
                className="fixed w-32 h-32 rounded-full border-4 border-archo-brass shadow-[0_0_50px_rgba(139,115,46,0.5)] pointer-events-none z-50"
                animate={{ 
                  top: spotlightPositions[spotlightStep].top,
                  left: spotlightPositions[spotlightStep].left,
                  right: spotlightPositions[spotlightStep].right,
                  opacity: 1,
                  scale: 1
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              />

              <div className="max-w-md w-full relative z-[60]">
                <AnimatePresence mode="wait">
                  {spotlightStep === 0 && (
                    <motion.div 
                      key="spotlight0"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-archo-cream rounded-3xl p-8 shadow-2xl border border-archo-brass/20 space-y-6"
                    >
                      <div className="w-16 h-16 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass mb-4">
                        <MessageSquare size={32} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-archo-ink">Archo Chat</h3>
                      <p className="text-archo-slate leading-relaxed">
                        Ask Archo anything about lender criteria, affordability, or your cases. It's like having a senior criteria specialist on call 24/7.
                      </p>
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => {
                            playClickSound();
                            setSpotlightStep(1);
                          }}
                          onMouseEnter={playHoverSound}
                          className="flex-1 py-3 bg-archo-brass text-archo-cream rounded-xl font-bold text-sm"
                        >
                          Next
                        </button>
                        <button 
                          onClick={finishOnboarding}
                          onMouseEnter={playHoverSound}
                          className="px-6 py-3 text-archo-muted font-bold text-sm hover:text-archo-ink transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {spotlightStep === 1 && (
                    <motion.div 
                      key="spotlight1"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-archo-cream rounded-3xl p-8 shadow-2xl border border-archo-brass/20 space-y-6"
                    >
                      <div className="w-16 h-16 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass mb-4">
                        <Search size={32} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-archo-ink">Criteria Explorer</h3>
                      <p className="text-archo-slate leading-relaxed">
                        Search and compare lender policies instantly. No more digging through PDFs or calling helpdesks.
                      </p>
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => {
                            playClickSound();
                            setSpotlightStep(2);
                          }}
                          onMouseEnter={playHoverSound}
                          className="flex-1 py-3 bg-archo-brass text-archo-cream rounded-xl font-bold text-sm"
                        >
                          Next
                        </button>
                        <button 
                          onClick={finishOnboarding}
                          onMouseEnter={playHoverSound}
                          className="px-6 py-3 text-archo-muted font-bold text-sm hover:text-archo-ink transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {spotlightStep === 2 && (
                    <motion.div 
                      key="spotlight2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-archo-cream rounded-3xl p-8 shadow-2xl border border-archo-brass/20 space-y-6"
                    >
                      <div className="w-16 h-16 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass mb-4">
                        <Plus size={32} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-archo-ink">Add New Case</h3>
                      <p className="text-archo-slate leading-relaxed">
                        Build your pipeline and track every client from lead to offer. Stay on top of every case with real-time status updates.
                      </p>
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={finishOnboarding}
                          onMouseEnter={playHoverSound}
                          className="flex-1 py-3 bg-archo-brass text-archo-cream rounded-xl font-bold text-sm"
                        >
                          Get Started
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
