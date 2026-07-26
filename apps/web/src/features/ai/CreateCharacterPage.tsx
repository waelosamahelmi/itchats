import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Sparkles, Globe, Lock, Wand2, Bot, Mic, MapPin, Clock, Check, Volume2, Trash2, Pencil } from 'lucide-react';
import type { RootState } from '@/app/store';

const STEPS = ['Type', 'Identity', 'Appearance', 'Personality', 'Voice', 'Location', 'Autonomy', 'Review'];

export default function CreateCharacterPage() {
  const nav = useNavigate();
  const { characterId } = useParams<{ characterId?: string }>();
  const isEdit = !!characterId;
  const { token } = useSelector((s: RootState) => s.auth);
  const [step, setStep] = useState(0);
  const [vis, setVis] = useState<'public' | 'private'>('private');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [personality, setPersonality] = useState('');
  const [backstory, setBackstory] = useState('');
  const [appearance, setAppearance] = useState('');
  const [gender, setGender] = useState('');
  const [voice, setVoice] = useState('text-only');
  const [city, setCity] = useState('');
  const [autonomy, setAutonomy] = useState('off');
  // New identity fields
  const [nationality, setNationality] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [height, setHeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [hairStyle, setHairStyle] = useState('');
  const [skinTone, setSkinTone] = useState('');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [humorStyle, setHumorStyle] = useState('');
  const [occupation, setOccupation] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [autofilling, setAutofilling] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [loadingChar, setLoadingChar] = useState(isEdit);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const API = (import.meta as any).env?.VITE_API_URL || '/v1';

  // Fetch character data when editing
  useEffect(() => {
    if (!isEdit || !token || !characterId) return;
    setLoadingChar(true);
    (async () => {
      try {
        const res = await fetch(`${API}/characters/${characterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Character not found');
        const data = await res.json();
        setName(data.name || '');
        setDesc(data.description || '');
        setPersonality(data.personality || '');
        setBackstory(data.backstory || '');
        setAppearance(data.appearance || '');
        setGender(data.gender || '');
        setVoice(data.voiceProfileId || 'text-only');
        setCity(data.location?.city || '');
        setVis(data.visibility || 'private');
        const autoConfig = data.autonomyConfig || {};
        setAutonomy(autoConfig.level || 'off');
      } catch (e: any) {
        setError(e.message || 'Failed to load character');
      }
      setLoadingChar(false);
    })();
  }, [characterId, token, isEdit]);

  const handleAutofill = async () => {
    if (!token || !name) return;
    setAutofilling(true);
    try {
      const res = await fetch(`${API}/characters/autofill`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Autofill failed'); }
      const data = await res.json();
      if (data.personality) setPersonality(data.personality);
      if (data.backstory) setBackstory(data.backstory);
    } catch (e: any) { setError(e.message); }
    setAutofilling(false);
  };

  const handlePreviewVoice = async (voiceId: string, emotion?: string) => {
    if (!token) return;
    setPreviewing(voiceId);
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const body: any = { text: 'Hello! I am an AI character. This is how I sound.', voice: voiceId };
      if (emotion) body.emotion = emotion;
      const res = await fetch(`${API}/ai/tts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { console.warn('TTS error:', data.error); return; }
      if (data.audioBase64) {
        // audioBase64 is already a full data URL: data:audio/mp3;base64,...
        const audioUrl = data.audioBase64.startsWith('data:') ? data.audioBase64 : `data:audio/mp3;base64,${data.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.volume = 1.0;
        await audio.play();
      }
    } catch (e) { console.warn('TTS preview failed:', e); }
    setPreviewing(null);
  };

  const voices = [
    { id: 'aria',   label: 'Aria',   desc: '♀ Bright, energetic American — cheerful and bubbly' },
    { id: 'stella', label: 'Stella', desc: '♀ Elegant British — calm and sophisticated' },
    { id: 'luna',   label: 'Luna',   desc: '♀ Soft, gentle — warm and intimate, slow pace' },
    { id: 'iris',   label: 'Iris',   desc: '♀ Mature, wise — motherly and reassuring' },
    { id: 'sage',   label: 'Sage',   desc: '♀ Laid-back California — casual and cool' },
    { id: 'marcus', label: 'Marcus', desc: '♂ Warm, deep American — like a podcast host' },
    { id: 'james',  label: 'James',  desc: '♂ Authoritative British — commanding narrator' },
    { id: 'theo',   label: 'Theo',   desc: '♂ Young, upbeat American — friendly Gen-Z' },
    { id: 'oliver', label: 'Oliver', desc: '♂ Gentle British — kind teacher vibe' },
    { id: 'text-only', label: 'Text only', desc: 'No voice, chat only' },
  ];
  const emotions = ['neutral', 'happy', 'sad', 'angry', 'surprised'];

  const handleSave = async () => {
    if (!token) { nav('/auth'); return; }
    setSaving(true);
    setError('');
    try {
      const body: any = {
        name, description: desc, personality, backstory, gender, appearance,
        visibility: vis, city, occupation,
        nationality, ethnicity, height, bodyType, eyeColor,
        hair: hairStyle, skinTone, speakingStyle, humorStyle,
        autonomyLevel: autonomy as 'off' | 'low' | 'normal' | 'high',
        storyCadence: autonomy === 'off' ? 'manual' : autonomy === 'low' ? 'every_3_days' : autonomy === 'normal' ? 'every_2_days' : 'daily',
      };
      if (voice !== 'text-only') body.voiceProfileId = voice;

      const url = isEdit ? `${API}/characters/${characterId}` : `${API}/characters`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Save failed'); }
      const char = await res.json();

      // Generate image for ALL new characters (public gets AI portrait, private gets a generated icon)
      if (!isEdit) {
        try {
          const imgRes = await fetch(`${API}/characters/${char.id}/generate-image`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` },
          });
          if (!imgRes.ok) {
            const err = await imgRes.json().catch(() => ({}));
            console.warn('Image generation failed:', err.message || 'Unknown error');
          }
        } catch (err: any) {
          console.warn('Image generation error:', err.message);
          // Don't block — character was created successfully
        }
      }
      // Regenerate image if editing a public character
      if (isEdit && vis === 'public' && appearance) {
        try {
          await fetch(`${API}/characters/${characterId}/generate-image`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` },
          });
        } catch { /* non-fatal */ }
      }

      nav(`/ai/chat/${isEdit ? characterId : char.id}`);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!token || !characterId) return;
    if (!window.confirm('Are you sure you want to delete this character? This action cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API}/characters/${characterId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Delete failed'); }
      nav('/ai');
    } catch (e: any) { setError(e.message); }
    setDeleting(false);
  };

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Lock size={48} className="text-text-muted" />
      <p className="text-text-secondary text-center text-sm">Sign in to {isEdit ? 'edit' : 'create'} AI characters</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  if (loadingChar) return (
    <div className="flex h-full items-center justify-center bg-bg-canvas">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
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
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{isEdit ? 'Edit Character' : 'Create Character'}</h1>
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
            <div className="flex items-center justify-between">
              <p className="text-text-secondary text-sm">Who is your AI character?</p>
              <button onClick={async () => {
                if (!token) return;
                setAutofilling(true);
                try {
                  const res = await fetch(`${API}/characters/autofill`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: '', description: 'random character' }),
                  });
                  const data = await res.json();
                  if (data.name) setName(data.name);
                  if (data.description) setDesc(data.description);
                  if (data.appearance) setAppearance(data.appearance);
                  if (data.personality) setPersonality(data.personality);
                  if (data.backstory) setBackstory(data.backstory);
                  if (data.gender) setGender(data.gender);
                  if (data.occupation) setOccupation(data.occupation);
                  if (data.speakingStyle) setSpeakingStyle(data.speakingStyle);
                  if (data.humorStyle) setHumorStyle(data.humorStyle);
                  if (data.nationality) setNationality(data.nationality);
                  if (data.ethnicity) setEthnicity(data.ethnicity);
                  if (data.height) setHeight(data.height);
                  if (data.bodyType) setBodyType(data.bodyType);
                  if (data.eyeColor) setEyeColor(data.eyeColor);
                  if (data.hair) setHairStyle(data.hair);
                  if (data.skinTone) setSkinTone(data.skinTone);
                } catch {}
                setAutofilling(false);
              }} disabled={autofilling}
                className="glass rounded-xl px-3 py-1.5 text-xs text-brand-primary flex items-center gap-1.5 hover:bg-brand-glow/20 transition-all disabled:opacity-50">
                <Wand2 size={13} /> {autofilling ? 'Generating...' : 'Randomize'}
              </button>
            </div>
            <div className="space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Character name *" className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Who are they? A short concept...&#10;e.g. A free-spirited photographer who travels the world capturing moments" rows={3} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">What do they look like?</p>
            <div className="space-y-3">
              {/* Gender selector */}
              <p className="text-xs text-text-muted">Gender presentation</p>
              <div className="flex gap-2">
                {['Female', 'Male', 'Non-binary'].map(g => (
                  <button key={g} onClick={() => setGender(gender === g ? '' : g)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-all ${
                      gender === g ? 'bg-brand-primary/20 text-brand-primary ring-1 ring-brand-primary/50' : 'glass text-text-muted hover:text-white'
                    }`}>{g}</button>
                ))}
              </div>
              {vis === 'public' ? (
                <div>
                  <textarea value={appearance} onChange={e => setAppearance(e.target.value)} placeholder="Describe their appearance in detail...&#10;e.g. 25-year-old woman, long dark curly hair, hazel eyes, warm olive skin, casual streetwear, natural makeup" rows={4} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <input value={height} onChange={e => setHeight(e.target.value)} placeholder='Height (e.g. 5&apos;8&quot;)' className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                    <input value={bodyType} onChange={e => setBodyType(e.target.value)} placeholder="Body type (e.g. athletic)" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                    <input value={eyeColor} onChange={e => setEyeColor(e.target.value)} placeholder="Eye color" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                    <input value={hairStyle} onChange={e => setHairStyle(e.target.value)} placeholder="Hair (color, style, length)" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                    <input value={skinTone} onChange={e => setSkinTone(e.target.value)} placeholder="Skin tone" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                    <input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Occupation" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                  </div>
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

        {step === 3 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Give them a personality and history</p>
            <div className="space-y-3">
              <textarea value={personality} onChange={e => setPersonality(e.target.value)} placeholder="Personality traits...&#10;e.g. Warm, curious, witty, slightly sarcastic, loves deep conversations" rows={3} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
              <textarea value={backstory} onChange={e => setBackstory(e.target.value)} placeholder="Backstory...&#10;e.g. A former architect who left corporate life to travel the world" rows={3} className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <input value={speakingStyle} onChange={e => setSpeakingStyle(e.target.value)} placeholder="Speaking style (e.g. casual, sarcastic)" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                <input value={humorStyle} onChange={e => setHumorStyle(e.target.value)} placeholder="Humor style (e.g. dry, playful)" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Nationality" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
                <input value={ethnicity} onChange={e => setEthnicity(e.target.value)} placeholder="Ethnicity" className="glass rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
              </div>
              <button onClick={handleAutofill} disabled={autofilling}
                className="w-full glass rounded-2xl p-3 text-sm text-brand-primary flex items-center justify-center gap-2 hover:bg-brand-glow/20 transition-all disabled:opacity-50">
                <Sparkles size={16} /> {autofilling ? 'Generating...' : 'AI Auto-Fill Personality'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Choose how they sound</p>
            {voices.map(v => (
              <div key={v.id} onClick={() => setVoice(v.id)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setVoice(v.id)}
                className={`w-full glass rounded-2xl p-4 text-left flex items-start gap-3 transition-all cursor-pointer ${voice === v.id ? 'ring-2 ring-brand-primary bg-brand-glow/20' : 'hover:bg-white/5'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${voice === v.id ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                  <Mic size={18} className={voice === v.id ? 'text-white' : 'text-text-secondary'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{v.label}</p>
                  <p className="text-xs text-text-muted">{v.desc}</p>
                  {v.id !== 'text-only' && voice === v.id && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {emotions.map(em => (
                        <button key={em} onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id, em); }}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-surface-elevated text-text-muted hover:bg-brand-glow/20 hover:text-brand-primary transition-all capitalize"
                          disabled={previewing === v.id}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {v.id !== 'text-only' && (
                  <button onClick={(e) => { e.stopPropagation(); handlePreviewVoice(v.id); }}
                    className="p-2 rounded-lg glass hover:bg-brand-glow/20 text-text-secondary hover:text-brand-primary transition-all shrink-0 mt-0.5"
                    disabled={previewing === v.id}>
                    <Volume2 size={16} className={previewing === v.id ? 'animate-pulse' : ''} />
                  </button>
                )}
                {voice === v.id && <Check size={18} className="text-brand-primary shrink-0 mt-1" />}
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-text-secondary text-sm">Where are they based?</p>
            <p className="text-[10px] text-text-muted">Only a coarse city-level location is used. Your exact location is never shared.</p>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City (e.g. Cairo, London, Tokyo)" className="w-full glass rounded-2xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-brand-primary/50" />
          </div>
        )}

        {step === 6 && (
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

        {step === 7 && (
          <div className="space-y-5 animate-slide-up">
            <p className="text-text-secondary text-sm">Review before {isEdit ? 'saving' : 'creating'}</p>
            <div className="glass rounded-2xl p-5 space-y-3">
              {[
                ['Type', vis === 'public' ? '🌐 Public' : '🔒 Private'],
                ['Name', name || '(not set)'],
                ['Description', desc || '(not set)'],
                ['Appearance', appearance || '(not set)'],
                ['Personality', personality || '(not set)'],
                ['Speaking', speakingStyle || 'casual'],
                ['Humor', humorStyle || 'natural'],
                ['Occupation', occupation || '(not set)'],
                ['Voice', voice.replace(/-/g, ' ')],
                ['Location', city || '(not set)'],
                ['Nationality', nationality || '(not set)'],
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
      <div className="safe-bottom p-4 space-y-3">
        <button onClick={step === STEPS.length - 1 ? handleSave : next} disabled={saving || deleting || (step === 1 && !name)}
          className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 accent-glow hover:brightness-110 transition-all disabled:opacity-40">
          {saving ? (isEdit ? 'Saving...' : 'Creating...') : step === STEPS.length - 1 ? <>{isEdit ? <Pencil size={17} /> : <Sparkles size={17} />} {isEdit ? 'Save Changes' : 'Create Character'}</> : <><ArrowRight size={17} /> Continue</>}
        </button>
        {isEdit && (
          <button onClick={handleDelete} disabled={deleting || saving}
            className="w-full rounded-2xl glass py-3 text-danger font-medium text-sm flex items-center justify-center gap-2 hover:bg-danger/10 transition-all disabled:opacity-40">
            <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Character'}
          </button>
        )}
      </div>
    </div>
  );
}
