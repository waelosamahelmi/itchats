import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, ArrowRight, Sparkles, Globe, Lock, Check, Wand2, Bot,
  Mic, Volume2, Pause, Play, MapPin, Clock, Star, ShieldAlert,
  ChevronRight, Loader2, RefreshCw, Pencil, Trash2,
  Users, Palette, Music, Heart, Zap, Brain, Eye, Smile,
  Camera, Video, CreditCard, AlertTriangle,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { Badge } from '@itchats/ui';
import { mockVoices, mockCurrentUser, type MockVoice } from '@/lib/mockData';

const STEPS = [
  { id: 'basics', label: 'Basics', icon: Sparkles },
  { id: 'personality', label: 'Personality', icon: Brain },
  { id: 'appearance', label: 'Appearance', icon: Eye },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'media-budget', label: 'Budget', icon: CreditCard },
  { id: 'autonomy', label: 'Autonomy', icon: Users },
  { id: 'review', label: 'Review', icon: Star },
];

const GENDERS = [
  { id: 'female', label: 'Female', icon: '♀' },
  { id: 'male', label: 'Male', icon: '♂' },
  { id: 'non-binary', label: 'Non-binary', icon: '⚧' },
];

const PERSONALITY_TYPES = [
  { id: 'creative', label: 'Creative', emoji: '🎨', desc: 'Artistic, imaginative, expressive' },
  { id: 'analytical', label: 'Analytical', emoji: '🧮', desc: 'Logical, precise, data-driven' },
  { id: 'playful', label: 'Playful', emoji: '🎭', desc: 'Fun, energetic, spontaneous' },
  { id: 'serious', label: 'Serious', emoji: '🎯', desc: 'Focused, disciplined, grounded' },
  { id: 'romantic', label: 'Romantic', emoji: '💝', desc: 'Passionate, emotional, dreamy' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🏔️', desc: 'Bold, curious, thrill-seeking' },
];

const SPEAKING_STYLES = ['Casual', 'Formal', 'Sarcastic', 'Sweet', 'Direct', 'Poetic'];
const HUMOR_STYLES = ['Witty', 'Dry', 'Goofy', 'Dark', 'Silly', 'None'];
const INTEREST_TAGS = ['Music', 'Tech', 'Fashion', 'Sports', 'News', 'Art', 'Food', 'Travel', 'Gaming', 'Science', 'Philosophy', 'Fitness', 'Movies', 'Books', 'Nature'];

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

// ── Progress Bar ──
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = ((step + 1) / total) * 100;
  return (
    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Card Select ──
function CardSelect({ options, selected, onSelect, renderLabel }: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  renderLabel?: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt === selected ? '' : opt)}
          className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
            selected === opt
              ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
              : 'glass text-text-muted hover:text-text-primary hover:bg-white/5'
          }`}
        >
          {renderLabel ? renderLabel(opt) : opt}
        </button>
      ))}
    </div>
  );
}

// ── Voice Card ──
function VoiceCard({ voice, selected, onSelect, playing, onPlay }: {
  voice: MockVoice;
  selected: boolean;
  onSelect: () => void;
  playing: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full glass rounded-2xl p-4 text-left flex items-start gap-3 transition-all ${
        selected ? 'ring-2 ring-brand-primary bg-brand-glow/10' : 'hover:bg-white/5'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
        selected ? 'bg-brand-primary' : 'bg-surface-elevated'
      }`}>
        <Mic size={18} className={selected ? 'text-white' : 'text-text-secondary'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{voice.name}</p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {voice.gender === 'male' ? '♂' : '♀'} {voice.style}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{voice.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <span
          onClick={(e) => { e.stopPropagation(); onPlay(); }}
          className={`p-2 rounded-lg glass hover:bg-brand-glow/20 transition-all ${
            playing ? 'text-brand-primary' : 'text-text-secondary hover:text-brand-primary'
          }`}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </span>
        {selected && <Check size={16} className="text-brand-primary shrink-0" />}
      </div>
    </button>
  );
}

// ── MAIN COMPONENT ──
export default function CreateCharacterPage() {
  const nav = useNavigate();
  const { characterId } = useParams<{ characterId?: string }>();
  const isEdit = !!characterId;
  const { token } = useSelector((s: RootState) => s.auth);

  // Step state
  const [step, setStep] = useState(0);

  // Step 1 - Basics
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [desc, setDesc] = useState('');
  const [vis, setVis] = useState<'public' | 'private'>('private');

  // Step 2 - Personality
  const [personalityType, setPersonalityType] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [humorStyle, setHumorStyle] = useState('');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [emotionalBaseline, setEmotionalBaseline] = useState('');

  // Step 3 - Appearance
  const [appearance, setAppearance] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [occupation, setOccupation] = useState('');

  // Step 4 - Voice
  const [voiceId, setVoiceId] = useState('');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Step 5 - Media Budget
  const [budgetPeriod, setBudgetPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [maxImages, setMaxImages] = useState(0);
  const [maxVideos, setMaxVideos] = useState(0);
  const [agreeToDeductions, setAgreeToDeductions] = useState(false);

  // Step 6 - Autonomy

  // ── Credit cost constants ──
  const IMAGE_COST = 175;
  const VIDEO_COST = 625;
  const userBalance = mockCurrentUser.score;

  const computeMonthlyCredits = () => {
    const totalPerPeriod = maxImages * IMAGE_COST + maxVideos * VIDEO_COST;
    return budgetPeriod === 'weekly' ? totalPerPeriod * 4 : totalPerPeriod;
  };

  const estimatedMonthlyCredits = computeMonthlyCredits();
  const remainingAfterDeduction = userBalance - estimatedMonthlyCredits;

  // Step 6 - Autonomy
  const [city, setCity] = useState('');
  const [canPost, setCanPost] = useState(false);
  const [canStory, setCanStory] = useState(false);
  const [postFrequency, setPostFrequency] = useState('medium');
  const [interests, setInterests] = useState<string[]>([]);

  // General
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [loadingChar, setLoadingChar] = useState(isEdit);

  const totalSteps = STEPS.length;

  // Fetch character on edit
  useEffect(() => {
    if (!isEdit || !token || !characterId) return;
    setLoadingChar(true);
    (async () => {
      try {
        const res = await fetch(`${API}/characters/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setName(data.name || '');
        setDesc(data.description || '');
        setGender(data.gender || '');
        setAppearance(data.appearance || '');
        setVoiceId(data.voiceProfileId || '');
        setCity(data.location?.city || '');
        setVis(data.visibility || 'private');
        if (data.autonomyConfig) {
          setCanPost(data.autonomyConfig.canPost || false);
          setPostFrequency(data.autonomyConfig.frequency || 'medium');
        }
      } catch (e: any) { setError(e.message); }
      setLoadingChar(false);
    })();
  }, [characterId, token, isEdit]);

  const next = () => {
    if (step === 0 && !name.trim()) { setError('Please enter a name'); return; }
    if (step === 4 && estimatedMonthlyCredits > 0 && !agreeToDeductions) { setError('Please agree to monthly credit deductions'); return; }
    setError('');
    setStep(s => Math.min(s + 1, totalSteps - 1));
  };
  const prev = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const handleGenerateImage = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    setGeneratedImage(`https://picsum.photos/400/400?random=${Date.now()}`);
    setGenerating(false);
  };

  const handlePlayVoice = (v: MockVoice) => {
    if (playingVoice === v.id) {
      audioRef.current?.pause();
      setPlayingVoice(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    setPlayingVoice(v.id);
    setTimeout(() => setPlayingVoice(null), 3000);
  };

  const toggleInterest = (tag: string) => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!token) { nav('/auth'); return; }
    setSaving(true);
    setError('');
    try {
      const url = isEdit ? `${API}/characters/${characterId}` : `${API}/characters`;
      const method = isEdit ? 'PATCH' : 'POST';
      const body: any = {
        name, description: desc, gender, appearance, visibility: vis,
        city, occupation, personalityType, speakingStyle, humorStyle,
        energyLevel, emotionalBaseline, interests,
        autonomyLevel: canPost ? postFrequency : 'off',
        mediaBudgetType: budgetPeriod,
        maxImagesPerPeriod: maxImages,
        maxVideosPerPeriod: maxVideos,
        mediaBudgetCredits: computeMonthlyCredits(),
        agreeToDeductions,
      };
      if (voiceId) body.voiceProfileId = voiceId;

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Save failed'); }
      const char = await res.json();
      nav(`/ai/chat/${isEdit ? characterId : char.id}`);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!token || !characterId) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await fetch(`${API}/characters/${characterId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      nav('/characters');
    } catch (e: any) { setError(e.message); }
    setDeleting(false);
  };

  // ── Not authenticated ──
  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Bot size={48} className="text-text-muted" />
      <p className="text-text-secondary text-center text-sm">Sign in to {isEdit ? 'edit' : 'create'} AI characters</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  if (loadingChar) return (
    <div className="flex h-full items-center justify-center bg-bg-canvas">
      <Loader2 size={32} className="animate-spin text-brand-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => step === 0 ? nav(-1) : prev()} className="p-1.5 rounded-full glass hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <div className="flex-1">
            <ProgressBar step={step} total={totalSteps} />
            <div className="flex items-center justify-between mt-2">
              {STEPS.map((s, i) => (
                <span key={s.id} className={`text-[10px] font-medium transition-colors ${i === step ? 'text-brand-primary' : i < step ? 'text-success' : 'text-text-muted'}`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <h1 className="text-xl font-bold text-text-primary tracking-tight">
          {isEdit ? 'Edit Character' : `Step ${step + 1}: ${STEPS[step]?.label ?? ''}`}
        </h1>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-2 glass rounded-xl px-4 py-3 text-sm text-danger text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Step 1: Basics */}
        {step === 0 && (
          <div className="space-y-5 animate-slide-up">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Give your character a name"
                maxLength={50}
                className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                autoFocus
              />
              <p className="text-[10px] text-text-muted mt-1 text-right">{name.length}/50</p>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Gender</label>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGender(gender === g.id ? '' : g.id)}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                      gender === g.id
                        ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
                        : 'glass text-text-muted hover:text-white'
                    }`}
                  >
                    <span className="mr-1.5 text-base">{g.icon}</span>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Short Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder='e.g. "A free-spirited photographer who travels the world capturing moments"'
                rows={3}
                className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Visibility</label>
              <div className="space-y-2">
                {[
                  { id: 'private', icon: Lock, title: 'Private', desc: 'Only you can see and chat with this character' },
                  { id: 'public', icon: Globe, title: 'Public', desc: 'Anyone can discover and interact with this character' },
                ].map(o => (
                  <button
                    key={o.id}
                    onClick={() => setVis(o.id as any)}
                    className={`w-full glass rounded-2xl p-4 text-left flex items-start gap-3 transition-all ${
                      vis === o.id ? 'ring-2 ring-brand-primary bg-brand-glow/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${vis === o.id ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                      <o.icon size={16} className={vis === o.id ? 'text-white' : 'text-text-secondary'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{o.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{o.desc}</p>
                    </div>
                    {vis === o.id && <Check size={16} className="text-brand-primary shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Personality */}
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            {/* Personality Type */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Personality Type</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITY_TYPES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPersonalityType(personalityType === p.id ? '' : p.id)}
                    className={`rounded-xl p-3.5 text-left transition-all ${
                      personalityType === p.id
                        ? 'bg-brand-primary/20 ring-1 ring-brand-primary/50'
                        : 'glass hover:bg-white/5'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{p.emoji}</span>
                    <span className={`text-sm font-semibold ${personalityType === p.id ? 'text-brand-primary' : 'text-text-primary'}`}>{p.label}</span>
                    <p className="text-[10px] text-text-muted mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Speaking Style */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Speaking Style</label>
              <div className="flex flex-wrap gap-2">
                {SPEAKING_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeakingStyle(speakingStyle === s ? '' : s)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                      speakingStyle === s
                        ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
                        : 'glass text-text-muted hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Humor Style */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Humor Style</label>
              <div className="flex flex-wrap gap-2">
                {HUMOR_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setHumorStyle(humorStyle === s ? '' : s)}
                    className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                      humorStyle === s
                        ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
                        : 'glass text-text-muted hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                Energy Level: <span className="text-brand-primary font-bold">{energyLevel}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={energyLevel}
                onChange={e => setEnergyLevel(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-surface-elevated accent-brand-primary"
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>Chill</span>
                <span>Balanced</span>
                <span>Hyper</span>
              </div>
            </div>

            {/* Emotional Baseline */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Emotional Baseline</label>
              <div className="flex gap-2">
                {['😊 Cheerful', '😌 Calm', '🤔 Pensive', '😤 Intense'].map(e => (
                  <button
                    key={e}
                    onClick={() => setEmotionalBaseline(emotionalBaseline === e ? '' : e)}
                    className={`flex-1 rounded-xl py-3 text-xs font-medium transition-all ${
                      emotionalBaseline === e
                        ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
                        : 'glass text-text-muted hover:text-white'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Appearance */}
        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-text-secondary text-sm">Design how your character looks</p>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Appearance Description</label>
              <textarea
                value={appearance}
                onChange={e => setAppearance(e.target.value)}
                placeholder="e.g. 25-year-old woman, long dark curly hair, hazel eyes, warm olive skin, casual streetwear"
                rows={4}
                className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
              />
            </div>

            <input
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              placeholder="Occupation (e.g. Photographer)"
              className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50"
            />

            {/* Image generation */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-text-primary">Profile Picture</p>
                {generatedImage && (
                  <button onClick={handleGenerateImage} disabled={generating}
                    className="text-xs text-brand-primary flex items-center gap-1 hover:underline">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                )}
              </div>
              {generatedImage ? (
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-brand-primary/30">
                  <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                </div>
              ) : (
                <button
                  onClick={handleGenerateImage}
                  disabled={generating}
                  className="w-full glass rounded-2xl py-8 flex flex-col items-center gap-3 hover:bg-white/8 transition-all"
                >
                  {generating ? (
                    <>
                      <Loader2 size={32} className="animate-spin text-brand-primary" />
                      <p className="text-sm text-text-secondary">Generating your AI portrait...</p>
                      <p className="text-[10px] text-text-muted">This may take a few seconds</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-brand-glow/20 flex items-center justify-center">
                        <Wand2 size={28} className="text-brand-primary" />
                      </div>
                      <p className="text-sm font-medium text-text-primary">Generate AI Profile Picture</p>
                      <p className="text-xs text-text-muted">AI will create a unique portrait from the description</p>
                    </>
                  )}
                </button>
              )}
              {vis === 'public' && (
                <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-warning/5 border border-warning/10">
                  <ShieldAlert size={14} className="text-warning shrink-0 mt-0.5" />
                  <p className="text-[10px] text-text-muted">Public characters must use AI-generated faces. NSFW content is filtered.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Voice */}
        {step === 3 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Choose how your character sounds</p>
            <div className="space-y-2">
              {mockVoices.map(v => (
                <VoiceCard
                  key={v.id}
                  voice={v}
                  selected={voiceId === v.id}
                  onSelect={() => setVoiceId(voiceId === v.id ? '' : v.id)}
                  playing={playingVoice === v.id}
                  onPlay={() => handlePlayVoice(v)}
                />
              ))}
              <button
                onClick={() => setVoiceId('text-only')}
                className={`w-full glass rounded-2xl p-4 text-left flex items-center gap-3 transition-all ${
                  voiceId === 'text-only' ? 'ring-2 ring-brand-primary bg-brand-glow/10' : 'hover:bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${voiceId === 'text-only' ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                  <MessageSquare size={18} className={voiceId === 'text-only' ? 'text-white' : 'text-text-secondary'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Text Only</p>
                  <p className="text-xs text-text-muted">No voice, chat only</p>
                </div>
                {voiceId === 'text-only' && <Check size={16} className="text-brand-primary shrink-0" />}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Media Budget */}
        {step === 4 && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-text-secondary text-sm">Choose how many images and videos your character can generate per period. Credits will be deducted monthly.</p>

            {/* Period selector */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Budget Period</label>
              <div className="flex gap-2">
                {(['weekly', 'monthly'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setBudgetPeriod(p); setAgreeToDeductions(false); }}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                      budgetPeriod === p
                        ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50'
                        : 'glass text-text-muted hover:text-white'
                    }`}
                  >
                    Per {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Images slider */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                <Camera size={12} className="inline mr-1" />
                Images per {budgetPeriod === 'weekly' ? 'week' : 'month'}: <span className="text-brand-primary font-bold">{maxImages}</span>
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={maxImages}
                onChange={e => { setMaxImages(Number(e.target.value)); setAgreeToDeductions(false); }}
                className="w-full h-2 rounded-full appearance-none bg-surface-elevated accent-brand-primary"
                style={{ background: `linear-gradient(to right, var(--brand-primary) ${(maxImages / 50) * 100}%, var(--surface-elevated) ${(maxImages / 50) * 100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>0</span><span>5</span><span>10</span><span>20</span><span>30</span><span>50</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {maxImages} image{maxImages !== 1 ? 's' : ''}/{budgetPeriod} · ~{maxImages * IMAGE_COST} credits/{budgetPeriod}
              </p>
            </div>

            {/* Videos slider */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                <Video size={12} className="inline mr-1" />
                Videos per {budgetPeriod === 'weekly' ? 'week' : 'month'}: <span className="text-brand-primary font-bold">{maxVideos}</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={maxVideos}
                onChange={e => { setMaxVideos(Number(e.target.value)); setAgreeToDeductions(false); }}
                className="w-full h-2 rounded-full appearance-none bg-surface-elevated accent-brand-primary"
                style={{ background: `linear-gradient(to right, var(--brand-primary) ${(maxVideos / 10) * 100}%, var(--surface-elevated) ${(maxVideos / 10) * 100}%)` }}
              />
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {maxVideos} video{maxVideos !== 1 ? 's' : ''}/{budgetPeriod} · ~{maxVideos * VIDEO_COST} credits/{budgetPeriod}
              </p>
            </div>

            {/* Summary box */}
            {estimatedMonthlyCredits > 0 && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Estimated monthly cost</span>
                  <span className="text-sm font-bold text-brand-primary">{estimatedMonthlyCredits.toLocaleString()} credits</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Your balance</span>
                  <span className="text-sm text-text-primary">{userBalance.toLocaleString()} credits</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">After deduction</span>
                  <span className={`text-sm font-semibold ${remainingAfterDeduction >= 0 ? 'text-success' : 'text-danger'}`}>
                    {remainingAfterDeduction.toLocaleString()} credits
                  </span>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeToDeductions}
                      onChange={e => setAgreeToDeductions(e.target.checked)}
                      className="mt-0.5 accent-brand-primary"
                    />
                    <span className="text-[11px] text-text-muted leading-relaxed">
                      I agree to monthly credit deductions. If credits run out, character posting will pause until next renewal.
                    </span>
                  </label>
                </div>

                {remainingAfterDeduction < 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/5 border border-warning/10">
                    <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-[11px] text-warning">Your balance may not cover this budget. Add more credits or reduce images/videos.</p>
                  </div>
                )}
              </div>
            )}

            {estimatedMonthlyCredits === 0 && (
              <div className="glass rounded-2xl p-5 text-center">
                <CreditCard size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No media budget set</p>
                <p className="text-xs text-text-muted mt-1">Your character will not generate images or videos automatically.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Autonomy */}
        {step === 5 && (
          <div className="space-y-5 animate-slide-up">
            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <MapPin size={12} /> Location
              </label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City (e.g. Tokyo, London, New York)"
                className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50"
              />
              <p className="text-[10px] text-text-muted mt-1">Only a coarse city-level location. Never shared precisely.</p>
            </div>

            {/* Autonomy toggles */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 block">Autonomy Settings</label>
              <div className="space-y-3">
                {/* Can post */}
                <button
                  onClick={() => setCanPost(!canPost)}
                  className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${canPost ? 'bg-brand-primary/20' : 'bg-surface-elevated'}`}>
                      <Sparkles size={16} className={canPost ? 'text-brand-primary' : 'text-text-muted'} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">Can post on feed</p>
                      <p className="text-[10px] text-text-muted">Character can create posts independently</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${canPost ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${canPost ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>

                {/* Can story */}
                <button
                  onClick={() => setCanStory(!canStory)}
                  className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${canStory ? 'bg-brand-primary/20' : 'bg-surface-elevated'}`}>
                      <Eye size={16} className={canStory ? 'text-brand-primary' : 'text-text-muted'} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">Can share stories</p>
                      <p className="text-[10px] text-text-muted">Character can post 24-hour stories</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${canStory ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform mt-0.5 ${canStory ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Post Frequency */}
            {canPost && (
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Post Frequency</label>
                <div className="flex gap-2">
                  {[
                    { id: 'low', label: 'Low', desc: '~1/week' },
                    { id: 'medium', label: 'Medium', desc: '~3/week' },
                    { id: 'high', label: 'High', desc: '~2/day' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setPostFrequency(f.id)}
                      className={`flex-1 rounded-xl py-3 text-center transition-all ${
                        postFrequency === f.id ? 'bg-brand-primary/20 ring-1 ring-brand-primary/50' : 'glass hover:bg-white/5'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${postFrequency === f.id ? 'text-brand-primary' : 'text-text-primary'}`}>{f.label}</p>
                      <p className={`text-[10px] ${postFrequency === f.id ? 'text-brand-secondary' : 'text-text-muted'}`}>{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interest Tags */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">Interests</label>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                      interests.includes(tag)
                        ? 'bg-brand-primary text-white'
                        : 'glass text-text-muted hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {step === 6 && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-text-secondary text-sm">Review before {isEdit ? 'saving' : 'creating'}</p>

            {/* Profile preview */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                {generatedImage ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-brand-primary/30">
                    <img src={generatedImage} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-glow flex items-center justify-center">
                    <Bot size={28} className="text-brand-primary" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-text-primary text-lg">{name || '(No name)'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="ai" className="text-[9px]">AI</Badge>
                    {vis === 'public' ? (
                      <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Globe size={10} /> Public</span>
                    ) : (
                      <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Lock size={10} /> Private</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  ['Description', desc || '(not set)'],
                  ['Gender', gender || '(not set)'],
                  ['Personality', personalityType || '(not set)'],
                  ['Speaking', speakingStyle || '(not set)'],
                  ['Humor', humorStyle || '(not set)'],
                  ['Energy', `${energyLevel}/10`],
                  ['Appearance', appearance || '(not set)'],
                  ['Voice', voiceId ? voiceId.charAt(0).toUpperCase() + voiceId.slice(1) : 'Text only'],
                  ['Location', city || '(not set)'],
                  ['Posting', canPost ? `${postFrequency} frequency` : 'Manual only'],
                  ['Stories', canStory ? 'Enabled' : 'Disabled'],
                  ['Interests', interests.length > 0 ? interests.join(', ') : '(none)'],
                  ...(estimatedMonthlyCredits > 0 ? [
                    ['—', '—'],
                    ['Media Budget', `${budgetPeriod === 'weekly' ? 'Weekly' : 'Monthly'}`],
                    ['Images', `${maxImages} per ${budgetPeriod === 'weekly' ? 'week' : 'month'}`],
                    ['Videos', `${maxVideos} per ${budgetPeriod === 'weekly' ? 'week' : 'month'}`],
                    ['Monthly cost', `${estimatedMonthlyCredits.toLocaleString()} credits`],
                  ] : [['Media Budget', 'Not set']]),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className={`text-xs ${k === '—' ? 'text-text-muted/40' : 'text-text-muted'}`}>{k === '—' ? '‎' : k}</span>
                    <span className="text-xs text-text-primary text-right max-w-[180px] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost */}
            <div className="glass rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-brand-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Creation cost: <span className="text-brand-primary font-bold">50 credits</span></p>
                </div>
              </div>
              {estimatedMonthlyCredits > 0 && (
                <div className="flex items-center gap-3 border-t border-white/5 pt-2">
                  <CreditCard size={16} className="text-brand-secondary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Monthly budget: <span className="text-brand-secondary font-bold">{estimatedMonthlyCredits.toLocaleString()} credits</span></p>
                    <p className="text-[10px] text-text-muted">Total first month: 50 + {estimatedMonthlyCredits.toLocaleString()} = {(50 + estimatedMonthlyCredits).toLocaleString()} credits</p>
                  </div>
                </div>
              )}
              <div className="border-t border-white/5 pt-2">
                <p className="text-[10px] text-text-muted">You have {mockCurrentUser.score.toLocaleString()} credits available</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="safe-bottom p-4 space-y-3">
        <button
          onClick={step === totalSteps - 1 ? handleSave : next}
          disabled={saving || deleting || (step === 0 && !name.trim()) || (step === 4 && estimatedMonthlyCredits > 0 && !agreeToDeductions)}
          className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow hover:brightness-110 transition-all disabled:opacity-40"
        >
          {saving ? (
            <><Loader2 size={17} className="animate-spin" /> {isEdit ? 'Saving...' : 'Creating...'}</>
          ) : step === totalSteps - 1 ? (
            <><Sparkles size={17} /> {isEdit ? 'Save Changes' : 'Create Character'}</>
          ) : (
            <>Continue <ArrowRight size={17} /></>
          )}
        </button>
        {isEdit && (
          <button onClick={handleDelete} disabled={deleting || saving}
            className="w-full rounded-2xl glass py-3 text-danger font-medium text-sm flex items-center justify-center gap-2 hover:bg-danger/10 transition-all disabled:opacity-40">
            <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Character'}
          </button>
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}

// Text-only icon fallback
function MessageSquare({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
