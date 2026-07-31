import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

interface CharacterSuggestion {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  visibility: string;
}

interface MentionAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  text: string;
  onInsertMention: (before: string, mention: string, after: string) => void;
}

export default function MentionAutocomplete({ textareaRef, text, onInsertMention }: MentionAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CharacterSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeQueryStart = useRef<number>(-1);

  // Detect @mention at cursor position
  const detectMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart ?? text.length;
    const textBefore = text.substring(0, cursorPos);
    const match = textBefore.match(/@([\p{L}\p{N}_]*)$/u);

    if (match && match.index !== undefined) {
      activeQueryStart.current = match.index;
      const q = match[1] || '';
      setQuery(q);

      // Debounce API call
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await apiFetch<{ results: CharacterSuggestion[] }>(
            `/characters/mention-search?q=${encodeURIComponent(q)}&limit=10`
          );
          setSuggestions(data.results || []);
          setSelectedIndex(0);
          setIsOpen(true);
        } catch {
          setSuggestions([]);
          setIsOpen(false);
        }
        setLoading(false);
      }, 200);

      // Position the dropdown near the cursor
      updatePosition(el, match.index);
    } else {
      setIsOpen(false);
      setSuggestions([]);
    }
  }, [text, textareaRef]);

  const updatePosition = (el: HTMLTextAreaElement, matchIndex: number) => {
    // Approximate position based on text before cursor
    const textBefore = text.substring(0, matchIndex);
    const lines = textBefore.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    
    // Create a temporary span to measure text width
    const rect = el.getBoundingClientRect();
    const lineHeight = 20;
    // Rough estimate of character width
    const charWidth = 7.5;
    const top = rect.top + (lines.length * lineHeight) + lineHeight + 4;
    const left = rect.left + (lastLine.length * charWidth) + 8;

    setPosition({
      top: Math.min(top, window.innerHeight - 250),
      left: Math.min(left, window.innerWidth - 280),
    });
  };

  useEffect(() => {
    detectMention();
  }, [detectMention]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || suggestions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          selectCharacter(suggestions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, suggestions, selectedIndex]);

  const selectCharacter = (char: CharacterSuggestion) => {
    const handle = char.handle || char.name.toLowerCase().replace(/\s+/g, '_');
    const el = textareaRef.current;
    const cursorPos = el?.selectionStart ?? text.length;
    const startIdx = activeQueryStart.current;
    const before = text.substring(0, startIdx);
    const after = text.substring(cursorPos);
    onInsertMention(before, `@${handle} `, after);
    setIsOpen(false);
    setSuggestions([]);
  };

  if (!isOpen || suggestions.length === 0) return null;

  return createPortal(
    <div
      className="fixed z-[var(--z-dropdown,1000)] w-[260px] max-h-[240px] overflow-y-auto bg-bg-overlay rounded-2xl shadow-xl border border-border-subtle animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(30, 30, 48, 0.95)',
      }}
    >
      {loading && (
        <div className="px-3 py-2 text-xs text-text-muted">Searching...</div>
      )}
      {suggestions.map((char, i) => (
        <button
          key={char.id}
          onMouseDown={(e) => { e.preventDefault(); selectCharacter(char); }}
          className={`flex w-full items-center gap-3 px-3 py-2.5 transition-colors text-left ${
            i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          <img
            src={char.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(char.name)}`}
            alt={char.name}
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{char.name}</p>
            <p className="text-[10px] text-text-muted truncate">@{char.handle}</p>
          </div>
          {char.visibility === 'private' && (
            <span className="text-[9px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">Private</span>
          )}
        </button>
      ))}
    </div>,
    document.body
  );
}
