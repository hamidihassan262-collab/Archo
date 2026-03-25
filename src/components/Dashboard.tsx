import React, { useEffect, useState, useCallback } from 'react';
import { MortgageCase, CaseStage, UserProfile } from '../types';
import { MoreHorizontal, Calendar, ArrowRight, Plus, X, Edit3, Trash2, AlertCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import PrimaryButton from './PrimaryButton';
import BorderGlow from './BorderGlow';
import LockedFeature from './LockedFeature';
import { playHoverSound, playClickSound, playModalOpenSound, playModalCloseSound, playSuccessSound, playErrorSound } from '../lib/sounds';

const STAGES: CaseStage[] = ['Lead', 'Fact-Find', 'Sourcing', 'Application', 'Offer', 'Completion'];

export default function Dashboard({ requireAuth, userProfile, onUpgrade, hasProAccess }: { 
  requireAuth: (cb: () => void) => void;
  userProfile: UserProfile | null;
  onUpgrade: () => void;
  hasProAccess: boolean;
}) {
  const [cases, setCases] = useState<MortgageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<MortgageCase | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showLock, setShowLock] = useState(true);
  const [newCase, setNewCase] = useState({ 
    clientName: '', 
    propertyValue: '', 
    loanAmount: '', 
    ltv: '', 
    statusColour: 'Green', 
    assignedTo: userProfile?.full_name || 'User',
    stage: 'Lead' as CaseStage 
  });

  const analytics = React.useMemo(() => {
    if (cases.length === 0) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const getMonthStats = (month: number, year: number) => {
      const monthCases = cases.filter(c => {
        const d = new Date(c.createdAt || '');
        return d.getMonth() === month && d.getFullYear() === year;
      });

      const totalVolume = monthCases.reduce((acc, c) => acc + c.propertyValue, 0);
      const conversionRate = monthCases.length > 0 
        ? (monthCases.filter(c => ['Offer', 'Completion'].includes(c.stage)).length / monthCases.length) * 100 
        : 0;
      
      const activeCases = monthCases.filter(c => c.stage !== 'Completion');
      const avgCaseTime = activeCases.length > 0
        ? activeCases.reduce((acc, c) => {
            const created = new Date(c.createdAt || '');
            const diff = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
            return acc + diff;
          }, 0) / activeCases.length
        : 0;
      
      const pipelineValue = activeCases.reduce((acc, c) => acc + c.loanAmount, 0);

      return { totalVolume, conversionRate, avgCaseTime, pipelineValue };
    };

    const currentStats = getMonthStats(currentMonth, currentYear);
    const prevStats = getMonthStats(lastMonth, lastMonthYear);

    const calculateTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const diff = ((current - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
    };

    const calculateTimeTrend = (current: number, prev: number) => {
      const diff = Math.round(current - prev);
      return `${diff >= 0 ? '+' : ''}${diff} Days`;
    };

    // Overall stats (all time as requested for some, or just current month? 
    // User said "Total Volume should be the sum of all property_value fields across all the users cases")
    const totalVolumeAllTime = cases.reduce((acc, c) => acc + c.propertyValue, 0);
    const conversionRateAllTime = (cases.filter(c => ['Offer', 'Completion'].includes(c.stage)).length / cases.length) * 100;
    
    const activeCasesAllTime = cases.filter(c => c.stage !== 'Completion');
    const avgCaseTimeAllTime = activeCasesAllTime.length > 0
      ? activeCasesAllTime.reduce((acc, c) => {
          const created = new Date(c.createdAt || '');
          const diff = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
          return acc + diff;
        }, 0) / activeCasesAllTime.length
      : 0;
    
    const pipelineValueAllTime = activeCasesAllTime.reduce((acc, c) => acc + c.loanAmount, 0);

    return [
      { 
        label: 'Total Volume', 
        value: `£${(totalVolumeAllTime / 1000000).toFixed(1)}M`, 
        trend: calculateTrend(currentStats.totalVolume, prevStats.totalVolume) 
      },
      { 
        label: 'Conversion Rate', 
        value: `${Math.round(conversionRateAllTime)}%`, 
        trend: calculateTrend(currentStats.conversionRate, prevStats.conversionRate) 
      },
      { 
        label: 'Avg. Case Time', 
        value: `${Math.round(avgCaseTimeAllTime)} Days`, 
        trend: calculateTimeTrend(currentStats.avgCaseTime, prevStats.avgCaseTime) 
      },
      { 
        label: 'Pipeline Value', 
        value: `£${(pipelineValueAllTime / 1000000).toFixed(1)}M`, 
        trend: calculateTrend(currentStats.pipelineValue, prevStats.pipelineValue) 
      }
    ];
  }, [cases]);

  const loadCases = useCallback(async () => {
    setFetchError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        setFetchError('Failed to load your cases. Please check your connection and try again.');
        return;
      }

      if (data) {
        const mappedData: MortgageCase[] = data.map((item: any) => {
          const dbStage = (item.stage || 'lead').toLowerCase();
          let stage: CaseStage = 'Lead';
          
          if (dbStage === 'fact-find') stage = 'Fact-Find';
          else if (dbStage === 'sourcing') stage = 'Sourcing';
          else if (dbStage === 'application') stage = 'Application';
          else if (dbStage === 'offer') stage = 'Offer';
          else if (dbStage === 'completion') stage = 'Completion';
          else stage = 'Lead';

          return {
            id: item.id,
            clientName: item.client_name || 'Unknown Client',
            propertyValue: item.property_value || 0,
            loanAmount: item.loan_amount || 0,
            ltv: Math.round((Number(item.loan_amount) / Number(item.property_value)) * 100) || 0,
            stage: stage,
            lastActionDate: item.last_action_date || new Date(item.created_at).toISOString().split('T')[0],
            ragStatus: item.status_colour || 'Green',
            createdAt: item.created_at
          };
        });
        setCases(mappedData);
      }
    } catch (error) {
      console.error('Error in loadCases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();

    const channel = supabase
      .channel('cases-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          loadCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCases]);

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setModalError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setModalError('You must be logged in to create a case.');
        playErrorSound();
        return;
      }

      // Check case limit for free users
      if (!hasProAccess && cases.length >= 3) {
        setShowAddModal(false);
        playModalCloseSound();
        setShowLimitModal(true);
        playModalOpenSound();
        return;
      }

      const { error } = await supabase
        .from('cases')
        .insert({
          client_name: newCase.clientName,
          stage: newCase.stage.toLowerCase(),
          property_value: Number(newCase.propertyValue),
          loan_amount: Number(newCase.loanAmount),
          ltv: Number(newCase.ltv) || Math.round((Number(newCase.loanAmount) / Number(newCase.propertyValue)) * 100),
          status_colour: newCase.statusColour,
          assigned_to: newCase.assignedTo,
          user_id: user.id
        });

      if (error) {
        console.error('Supabase Insert Error (Detailed):', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setModalError(`Database Error: ${error.message} (Code: ${error.code})`);
        playErrorSound();
        return;
      }
      
      setShowAddModal(false);
      playModalCloseSound();
      playSuccessSound();
      setNewCase({ 
        clientName: '', 
        propertyValue: '', 
        loanAmount: '', 
        ltv: '', 
        statusColour: 'Green', 
        assignedTo: userProfile?.full_name || 'User',
        stage: 'Lead' 
      });
      loadCases();
    } catch (error: any) {
      setModalError(error.message || 'An unexpected error occurred. Please try again.');
      playErrorSound();
    }
  };

  const handleDeleteCase = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    if (!window.confirm('Are you sure you want to delete this case?')) return;
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadCases();
      if (selectedCase?.id === id) {
        setSelectedCase(null);
        playModalCloseSound();
      }
      playSuccessSound();
    } catch (error) {
      console.error('Delete error:', error);
      playErrorSound();
      alert('Failed to delete case');
    }
  };

  const handleUpdateStage = async (id: string, newStage: CaseStage) => {
    playClickSound();
    try {
      const { error } = await supabase
        .from('cases')
        .update({ stage: newStage.toLowerCase() })
        .eq('id', id);
      
      if (error) throw error;
      loadCases();
      playSuccessSound();
    } catch (error) {
      console.error('Update stage error:', error);
      playErrorSound();
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-archo-brass"></div>
        <p className="text-archo-brass font-serif italic animate-pulse">Loading your pipeline...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-serif font-bold text-archo-ink">Connection Error</h3>
        <p className="text-archo-slate max-w-md italic">{fetchError}</p>
        <PrimaryButton onClick={() => loadCases()} className="px-8 py-3 rounded-full">
          Try Again
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="p-8 relative z-10">
      <header className="mb-14 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif font-bold text-archo-ink tracking-tight">Case Pipeline</h2>
          <p className="text-lg text-archo-slate/80 mt-3 font-serif italic">You have {cases.length} active cases this month.</p>
        </div>
        <div className="flex items-center gap-4">
          <PrimaryButton 
            onClick={() => {
              playClickSound();
              requireAuth(() => {
                if (!hasProAccess && cases.length >= 3) {
                  setShowLimitModal(true);
                  playModalOpenSound();
                } else {
                  setShowAddModal(true);
                  playModalOpenSound();
                }
              });
            }}
            onMouseEnter={playHoverSound}
            className="px-8 py-3 rounded-full text-sm flex items-center gap-2 shadow-lg shadow-archo-brass/10"
          >
            New Case <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </header>

      {/* Analytics Gating */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 flex-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-archo-brass whitespace-nowrap">Performance Analytics</h3>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-archo-gold/40 to-transparent"></div>
          </div>
          {!hasProAccess && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-archo-gold uppercase tracking-wider bg-archo-gold/10 px-3 py-1 rounded-full border border-archo-gold/20 ml-4">
              <Lock size={10} /> Pro Feature
            </span>
          )}
        </div>
        
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {(analytics || [
              { label: 'Total Volume', value: '£0.0M', trend: '0%' },
              { label: 'Conversion Rate', value: '0%', trend: '0%' },
              { label: 'Avg. Case Time', value: '0 Days', trend: '0 Days' },
              { label: 'Pipeline Value', value: '£0.0M', trend: '0%' }
            ]).map((stat, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -4, boxShadow: "0 12px 30px -10px rgba(139, 115, 46, 0.15)" }}
                onMouseEnter={playHoverSound}
                className="bg-[#FEFDF5] border border-archo-gold/20 border-l-[3px] border-l-archo-gold rounded-2xl p-[24px] transition-all duration-300 relative overflow-hidden"
              >
                {cases.length === 0 && (
                  <div className="absolute inset-0 bg-archo-cream/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <span className="text-[9px] font-bold text-archo-brass uppercase tracking-tighter">Add case to see</span>
                  </div>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-archo-muted mb-3">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-serif font-bold text-archo-ink leading-none">{stat.value}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    stat.trend.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 
                    stat.trend.startsWith('-') ? 'text-rose-600 bg-rose-50' : 'text-archo-muted bg-archo-brass/5'
                  }`}>{stat.trend}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {!hasProAccess && showLock && (
            <LockedFeature 
              featureName="Detailed Case Analytics"
              onUpgrade={onUpgrade}
              onClose={() => setShowLock(false)}
            />
          )}
        </div>
      </div>

      <div className="flex gap-8 overflow-x-auto pb-12 min-h-[calc(100vh-250px)]">
        {STAGES.map((stage) => {
          const stageCases = cases.filter(c => c.stage === stage);
          return (
            <div key={stage} className="kanban-column min-w-[300px]">
              <div className="flex items-center justify-between px-4 py-2.5 mb-6 bg-archo-brass/5 rounded-full border border-archo-gold/10 border-b-archo-gold/30">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-archo-brass">{stage}</h3>
                <span className="text-[10px] bg-archo-gold text-archo-cream px-2.5 py-0.5 rounded-full font-bold border border-archo-gold/50 shadow-sm">
                  {stageCases.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-5">
                {stageCases.map((item) => (
                <BorderGlow
                  key={item.id}
                  glowColor="45 50 50"
                  colors={['#8B732E', '#B59410', '#D4AF37']}
                  backgroundColor="#FDFCF0"
                  borderRadius={16}
                  glowRadius={20}
                  glowIntensity={0.2}
                  className="w-full"
                >
                  <motion.div
                    layoutId={item.id}
                    onClick={() => {
                      playClickSound();
                      requireAuth(() => {
                        setSelectedCase(item);
                        playModalOpenSound();
                      });
                    }}
                    onMouseEnter={playHoverSound}
                    className="case-card group relative overflow-hidden h-full"
                    whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(139, 115, 46, 0.1)" }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shadow-sm ${
                        item.ragStatus === 'Green' ? 'bg-emerald-600' : 
                        item.ragStatus === 'Amber' ? 'bg-archo-brass' : 'bg-red-600'
                      }`} />
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            requireAuth(() => handleDeleteCase(item.id));
                          }}
                          onMouseEnter={playHoverSound}
                          className="text-archo-muted hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                          }}
                          onMouseEnter={playHoverSound}
                          className="text-archo-muted hover:text-archo-brass"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </div>
                  
                  <h4 className="font-serif font-bold text-xl text-archo-ink mb-2 leading-tight">{item.clientName}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5">
                    <span className="text-[11px] font-mono text-archo-muted uppercase tracking-wider">£{item.propertyValue.toLocaleString()} val</span>
                    <span className="text-[11px] font-mono text-archo-muted uppercase tracking-wider">{item.ltv}% LTV</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-archo-brass/10">
                    <div className="flex items-center gap-2 text-archo-muted">
                      <Calendar size={13} className="text-archo-brass/60" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {new Date(item.createdAt || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full border-2 border-archo-cream bg-archo-ink flex items-center justify-center text-[8px] text-archo-brass-pale font-serif font-bold">AI</div>
                    </div>
                  </div>
                </motion.div>
              </BorderGlow>
            ))}
              
                <BorderGlow
                  glowColor="212 175 55"
                  colors={['#8B732E', '#B59410', '#D4AF37']}
                  backgroundColor="transparent"
                  borderRadius={16}
                  glowRadius={20}
                  glowIntensity={0.4}
                  className="w-full"
                >
                  <motion.button 
                    animate={cases.length === 0 ? {
                      scale: [1, 1.02, 1],
                      borderColor: ['rgba(212, 175, 55, 0.3)', 'rgba(212, 175, 55, 0.6)', 'rgba(212, 175, 55, 0.3)']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    onClick={() => {
                      playClickSound();
                      requireAuth(() => {
                        if (!hasProAccess && cases.length >= 3) {
                          setShowLimitModal(true);
                          playModalOpenSound();
                        } else {
                          setNewCase(prev => ({ ...prev, stage }));
                          setShowAddModal(true);
                          playModalOpenSound();
                        }
                      });
                    }}
                    onMouseEnter={playHoverSound}
                    className="w-full py-5 border-2 border-dashed border-archo-gold/40 rounded-2xl text-archo-gold hover:bg-archo-gold/5 hover:border-archo-gold transition-all text-[11px] font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Case
                  </motion.button>
                </BorderGlow>
              </div>
            </div>
          );
        })}
      </div>

      {/* Case Detail Modal */}
      <AnimatePresence>
        {selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCase(null)}
              className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-archo-cream w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-archo-brass/20"
            >
              <div className="p-8 border-b border-archo-brass/10 flex justify-between items-center bg-archo-paper">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${
                    selectedCase.ragStatus === 'Green' ? 'bg-emerald-600' : 
                    selectedCase.ragStatus === 'Amber' ? 'bg-archo-brass' : 'bg-red-600'
                  }`} />
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-archo-ink">{selectedCase.clientName}</h3>
                    <p className="text-[10px] text-archo-muted uppercase tracking-widest font-bold">Case ID: {selectedCase.id.slice(0, 8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    playModalCloseSound();
                    setSelectedCase(null);
                  }} 
                  onMouseEnter={playHoverSound}
                  className="text-archo-muted hover:text-archo-ink transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Property Value</label>
                    <p className="text-2xl font-serif font-bold text-archo-ink">£{selectedCase.propertyValue.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Loan Amount</label>
                    <p className="text-2xl font-serif font-bold text-archo-ink">£{selectedCase.loanAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">LTV</label>
                    <p className="text-2xl font-serif font-bold text-archo-ink">{selectedCase.ltv}%</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Current Stage</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {STAGES.map(s => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStage(selectedCase.id, s)}
                          onMouseEnter={playHoverSound}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${
                            selectedCase.stage === s 
                              ? 'bg-archo-brass text-archo-cream' 
                              : 'bg-archo-brass/5 text-archo-brass hover:bg-archo-brass/10'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Last Action</label>
                    <p className="text-sm font-serif italic text-archo-slate">{selectedCase.lastActionDate}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-archo-paper border-t border-archo-brass/10 flex gap-4">
                <PrimaryButton 
                  onClick={() => playClickSound()}
                  onMouseEnter={playHoverSound}
                  className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} /> Edit Case
                </PrimaryButton>
                <button 
                  onClick={() => handleDeleteCase(selectedCase.id)}
                  onMouseEnter={playHoverSound}
                  className="px-6 py-4 border border-red-200 text-red-600 rounded-2xl font-serif font-bold hover:bg-red-50 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
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
              <h3 className="text-2xl font-serif font-bold text-archo-ink text-center mb-4">Case Limit Reached</h3>
              <p className="text-archo-slate text-center mb-8 leading-relaxed">
                Free users are limited to 3 active cases. Upgrade to Pro for unlimited cases and advanced pipeline management.
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                playModalCloseSound();
                setShowAddModal(false);
              }}
              className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-archo-cream w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-archo-brass/20 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-serif font-bold text-archo-ink mb-6">New Mortgage Case</h3>
              
              {modalError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  {modalError}
                </div>
              )}

              <form onSubmit={handleAddCase} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Client Names</label>
                  <input 
                    required
                    type="text" 
                    value={newCase.clientName}
                    onChange={e => setNewCase({ ...newCase, clientName: e.target.value })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                    placeholder="e.g. John & Jane Doe"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Property Value</label>
                    <input 
                      required
                      type="number" 
                      value={newCase.propertyValue}
                      onChange={e => setNewCase({ ...newCase, propertyValue: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                      placeholder="£"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Loan Amount</label>
                    <input 
                      required
                      type="number" 
                      value={newCase.loanAmount}
                      onChange={e => setNewCase({ ...newCase, loanAmount: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                      placeholder="£"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">LTV %</label>
                    <input 
                      type="number" 
                      value={newCase.ltv}
                      onChange={e => setNewCase({ ...newCase, ltv: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                      placeholder="Auto-calculated if empty"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Status Colour</label>
                    <select 
                      value={newCase.statusColour}
                      onChange={e => setNewCase({ ...newCase, statusColour: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                    >
                      <option value="Green">Green</option>
                      <option value="Amber">Amber</option>
                      <option value="Red">Red</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Assigned To</label>
                  <input 
                    required
                    type="text" 
                    value={newCase.assignedTo}
                    onChange={e => setNewCase({ ...newCase, assignedTo: e.target.value })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Current Stage</label>
                  <select 
                    value={newCase.stage}
                    onChange={e => setNewCase({ ...newCase, stage: e.target.value as CaseStage })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      playClickSound();
                      playModalCloseSound();
                      setShowAddModal(false);
                      setModalError(null);
                    }}
                    onMouseEnter={playHoverSound}
                    className="flex-1 py-3 rounded-xl font-serif font-bold text-archo-slate hover:bg-archo-brass/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <PrimaryButton 
                    type="submit"
                    onMouseEnter={playHoverSound}
                    className="flex-1 py-3 rounded-xl"
                  >
                    Create Case
                  </PrimaryButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
