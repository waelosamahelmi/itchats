import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Zap, Gift, Shield, ArrowLeft, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', credits: '1,000', color: 'from-border-subtle to-border-subtle' },
  { id: 'plus', name: 'Plus', price: '$9.99', credits: '12,000', color: 'from-brand-primary/30 to-brand-secondary/20', popular: false },
  { id: 'pro', name: 'Pro', price: '$24.99', credits: '35,000', color: 'from-brand-primary/50 to-accent-gradient-2/30', popular: true },
  { id: 'creator', name: 'Creator', price: '$49.99', credits: '80,000', color: 'from-accent-gradient-2/40 to-social-warm/20' },
];

export default function BillingPage() {
  const nav = useNavigate();
  const { user, token } = useSelector((s: RootState) => s.auth);

  if (!user) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <Wallet size={48} className="text-text-muted" />
      <p className="text-text-secondary text-sm">Sign in to manage billing</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

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
          <p className="text-3xl font-bold text-text-primary mb-1">1,000</p>
          <p className="text-text-muted text-xs">Free plan credits</p>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 glass rounded-xl py-2.5 text-xs font-medium text-brand-primary hover:bg-brand-glow/20 transition-all">Top Up</button>
            <button className="flex-1 glass rounded-xl py-2.5 text-xs font-medium text-text-secondary hover:bg-white/5 transition-all">History</button>
          </div>
        </div>
        {/* Plans */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><Zap size={16} className="text-brand-primary" /> Subscription Plans</h2>
          <div className="space-y-2">
            {PLANS.map(plan => (
              <button key={plan.id} className={`w-full glass rounded-2xl p-4 text-left flex items-center gap-4 transition-all hover:bg-white/8 ${plan.popular ? 'ring-2 ring-brand-primary' : ''}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shrink-0`}>
                  <Sparkles size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">{plan.name}</p>
                    {plan.popular && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary font-medium">Popular</span>}
                  </div>
                  <p className="text-xs text-text-muted">{plan.credits} credits/month</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">{plan.price}</p>
                  <p className="text-[10px] text-text-muted">/month</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Quick info */}
        <div className="grid grid-cols-2 gap-2 pb-4">
          {[
            { icon: Gift, label: 'Credit Packs', desc: 'One-time top up' },
            { icon: Shield, label: 'Usage Limits', desc: 'Free tier limits' },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-all">
              <Icon size={18} className="text-text-secondary mb-2" />
              <p className="text-xs font-medium text-text-primary">{label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
