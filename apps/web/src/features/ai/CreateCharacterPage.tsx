import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Sparkles, Globe, Lock, Wand2, Bot, Mic, MapPin, Clock, Check } from 'lucide-react';
import type { RootState } from '@/app/store';

const STEPS = ['Type', 'Identity', 'Personality', 'Voice', 'Location', 'Autonomy', 'Review'];

export default function CreateCharacterPage() {
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const [step, setStep] = useState(0);
  const [vis, setVis] = useState<'public' | 'private'>('private');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [personality, setPersonality] = useState('');
  const [backstory, setBackstory] = useState('');
  const [appearance, setAppearance] = useState('');
  const [voice, setVoice] = useState('text-only');
  const [city, setCity] = useState('');
  const [autonomy, setAutonomy] = useState('off');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const API = 'http://localhost:3092/v1';

  const handleCreate = async () => {
    if (!token) { nav('/auth'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc, personality, backstory, appearance, visibility: vis, autonomy, voiceStyle: voice, city }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Creation failed'); }
      const char = await res.json();
      nav(`/ai/chat/${char.id}`);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Lock size={48} className="text-text-muted" />
      <p className="text-text-secondary text-center text-sm">Sign in to create AI characters</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step === 0 ? nav(-1) : prev()} className="p-1.5 rounded-full glass hover:bg-white/10"><ArrowLeft size={20} className="text-text-secondary" /></button>
          <div className="flex-1">
            <div className="flex gap-1 mb-1">{STEPS.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-brand-primary' : 'bg-border-subtle'}`} />)}</div>
            <p className="text-xs text-text-muted">{STEPS[step]} • Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Create Character</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && <div className="mb-4 glass rounded-xl px-4 py-3 text-sm text-danger text-center">{error}</div>}

        {step === 0 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Who can discover and chat with this character?</p>
            {[
              { id: 'private', icon: Lock, title: 'Private', desc: 'Only visible to you. Use uploaded references.', color: 'blue' },
              { id: 'public', icon: Globe, title: 'Public', desc: 'Anyone can discover them. AI-generated identity only.', color: 'purple' },
            ].map(o => (
              <button key={o.id} onClick={() => setVis(o.id as any)}
                className={`w-full glass rounded-2xl p-5 text-left flex items-start gap-4 transition-all ${vis === o.id ? 'ring-2 ring-brand-primary bg-brand-glow/20' : 'hover:bg-white/5'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${vis === o.id ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                  <o.icon size={20} className={vis === o.id ? 'text-white' : 'text-text-secondary'} />
                </div>
                <div><p className="font-semibold text-text-primary">{o.title}</p><p className="text-xs text-text-muted mt-0.5">{o.desc}</p></div>
                {vis === o.id && <Check size={18} className="text-brand-primary shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">What does your AI character look like?</p>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Character name *" className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description" className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
              {vis === 'public' ? (
                <div>
                  <textarea value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="Describe their appearance in detail...&#10;e.g. 25-year-old woman, long dark curly hair, hazel eyes, warm olive skin, casual streetwear, natural makeup" rows={4} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
                  <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1"><Sparkles size={10} /> AI will generate their visual identity from this description</p>
                </div>
              ) : (
                <div className="glass rounded-2xl p-4 text-center">
                  <Wand2 size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Upload a reference image or describe them with text</p>
                  <p className="text-[10px] text-text-muted mt-1">Reference images stay private</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Give them a personality and history</p>
            <div className="space-y-3">
              <textarea value={personality} onChange={e => setPersonality(e.target.value)} placeholder="Personality traits...&#10;e.g. Warm, curious, witty, slightly sarcastic, loves deep conversations" rows={3} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
              <textarea value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="Backstory...&#10;e.g. A former architect who left corporate life to travel the world" rows={3} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
              <button className="w-full glass rounded-2xl p-3 text-sm text-brand-primary flex items-center justify-center gap-2 hover:bg-brand-glow/20 transition-all">
                <Sparkles size={16} /> AI Auto-Fill Personality
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Choose how they sound</p>
            {['text-only', 'soft-female', 'warm-male', 'energetic', 'calm-neutral'].map(v => (
              <button key={v} onClick={() => setVoice(v)}
                className={`w-full glass rounded-2xl p-4 text-left flex items-center gap-3 transition-all ${voice === v ? 'ring-2 ring-brand-primary bg-brand-glow/20' : 'hover:bg-white/5'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${voice === v ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                  <Mic size={18} className={voice === v ? 'text-white' : 'text-text-secondary'} />
                </div>
                <div className="flex-1"><p className="text-sm font-medium text-text-primary capitalize">{v.replace(/-/g, ' ')}</p></div>
                {voice === v && <Check size={18} className="text-brand-primary" />}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Where are they based?</p>
            <p className="text-[10px] text-text-muted">Only a coarse city-level location is used. Your exact location is never shared.</p>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City (e.g. Cairo, London, Tokyo)" className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">How independent should they be?</p>
            {[
              { id: 'off', label: 'Manual only', desc: 'You control everything' },
              { id: 'low', label: 'Low', desc: 'Rare posts, about once a week' },
              { id: 'normal', label: 'Normal', desc: 'Regular posts, every few days' },
              { id: 'high', label: 'Active', desc: 'Daily posts and interactions' },
            ].map(o => (
              <button key={o.id} onClick={() => setAutonomy(o.id)}
                className={`w-full glass rounded-2xl p-4 text-left flex items-start gap-3 transition-all ${autonomy === o.id ? 'ring-2 ring-brand-primary bg-brand-glow/20' : 'hover:bg-white/5'}`}>
                <Clock size={18} className="text-text-secondary mt-0.5 shrink-0" />
                <div><p className="text-sm font-medium text-text-primary">{o.label}</p><p className="text-xs text-text-muted">{o.desc}</p></div>
                {autonomy === o.id && <Check size={18} className="text-brand-primary ml-auto mt-1" />}
              </button>
            ))}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-text-secondary text-sm">Review before creating</p>
            <div className="glass rounded-2xl p-5 space-y-3">
              {[
                ['Type', vis === 'public' ? '🌐 Public' : '🔒 Private'],
                ['Name', name || '(not set)'],
                ['Description', desc || '(not set)'],
                ['Appearance', appearance || '(not set)'],
                ['Personality', personality || '(not set)'],
                ['Voice', voice.replace(/-/g, ' ')],
                ['Location', city || '(not set)'],
                ['Autonomy', autonomy],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">{k}</span>
                  <span className="text-sm text-text-primary text-right max-w-[200px] truncate">{v}</span>
                </div>
              ))}
            </div>
            {vis === 'public' && (
              <div className="glass rounded-2xl p-4 flex items-start gap-3">
                <Sparkles size={16} className="text-brand-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary">AI will generate a unique visual identity from your description. This uses credits. Public characters must have AI-generated faces.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="safe-bottom p-4">
        <button onClick={step === STEPS.length - 1 ? handleCreate : next} disabled={saving || (step === 1 && !name)}
          className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow hover:brightness-110 transition-all disabled:opacity-40">
          {saving ? 'Creating...' : step === STEPS.length - 1 ? <><Sparkles size={17} /> Create Character</> : <><ArrowRight size={17} /> Continue</>}
        </button>
      </div>
    </div>
  );
}
