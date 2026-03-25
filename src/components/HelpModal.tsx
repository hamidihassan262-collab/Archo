import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, Search, MousePointer2, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { playModalCloseSound, playHoverSound } from '../lib/sounds';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open Global Search', icon: <Search size={14} /> },
    { keys: ['ESC'], description: 'Close Modals or Search', icon: <X size={14} /> },
    { keys: ['↑', '↓'], description: 'Navigate Search Results', icon: <div className="flex gap-0.5"><ArrowUp size={10} /><ArrowDown size={10} /></div> },
    { keys: ['ENTER'], description: 'Select Search Result', icon: <CornerDownLeft size={14} /> },
    { keys: ['Click'], description: 'Select or Open Item', icon: <MousePointer2 size={14} /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            playModalCloseSound();
            onClose();
          }}
          className="absolute inset-0 bg-archo-ink/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-archo-paper w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-archo-brass/20"
        >
          <div className="p-6 border-b border-archo-brass/10 flex justify-between items-center bg-archo-cream/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-archo-brass/10 rounded-xl text-archo-brass">
                <Keyboard size={20} />
              </div>
              <h3 className="text-xl font-serif font-bold text-archo-ink">Keyboard Shortcuts</h3>
            </div>
            <button 
              onClick={() => {
                playModalCloseSound();
                onClose();
              }}
              onMouseEnter={playHoverSound}
              className="text-archo-muted hover:text-archo-ink transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-archo-slate font-medium uppercase tracking-widest mb-4">Global Shortcuts</p>
            <div className="space-y-3">
              {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-archo-cream/30 border border-archo-brass/5">
                  <div className="flex items-center gap-3">
                    <div className="text-archo-brass/60">
                      {s.icon}
                    </div>
                    <span className="text-sm font-medium text-archo-ink">{s.description}</span>
                  </div>
                  <div className="flex gap-1">
                    {s.keys.map((k, ki) => (
                      <kbd key={ki} className="px-2 py-1 bg-archo-paper border border-archo-brass/20 rounded-lg text-[10px] font-bold text-archo-brass shadow-sm min-w-[24px] flex items-center justify-center">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-archo-brass/5 border border-archo-brass/10">
              <div className="flex gap-3">
                <div className="p-2 bg-archo-brass/10 rounded-lg text-archo-brass h-fit">
                  <Command size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-archo-ink mb-1">Pro Tip</h4>
                  <p className="text-xs text-archo-slate leading-relaxed italic">
                    You can use the secret key "Aftrbirth" anywhere in the app to instantly unlock Pro features for this session.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-archo-cream/50 border-t border-archo-brass/10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-archo-muted">Archo AI · Efficiency by Design</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
