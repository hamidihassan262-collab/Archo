import React, { useEffect, useState } from 'react';
import { Search, Filter, Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Lender } from '../types';
import { fetchLenders } from '../services/api';

export default function CriteriaExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLenders();
  }, []);

  const loadLenders = async () => {
    try {
      const data = await fetchLenders();
      setLenders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLenders = lenders.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.selfEmployedPolicy.toLowerCase().includes(searchTerm.toLowerCase())
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

      <div className="flex gap-4 mb-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-archo-brass" size={20} />
          <input
            type="text"
            placeholder="Search by lender name or scenario (e.g. 'self employed 1 year')..."
            className="w-full pl-12 pr-4 py-4 bg-archo-cream border border-archo-brass/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-archo-brass/10 focus:border-archo-brass transition-all placeholder:text-archo-muted shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => alert('Filtering options coming soon!')}
          className="flex items-center gap-2 px-8 py-4 bg-archo-cream border border-archo-brass/20 rounded-2xl text-archo-ink font-serif font-bold hover:bg-archo-paper transition-all shadow-sm"
        >
          <Filter size={18} className="text-archo-brass" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredLenders.map((lender) => (
          <div key={lender.id} className="bg-archo-cream rounded-3xl border border-archo-brass/10 p-8 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-serif font-bold text-archo-ink group-hover:text-archo-brass transition-colors">{lender.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-archo-muted">
                  <Clock size={12} className="text-archo-brass/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Last Updated: {lender.lastUpdated}</span>
                </div>
              </div>
              <div className="bg-archo-brass text-archo-cream px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                Verified
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

            <button 
              onClick={() => alert(`Full policy for ${lender.name} is being retrieved...`)}
              className="w-full mt-8 py-4 bg-archo-ink text-archo-brass-pale rounded-2xl font-serif font-bold text-sm hover:bg-archo-brass hover:text-archo-cream transition-all shadow-lg flex items-center justify-center gap-2"
            >
              View Full Policy <Info size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
