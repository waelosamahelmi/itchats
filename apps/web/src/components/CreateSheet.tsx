import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PenSquare, Camera, Sparkles, Radio, X } from 'lucide-react';

/**
 * Bottom sheet opened by the center "Create" button in the tab bar.
 * Portal-rendered; framer-motion entrance.
 */
export default function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();

  const go = (to: string) => {
    onClose();
    nav(to);
  };

  const actions = [
    {
      icon: PenSquare,
      label: 'New Post',
      desc: 'Share what’s on your mind',
      color: 'bg-brand-primary/15 text-brand-primary',
      onClick: () => go('/?compose=1'),
    },
    {
      icon: Camera,
      label: 'New Story',
      desc: 'A photo or moment, gone in 24h',
      color: 'bg-brand-secondary/15 text-brand-secondary',
      onClick: () => go('/?story=1'),
    },
    {
      icon: Sparkles,
      label: 'New Character',
      desc: 'Create your own AI character',
      color: 'bg-accent-purple/15 text-accent-purple',
      onClick: () => go('/ai/create'),
    },
    {
      icon: Radio,
      label: 'Go Live',
      desc: 'Watch or start live sessions',
      color: 'bg-danger/15 text-danger',
      onClick: () => go('/live'),
    },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="create-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: 'var(--z-modal-backdrop, 1100)' }}
            onClick={onClose}
          />
          <motion.div
            key="create-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 mx-auto max-w-lg bg-bg-canvas rounded-t-3xl border-t border-border-subtle safe-bottom"
            style={{ zIndex: 'var(--z-modal, 1200)' }}
            role="dialog"
            aria-label="Create"
          >
            <div className="w-10 h-1 rounded-full bg-border-default mx-auto mt-3" />
            <div className="flex items-center justify-between px-5 pt-3 pb-1">
              <h2 className="text-lg font-bold text-text-primary">Create</h2>
              <button
                onClick={onClose}
                className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-3 pb-5 space-y-1">
              {actions.map(({ icon: Icon, label, desc, color, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-4 px-3 py-3 min-h-[56px] rounded-2xl hover:bg-white/5 active:bg-white/8 transition-colors text-left"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted truncate">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
