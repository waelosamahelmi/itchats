import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Zap, ArrowLeft, Sparkles, Check, Crown, Star, Shield, Image, Mic, MessageCircle, Bot, TrendingUp, Key, BarChart3, Video, Heart, ThumbsUp, Phone } from 'lucide-react';
import type { RootState } from '@/app/store';

const API = (import.meta as any).env?.VITE_API_URL || '/v1';

async function fetchJson(url: string, token: string, opts?: RequestInit) {
  const res = await fetch(`${API}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

interface PlanFeature {
  label: string;
  icon: React.ReactNode;
  tiers: (string | boolean)[];
}

const FEATURES: PlanFeature[] = [
  { label: 'Monthly Credits', icon: <Zap size={14} />, tiers: ['500', '3,000', '15,000', '75,000'] },
  { label: 'Private Characters', icon: <Bot size={14} />, tiers: ['2', '5', '20', '100'] },
  { label: 'Public Characters', icon: <Bot size={14} />, tiers: ['—', '2', '10', '50'] },
  { label: 'Auto Story Characters', icon: <TrendingUp size={14} />, tiers: ['—', '1', '5', '20'] },
  { label: 'Basic Chat', icon: <MessageCircle size={14} />, tiers: [true, true, true, true] },
  { label: 'Image Generation', icon: <Image size={14} />, tiers: ['Limited', true, true, true] },
  { label: 'Voice Messages', icon: <Mic size={14} />, tiers: [true, true, true, true] },
  { label: 'Feed Posting', icon: <MessageCircle size={14} />, tiers: [true, true, true, true] },
  { label: 'Discover', icon: <Star size={14} />, tiers: [true, true, true, true] },
  { label: 'Character Autonomy', icon: <Bot size={14} />, tiers: [false, true, true, true] },
  { label: 'NSFW Filter', icon: <Shield size={14} />, tiers: [false, true, true, true] },
  { label: 'Roleplay', icon: <MessageCircle size={14} />, tiers: [false, false, true, true] },
  { label: 'Custom Voices', icon: <Mic size={14} />, tiers: [false, false, true, true] },
  { label: 'Priority Support', icon: <Star size={14} />, tiers: [false, false, true, true] },
  { label: 'API Access', icon: <Key size={14} />, tiers: [false, false, false, true] },
  { label: 'Analytics', icon: <BarChart3 size={14} />, tiers: [false, false, false, true] },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={14} className="text-green-400" />;
  if (value === false) return <span className="text-text-muted text-xs">—</span>;
  if (value === 'Limited') return <span className="text-yellow-400 text-xs font-medium">Limited</span>;
  return <span className="text-xs text-text-secondary">{value}</span>;
}

export default function BillingPage() {
  const nav = useNavigate();
  const { user, token } = useSelector((s: RootState) => s.auth);
  const [wallet, setWallet] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [w, p, s] = await Promise.all([
        fetchJson('/billing/wallet', token),
        fetchJson('/billing/plans', token),
        fetchJson('/billing/subscription', token).catch(() => null),
      ]);
      setWallet(w);
      setPlans(Array.isArray(p) ? p : []);
      setSub(s);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const checkout = async (planId: string) => {
    if (!token || checkingOut) return;
    if (planId === 'free') {
      // Free plan — already active, no checkout needed
      return;
    }
    setCheckingOut(planId);
    try {
      const result = await fetchJson('/billing/checkout', token, {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      if (result.url) window.location.href = result.url;
      else { alert('Subscribed!'); loadData(); }
    } catch (e: any) { alert(e.message || 'Checkout failed'); }
    finally { setCheckingOut(null); }
  };

  const displayPlans = plans.length >= 4 ? plans : DEFAULT_PLANS;
  const activePlanId = sub?.planId ?? null;

  if (!user) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Wallet size={48} className="text-text-muted" />
      <p className="text-text-secondary text-sm">Sign in to manage billing</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  const balance = wallet?.balance ?? 0;

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => nav('/profile')} className="p-1.5 rounded-full glass">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Billing & Plans</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
        {/* Wallet card */}
        <div className="glass rounded-2xl p-5 bg-gradient-to-br from-brand-glow/10 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Credit Balance</p>
            <Wallet size={16} className="text-brand-primary" />
          </div>
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-white/10" />
          ) : (
            <p className="text-3xl font-bold text-text-primary mb-1">{balance.toLocaleString()}</p>
          )}
          <p className="text-text-muted text-xs">
            {sub ? `${displayPlans.find((p: any) => p.id === sub.planId)?.name ?? sub.planId} plan` : 'Free plan'}
            {' · '}
            {sub?.status === 'active' ? 'Active' : sub?.status ?? 'No subscription'}
          </p>
        </div>

        {/* Plan cards */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Crown size={16} className="text-brand-primary" /> Choose Your Plan
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayPlans.map((plan: any, i: number) => {
                const isActive = plan.id === activePlanId;
                const isRecommended = plan.id === 'pro';
                const planIndex = i;

                return (
                  <div
                    key={plan.id}
                    className={`relative glass rounded-2xl p-5 transition-all ${
                      isActive
                        ? 'ring-2 ring-brand-primary bg-brand-primary/5'
                        : isRecommended
                        ? 'ring-1 ring-brand-secondary/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Recommended badge */}
                    {isRecommended && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles size={10} /> Recommended
                      </div>
                    )}

                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute -top-2.5 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                        <Check size={10} /> Current Plan
                      </div>
                    )}

                    {/* Plan header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                        <p className="text-sm text-text-muted mt-0.5">
                          {plan.monthlyCredits?.toLocaleString() ?? plan.credits} credits/month
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-text-primary">
                          {plan.price ?? (plan.monthlyPriceUsd ? `$${Number(plan.monthlyPriceUsd).toFixed(2)}` : '$0')}
                        </p>
                        <p className="text-[10px] text-text-muted">/month</p>
                      </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {plan.capabilities ? (
                        <>
                          {plan.capabilities.basicChat && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-text-secondary">
                              <MessageCircle size={10} /> Chat
                            </span>
                          )}
                          {plan.capabilities.imageGeneration === true && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-text-secondary">
                              <Image size={10} /> Images
                            </span>
                          )}
                          {plan.capabilities.imageGeneration === 'limited' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-yellow-400">
                              <Image size={10} /> Limited Images
                            </span>
                          )}
                          {plan.capabilities.voiceMessages && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-text-secondary">
                              <Mic size={10} /> Voice
                            </span>
                          )}
                          {plan.capabilities.roleplay && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-primary/10 text-[10px] text-brand-primary">
                              <Star size={10} /> Roleplay
                            </span>
                          )}
                          {plan.capabilities.apiAccess && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-secondary/10 text-[10px] text-brand-secondary">
                              <Key size={10} /> API
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-text-muted">
                          {plan.monthlyCredits?.toLocaleString() ?? plan.credits} credits
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    {isActive ? (
                      <button
                        disabled
                        className="w-full rounded-xl py-2.5 text-sm font-semibold bg-brand-primary/10 text-brand-primary cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : plan.id === 'free' ? (
                      <button
                        disabled
                        className="w-full rounded-xl py-2.5 text-sm font-semibold bg-white/5 text-text-muted cursor-not-allowed"
                      >
                        Included by Default
                      </button>
                    ) : (
                      <button
                        onClick={() => checkout(plan.id)}
                        disabled={checkingOut === plan.id}
                        className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                          isRecommended
                            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:opacity-90'
                            : 'bg-white/10 text-text-primary hover:bg-white/15'
                        } disabled:opacity-50`}
                      >
                        {checkingOut === plan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Redirecting...
                          </span>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature comparison table */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Shield size={16} className="text-text-muted" /> Feature Comparison
          </h2>

          <div className="glass rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider" />
              {displayPlans.slice(0, 4).map((p: any) => (
                <span key={p.id} className="text-[10px] font-medium text-text-muted uppercase tracking-wider text-center">
                  {p.name}
                </span>
              ))}
            </div>

            {/* Table body */}
            {FEATURES.map((feature, i) => (
              <div
                key={feature.label}
                className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] px-4 py-2.5 ${
                  i < FEATURES.length - 1 ? 'border-b border-white/[0.03]' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-xs text-text-secondary">
                  {feature.icon}
                  {feature.label}
                </span>
                {displayPlans.slice(0, 4).map((_: any, j: number) => (
                  <span key={j} className="flex items-center justify-center">
                    <FeatureValue value={feature.tiers[j] ?? '—'} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Credits Reference ── */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Zap size={16} className="text-brand-primary" /> What Your Credits Can Do
          </h2>

          <div className="glass rounded-2xl overflow-hidden">
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Operation</span>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Model</span>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider text-center">Credits</span>
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Example</span>
            </div>

            {CREDIT_OPERATIONS.map((op, i) => (
              <div
                key={op.label}
                className={`px-4 py-3 ${i < CREDIT_OPERATIONS.length - 1 ? 'border-b border-white/[0.03]' : ''} ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_0.8fr_1.2fr] items-center gap-1">
                  <span className="flex items-center gap-2 text-xs text-text-secondary">
                    {op.icon}
                    {op.label}
                  </span>
                  <span className="text-[11px] text-text-muted truncate">{op.model}</span>
                  <span className="text-xs font-semibold text-brand-primary text-center">{op.credits.toLocaleString()}</span>
                  <span className="text-[11px] text-text-muted">{op.example}</span>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                      {op.icon}
                      {op.label}
                    </span>
                    <span className="text-xs font-bold text-brand-primary">{op.credits.toLocaleString()} credits</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{op.model}</span>
                    <span className="text-text-muted/50">&middot;</span>
                    <span>{op.example}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Plan Value Summary ── */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Crown size={16} className="text-brand-primary" /> What Your Plan Gets You
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLAN_VALUE_EXAMPLES.map((plan) => (
              <div key={plan.planId} className="glass rounded-2xl p-4 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-text-primary">{plan.planName}</span>
                  <span className="text-xs font-bold text-brand-primary">{plan.credits.toLocaleString()} credits</span>
                </div>
                <div className="space-y-1.5">
                  {plan.examples.map((ex, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check size={10} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[11px] text-text-secondary">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Voice & Video Call Costs ── */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Phone size={16} className="text-brand-primary" /> Voice &amp; Video Call Costs
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CALL_PRICING.map((item) => (
              <div key={item.label} className="glass rounded-2xl p-5 text-center hover:bg-white/[0.03] transition-colors">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-primary/10 mb-3">
                  <span className="text-brand-primary">{item.icon}</span>
                </div>
                <p className="text-xs font-semibold text-text-primary mb-2">{item.label}</p>
                <p className="text-2xl font-bold text-brand-primary mb-1">~{item.credits}</p>
                <p className="text-[10px] text-text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise / credit packs section */}
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-sm text-text-secondary mb-2">
            Need more credits or a custom plan?
          </p>
          <p className="text-xs text-text-muted">
            Additional credit packs and enterprise billing coming soon. Contact support for custom pricing.
          </p>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    monthlyCredits: 500,
    credits: '500',
    capabilities: {
      basicChat: true,
      imageGeneration: 'limited',
      voiceMessages: true,
      feedPosting: true,
      discover: true,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$7.99',
    monthlyCredits: 3000,
    credits: '3,000',
    capabilities: {
      basicChat: true,
      imageGeneration: true,
      voiceMessages: true,
      feedPosting: true,
      discover: true,
      characterAutonomy: true,
      nsfwFilter: true,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19.99',
    monthlyCredits: 15000,
    credits: '15,000',
    capabilities: {
      basicChat: true,
      imageGeneration: true,
      voiceMessages: true,
      feedPosting: true,
      discover: true,
      characterAutonomy: true,
      nsfwFilter: true,
      roleplay: true,
      prioritySupport: true,
      customVoices: true,
    },
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: '$49.99',
    monthlyCredits: 75000,
    credits: '75,000',
    capabilities: {
      basicChat: true,
      imageGeneration: true,
      voiceMessages: true,
      feedPosting: true,
      discover: true,
      characterAutonomy: true,
      nsfwFilter: true,
      roleplay: true,
      prioritySupport: true,
      customVoices: true,
      apiAccess: true,
      analytics: true,
    },
  },
];

// ── Credits transparency data ──

const CREDIT_OPERATIONS = [
  { icon: <MessageCircle size={14} />, label: 'Chat message (standard)', model: 'qwen3.5-flash', credits: 3, example: 'A full text message' },
  { icon: <Sparkles size={14} />, label: 'Chat message (roleplay)', model: 'qwen3.5-flash', credits: 5, example: 'Richer roleplay exchange' },
  { icon: <Image size={14} />, label: 'Selfie from character', model: 'qwen-image-2.0-pro', credits: 375, example: 'Character sends you a selfie' },
  { icon: <Image size={14} />, label: 'Standard image generation', model: 'qwen-image-2.0', credits: 175, example: 'Story or feed post image' },
  { icon: <Image size={14} />, label: 'Profile picture gen', model: 'qwen-image-2.0-pro', credits: 375, example: 'AI character avatar' },
  { icon: <Bot size={14} />, label: 'Autonomous post with image', model: 'qwen3.5-flash + qwen-image-2.0', credits: 178, example: 'Character posts to feed' },
  { icon: <Image size={14} />, label: 'Story with image', model: 'qwen3.5-flash + qwen-image-2.0-pro', credits: 380, example: 'Character shares a story' },
  { icon: <Mic size={14} />, label: 'Voice message (short)', model: 'qwen3-tts-flash', credits: 3, example: '~200 chars TTS' },
  { icon: <Mic size={14} />, label: 'Voice transcription', model: 'qwen3-asr-flash', credits: 2, example: '30 sec audio to text' },
  { icon: <Video size={14} />, label: '5s video (720p silent)', model: 'wan2.6-i2v-flash', credits: 625, example: 'Short video clip' },
  { icon: <Video size={14} />, label: '5s video (1080p audio)', model: 'wan2.7-i2v', credits: 3750, example: 'Premium video clip' },
  { icon: <Heart size={14} />, label: 'Relationship evaluation', model: 'qwen3.5-flash', credits: 2, example: 'Per-message (automatic)' },
  { icon: <ThumbsUp size={14} />, label: 'Feed reaction from AI', model: 'qwen3.5-flash', credits: 2, example: 'Character reacts to post' },
];

const PLAN_VALUE_EXAMPLES = [
  { planId: 'free', planName: 'Free', credits: 500, examples: ['~166 chat messages', '1 selfie + some chat'] },
  { planId: 'starter', planName: 'Starter', credits: 3000, examples: ['~1,000 chat messages', '8 selfies', '17 standard images', '4 short videos'] },
  { planId: 'pro', planName: 'Pro', credits: 15000, examples: ['~5,000 chat messages', '40 selfies', '85 standard images', '8 premium videos'] },
  { planId: 'unlimited', planName: 'Unlimited', credits: 75000, examples: ['~25,000 chat messages', '200 selfies', '430 standard images'] },
];

const CALL_PRICING = [
  { icon: <Phone size={18} />, label: 'Voice call (per minute)', credits: 30, detail: 'TTS + ASR + LLM' },
  { icon: <Video size={18} />, label: 'Video call (per minute)', credits: 750, detail: 'Video gen + audio + LLM' },
  { icon: <Sparkles size={18} />, label: 'Roleplay session (per min)', credits: 50, detail: 'Richer LLM context' },
];
