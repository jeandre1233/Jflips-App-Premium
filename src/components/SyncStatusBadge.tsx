import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, X, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getAllItems, QueuedSession, updateItemStatus } from '../utils/offlineQueue';

export const SyncStatusBadge: React.FC = () => {
  const [items, setItems] = useState<QueuedSession[]>([]);
  const [showList, setShowList] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadItems = async () => {
    const all = await getAllItems();
    setItems(all);
  };

  useEffect(() => {
    loadItems();
    const interval = setInterval(loadItems, 5000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const failedCount = items.filter(i => i.status === 'failed').length;

  if (items.length === 0) return null;

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      for (const item of items) {
        if (item.status === 'failed') {
          await updateItemStatus(item.id, 'pending');
        }
      }
      await loadItems();
    } catch (err) {
      console.error('Failed to retry offline sessions:', err);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowList(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border transition-all ${
          failedCount > 0 
            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900' 
            : pendingCount > 0 
            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900' 
            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
        }`}
      >
        {failedCount > 0 ? <AlertCircle size={12} className="animate-pulse" /> : <CloudOff size={11} />}
        <span>
          {failedCount > 0 
            ? `${failedCount} sync errors` 
            : pendingCount > 0 
            ? `${pendingCount} pending sync` 
            : 'All synced'}
        </span>
      </motion.button>

      <AnimatePresence>
        {showList && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-6 shadow-2xl border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">Offline Queue</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Local Storage Cache Sync Items</p>
                </div>
                <button 
                  onClick={() => setShowList(false)} 
                  aria-label="Close"
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {failedCount > 0 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 rounded-2xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-red-700 dark:text-red-400 uppercase tracking-wide">Sync Failures Detected</p>
                    <p className="text-[8px] text-red-500/80 font-semibold leading-normal uppercase">Some local records failed to match database constraints.</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={retrying}
                    onClick={handleRetryFailed}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/15 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw size={10} className={retrying ? "animate-spin" : ""} />
                    {retrying ? 'Retrying…' : 'Retry All'}
                  </motion.button>
                </div>
              )}

              <div className="space-y-3 max-h-[45vh] overflow-y-auto no-scrollbar pb-6">
                {items.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-[10px] font-black uppercase">Queue is empty</p>
                ) : (
                  items.map((item, idx) => (
                    <div key={`sync-${item.id || idx}-${idx}`} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30' :
                        item.status === 'synced' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30' :
                        'bg-red-100 text-red-600 dark:bg-red-950/30'
                      }`}>
                        {item.status === 'pending' ? <Clock size={18} /> :
                         item.status === 'synced' ? <CheckCircle2 size={18} /> :
                         <AlertCircle size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase italic">
                          {Array.isArray(item.payload) ? `${item.payload.length} Sessions` : 'Single Session'}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed">
                          {new Date(item.queued_at).toLocaleString()} • <span className={item.status === 'failed' ? "text-red-500" : ""}>{item.status}</span>
                        </p>
                        {item.error && (
                          <p className="text-[8.5px] text-red-500 dark:text-red-400 font-bold mt-1 bg-red-50/50 dark:bg-red-950/10 p-1.5 rounded border border-red-100/30 font-mono break-words leading-tight">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
