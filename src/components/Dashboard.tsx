import React, { useEffect, useState } from 'react';
import { MortgageCase, CaseStage } from '../types';
import { MoreHorizontal, Calendar, ArrowRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../supabaseClient';

const STAGES: CaseStage[] = ['Lead', 'Fact-Find', 'Sourcing', 'Application', 'Offer', 'Completion'];

export default function Dashboard() {
  const [cases, setCases] = useState<MortgageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({ 
    clientName: '', 
    propertyValue: '', 
    loanAmount: '', 
    ltv: '', 
    statusColour: 'Green', 
    assignedTo: 'Hassan Hamidi',
    stage: 'Lead' as CaseStage 
  });

  useEffect(() => {
    loadCases();

    // Set up real-time subscription
    const channel = supabase
      .channel('cases-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        (payload) => {
          console.log('Case changed:', payload);
          loadCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      if (data) {
        const mappedData: MortgageCase[] = data.map((item: any) => {
          // Robust stage mapping to handle lowercase and special characters like Fact-Find
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
            ltv: item.ltv || 0,
            stage: stage,
            lastActionDate: item.last_action_date || new Date(item.created_at).toISOString().split('T')[0],
            ragStatus: item.status_colour || 'Green'
          };
        });
        setCases(mappedData);
      }
    } catch (error) {
      console.error('Error in loadCases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      // Save to Supabase as requested
      const { error } = await supabase
        .from('cases')
        .insert({
          client_name: newCase.clientName,
          stage: newCase.stage.toLowerCase(),
          property_value: Number(newCase.propertyValue),
          loan_amount: Number(newCase.loanAmount),
          ltv: Number(newCase.ltv) || Math.round((Number(newCase.loanAmount) / Number(newCase.propertyValue)) * 100),
          status_colour: newCase.statusColour,
          assigned_to: newCase.assignedTo
        });

      if (error) {
        console.error('Supabase insert error:', error);
        setModalError('Failed to save case to database. Please try again.');
        return;
      }
      
      setShowAddModal(false);
      setNewCase({ 
        clientName: '', 
        propertyValue: '', 
        loanAmount: '', 
        ltv: '', 
        statusColour: 'Green', 
        assignedTo: 'Hassan Hamidi',
        stage: 'Lead' 
      });
      // Real-time subscription will handle the UI update, but we can also call loadCases() to be sure
      loadCases();
    } catch (error) {
      setModalError('An unexpected error occurred. Please try again.');
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this case?')) return;
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadCases();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete case');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-archo-brass"></div>
      </div>
    );
  }

  return (
    <div className="p-8 relative z-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif font-bold text-archo-ink tracking-tight">Case Pipeline</h2>
          <p className="text-archo-slate mt-2 font-serif italic">You have {cases.length} active cases this month.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-archo-brass text-archo-cream px-8 py-3 rounded-full font-serif font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          New Case <ArrowRight size={16} />
        </button>
      </header>

      <div className="flex gap-8 overflow-x-auto pb-8 min-h-[calc(100vh-250px)]">
        {STAGES.map((stage) => (
          <div key={stage} className="kanban-column">
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-archo-brass">{stage}</h3>
              <span className="text-[10px] bg-archo-brass/10 text-archo-brass px-2.5 py-1 rounded-full font-bold border border-archo-brass/20">
                {cases.filter(c => c.stage === stage).length}
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              {cases.filter(c => c.stage === stage).map((item) => (
                <motion.div
                  layoutId={item.id}
                  key={item.id}
                  className="case-card group relative overflow-hidden"
                  whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(139, 115, 46, 0.1)" }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shadow-sm ${
                      item.ragStatus === 'Green' ? 'bg-emerald-600' : 
                      item.ragStatus === 'Amber' ? 'bg-archo-brass' : 'bg-red-600'
                    }`} />
                    <button 
                      onClick={() => handleDeleteCase(item.id)}
                      className="text-archo-muted opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  
                  <h4 className="font-serif font-bold text-xl text-archo-ink mb-2 leading-tight">{item.clientName}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5">
                    <span className="text-[11px] font-mono text-archo-muted uppercase tracking-wider">£{item.propertyValue.toLocaleString()} val</span>
                    <span className="text-[11px] font-mono text-archo-muted uppercase tracking-wider">{item.ltv}% LTV</span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-archo-brass/10">
                    <div className="flex items-center gap-2 text-archo-muted">
                      <Calendar size={13} className="text-archo-brass/60" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.lastActionDate}</span>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full border-2 border-archo-cream bg-archo-ink flex items-center justify-center text-[8px] text-archo-brass-pale font-serif font-bold">AI</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <button 
                onClick={() => {
                  setNewCase(prev => ({ ...prev, stage }));
                  setShowAddModal(true);
                }}
                className="w-full py-4 border border-dashed border-archo-brass/30 rounded-2xl text-archo-brass hover:bg-archo-brass/5 hover:border-archo-brass transition-all text-[10px] font-bold uppercase tracking-[0.2em]"
              >
                + Add Case
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Case Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
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
                      setShowAddModal(false);
                      setModalError(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-serif font-bold text-archo-slate hover:bg-archo-brass/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-archo-brass text-archo-cream rounded-xl font-serif font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    Create Case
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
