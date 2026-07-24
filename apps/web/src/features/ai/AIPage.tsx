import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, Wand2, MessageCircle } from 'lucide-react';
import type { RootState } from '@/app/store';
import { fetchMine, fetchDiscover, useAppDispatch } from '@/app/store';
import { Avatar, Badge, Tabs } from '@itchats/ui';

export default function AIPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { mine, discover } = useSelector((s: RootState) => s.characters);
  const [tab, setTab] = useState('mine');

  useEffect(() => { dispatch(fetchMine()); dispatch(fetchDiscover()); }, [dispatch]);

  const characters = tab === 'mine' ? mine : discover;

  return (
    <div className="flex flex-col h-full">
      <header className="safe-top px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">AI World</h1>
            <p className="text-text-muted text-xs mt-0.5">Discover & chat with AI personas</p>
          </div>
          <button onClick={() => nav('/ai/create')} className="flex items-center gap-1.5 rounded-full bg-brand-primary hover:bg-brand-secondary text-white px-4 py-2.5 text-sm font-medium shadow-lg shadow-brand-glow transition-all hover:scale-105">
            <Wand2 size={16} /> Create
          </button>
        </div>
        <Tabs value={tab} onValueChange={setTab} items={[
          { value: 'mine', label: 'My Characters' },
          { value: 'discover', label: 'Discover' },
        ]} />
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
              <Bot size={36} className="text-brand-secondary" />
            </div>
            <p className="text-text-secondary text-sm font-medium">{tab === 'mine' ? 'No AI characters yet' : 'Nothing discovered yet'}</p>
            <p className="text-text-muted text-xs text-center max-w-xs">{tab === 'mine' ? 'Create your first AI friend. They will have a unique personality, memories, and visual identity.' : 'Characters created by the community will appear here.'}</p>
            <button onClick={() => nav('/ai/create')} className="flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium accent-glow hover:brightness-110 transition-all mt-2">
              <Sparkles size={16} /> Create Your First AI
            </button>
          </div>
        ) : (
          characters.map((c: any, i: number) => (
            <div
              key={c.id}
              className="flex w-full items-center gap-4 text-left glass rounded-2xl p-3.5 hover:bg-white/8 transition-all group animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <button onClick={() => nav(`/ai/profile/${c.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                <div className="relative shrink-0">
                  <Avatar size="lg" fallback={c.name?.[0]} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-bg-canvas" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary text-sm truncate group-hover:text-brand-primary transition-colors">{c.name}</span>
                    <Badge variant="ai" className="text-[10px] shrink-0">AI</Badge>
                  </div>
                  <p className="text-xs text-text-muted truncate mt-0.5">{c.personality || c.description || 'A unique AI personality waiting to meet you'}</p>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nav(`/ai/chat/${c.id}`); }}
                className="p-2 rounded-full hover:bg-brand-primary/10 transition-colors shrink-0"
              >
                <MessageCircle size={18} className="text-brand-secondary group-hover:text-brand-primary transition-colors" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
