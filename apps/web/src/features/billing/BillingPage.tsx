import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Zap, Gift, Shield, ArrowLeft, Sparkles } from 'lucide-react';
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

export default function BillingPage() {
  const nav = useNavigate();
  const { user, token } = useSelector((s: RootState) => s.auth);
  const [wallet, setWallet] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (!token) return;
    try {
      const result = await fetchJson('/billing/checkout', token, {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      if (result.url) window.location.href = result.url;
      else { alert('Subscribed!'); loadData(); }
    } catch (e: any) { alert(e.message || 'Checkout failed'); }
  };

  if (!user) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Wallet size={48} className="text-text-muted" />
      <p className="text-text-secondary text-sm">Sign in to manage billing</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  const balance = wallet?.balance ?? 0;
  const activePlanId = sub?.planId;

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => nav('/profile')} className="p-1.5 rounded-full glass"><ArrowLeft size={20} className="text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Billing & Credits</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 space-y-4">
        {/* Wallet card */}
        <div className="glass rounded-2xl p-5 bg-gradient-to-br from-brand-glow/10 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Credit Balance</p>
            <Wallet size={16} className="text-brand-primary" />
          </div>
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-white/10" />
          ) : (
            <p className="text-3xl font-bold text-text-primary mb-1">{balance.toLocaleString()}</p>
          )}
          <p className="text-text-muted text-xs">{sub ? `${sub.planId} plan` : 'Free plan'}</p>
        </div>
        {/* Plans */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Zap size={16} className="text-brand-primary" /> Subscription Plans</h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(plans.length > 0 ? plans : DEFAULT_PLANS).map((plan: any) => (
                <button key={plan.id} onClick={() => checkout(plan.id)}
                  className={`w-full glass rounded-2xl p-4 text-left flex items-center gap-4 transition-all hover:bg-white/8 ${plan.id === activePlanId ? 'ring-2 ring-brand-primary' : ''} ${plan.popular ? '' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/40 to-brand-secondary/20 flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{plan.name}</p>
                      {plan.popular && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary font-medium">Popular</span>}
                    </div>
                    <p className="text-xs text-text-muted">{plan.monthlyCredits?.toLocaleString() ?? plan.credits} credits/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{plan.price ?? `$${plan.monthlyPriceUsd}`}</p>
                    <p className="text-[10px] text-text-muted">/month</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_PLANS = [
  { id: 'free', name: 'Free', price: '$0', credits: '1,000', popular: false },
  { id: 'plus', name: 'Plus', price: '$9.99', credits: '12,000', popular: true },
  { id: 'pro', name: 'Pro', price: '$24.99', credits: '35,000' },
  { id: 'creator', name: 'Creator', price: '$49.99', credits: '80,000' },
];
