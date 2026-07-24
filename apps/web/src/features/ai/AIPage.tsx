import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Search, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';
import { fetchMine, fetchDiscover, useAppDispatch } from '@/app/store';
import { Avatar, Card, Badge, Tabs } from '@itchats/ui';

export default function AIPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { mine, discover } = useSelector((s: RootState) => s.characters);
  const [tab, setTab] = useState('mine');

  useEffect(() => { dispatch(fetchMine()); dispatch(fetchDiscover()); }, [dispatch]);

  const characters = tab === 'mine' ? mine : discover;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 safe-top">
        <h1 className="text-xl font-bold text-text-primary">AI World</h1>
        <button onClick={() => nav('/ai/chat/new')} className="rounded-full bg-brand-primary p-2 text-white"><Plus size={20} /></button>
      </header>
      <div className="px-4 pb-2"><Tabs value={tab} onValueChange={setTab} items={[{ value: 'mine', label: 'My AI' }, { value: 'discover', label: 'Discover' }]} /></div>
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot size={48} className="text-text-muted mb-3" />
            <p className="text-text-muted text-sm mb-4">{tab === 'mine' ? 'Create your first AI character' : 'No characters discovered yet'}</p>
            <button onClick={() => nav('/ai/create')} className="rounded-full bg-brand-primary px-5 py-2.5 text-white text-sm flex items-center gap-2"><Sparkles size={16} /> Create Character</button>
          </div>
        ) : (
          characters.map((c: any) => (
            <button key={c.id} onClick={() => nav(`/ai/chat/${c.id}`)} className="flex w-full items-center gap-3 text-left hover:opacity-80 transition-opacity">
              <Avatar size="lg" fallback={c.name?.[0]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-medium text-text-primary text-sm">{c.name}</span><Badge variant="ai" className="text-[10px]">AI</Badge></div>
                <p className="text-xs text-text-muted truncate mt-0.5">{c.personality || c.description}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
