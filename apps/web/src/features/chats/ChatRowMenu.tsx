import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Bell, BellOff, Trash2, ChevronLeft } from 'lucide-react';
import type { ConversationListItem } from '@/app/store';
import { useAppDispatch, updateConvSettings } from '@/app/store';

interface ChatRowMenuProps {
  conversation: ConversationListItem;
  onDelete: () => void;
}

/** Per-row three-dot menu for a conversation, rendered through a portal (mirrors PostMenu). */
export default function ChatRowMenu({ conversation, onDelete }: ChatRowMenuProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'mute'>('main');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const conversationId = conversation.conversationId || conversation.id;
  const isMuted = !!conversation.mutedUntil && new Date(conversation.mutedUntil).getTime() > Date.now();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView('main');
        setShowDeleteConfirm(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 208, window.innerWidth - 216),
      });
    }
  };

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setOpen(prev => !prev);
    setView('main');
    setShowDeleteConfirm(false);
  };

  const closeMenu = () => {
    setOpen(false);
    setView('main');
    setShowDeleteConfirm(false);
  };

  const handleMute = async (mutedUntil: string | null) => {
    try {
      await dispatch(updateConvSettings({ conversationId, mutedUntil })).unwrap();
    } catch (err) {
      console.warn('Failed to update mute setting:', err);
    }
    closeMenu();
  };

  const muteOptions = [
    { label: 'Mute 1 hour', value: () => new Date(Date.now() + 3600000).toISOString() },
    { label: 'Mute 8 hours', value: () => new Date(Date.now() + 28800000).toISOString() },
    { label: 'Mute 1 week', value: () => new Date(Date.now() + 604800000).toISOString() },
    { label: 'Mute indefinitely', value: () => new Date(Date.now() + 365 * 86400000 * 100).toISOString() },
  ];

  const menuContent = open && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[var(--z-dropdown,1000)] w-52 py-1.5 bg-bg-overlay rounded-2xl shadow-xl border border-border-subtle animate-fade-in"
      style={{
        top: menuPos.top,
        left: menuPos.left,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(30, 30, 48, 0.95)',
      }}
    >
      {showDeleteConfirm ? (
        <div className="p-3">
          <p className="text-xs text-text-secondary mb-3 text-center">Delete this conversation?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-full text-xs text-text-secondary bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { closeMenu(); onDelete(); }}
              className="flex-1 py-2 rounded-full text-xs text-white bg-danger hover:brightness-110 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      ) : view === 'mute' ? (
        <>
          <button
            onClick={() => setView('main')}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-text-secondary hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={15} />
            Back
          </button>
          <div className="my-1 border-t border-border-subtle" />
          {muteOptions.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleMute(opt.value())}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <BellOff size={15} className="text-text-secondary" />
              {opt.label}
            </button>
          ))}
        </>
      ) : (
        <>
          {isMuted ? (
            <button
              onClick={() => handleMute(null)}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <Bell size={15} className="text-text-secondary" />
              Unmute notifications
            </button>
          ) : (
            <button
              onClick={() => setView('mute')}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <BellOff size={15} className="text-text-secondary" />
              Mute notifications
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-danger hover:bg-white/5 transition-colors"
          >
            <Trash2 size={15} />
            Delete conversation
          </button>
        </>
      )}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors shrink-0"
        aria-label="Conversation options"
      >
        <MoreHorizontal size={16} className="text-text-muted" />
      </button>
      {menuContent}
    </>
  );
}
