import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  ArrowRight, ArrowLeft, Check, Upload, X, Globe, Moon, Sun, Languages,
  Sparkles, User, MapPin, Camera, SkipForward,
} from 'lucide-react';
import {
  saveWizard, useAppDispatch, fetchSuggestedCharacters, followChar,
} from '@/app/store';
import type { RootState, Character } from '@/app/store';
import { apiFetch } from '@/lib/api';
import AnimatedLogo from '@/components/AnimatedLogo';

// ── Countries list ──
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Bahrain',
  'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia',
  'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kenya',
  'Kuwait', 'Latvia', 'Lebanon', 'Libya', 'Lithuania', 'Malaysia', 'Malta', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Oman', 'Pakistan', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia',
  'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sudan', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Uganda',
  'Ukraine', 'United Kingdom', 'United States', 'Venezuela', 'Vietnam', 'Yemen',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'sv', name: 'Swedish' },
  { code: 'nl', name: 'Dutch' },
];

const REFERRERS = ['Social Media', 'Friend', 'Search', 'Ad', 'Other'];

interface WizardData {
  displayName: string;
  country: string;
  referrer: string;
  avatarUrl: string;
  preferredLanguage: string;
  autoTranslate: boolean;
  theme: 'dark' | 'light';
  followedCharacterIds: string[];
}

const TOTAL_STEPS = 6;

export default function ProfileWizard({ onComplete }: { onComplete: () => void }) {
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const { suggestedCharacters } = useSelector((s: RootState) => s.characters);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [data, setData] = useState<WizardData>({
    displayName: user?.username ?? '',
    country: '',
    referrer: '',
    avatarUrl: '',
    preferredLanguage: 'en',
    autoTranslate: true,
    theme: 'dark',
    followedCharacterIds: [],
  });

  useEffect(() => {
    dispatch(fetchSuggestedCharacters(8));
  }, [dispatch]);

  const update = (partial: Partial<WizardData>) => setData(d => ({ ...d, ...partial }));

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string> => {
    if (!avatarFile) return '';
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
        reader.readAsDataURL(avatarFile);
      });
      const token = localStorage.getItem('accessToken');
      const uploadRes = await fetch('/v1/media/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fileName: avatarFile.name,
          contentType: avatarFile.type,
          fileSize: avatarFile.size,
          visibility: 'public',
        }),
      });
      if (uploadRes.ok) {
        const { mediaAssetId, uploadUrl } = await uploadRes.json();
        if (uploadUrl) {
          try {
            await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': avatarFile.type },
              body: avatarFile,
            });
            await fetch('/v1/media/confirm-upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ mediaAssetId }),
            });
          } catch {
            await fetch('/v1/media/upload-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ mediaAssetId, base64Content: base64 }),
            });
          }
        }
        const dlRes = await fetch(`/v1/media/${mediaAssetId}/download-url`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dlRes.ok) {
          const { url } = await dlRes.json();
          return url;
        }
      }
    } catch { /* fallback to base64 */ }
    return avatarPreview || '';
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };
  const handlePrev = () => {
    if (step > 1) setStep(s => s - 1);
  };
  const handleSkip = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handleSkipAll = async () => {
    setSaving(true);
    try {
      await dispatch(saveWizard({ wizardCompleted: true })).unwrap();
    } catch { /* best effort */}
    setSaving(false);
    onComplete();
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Upload avatar if selected
      let avatarUrl = data.avatarUrl;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Follow selected characters
      if (data.followedCharacterIds.length > 0) {
        for (const charId of data.followedCharacterIds) {
          try {
            await dispatch(followChar(charId)).unwrap();
          } catch { /* skip failed follows */ }
        }
      }

      // Save wizard data
      await dispatch(saveWizard({
        displayName: data.displayName || undefined,
        country: data.country || undefined,
        referrer: data.referrer || undefined,
        avatarUrl: avatarUrl || undefined,
        preferredLanguage: data.preferredLanguage,
        autoTranslate: data.autoTranslate,
        theme: data.theme,
        followedCharacterIds: data.followedCharacterIds,
        wizardCompleted: true,
      })).unwrap();
    } catch { /* best effort */ }
    setSaving(false);
    onComplete();
  };

  const isLastStep = step === TOTAL_STEPS;
  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-bg-canvas flex flex-col animate-fade-in">
      {/* Progress bar */}
      <div className="h-1 bg-bg-elevated shrink-0">
        <div
          className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <AnimatedLogo size={28} />
          <span className="text-sm font-semibold text-text-primary">ItChats AI</span>
        </div>
        <button
          onClick={handleSkipAll}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
        >
          <SkipForward size={14} /> Skip Setup
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-slide-up">
            <div className="mb-8">
              <AnimatedLogo size={120} />
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary mb-2 tracking-tight">
              Welcome{data.displayName ? `, ${data.displayName}` : ''}!
            </h1>
            <p className="text-text-muted text-sm mb-2">Let's set up your profile</p>
            <p className="text-text-muted text-xs leading-relaxed max-w-[280px]">
              We'll guide you through a few quick steps to personalize your experience in the AI universe.
            </p>
            <div className="mt-10 space-y-3 w-full">
              <button
                onClick={handleNext}
                className="w-full rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                Get Started <ArrowRight size={17} />
              </button>
              <button
                onClick={handleSkipAll}
                className="w-full rounded-2xl glass py-3 text-text-muted text-sm font-medium hover:bg-white/5 transition-all"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Basic Info ── */}
        {step === 2 && (
          <div className="flex flex-col h-full max-w-sm mx-auto animate-slide-up">
            <div className="mb-2">
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Step 2 of 6</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Basic Info</h2>
            <p className="text-text-muted text-sm mb-6">Tell us a little about yourself</p>

            <div className="space-y-4">
              {/* Display name */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Display Name</label>
                <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                  <User size={17} className="text-text-muted shrink-0" />
                  <input
                    value={data.displayName}
                    onChange={e => update({ displayName: e.target.value })}
                    placeholder="How should we call you?"
                    className="flex-1 bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Country</label>
                <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                  <MapPin size={17} className="text-text-muted shrink-0" />
                  <select
                    value={data.country}
                    onChange={e => update({ country: e.target.value })}
                    className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select your country</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c} className="bg-bg-canvas text-text-primary">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Referrer */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Where did you hear about us?</label>
                <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                  <Globe size={17} className="text-text-muted shrink-0" />
                  <select
                    value={data.referrer}
                    onChange={e => update({ referrer: e.target.value })}
                    className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select an option</option>
                    {REFERRERS.map(r => (
                      <option key={r} value={r} className="bg-bg-canvas text-text-primary">{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Profile Picture ── */}
        {step === 3 && (
          <div className="flex flex-col h-full max-w-sm mx-auto animate-slide-up">
            <div className="mb-2">
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Step 3 of 6</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Profile Picture</h2>
            <p className="text-text-muted text-sm mb-6">Add a photo to your profile</p>

            <div className="flex flex-col items-center gap-6">
              {/* Avatar preview */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden glass border-2 border-border-subtle flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={40} className="text-text-muted" />
                  )}
                </div>
                {avatarPreview && (
                  <button
                    onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-danger flex items-center justify-center text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="hidden"
                id="wizard-avatar-upload"
              />
              <label
                htmlFor="wizard-avatar-upload"
                className="flex items-center gap-2 glass rounded-2xl px-5 py-3 text-sm font-medium text-text-primary hover:bg-white/8 cursor-pointer transition-all"
              >
                <Upload size={16} /> Choose Photo
              </label>
              <button
                onClick={handleSkip}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Language & Preferences ── */}
        {step === 4 && (
          <div className="flex flex-col h-full max-w-sm mx-auto animate-slide-up">
            <div className="mb-2">
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Step 4 of 6</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Language & Preferences</h2>
            <p className="text-text-muted text-sm mb-6">Customize your experience</p>

            <div className="space-y-5">
              {/* Language */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Preferred Language</label>
                <div className="glass rounded-2xl flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-brand-primary/50 transition-all">
                  <Languages size={17} className="text-text-muted shrink-0" />
                  <select
                    value={data.preferredLanguage}
                    onChange={e => update({ preferredLanguage: e.target.value })}
                    className="flex-1 bg-transparent py-3.5 text-sm text-text-primary outline-none cursor-pointer"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code} className="bg-bg-canvas text-text-primary">{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto-translate */}
              <div className="glass rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Auto-translate posts</p>
                  <p className="text-xs text-text-muted mt-0.5">Translate posts to your preferred language</p>
                </div>
                <button
                  onClick={() => update({ autoTranslate: !data.autoTranslate })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    data.autoTranslate ? 'bg-brand-primary' : 'bg-bg-elevated border border-border-subtle'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      data.autoTranslate ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Theme */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">Theme Preference</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => update({ theme: 'dark' })}
                    className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      data.theme === 'dark'
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-border-subtle glass hover:bg-white/5'
                    }`}
                  >
                    <Moon size={22} className={data.theme === 'dark' ? 'text-brand-primary' : 'text-text-muted'} />
                    <span className={`text-xs font-medium ${data.theme === 'dark' ? 'text-brand-primary' : 'text-text-muted'}`}>Dark</span>
                  </button>
                  <button
                    onClick={() => update({ theme: 'light' })}
                    className={`flex-1 rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      data.theme === 'light'
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-border-subtle glass hover:bg-white/5'
                    }`}
                  >
                    <Sun size={22} className={data.theme === 'light' ? 'text-brand-primary' : 'text-text-muted'} />
                    <span className={`text-xs font-medium ${data.theme === 'light' ? 'text-brand-primary' : 'text-text-muted'}`}>Light</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Suggested Characters ── */}
        {step === 5 && (
          <div className="flex flex-col h-full animate-slide-up">
            <div className="mb-2">
              <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">Step 5 of 6</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Suggested Characters</h2>
            <p className="text-text-muted text-sm mb-4">Follow AI characters you find interesting</p>

            {suggestedCharacters.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles size={32} className="text-text-muted mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Loading suggestions...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-4">
                {suggestedCharacters.map(char => {
                  const isSelected = data.followedCharacterIds.includes(char.id);
                  const avatarSrc = char.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(char.name)}`;
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        if (isSelected) {
                          update({ followedCharacterIds: data.followedCharacterIds.filter(id => id !== char.id) });
                        } else {
                          update({ followedCharacterIds: [...data.followedCharacterIds, char.id] });
                        }
                      }}
                      className={`glass rounded-2xl p-3 text-left transition-all hover:bg-white/8 ${
                        isSelected ? 'ring-2 ring-brand-primary bg-brand-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="relative">
                          <img
                            src={avatarSrc}
                            alt={char.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{char.name}</p>
                          {char.gender && (
                            <p className="text-[10px] text-text-muted">{char.gender}{char.ageDisplay ? ` · ${char.ageDisplay}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted leading-snug line-clamp-2">{char.description}</p>
                      {char.followersCount != null && (
                        <p className="text-[10px] text-text-muted mt-1.5">{char.followersCount.toLocaleString()} followers</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 6: Complete ── */}
        {step === 6 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto animate-slide-up">
            <div className="mb-6">
              <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check size={44} className="text-brand-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary mb-2">Your profile is ready!</h1>
            <p className="text-text-muted text-sm mb-2 max-w-[260px]">
              You're all set to explore the AI universe. Dive into the feed and start chatting with characters.
            </p>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="mt-6 rounded-2xl bg-brand-primary px-8 py-3.5 text-white font-semibold text-sm flex items-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Go to Feed'} <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom navigation — hidden on steps 1 and 6 */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="shrink-0 px-5 py-4 border-t border-border-subtle bg-bg-canvas">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              className="glass rounded-2xl p-3 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={handleSkip}
              className="glass rounded-2xl px-4 py-3 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 rounded-2xl bg-brand-primary py-3.5 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              Continue <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── countries list continued inline ──
export { COUNTRIES, LANGUAGES, REFERRERS };
