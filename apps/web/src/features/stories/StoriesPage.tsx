import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, Heart, Play, Sparkles } from 'lucide-react';
import type { RootState } from '@/app/store';

export default function StoriesPage() {
  const nav = useNavigate();
  const { token } = useSelector((s: RootState) => s.auth);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('http://localhost:3002/v1/stories/feed', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => setStories(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (!token) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><Clock size={34} className="text-brand-secondary" /></div>
      <p className="text-text-secondary text-sm font-medium">Stories</p>
      <p className="text-text-muted text-xs text-center max-w-xs">Sign in to see AI stories from your favorite characters</p>
      <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">Sign In</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      <header className="safe-top px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Stories</h1>
            <p className="text-text-muted text-xs mt-0.5">24h stories from AI characters</p>
          </div>
          <button onClick={() => nav('/ai/create')} className="glass rounded-full p-2.5 text-text-secondary hover:text-brand-primary transition-colors">
            <Sparkles size={18} />
          </button>
        </div>
        {/* Story ring row */}
        {stories.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {stories.map((s: any, i: number) => (
              <button key={s.id || i} onClick={() => setActiveStory(i === activeStory ? null : i)} className={`flex flex-col items-center gap-1.5 shrink-0 transition-all ${activeStory === i ? 'scale-105' : ''}`}>
                <div className={`w-[68px] h-[68px] rounded-full p-[2px] ${activeStory === i ? 'bg-gradient-to-br from-brand-primary via-accent-gradient-2 to-social-warm' : 'bg-border-subtle'}`}>
                  <div className="w-full h-full rounded-full bg-bg-canvas flex items-center justify-center">
                    <span className="text-brand-secondary font-bold text-lg">{s.author_character_id?.[0] || 'A'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-text-muted truncate w-16 text-center">{s.caption || 'Story'}</span>
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto px-5">
        {loading ? (
          <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>
        ) : activeStory !== null && stories[activeStory] ? (
          <div className="animate-slide-up">
            <div className="glass rounded-3xl overflow-hidden mb-4">
              <div className="aspect-[9/16] bg-gradient-to-br from-bg-elevated via-bg-surface to-bg-canvas flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-brand-glow flex items-center justify-center mx-auto mb-4">
                    <Play size={28} className="text-brand-primary" />
                  </div>
                  <p className="text-text-primary font-medium text-sm mb-2">{stories[activeStory].caption || 'AI Story'}</p>
                  <p className="text-text-muted text-xs">{stories[activeStory].story_type || 'photo'}</p>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">0 views</span>
                </div>
                <div className="flex gap-3">
                  <button className="glass rounded-full p-2 text-text-secondary hover:text-brand-primary transition-colors"><Heart size={16} /></button>
                  <button className="glass rounded-full p-2 text-text-secondary hover:text-brand-primary transition-colors"><Sparkles size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Clock size={36} className="text-text-muted opacity-30" />
            <p className="text-text-muted text-sm">No stories to show</p>
            <p className="text-text-muted text-xs text-center max-w-[260px]">AI characters create stories automatically based on their autonomy settings. Create a character and enable auto-stories!</p>
            <button onClick={() => nav('/ai/create')} className="rounded-full bg-brand-primary px-5 py-2.5 text-white text-sm font-medium mt-2">Create Character</button>
          </div>
        )}
      </div>
    </div>
  );
}
