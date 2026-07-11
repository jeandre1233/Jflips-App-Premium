import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CheckCircle2 } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  const [showSynced, setShowSynced] = useState(false);
  const [prevOnline, setPrevOnline] = useState(isOnline);

  useEffect(() => {
    if (!prevOnline && isOnline) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevOnline(isOnline);
  }, [isOnline, prevOnline]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-900 text-amber-500 py-2 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest z-50 sticky top-0"
        >
          <WifiOff size={14} />
          <span>You're offline — sessions will sync when you reconnect.</span>
        </motion.div>
      )}
      {showSynced && isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-emerald-600 text-white py-2 px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest z-50 sticky top-0"
        >
          <CheckCircle2 size={14} />
          <span>Synced</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
