import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, CheckCircle2 } from 'lucide-react';

interface ShareSignupLinkProps {
  onClose: () => void;
  ownerId?: string;
}

const ShareSignupLink: React.FC<ShareSignupLinkProps> = ({ onClose, ownerId }) => {
  const [copied, setCopied] = useState(false);
  const signupUrl = `${window.location.origin}/#/signup?ownerId=${ownerId || ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white dark:bg-[#1e293b] w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-8 pb-3 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-[#94a3b8]">Share Signup Link</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[#94a3b8]">
            <X size={16} />
          </button>
        </div>
        <div className="p-8 pt-5 no-scrollbar overflow-y-auto max-h-[80vh]">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Copy size={32} />
              </div>
              <h4 className="text-lg font-black italic text-slate-900 dark:text-white uppercase mb-2">Invite Athletes</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Share this link with parents so they can register their children for your classes.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 break-all text-sm font-medium text-slate-700 dark:text-slate-300 text-center select-all">
              {signupUrl}
            </div>

            <button
              onClick={handleCopy}
              className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#1e4da1] dark:bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ShareSignupLink;
