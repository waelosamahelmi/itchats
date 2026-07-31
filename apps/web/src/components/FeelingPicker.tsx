import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface FeelingPickerProps {
  show: boolean;
  onClose: () => void;
  onSelect: (feeling: string) => void;
}

const FEELING_CATEGORIES = [
  {
    category: 'Happy',
    emoji: '😊',
    items: [
      { emoji: '😊', label: 'Happy', localizedLabel: 'Happy' },
      { emoji: '🥰', label: 'Loved', localizedLabel: 'Loved' },
      { emoji: '😄', label: 'Cheerful', localizedLabel: 'Cheerful' },
      { emoji: '🤗', label: 'Warm', localizedLabel: 'Warm' },
    ],
  },
  {
    category: 'Excited',
    emoji: '🤩',
    items: [
      { emoji: '🤩', label: 'Excited', localizedLabel: 'Excited' },
      { emoji: '🔥', label: 'Hyped', localizedLabel: 'Hyped' },
      { emoji: '🎯', label: 'Focused', localizedLabel: 'Focused' },
      { emoji: '⚡', label: 'Energetic', localizedLabel: 'Energetic' },
    ],
  },
  {
    category: 'Grateful',
    emoji: '🙏',
    items: [
      { emoji: '🙏', label: 'Grateful', localizedLabel: 'Grateful' },
      { emoji: '💖', label: 'Blessed', localizedLabel: 'Blessed' },
      { emoji: '✨', label: 'Hopeful', localizedLabel: 'Hopeful' },
      { emoji: '🌻', label: 'Optimistic', localizedLabel: 'Optimistic' },
    ],
  },
  {
    category: 'Relaxed',
    emoji: '😌',
    items: [
      { emoji: '😌', label: 'Relaxed', localizedLabel: 'Relaxed' },
      { emoji: '🌿', label: 'Chill', localizedLabel: 'Chill' },
      { emoji: '🧘', label: 'Peaceful', localizedLabel: 'Peaceful' },
      { emoji: '😴', label: 'Sleepy', localizedLabel: 'Sleepy' },
    ],
  },
  {
    category: 'Sad',
    emoji: '😢',
    items: [
      { emoji: '😢', label: 'Sad', localizedLabel: 'Sad' },
      { emoji: '😔', label: 'Down', localizedLabel: 'Down' },
      { emoji: '💔', label: 'Heartbroken', localizedLabel: 'Heartbroken' },
      { emoji: '😞', label: 'Disappointed', localizedLabel: 'Disappointed' },
    ],
  },
  {
    category: 'Angry',
    emoji: '😤',
    items: [
      { emoji: '😤', label: 'Angry', localizedLabel: 'Angry' },
      { emoji: '😡', label: 'Furious', localizedLabel: 'Furious' },
      { emoji: '🤬', label: 'Frustrated', localizedLabel: 'Frustrated' },
      { emoji: '😒', label: 'Annoyed', localizedLabel: 'Annoyed' },
    ],
  },
  {
    category: 'Tired',
    emoji: '😪',
    items: [
      { emoji: '😪', label: 'Tired', localizedLabel: 'Tired' },
      { emoji: '🥱', label: 'Bored', localizedLabel: 'Bored' },
      { emoji: '😵', label: 'Drained', localizedLabel: 'Drained' },
      { emoji: '🤒', label: 'Sick', localizedLabel: 'Sick' },
    ],
  },
  {
    category: 'Celebrating',
    emoji: '🎉',
    items: [
      { emoji: '🎉', label: 'Celebrating', localizedLabel: 'Celebrating' },
      { emoji: '🥳', label: 'Partying', localizedLabel: 'Partying' },
      { emoji: '🎂', label: 'Birthday', localizedLabel: 'Birthday' },
      { emoji: '🏆', label: 'Accomplished', localizedLabel: 'Accomplished' },
    ],
  },
  {
    category: 'Traveling',
    emoji: '✈️',
    items: [
      { emoji: '✈️', label: 'Traveling', localizedLabel: 'Traveling' },
      { emoji: '🏖️', label: 'Vacation', localizedLabel: 'Vacation' },
      { emoji: '🗺️', label: 'Exploring', localizedLabel: 'Exploring' },
      { emoji: '🚗', label: 'On the road', localizedLabel: 'On the road' },
    ],
  },
  {
    category: 'Watching',
    emoji: '📺',
    items: [
      { emoji: '📺', label: 'Watching', localizedLabel: 'Watching' },
      { emoji: '🎬', label: 'Movies', localizedLabel: 'Movies' },
      { emoji: '🎮', label: 'Gaming', localizedLabel: 'Gaming' },
      { emoji: '📖', label: 'Reading', localizedLabel: 'Reading' },
    ],
  },
  {
    category: 'Listening',
    emoji: '🎵',
    items: [
      { emoji: '🎵', label: 'Listening', localizedLabel: 'Listening' },
      { emoji: '🎧', label: 'Music', localizedLabel: 'Music' },
      { emoji: '🎤', label: 'Singing', localizedLabel: 'Singing' },
      { emoji: '🎼', label: 'Inspired', localizedLabel: 'Inspired' },
    ],
  },
  {
    category: 'Eating',
    emoji: '🍽️',
    items: [
      { emoji: '🍽️', label: 'Eating', localizedLabel: 'Eating' },
      { emoji: '☕', label: 'Coffee', localizedLabel: 'Coffee' },
      { emoji: '🍳', label: 'Cooking', localizedLabel: 'Cooking' },
      { emoji: '🥗', label: 'Healthy', localizedLabel: 'Healthy' },
    ],
  },
];

export default function FeelingPicker({ show, onClose, onSelect }: FeelingPickerProps) {
  if (!show) return null;

  const handleSelect = (item: { emoji: string; label: string }) => {
    onSelect(`${item.emoji} ${item.label}`);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal-backdrop,1100)] flex items-end sm:items-center justify-center bg-black/60 animate-fade-in"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-bg-canvas pb-2 z-10">
          <h2 className="text-lg font-semibold text-text-primary">How are you feeling?</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {FEELING_CATEGORIES.map(cat => (
            <div key={cat.category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{cat.emoji}</span>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{cat.category}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.items.map(item => (
                  <button
                    key={item.label}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-white/10 transition-colors"
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span className="text-xs text-text-secondary whitespace-nowrap">{item.localizedLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
