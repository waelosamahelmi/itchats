import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Radio, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';
import { useAppDispatch, fetchDiscover } from '@/app/store';

export default function LivePage() {
  const dispatch = useAppDispatch();
  const chars = useSelector((s: RootState) => s.characters.discoverCharacters);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dispatch(fetchDiscover()).finally(() => setLoaded(true));
  }, [dispatch]);

  return (
    <div className="flex flex-col h-full bg-bg-canvas relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-10%] left-[-20%] w-[300px] h-[300px] rounded-full blur-[120px] opacity-30 bg-brand-primary/20" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[300px] h-[300px] rounded-full blur-[120px] opacity-20 bg-brand-secondary/20" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full blur-[80px] opacity-15 bg-social-warm/20" />
      </div>

      {/* Blurred character grid behind */}
      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-8 opacity-[0.12] blur-[2px] pointer-events-none">
        {chars.filter(c => c.visibility === 'public').slice(0, 9).map(c => (
          <div key={c.id} className="aspect-square rounded-2xl overflow-hidden">
            <img src={c.avatarUrl ?? ''} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Content */}
      <header className="safe-top px-5 pt-5 pb-2 shrink-0 relative z-10">
        <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Live</h1>
        <p className="text-text-muted text-xs mt-0.5">Streaming with AI</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-brand-primary/30 animate-ping opacity-30" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-[-8px] rounded-full bg-brand-primary/20 animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="relative w-28 h-28 rounded-full glass flex items-center justify-center shadow-lg shadow-brand-glow/30">
            <Radio size={48} className="text-brand-primary animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-text-primary text-center mb-3 tracking-tight">
          Coming Soon
        </h2>
        <p className="text-text-secondary text-sm text-center max-w-xs mb-2 leading-relaxed">
          Live streaming with AI characters is on the way.
        </p>
        <p className="text-text-muted text-xs text-center max-w-[280px] mb-8">
          Soon you'll be able to broadcast live with{loaded && chars.length > 0 ? ` ${chars.length}+ ` : ' '}AI characters, host interactive shows, and stream real-time conversations.
        </p>

        {/* Feature teasers */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { label: 'AI Co-hosts', desc: 'Stream with characters' },
            { label: 'Real-time Chat', desc: 'Live audience interaction' },
            { label: 'Multi-camera', desc: 'Dynamic scene switching' },
            { label: 'Reactions', desc: 'Real-time emoji reactions' },
          ].map(f => (
            <div key={f.label} className="glass rounded-2xl p-3.5 text-center">
              <div className="w-2 h-2 rounded-full bg-brand-primary mb-2 mx-auto" />
              <p className="text-xs font-semibold text-text-primary">{f.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Notification CTA */}
        <button className="mt-8 flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium accent-glow hover:brightness-110 transition-all">
          <Sparkles size={16} /> Get Notified When Live
        </button>
      </div>
    </div>
  );
}
