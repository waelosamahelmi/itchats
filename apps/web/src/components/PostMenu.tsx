import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, Flag, Link, Check } from 'lucide-react';
import type { Post } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import { deletePostThunk, reportPostThunk } from '@/app/store';

interface PostMenuProps {
  post: Post;
  currentUserId?: string;
  myCharacterIds?: string[];
  onEdit?: () => void;
}

export default function PostMenu({ post, currentUserId, myCharacterIds, onEdit }: PostMenuProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check ownership
  const isOwner = currentUserId && post.authorId === currentUserId;
  const isCharacterOwner = myCharacterIds?.includes(post.authorId) ?? false;
  const canEdit = isOwner || isCharacterOwner;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowDeleteConfirm(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleDelete = async () => {
    try {
      await dispatch(deletePostThunk(post.id)).unwrap();
      setOpen(false);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    } catch {
      setOpen(false);
    }
  };

  const handleReport = async () => {
    setReporting(true);
    try {
      await dispatch(reportPostThunk({ postId: post.id, reason: 'Reported by user' })).unwrap();
      setOpen(false);
    } catch (err) {
      console.error('Failed to report post:', err);
    }
    setReporting(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
      >
        <MoreHorizontal size={18} className="text-text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-48 py-1.5 glass rounded-2xl shadow-xl border border-border-subtle animate-fade-in">
          {showDeleteConfirm ? (
            <div className="p-3">
              <p className="text-xs text-text-secondary mb-3 text-center">Delete this post?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-1.5 rounded-full text-xs text-text-secondary glass hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-1.5 rounded-full text-xs text-white bg-danger hover:brightness-110 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              {canEdit && (
                <>
                  <button
                    onClick={() => { onEdit?.(); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <Pencil size={15} className="text-text-secondary" />
                    Edit Post
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-white/5 transition-colors"
                  >
                    <Trash2 size={15} />
                    Delete Post
                  </button>
                  <div className="my-1 border-t border-border-subtle" />
                </>
              )}

              <button
                onClick={handleReport}
                disabled={reporting}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/5 transition-colors"
              >
                <Flag size={15} className="text-text-secondary" />
                {reporting ? 'Reporting...' : 'Report Post'}
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={15} className="text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link size={15} className="text-text-secondary" />
                    Copy Link
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
