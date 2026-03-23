import React, { useEffect, useState, useCallback } from 'react';
import { MortgageCase, CaseStage, UserProfile } from '../types';
import { Search, Filter, Plus, MoreVertical, Calendar, User, Trash2, Edit3, X, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import PrimaryButton from './PrimaryButton';

const STAGES: CaseStage[] = ['Lead', 'Fact-Find', 'Sourcing', 'Application', 'Offer', 'Completion'];

interface CasesProps {
  requireAuth: (cb: () => void) => void;
  userProfile: UserProfile;
  onUpgrade: () => void;
  hasProAccess?: boolean;
}

export default function Cases({ requireAuth, userProfile, onUpgrade, hasProAccess }: CasesProps) {
  const [cases, setCases] = useState<MortgageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [draggedCaseId, setDraggedCaseId] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<MortgageCase | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    propertyValue: '',
    loanAmount: '',
    ltv: '',
    statusColour: 'Green',
    assignedTo: 'Hassan Hamidi',
    stage: 'Lead' as CaseStage
  });

  const isFree = !hasProAccess;
  const caseLimit = 3;

  const loadCases = useCallback(async () => {
    try {
      if (userProfile?.id === 'demo-user') {
        if (cases.length === 0) {
          setCases([
            {
              id: 'demo-case-1',
              clientName: 'John & Jane Smith',
              propertyValue: 450000,
              loanAmount: 337500,
              ltv: 75,
              stage: 'Application',
              lastActionDate: new Date().toISOString().split('T')[0],
              ragStatus: 'Green',
              assignedTo: 'Hassan Hamidi',
              createdAt: new Date().toISOString()
            },
            {
              id: 'demo-case-2',
              clientName: 'Robert Brown',
              propertyValue: 280000,
              loanAmount: 210000,
              ltv: 75,
              stage: 'Lead',
              lastActionDate: new Date().toISOString().split('T')[0],
              ragStatus: 'Amber',
              assignedTo: 'Hassan Hamidi',
              createdAt: new Date().toISOString()
            }
          ]);
        }
        setLoading(false);
        return;
      }

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

      if (error) throw error;

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
            clientName: item.client_name,
            propertyValue: item.property_value,
            loanAmount: item.loan_amount,
            ltv: item.ltv,
            stage: stage,
            lastActionDate: item.last_action_date || new Date(item.created_at).toISOString().split('T')[0],
            ragStatus: item.status_colour || 'Green',
            assignedTo: item.assigned_to,
            createdAt: item.created_at
          };
        });
        setCases(mappedData);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();

    const channel = supabase
      .channel('cases-list-feed')
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
    setModalError(null);

    if (isFree && cases.length >= caseLimit) {
      setShowAddModal(false);
      setShowLimitModal(true);
      return;
    }

    try {
      if (userProfile?.id === 'demo-user') {
        const newDemoCase: MortgageCase = {
          id: `demo-${Math.random().toString(36).substr(2, 9)}`,
          clientName: formData.clientName,
          stage: formData.stage,
          propertyValue: Number(formData.propertyValue),
          loanAmount: Number(formData.loanAmount),
          ltv: Number(formData.ltv) || Math.round((Number(formData.loanAmount) / Number(formData.propertyValue)) * 100),
          ragStatus: formData.statusColour as any,
          lastActionDate: new Date().toISOString().split('T')[0],
          assignedTo: formData.assignedTo,
          createdAt: new Date().toISOString()
        };
        setCases(prev => [newDemoCase, ...prev]);
        setShowAddModal(false);
        resetForm();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setModalError('You must be logged in to create a case.');
        return;
      }

      const { error } = await supabase
        .from('cases')
        .insert({
          client_name: formData.clientName,
          stage: formData.stage.toLowerCase(),
          property_value: Number(formData.propertyValue),
          loan_amount: Number(formData.loanAmount),
          ltv: Number(formData.ltv) || Math.round((Number(formData.loanAmount) / Number(formData.propertyValue)) * 100),
          status_colour: formData.statusColour,
          assigned_to: formData.assignedTo,
          user_id: user.id
        });

      if (error) {
        console.error('Supabase Insert Error (Detailed):', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      setModalError(error.message || 'Failed to save case. Please check your connection.');
    }
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    setModalError(null);
    try {
      if (userProfile?.id === 'demo-user') {
        setCases(prev => prev.map(c => c.id === selectedCase.id ? {
          ...c,
          clientName: formData.clientName,
          stage: formData.stage,
          propertyValue: Number(formData.propertyValue),
          loanAmount: Number(formData.loanAmount),
          ltv: Number(formData.ltv) || Math.round((Number(formData.loanAmount) / Number(formData.propertyValue)) * 100),
          ragStatus: formData.statusColour as any,
          assignedTo: formData.assignedTo
        } : c));
        setShowEditModal(false);
        setSelectedCase(null);
        resetForm();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setModalError('You must be logged in to update a case.');
        return;
      }

      const { error } = await supabase
        .from('cases')
        .update({
          client_name: formData.clientName,
          stage: formData.stage.toLowerCase(),
          property_value: Number(formData.propertyValue),
          loan_amount: Number(formData.loanAmount),
          ltv: Number(formData.ltv) || Math.round((Number(formData.loanAmount) / Number(formData.propertyValue)) * 100),
          status_colour: formData.statusColour,
          assigned_to: formData.assignedTo
        })
        .eq('id', selectedCase.id);

      if (error) throw error;
      
      setShowEditModal(false);
      setSelectedCase(null);
      resetForm();
    } catch (error: any) {
      setModalError(error.message || 'Failed to update case.');
    }
  };

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this case?')) return;
    try {
      if (userProfile?.id === 'demo-user') {
        setCases(prev => prev.filter(c => c.id !== id));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to delete a case.');
        return;
      }

      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error: any) {
      alert(error.message || 'Failed to delete case');
    }
  };

  const handleUpdateCaseStage = async (id: string, newStage: CaseStage) => {
    try {
      if (userProfile?.id === 'demo-user') {
        setCases(prev => prev.map(c => c.id === id ? { ...c, stage: newStage } : c));
        return;
      }

      const { error } = await supabase
        .from('cases')
        .update({ stage: newStage.toLowerCase() })
        .eq('id', id);
      if (error) throw error;
      // loadCases will be called by realtime subscription
    } catch (error: any) {
      alert(error.message || 'Failed to update stage');
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedCaseId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: CaseStage) => {
    e.preventDefault();
    if (draggedCaseId) {
      handleUpdateCaseStage(draggedCaseId, targetStage);
      setDraggedCaseId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      propertyValue: '',
      loanAmount: '',
      ltv: '',
      statusColour: 'Green',
      assignedTo: 'Hassan Hamidi',
      stage: 'Lead'
    });
  };

  const openEditModal = (mortgageCase: MortgageCase) => {
    setSelectedCase(mortgageCase);
    setFormData({
      clientName: mortgageCase.clientName,
      propertyValue: mortgageCase.propertyValue.toString(),
      loanAmount: mortgageCase.loanAmount.toString(),
      ltv: mortgageCase.ltv.toString(),
      statusColour: mortgageCase.ragStatus,
      assignedTo: (mortgageCase as any).assignedTo || 'Hassan Hamidi',
      stage: mortgageCase.stage
    });
    setShowEditModal(true);
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'All' || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-archo-brass"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto relative z-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif font-bold text-archo-ink tracking-tight">All Cases</h2>
          <p className="text-archo-slate mt-2 font-serif italic">Manage and track your entire mortgage portfolio.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-archo-cream border border-archo-brass/20 rounded-full p-1 flex shadow-sm">
            <button 
              onClick={() => setViewMode('table')}
              className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-archo-ink text-archo-brass-pale shadow-md' : 'text-archo-muted hover:text-archo-ink'}`}
            >
              Table
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-archo-ink text-archo-brass-pale shadow-md' : 'text-archo-muted hover:text-archo-ink'}`}
            >
              Kanban
            </button>
          </div>
          <PrimaryButton 
            onClick={() => {
              requireAuth(() => {
                resetForm();
                setShowAddModal(true);
              });
            }}
            className="px-8 py-3 rounded-full text-sm flex items-center gap-2"
          >
            <Plus size={18} /> New Case
          </PrimaryButton>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass" size={18} />
          <input
            type="text"
            placeholder="Search by client name..."
            className="w-full pl-12 pr-4 py-3 bg-archo-cream border border-archo-brass/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-archo-brass/10 focus:border-archo-brass transition-all placeholder:text-archo-muted shadow-sm font-serif"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass" size={18} />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="pl-12 pr-8 py-3 bg-archo-cream border border-archo-brass/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-archo-brass/10 focus:border-archo-brass transition-all appearance-none font-serif font-bold text-archo-ink shadow-sm min-w-[160px]"
            >
              <option value="All">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Cases List */}
      {viewMode === 'table' ? (
        <div className="bg-archo-cream rounded-3xl border border-archo-brass/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-archo-paper border-b border-archo-brass/10">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Client Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Stage</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Property Value</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Loan / LTV</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Created</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Assigned To</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-archo-brass/5">
                {filteredCases.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => requireAuth(() => openEditModal(c))}
                    className="hover:bg-archo-paper transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5">
                      <p className="font-serif font-bold text-archo-ink">{c.clientName}</p>
                      <p className="text-[10px] text-archo-muted uppercase tracking-widest mt-1">Ref: {c.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-archo-brass/10 text-archo-brass rounded-full text-[10px] font-bold uppercase tracking-wider border border-archo-brass/20">
                        {c.stage}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-serif font-bold text-archo-ink">£{c.propertyValue.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-serif font-bold text-archo-ink">£{c.loanAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-archo-muted font-mono">{c.ltv}% LTV</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          c.ragStatus === 'Green' ? 'bg-emerald-600' : 
                          c.ragStatus === 'Amber' ? 'bg-archo-brass' : 'bg-red-600'
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-archo-slate">{c.ragStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-archo-muted">
                        <Calendar size={12} className="text-archo-brass/60" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {new Date((c as any).createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-archo-ink flex items-center justify-center text-[8px] text-archo-brass-pale font-serif font-bold">
                          {(c as any).assignedTo?.[0] || 'H'}
                        </div>
                        <span className="text-xs text-archo-slate">{(c as any).assignedTo || 'Hassan Hamidi'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); requireAuth(() => openEditModal(c)); }}
                          className="p-2 text-archo-slate hover:text-archo-brass transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={(e) => requireAuth(() => handleDeleteCase(c.id, e))}
                          className="p-2 text-archo-slate hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCases.length === 0 && (
            <div className="p-20 text-center">
              <Briefcase size={48} className="mx-auto text-archo-brass/20 mb-4" />
              <p className="text-archo-slate font-serif italic">No cases found matching your criteria.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide">
          {STAGES.map(stage => (
            <div 
              key={stage} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
              className="flex-shrink-0 w-80 bg-archo-paper/50 rounded-3xl border border-archo-brass/10 flex flex-col min-h-[600px]"
            >
              <div className="p-6 border-b border-archo-brass/10 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-archo-ink">{stage}</h3>
                <span className="bg-archo-brass/10 text-archo-brass px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {filteredCases.filter(c => c.stage === stage).length}
                </span>
              </div>
              <div className="p-4 flex-1 space-y-4">
                {filteredCases.filter(c => c.stage === stage).map(c => (
                  <motion.div
                    key={c.id}
                    layoutId={c.id}
                    draggable
                    onDragStart={() => handleDragStart(c.id)}
                    onClick={() => requireAuth(() => openEditModal(c))}
                    className="bg-archo-cream p-6 rounded-2xl border border-archo-brass/5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-2 h-2 rounded-full ${
                        c.ragStatus === 'Green' ? 'bg-emerald-600' : 
                        c.ragStatus === 'Amber' ? 'bg-archo-brass' : 'bg-red-600'
                      }`} />
                      <button 
                        onClick={(e) => { e.stopPropagation(); requireAuth(() => openEditModal(c)); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-archo-muted hover:text-archo-brass"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <h4 className="font-serif font-bold text-archo-ink mb-1">{c.clientName}</h4>
                    <p className="text-[10px] text-archo-muted uppercase tracking-widest mb-4">£{c.loanAmount.toLocaleString()} @ {c.ltv}% LTV</p>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-archo-brass/5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-archo-ink flex items-center justify-center text-[6px] text-archo-brass-pale font-serif font-bold">
                          {(c as any).assignedTo?.[0] || 'H'}
                        </div>
                        <span className="text-[10px] text-archo-slate">{(c as any).assignedTo || 'Hassan Hamidi'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-archo-muted">
                        <Calendar size={10} />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">
                          {new Date((c as any).createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLimitModal(false)}
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
                <PrimaryButton onClick={() => { setShowLimitModal(false); onUpgrade(); }} className="w-full py-4 rounded-xl">
                  Upgrade to Pro
                </PrimaryButton>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-4 text-archo-muted font-bold hover:text-archo-ink transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-archo-cream w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-archo-brass/20 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-serif font-bold text-archo-ink">
                  {showAddModal ? 'New Mortgage Case' : 'Edit Case Details'}
                </h3>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="text-archo-muted hover:text-archo-ink">
                  <X size={24} />
                </button>
              </div>
              
              {modalError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  {modalError}
                </div>
              )}

              <form onSubmit={showAddModal ? handleAddCase : handleUpdateCase} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Client Names</label>
                  <input 
                    required
                    type="text" 
                    value={formData.clientName}
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif"
                    placeholder="e.g. John & Jane Doe"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Property Value</label>
                    <input 
                      required
                      type="number" 
                      value={formData.propertyValue}
                      onChange={e => setFormData({ ...formData, propertyValue: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-mono"
                      placeholder="£"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Loan Amount</label>
                    <input 
                      required
                      type="number" 
                      value={formData.loanAmount}
                      onChange={e => setFormData({ ...formData, loanAmount: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-mono"
                      placeholder="£"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">LTV %</label>
                    <input 
                      type="number" 
                      value={formData.ltv}
                      onChange={e => setFormData({ ...formData, ltv: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-mono"
                      placeholder="Auto-calculated"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Status Colour</label>
                    <select 
                      value={formData.statusColour}
                      onChange={e => setFormData({ ...formData, statusColour: e.target.value })}
                      className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif font-bold"
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
                    value={formData.assignedTo}
                    onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-archo-brass mb-1.5">Current Stage</label>
                  <select 
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value as CaseStage })}
                    className="w-full bg-archo-paper border border-archo-brass/20 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-archo-brass/10 font-serif font-bold"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); setModalError(null); }}
                    className="flex-1 py-3 rounded-xl font-serif font-bold text-archo-slate hover:bg-archo-brass/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <PrimaryButton 
                    type="submit"
                    className="flex-1 py-3 rounded-xl"
                  >
                    {showAddModal ? <Plus size={18} /> : <ArrowRight size={18} />}
                    {showAddModal ? 'Create Case' : 'Save Changes'}
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

// Re-using icon from Sidebar for empty state
function Briefcase({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
