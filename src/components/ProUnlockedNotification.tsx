import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ProUnlockedNotificationProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ProUnlockedNotification({ isVisible, onClose }: ProUnlockedNotificationProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-8 right-8 z-[100] flex items-center gap-4 px-6 py-4 bg-archo-paper border border-archo-brass/30 rounded-xl shadow-2xl shadow-archo-brass/10"
        >
          <div className="w-12 h-12 flex items-center justify-center bg-archo-brass/10 rounded-full text-archo-brass">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-archo-slate flex items-center gap-2">
              Pro Unlocked
              <CheckCircle2 size={18} className="text-green-500" />
            </h3>
            <p className="text-sm text-archo-muted">You now have access to all premium features.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
