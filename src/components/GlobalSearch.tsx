import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Building2, ArrowRight, X, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { MortgageCase, Lender } from '../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  onSelectLender: (lenderId: string) => void;
}

export default function GlobalSearch({ isOpen, onClose, onSelectCase, onSelectLender }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ cases: MortgageCase[], lenders: Lender[] }>({ cases: [], lenders: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults({ cases: [], lenders: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults({ cases: [], lenders: [] });
        return;
      }

      setLoading(true);
      try {
        const [casesRes, lendersRes] = await Promise.all([
          supabase.from('cases').select('*').ilike('client_name', `%${query}%`).limit(5),
          supabase.from('lenders').select('*').ilike('name', `%${query}%`).limit(5)
        ]);

        setResults({
          cases: (casesRes.data || []).map(c => ({
            id: c.id,
            clientName: c.client_name,
            propertyValue: c.property_value,
            loanAmount: c.loan_amount,
            ltv: c.ltv,
            stage: c.stage.charAt(0).toUpperCase() + c.stage.slice(1),
            lastActionDate: new Date(c.updated_at || c.created_at).toLocaleDateString(),
            ragStatus: c.rag_status || 'Green'
          })),
          lenders: (lendersRes.data || []).map(l => ({
            id: l.id,
            name: l.name,
            maxLTV: l.max_ltv,
            minIncome: l.min_income,
            selfEmployedPolicy: l.self_employed_policy,
            adverseCreditStance: l.adverse_credit_stance,
            isSpecialist: l.is_specialist,
            lastUpdated: new Date(l.updated_at || l.created_at).toLocaleDateString()
          }))
        });
      } catch (error) {
        console.error('Global search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-archo-ink/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="w-full max-w-2xl bg-archo-paper border border-archo-brass/20 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-6 border-b border-archo-brass/10 flex items-center gap-4">
          <Search className="text-archo-brass" size={24} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cases, lenders, or criteria..."
            className="flex-1 bg-transparent border-none focus:outline-none text-xl font-serif text-archo-ink placeholder:text-archo-muted"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-2 hover:bg-archo-cream rounded-full transition-colors">
            <X size={20} className="text-archo-slate" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto p-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-archo-brass"></div>
              <p className="text-sm font-serif italic text-archo-slate">Searching Archo database...</p>
            </div>
          )}

          {!loading && query.length >= 2 && results.cases.length === 0 && results.lenders.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-archo-slate font-serif italic">No results found for "{query}"</p>
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="py-8 text-center">
              <p className="text-archo-muted text-sm uppercase tracking-widest font-bold">Type at least 2 characters to search</p>
            </div>
          )}

          {!loading && (results.cases.length > 0 || results.lenders.length > 0) && (
            <div className="space-y-8">
              {results.cases.length > 0 && (
                <div>
                  <h4 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass mb-4">Mortgage Cases</h4>
                  <div className="space-y-2">
                    {results.cases.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCase(c.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-archo-cream border border-transparent hover:border-archo-brass/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-archo-paper rounded-xl border border-archo-brass/10">
                            <FileText size={18} className="text-archo-brass" />
                          </div>
                          <div className="text-left">
                            <p className="font-serif font-bold text-archo-ink">{c.clientName}</p>
                            <p className="text-xs text-archo-slate">{c.stage} · £{c.loanAmount.toLocaleString()}</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-archo-brass opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.lenders.length > 0 && (
                <div>
                  <h4 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-archo-brass mb-4">Lender Criteria</h4>
                  <div className="space-y-2">
                    {results.lenders.map(l => (
                      <button
                        key={l.id}
                        onClick={() => {
                          onSelectLender(l.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-archo-cream border border-transparent hover:border-archo-brass/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-archo-paper rounded-xl border border-archo-brass/10">
                            <Building2 size={18} className="text-archo-brass" />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-serif font-bold text-archo-ink">{l.name}</p>
                              {l.isSpecialist && <Sparkles size={12} className="text-archo-brass" />}
                            </div>
                            <p className="text-xs text-archo-slate">Max {l.maxLTV}% LTV · Min £{l.minIncome.toLocaleString()}</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-archo-brass opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-archo-cream border-t border-archo-brass/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-archo-muted">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-archo-paper border border-archo-brass/20 rounded">ESC</kbd> to close</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-archo-paper border border-archo-brass/20 rounded">↵</kbd> to select</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles size={10} className="text-archo-brass" />
            Powered by Archo AI
          </div>
        </div>
      </motion.div>
    </div>
  );
}
