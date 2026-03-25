import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Building2, ArrowRight, X, Clock, Sparkles, Loader2, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { MortgageCase, Lender } from '../types';
import { playHoverSound, playClickSound, playSuccessSound, playErrorSound } from '../lib/sounds';

interface TopSearchBarProps {
  onSelectCase: (caseId: string) => void;
  onSelectLender: (lenderId: string) => void;
}

export default function TopSearchBar({ onSelectCase, onSelectLender }: TopSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ cases: MortgageCase[], lenders: Lender[] }>({ cases: [], lenders: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalResults = results.cases.length + results.lenders.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults({ cases: [], lenders: [] });
        setSelectedIndex(-1);
        return;
      }

      setLoading(true);
      try {
        const [casesRes, lendersRes] = await Promise.all([
          supabase.from('cases').select('*').ilike('client_name', `%${query}%`).limit(4),
          supabase.from('lenders').select('*').ilike('name', `%${query}%`).limit(4)
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
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalResults === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalResults);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (selectedIndex < results.cases.length) {
          const c = results.cases[selectedIndex];
          onSelectCase(c.id);
        } else {
          const l = results.lenders[selectedIndex - results.cases.length];
          onSelectLender(l.id);
        }
        setIsOpen(false);
        setQuery('');
      }
    }
  };

  const handleSelectResult = (type: 'case' | 'lender', id: string) => {
    playClickSound();
    if (type === 'case') onSelectCase(id);
    else onSelectLender(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative flex items-center gap-4 text-archo-slate flex-1 max-w-xl">
      <div className="relative flex-1 group">
        <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors ${isOpen ? 'text-archo-brass' : 'text-archo-muted group-focus-within:text-archo-brass'}`}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Search cases, lenders, or criteria..." 
          className={`w-full bg-archo-cream/30 border border-archo-brass/10 rounded-2xl py-2.5 pl-12 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-archo-brass/20 focus:bg-white transition-all placeholder:text-archo-muted text-archo-ink font-serif ${isOpen ? 'shadow-lg border-archo-brass/30' : ''}`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute inset-y-0 right-4 flex items-center gap-1 pointer-events-none">
          <kbd className="px-1.5 py-0.5 bg-archo-paper border border-archo-brass/10 rounded text-[9px] font-bold text-archo-brass flex items-center gap-0.5">
            <Command size={8} /> K
          </kbd>
        </div>

        <AnimatePresence>
          {isOpen && (query.length >= 2 || loading) && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="absolute top-full left-0 right-0 mt-2 bg-archo-paper border border-archo-brass/20 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[480px] flex flex-col"
            >
              <div className="overflow-y-auto p-2">
                {loading && query.length >= 2 && results.cases.length === 0 && results.lenders.length === 0 && (
                  <div className="py-8 text-center">
                    <Loader2 size={24} className="animate-spin text-archo-brass mx-auto mb-2" />
                    <p className="text-xs font-serif italic text-archo-slate">Searching Archo database...</p>
                  </div>
                )}

                {!loading && results.cases.length === 0 && results.lenders.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-xs font-serif italic text-archo-slate">No results found for "{query}"</p>
                  </div>
                )}

                {results.cases.length > 0 && (
                  <div className="mb-2">
                    <h4 className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-archo-brass/60">Mortgage Cases</h4>
                    <div className="space-y-0.5">
                      {results.cases.map((c, i) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectResult('case', c.id)}
                          onMouseEnter={() => {
                            setSelectedIndex(i);
                            playHoverSound();
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${selectedIndex === i ? 'bg-archo-brass/10 border-archo-brass/20' : 'hover:bg-archo-cream border-transparent'} border`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg border transition-colors ${selectedIndex === i ? 'bg-archo-brass text-archo-cream border-archo-brass' : 'bg-archo-paper text-archo-brass border-archo-brass/10'}`}>
                              <FileText size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-serif font-bold text-archo-ink leading-tight">{c.clientName}</p>
                              <p className="text-[10px] text-archo-muted uppercase tracking-wider font-bold mt-0.5">{c.stage} · £{c.loanAmount.toLocaleString()}</p>
                            </div>
                          </div>
                          <ArrowRight size={14} className={`text-archo-brass transition-all ${selectedIndex === i ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {results.lenders.length > 0 && (
                  <div>
                    <h4 className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-archo-brass/60">Lender Criteria</h4>
                    <div className="space-y-0.5">
                      {results.lenders.map((l, i) => {
                        const index = i + results.cases.length;
                        return (
                          <button
                            key={l.id}
                            onClick={() => handleSelectResult('lender', l.id)}
                            onMouseEnter={() => {
                              setSelectedIndex(index);
                              playHoverSound();
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${selectedIndex === index ? 'bg-archo-brass/10 border-archo-brass/20' : 'hover:bg-archo-cream border-transparent'} border`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg border transition-colors ${selectedIndex === index ? 'bg-archo-brass text-archo-cream border-archo-brass' : 'bg-archo-paper text-archo-brass border-archo-brass/10'}`}>
                                <Building2 size={14} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-serif font-bold text-archo-ink leading-tight">{l.name}</p>
                                  {l.isSpecialist && <Sparkles size={10} className="text-archo-brass" />}
                                </div>
                                <p className="text-[10px] text-archo-muted uppercase tracking-wider font-bold mt-0.5">Max {l.maxLTV}% LTV · Min £{l.minIncome.toLocaleString()}</p>
                              </div>
                            </div>
                            <ArrowRight size={14} className={`text-archo-brass transition-all ${selectedIndex === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-archo-cream/50 border-t border-archo-brass/10 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-archo-muted/60">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-archo-paper border border-archo-brass/10 rounded">↑↓</kbd> to navigate</span>
                  <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-archo-paper border border-archo-brass/10 rounded">↵</kbd> to select</span>
                </div>
                <div className="flex items-center gap-1 italic">
                  <Sparkles size={10} className="text-archo-brass/40" />
                  Archo AI Search
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
