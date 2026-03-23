import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Filter, Info, CheckCircle2, AlertCircle, Clock, Sparkles, X, ExternalLink, Database, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lender, UserPlan } from '../types';
import { fetchLenders } from '../services/api';
import { supabase } from '../lib/supabase';
import { queryPinecone } from '../lib/pinecone';
import PrimaryButton from './PrimaryButton';
import { playHoverSound, playClickSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../lib/sounds';

const SEED_LENDERS = [
  {
    name: 'Nationwide Building Society',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: '2 years accounts required. Will use average of last 2 years or latest year if lower. 1 year considered for some professionals.',
    adverse_credit_stance: 'Strict. No CCJs or defaults in last 3 years. Small settled defaults over 3 years old may be considered.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Halifax',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: 'Latest year figures used if increasing. 1 year trading history accepted. Very contractor friendly (day rate x 5 x 48).',
    adverse_credit_stance: 'Credit score driven. High tolerance for minor historic issues if the overall score is strong.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'NatWest',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: 'Average of last 2 years. 1 year considered for medical professionals, accountants, and solicitors.',
    adverse_credit_stance: 'Case by case. Small defaults (<£500) ignored if satisfied over 12 months ago. No active CCJs.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Santander',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: 'Average of last 2 years. Will use latest year if lower. 1 year history considered for some IT contractors.',
    adverse_credit_stance: 'Considered if satisfied over 3 years ago and total value < £1000. No bankruptcy in last 6 years.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Barclays',
    max_ltv: 95,
    min_income: 20000,
    self_employed_policy: '2 years trading history required. 100% of latest year used if increasing. Excellent for high-net-worth.',
    adverse_credit_stance: 'Very strict. Clean credit for 6 years usually required. No tolerance for recent missed payments.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'HSBC',
    max_ltv: 95,
    min_income: 15000,
    self_employed_policy: '2 years history required. Salary and dividends or net profit for sole traders. Average of last 2 years.',
    adverse_credit_stance: 'Automated scoring. Very little manual override for adverse. Requires high credit score.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Virgin Money',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: 'Latest year or average of last 2. 1 year trading considered for certain professions. Good for entrepreneurs.',
    adverse_credit_stance: 'Flexible on satisfied defaults over 2 years old. No active payday loans in last 12 months.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Accord Mortgages',
    max_ltv: 95,
    min_income: 20000,
    self_employed_policy: '2 years accounts required. Will consider 1 year with projection for qualified professionals.',
    adverse_credit_stance: 'Strict. No CCJs or defaults in last 3 years. Satisfied defaults over 3 years considered on merit.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'The Mortgage Works',
    max_ltv: 75,
    min_income: 25000,
    self_employed_policy: 'BTL focus. No minimum income for experienced landlords. 1 year trading for first-time landlords.',
    adverse_credit_stance: 'No adverse in last 2 years. Older adverse considered on merit. BTL specific scoring.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Kensington Mortgages',
    max_ltv: 90,
    min_income: 0,
    self_employed_policy: 'Specialist. 1 year trading history accepted. Uses profit before tax for limited company directors.',
    adverse_credit_stance: 'Specialist lender. High tolerance for CCJs, defaults, and even recent missed payments. Rates reflect risk.',
    is_specialist: true,
    updated_at: new Date().toISOString()
  },
  {
    name: 'Precise Mortgages',
    max_ltv: 85,
    min_income: 0,
    self_employed_policy: '1 year trading history accepted. Good for complex income streams and multiple sources of income.',
    adverse_credit_stance: 'Specialist. Considers heavy adverse including DMPs and historic bankruptcies. Tiered product range.',
    is_specialist: true,
    updated_at: new Date().toISOString()
  },
  {
    name: 'Bluestone Mortgages',
    max_ltv: 85,
    min_income: 0,
    self_employed_policy: '1 year trading history. Will consider affordability based on most recent 3 months bank statements.',
    adverse_credit_stance: 'Specialist. No credit scoring—manual underwriting. Considers very recent adverse credit.',
    is_specialist: true,
    updated_at: new Date().toISOString()
  },
  {
    name: 'Pepper Money',
    max_ltv: 85,
    min_income: 18000,
    self_employed_policy: '1 year trading history. Uses latest year figures. Excellent for those with fluctuating income.',
    adverse_credit_stance: 'Specialist. Does not use credit scores. Transparent criteria for defaults and CCJs.',
    is_specialist: true,
    updated_at: new Date().toISOString()
  },
  {
    name: 'Skipton Building Society',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: 'Average of last 2 years. 1 year considered for some. Good for Track Record (renters) mortgage.',
    adverse_credit_stance: 'Moderate. Considers minor historic issues. No CCJs in last 2 years.',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Leeds Building Society',
    max_ltv: 95,
    min_income: 0,
    self_employed_policy: '2 years history required. Average of last 2 years. Good for Shared Ownership.',
    adverse_credit_stance: 'Strict. Clean credit for last 3 years usually required.',
    updated_at: new Date().toISOString()
  }
];

interface CriteriaExplorerProps {
  requireAuth: (cb: () => void) => void;
  userPlan: UserPlan;
  onUpgrade: () => void;
  hasProAccess?: boolean;
}

export default function CriteriaExplorer({ requireAuth, userPlan, onUpgrade, hasProAccess }: CriteriaExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ltvFilter, setLtvFilter] = useState<number>(100);
  const [incomeFilter, setIncomeFilter] = useState<number>(0);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [selectedLender, setSelectedLender] = useState<Lender | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showSpecialistOnly, setShowSpecialistOnly] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const isFree = !hasProAccess;

  useEffect(() => {
    loadLenders();
  }, []);

  const loadLenders = async () => {
    try {
      const data = await fetchLenders();
      setLenders(data);
    } catch (error) {
      console.error('Error loading lenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const seedLenders = async () => {
    setSeeding(true);
    playClickSound();
    try {
      const { error } = await supabase.from('lenders').insert(SEED_LENDERS);
      if (error) throw error;
      await loadLenders();
      playSuccessSound();
    } catch (error) {
      console.error('Error seeding lenders:', error);
      playErrorSound();
      alert('Failed to seed lenders. Check console for details.');
    } finally {
      setSeeding(false);
    }
  };

  const handleAiSearch = async () => {
    playClickSound();
    if (isFree) {
      setShowLimitModal(true);
      playModalOpenSound();
      return;
    }
    if (!searchTerm.trim()) return;
    setIsAiSearching(true);
    try {
      const matches = await queryPinecone(searchTerm);
      if (matches.length > 0) {
        // Filter lenders that match the Pinecone results
        const matchedLenderNames = matches.map(m => m.metadata.lender.toLowerCase());
        const filtered = lenders.filter(l => 
          matchedLenderNames.some(name => l.name.toLowerCase().includes(name))
        );
        
        if (filtered.length > 0) {
          setLenders(filtered);
          playSuccessSound();
        } else {
          playErrorSound();
          alert('AI found relevant criteria but no matching lender profiles in the database.');
        }
      } else {
        playErrorSound();
        alert('No relevant criteria found in AI knowledge base.');
      }
    } catch (error) {
      console.error('AI Search error:', error);
      playErrorSound();
    } finally {
      setIsAiSearching(false);
    }
  };

  const filteredLenders = lenders.filter(l => 
    (l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     l.selfEmployedPolicy.toLowerCase().includes(searchTerm.toLowerCase()) ||
     l.adverseCreditStance.toLowerCase().includes(searchTerm.toLowerCase())) &&
    l.maxLTV <= ltvFilter &&
    l.minIncome >= incomeFilter &&
    (!showSpecialistOnly || l.isSpecialist)
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-archo-brass"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto relative z-10">
      <header className="mb-10">
        <h2 className="text-4xl font-serif font-bold text-archo-ink tracking-tight">Lender Criteria Explorer</h2>
        <p className="text-archo-slate mt-2 font-serif italic">Search and compare {lenders.length}+ lender policies updated daily by AI.</p>
      </header>

      <div className="flex flex-wrap gap-4 mb-10">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass" size={20} />
          <input
            type="text"
            placeholder="Search by lender name or scenario (e.g. 'self employed 1 year')..."
            className="w-full pl-12 pr-4 py-4 bg-archo-cream border border-archo-brass/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-archo-brass/10 focus:border-archo-brass transition-all placeholder:text-archo-muted shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
          />
          <button 
            onClick={() => requireAuth(handleAiSearch)}
            onMouseEnter={playHoverSound}
            disabled={isAiSearching}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider z-20 ${
              isFree 
                ? 'bg-archo-slate/20 text-archo-slate cursor-not-allowed' 
                : 'bg-archo-ink text-archo-brass-pale hover:bg-archo-brass hover:text-archo-cream'
            }`}
          >
            {isAiSearching ? <Clock className="animate-spin" size={14} /> : isFree ? <Lock size={14} /> : <Sparkles size={14} />}
            {isFree ? 'Pro AI Search' : 'AI Search'}
          </button>
        </div>
        
        <div className="flex gap-4 items-center bg-archo-cream border border-archo-brass/20 rounded-2xl px-6 py-2 shadow-sm">
          <div className="flex flex-col">
            <label className="text-[8px] font-bold uppercase tracking-widest text-archo-brass">Specialist Only</label>
            <button
              onClick={() => {
                playClickSound();
                setShowSpecialistOnly(!showSpecialistOnly);
              }}
              onMouseEnter={playHoverSound}
              className={`w-12 h-6 rounded-full transition-all relative mt-1 ${
                showSpecialistOnly ? 'bg-archo-brass' : 'bg-archo-brass/20'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                showSpecialistOnly ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          <div className="w-px h-8 bg-archo-brass/10 mx-2" />
          <div className="flex flex-col">
            <label className="text-[8px] font-bold uppercase tracking-widest text-archo-brass">Max LTV: {ltvFilter}%</label>
            <input 
              type="range" 
              min="60" 
              max="100" 
              step="5"
              value={ltvFilter}
              onChange={(e) => setLtvFilter(Number(e.target.value))}
              className="w-32 accent-archo-brass"
            />
          </div>
          <div className="w-px h-8 bg-archo-brass/10 mx-2" />
          <div className="flex flex-col">
            <label className="text-[8px] font-bold uppercase tracking-widest text-archo-brass">Min Income: £{incomeFilter.toLocaleString()}</label>
            <input 
              type="range" 
              min="0" 
              max="100000" 
              step="5000"
              value={incomeFilter}
              onChange={(e) => setIncomeFilter(Number(e.target.value))}
              className="w-32 accent-archo-brass"
            />
          </div>
        </div>

        <button 
          onClick={() => {
            playClickSound();
            setSearchTerm('');
            setLtvFilter(100);
            setIncomeFilter(0);
            setShowSpecialistOnly(false);
          }}
          onMouseEnter={playHoverSound}
          className="flex items-center gap-2 px-8 py-4 bg-archo-cream border border-archo-brass/20 rounded-2xl text-archo-ink font-serif font-bold hover:bg-archo-paper transition-all shadow-sm"
        >
          Reset
        </button>
      </div>

      {lenders.length === 0 && !loading && (
        <div className="bg-archo-cream border-2 border-dashed border-archo-brass/20 rounded-3xl p-12 text-center">
          <Database size={48} className="mx-auto text-archo-brass/40 mb-4" />
          <h3 className="text-xl font-serif font-bold text-archo-ink mb-2">No Lenders Found</h3>
          <p className="text-archo-slate mb-8 max-w-md mx-auto">Your lenders table is currently empty. Would you like to seed it with some initial data to get started?</p>
          <PrimaryButton 
            onClick={() => requireAuth(seedLenders)}
            onMouseEnter={playHoverSound}
            disabled={seeding}
            className="px-8 py-4 rounded-2xl flex items-center gap-2 mx-auto"
          >
            {seeding ? <Clock className="animate-spin" size={18} /> : <Database size={18} />}
            Seed Initial Lenders
          </PrimaryButton>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredLenders.map((lender) => (
          <div 
            key={lender.id} 
            onMouseEnter={playHoverSound}
            className="bg-archo-cream rounded-3xl border border-archo-brass/10 p-8 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-serif font-bold text-archo-ink group-hover:text-archo-brass transition-colors">{lender.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-archo-muted">
                  <Clock size={12} className="text-archo-brass/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Last Updated: {lender.lastUpdated}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-archo-brass text-archo-cream px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                  Verified
                </div>
                {lender.isSpecialist && (
                  <div className="bg-archo-ink text-archo-brass-pale px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm flex items-center gap-1">
                    <Sparkles size={10} />
                    Specialist
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-archo-paper rounded-2xl border border-archo-brass/5">
                <p className="text-[10px] text-archo-brass uppercase font-bold tracking-[0.2em] mb-2">Max LTV</p>
                <p className="text-3xl font-serif font-bold text-archo-ink">{lender.maxLTV}%</p>
              </div>
              <div className="p-4 bg-archo-paper rounded-2xl border border-archo-brass/5">
                <p className="text-[10px] text-archo-brass uppercase font-bold tracking-[0.2em] mb-2">Min Income</p>
                <p className="text-3xl font-serif font-bold text-archo-ink">£{lender.minIncome.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-archo-ink">Self-Employed Policy</h4>
                </div>
                <p className="text-sm text-archo-slate leading-relaxed pl-7 font-serif italic">{lender.selfEmployedPolicy}</p>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle size={16} className="text-archo-brass" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-archo-ink">Adverse Credit</h4>
                </div>
                <p className="text-sm text-archo-slate leading-relaxed pl-7 font-serif italic">{lender.adverseCreditStance}</p>
              </div>
            </div>

            <PrimaryButton 
              onClick={() => {
                playClickSound();
                requireAuth(() => {
                  setSelectedLender(lender);
                  playModalOpenSound();
                });
              }}
              onMouseEnter={playHoverSound}
              className="w-full mt-8 py-4 rounded-2xl text-sm flex items-center justify-center gap-2"
            >
              View Full Policy <Info size={18} />
            </PrimaryButton>
          </div>
        ))}
      </div>

      {/* Lender Details Modal */}
      {selectedLender && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-archo-ink/60 backdrop-blur-md">
          <div className="bg-archo-cream w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-archo-brass/20 animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-archo-brass/10 flex justify-between items-center bg-archo-paper">
              <div>
                <h3 className="text-3xl font-serif font-bold text-archo-ink">{selectedLender.name}</h3>
                <p className="text-archo-brass text-[10px] font-bold uppercase tracking-[0.25em] mt-1">Full Criteria Policy</p>
              </div>
              <button 
                onClick={() => {
                  playModalCloseSound();
                  setSelectedLender(null);
                }}
                onMouseEnter={playHoverSound}
                className="p-3 hover:bg-archo-brass/10 rounded-full transition-colors text-archo-muted hover:text-archo-ink"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto max-h-[70vh] space-y-10 scrollbar-hide">
              <div className="grid grid-cols-2 gap-8">
                <div className="p-6 bg-archo-paper rounded-3xl border border-archo-brass/10">
                  <p className="text-[10px] text-archo-brass uppercase font-bold tracking-[0.2em] mb-3">Max LTV</p>
                  <p className="text-4xl font-serif font-bold text-archo-ink">{selectedLender.maxLTV}%</p>
                </div>
                <div className="p-6 bg-archo-paper rounded-3xl border border-archo-brass/10">
                  <p className="text-[10px] text-archo-brass uppercase font-bold tracking-[0.2em] mb-3">Min Income</p>
                  <p className="text-4xl font-serif font-bold text-archo-ink">£{selectedLender.minIncome.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-archo-ink">Self-Employed Policy</h4>
                  </div>
                  <div className="bg-archo-paper p-6 rounded-3xl border border-archo-brass/5">
                    <p className="text-archo-slate font-serif italic leading-relaxed">{selectedLender.selfEmployedPolicy}</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-archo-brass/10 flex items-center justify-center text-archo-brass">
                      <AlertCircle size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-archo-ink">Adverse Credit Stance</h4>
                  </div>
                  <div className="bg-archo-paper p-6 rounded-3xl border border-archo-brass/5">
                    <p className="text-archo-slate font-serif italic leading-relaxed">{selectedLender.adverseCreditStance}</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-archo-ink/5 flex items-center justify-center text-archo-ink">
                      <Info size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-archo-ink">Additional Information</h4>
                  </div>
                  <div className="bg-archo-paper p-6 rounded-3xl border border-archo-brass/5">
                    <p className="text-archo-slate text-sm leading-relaxed">
                      This lender typically requires a minimum of 3 months bank statements and the latest P60 for employed applicants. 
                      For self-employed, the latest 2 years tax calculations and overviews are standard.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="p-8 bg-archo-paper border-t border-archo-brass/10 flex gap-4">
              <PrimaryButton 
                onClick={() => playClickSound()}
                onMouseEnter={playHoverSound}
                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                Download Full Guide <ExternalLink size={18} />
              </PrimaryButton>
              <button 
                onClick={() => {
                  playModalCloseSound();
                  setSelectedLender(null);
                }}
                onMouseEnter={playHoverSound}
                className="px-8 py-4 bg-archo-cream border border-archo-brass/20 text-archo-ink rounded-2xl font-serif font-bold hover:bg-archo-paper transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playModalCloseSound();
                setShowLimitModal(false);
              }}
              className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-archo-cream w-full max-w-md rounded-3xl p-8 shadow-2xl border border-archo-brass/20"
            >
              <div className="w-16 h-16 bg-archo-gold/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <AlertCircle size={32} className="text-archo-gold" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-archo-ink text-center mb-4">Pro Search Required</h3>
              <p className="text-archo-slate text-center mb-8 leading-relaxed">
                AI-powered criteria matching is a Pro feature. Upgrade to unlock advanced search across all lenders and scenarios.
              </p>
              <div className="flex flex-col gap-3">
                <PrimaryButton 
                  onClick={() => { 
                    playClickSound();
                    playModalCloseSound();
                    setShowLimitModal(false); 
                    onUpgrade(); 
                  }} 
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 rounded-xl"
                >
                  Upgrade to Pro
                </PrimaryButton>
                <button 
                  onClick={() => {
                    playClickSound();
                    playModalCloseSound();
                    setShowLimitModal(false);
                  }}
                  onMouseEnter={playHoverSound}
                  className="w-full py-4 text-archo-muted font-bold hover:text-archo-ink transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
