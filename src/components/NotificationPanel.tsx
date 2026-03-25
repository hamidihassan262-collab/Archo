import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Clock, Sparkles } from 'lucide-react';
import { playClickSound, playHoverSound } from '../lib/sounds';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationPanel({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }: NotificationPanelProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-end pt-24 pr-8 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-transparent pointer-events-auto"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
          className="relative bg-archo-paper w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-archo-brass/20 pointer-events-auto z-10"
        >
          <div className="p-5 border-b border-archo-brass/10 flex justify-between items-center bg-archo-cream/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-archo-brass/10 rounded-xl text-archo-brass">
                <Bell size={18} />
              </div>
              <h3 className="text-lg font-serif font-bold text-archo-ink">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.read) && (
                <button 
                  onClick={() => {
                    playClickSound();
                    onMarkAllAsRead();
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-archo-brass hover:text-archo-ink transition-colors"
                >
                  Mark all as read
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-archo-muted hover:text-archo-ink transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-archo-cream rounded-full flex items-center justify-center mx-auto mb-4 border border-archo-brass/10">
                  <Bell size={24} className="text-archo-muted" />
                </div>
                <p className="text-sm font-serif italic text-archo-slate">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.read) {
                        playClickSound();
                        onMarkAsRead(n.id);
                      }
                    }}
                    onMouseEnter={playHoverSound}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      !n.read 
                        ? 'bg-archo-brass/5 border-archo-brass/10 shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-archo-cream/50'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-archo-brass animate-pulse' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <p className={`text-sm leading-relaxed ${!n.read ? 'text-archo-ink font-medium' : 'text-archo-slate'}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-archo-muted">
                          <Clock size={10} />
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!n.read && (
                        <div className="text-archo-brass opacity-0 group-hover:opacity-100">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-archo-cream/30 border-t border-archo-brass/10 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-archo-muted">
              <Sparkles size={10} className="text-archo-brass" />
              Archo Assistant Updates
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
