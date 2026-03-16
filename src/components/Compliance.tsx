import React from 'react';
import { Shield, Lock, Eye, FileCheck, Scale, Activity, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export default function Compliance() {
  const certifications = [
    { name: 'SOC 2 Type II', status: 'Certified', date: 'Jan 2024' },
    { name: 'ISO 27001', status: 'Certified', date: 'Dec 2023' },
    { name: 'GDPR Compliant', status: 'Verified', date: 'Ongoing' },
    { name: 'Supabase DB', status: import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Local Mode', date: 'Real-time' },
  ];

  const pillars = [
    {
      title: 'Data Sovereignty',
      icon: Lock,
      description: 'End-to-end encryption for all mortgage data. We use AES-256 at rest and TLS 1.3 in transit.',
      details: ['Regional Data Residency', 'Zero-Knowledge Architecture', 'Automated PII Masking']
    },
    {
      title: 'AI Explainability',
      icon: Eye,
      description: 'Archo provides clear reasoning for every recommendation, ensuring no "black box" decisions.',
      details: ['Feature Attribution', 'Counterfactual Analysis', 'Audit-Ready Reasoning']
    },
    {
      title: 'Regulatory Alignment',
      icon: Scale,
      description: 'Our models are continuously tuned to the latest FCA and PRA regulatory updates.',
      details: ['Consumer Duty Compliance', 'Fair Lending Monitoring', 'Bias Mitigation Protocols']
    }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-archo-brass">
          <Shield size={20} />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Trust & Compliance</span>
        </div>
        <h1 className="text-4xl font-serif font-bold text-archo-ink">Institutional Grade Security</h1>
        <p className="text-archo-slate max-w-2xl leading-relaxed">
          Archo is built on the principle of "Compliance by Design." We combine rigorous financial 
          regulatory standards with cutting-edge AI governance to ensure your data and decisions 
          remain secure, transparent, and defensible.
        </p>
      </div>

      {/* Certification Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {certifications.map((cert) => (
          <div key={cert.name} className="bg-archo-cream border border-archo-brass/10 p-4 rounded-xl flex flex-col gap-2 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-archo-muted uppercase tracking-wider">{cert.name}</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-serif font-bold text-archo-ink">{cert.status}</span>
              <span className="text-[10px] text-archo-muted italic">{cert.date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="space-y-4">
            <div className="w-12 h-12 bg-archo-brass/10 rounded-2xl flex items-center justify-center text-archo-brass">
              <pillar.icon size={24} />
            </div>
            <h3 className="text-xl font-serif font-bold text-archo-ink">{pillar.title}</h3>
            <p className="text-sm text-archo-slate leading-relaxed">
              {pillar.description}
            </p>
            <ul className="space-y-2">
              {pillar.details.map((detail) => (
                <li key={detail} className="flex items-center gap-2 text-xs text-archo-muted">
                  <div className="w-1 h-1 bg-archo-brass rounded-full" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* AI Ethics Section */}
      <div className="bg-archo-ink text-archo-cream rounded-3xl p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-archo-brass/10 blur-3xl rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-archo-brass/20 rounded-full border border-archo-brass/30">
              <Activity size={14} className="text-archo-brass-pale" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-archo-brass-pale">Real-time Monitoring</span>
            </div>
            <h2 className="text-3xl font-serif font-bold italic">Algorithmic Fairness & Bias Mitigation</h2>
            <p className="text-archo-muted leading-relaxed">
              Our proprietary Fairness Engine monitors every model inference for potential bias 
              across protected characteristics. Archo automatically flags decisions that deviate 
              from established fair-lending benchmarks, requiring human oversight for override.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => alert('Ethics Whitepaper download started...')}
                className="bg-archo-brass hover:bg-archo-brass-light text-archo-cream px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2"
              >
                Download Ethics Whitepaper <ExternalLink size={14} />
              </button>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-archo-brass-pale">System Health</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Operational
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Bias Variance', value: '0.002%', status: 'Optimal' },
                { label: 'Model Drift', value: 'Negligible', status: 'Optimal' },
                { label: 'Audit Log Integrity', value: '100%', status: 'Verified' },
              ].map((stat) => (
                <div key={stat.label} className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-archo-muted uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-xl font-serif font-bold">{stat.value}</p>
                  </div>
                  <span className="text-[10px] font-mono text-archo-brass-pale">{stat.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-archo-brass/10">
        <div 
          onClick={() => alert('Opening compliance documentation library...')}
          className="flex items-start gap-4 p-6 rounded-2xl border border-archo-brass/5 hover:border-archo-brass/20 transition-all cursor-pointer group"
        >
          <div className="p-3 bg-archo-paper rounded-xl group-hover:bg-archo-brass/10 transition-colors">
            <FileCheck className="text-archo-brass" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-archo-ink">Compliance Documentation</h4>
            <p className="text-xs text-archo-muted mt-1">Access our full library of regulatory filings and security audits.</p>
          </div>
        </div>
        <div 
          onClick={() => alert('Security concern report form opening...')}
          className="flex items-start gap-4 p-6 rounded-2xl border border-archo-brass/5 hover:border-archo-brass/20 transition-all cursor-pointer group"
        >
          <div className="p-3 bg-archo-paper rounded-xl group-hover:bg-archo-brass/10 transition-colors">
            <AlertCircle className="text-archo-brass" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-archo-ink">Report a Security Concern</h4>
            <p className="text-xs text-archo-muted mt-1">Direct line to our Data Protection Officer and Security Response Team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
