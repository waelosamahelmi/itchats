import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Camera as CameraIcon, FlipHorizontal, Zap, Sparkles, X, Check, ZoomIn, ZoomOut, Wand } from 'lucide-react';
import type { RootState } from '@/app/store';
import { addPhoto, toggleCameraMode, useAppDispatch } from '@/app/store';

const CAMERA_PERMISSION_KEY = 'itchats:camera:permission';
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.3;

const FILTERS: { name: string; css: string }[] = [
  { name: 'Normal', css: 'none' },
  { name: 'Warm', css: 'sepia(0.3) saturate(1.4) brightness(1.1)' },
  { name: 'Cool', css: 'saturate(1.2) hue-rotate(-20deg) brightness(1.05)' },
  { name: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { name: 'Sepia', css: 'sepia(0.8) contrast(0.95)' },
  { name: 'Vintage', css: 'sepia(0.4) contrast(1.1) brightness(0.9) saturate(0.8)' },
  { name: 'Dramatic', css: 'contrast(1.4) saturate(1.5) brightness(0.85)' },
  { name: 'Soft', css: 'brightness(1.15) contrast(0.9) saturate(1.1)' },
  { name: 'Moody', css: 'brightness(0.7) contrast(1.2) saturate(0.6)' },
  { name: 'Golden', css: 'sepia(0.5) saturate(1.6) brightness(1.1) contrast(1.05)' },
];

export default function CameraPage() {
  const dispatch = useAppDispatch();
  const mode = useSelector((s: RootState) => s.camera.mode);
  const photos = useSelector((s: RootState) => s.camera.photos);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [flash, setFlash] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [facingMode, setFacingMode] = useState(mode);
  const [filterIdx, setFilterIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [convs, setConvs] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_URL || '/v1';
  const token = useSelector((s: RootState) => s.auth.token);

  // Pinch-to-zoom state
  const pinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = useCallback(async (fm: string) => {
    try {
      stopStream();
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: fm,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setHasCamera(true);
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
    } catch {
      setHasCamera(false);
      localStorage.removeItem(CAMERA_PERMISSION_KEY);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
  }, [facingMode]);

  // Re-attach stream when returning from preview (video element gets remounted)
  useEffect(() => {
    if (!captured && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [captured]);

  const flip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    dispatch(toggleCameraMode());
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Apply filter to canvas context before drawing
    const filterCss = FILTERS[filterIdx].css;
    if (filterCss !== 'none') ctx.filter = filterCss;

    // Mirror only for front camera + zoom via canvas transform
    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }

    if (zoom !== 1) {
      const srcW = c.width / zoom;
      const srcH = c.height / zoom;
      const srcX = (c.width - srcW) / 2;
      const srcY = (c.height - srcH) / 2;
      ctx.drawImage(v, srcX, srcY, srcW, srcH, 0, 0, c.width, c.height);
    } else {
      ctx.drawImage(v, 0, 0);
    }
    ctx.restore();
    ctx.filter = 'none';

    // Brief flash
    if (flash) {
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 200);
    }

    const url = c.toDataURL('image/jpeg', 0.92);
    setCaptured(url);
    dispatch(addPhoto(url));
  };

  const discard = () => { setCaptured(null); setShowSend(false); };
  const save = () => {
    if (captured) {
      const a = document.createElement('a'); a.href = captured; a.download = 'itchats-photo.jpg'; a.click();
      setCaptured(null);
    }
  };

  const openSend = async () => {
    if (!token) return;
    setShowSend(true);
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConvs(Array.isArray(data) ? data : []);
    } catch { setConvs([]); }
  };

  const sendToConv = async (convId: string) => {
    if (!captured || !token) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: captured, type: 'image' }),
      });
      setCaptured(null);
      setShowSend(false);
    } catch (e: any) { alert('Send failed'); }
    finally { setSending(false); }
  };

  const postToStory = async () => {
    if (!captured || !token) return;
    try {
      await fetch(`${API_BASE}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ storyType: 'image', caption: '', mediaAssetId: captured.substring(0, 36) }),
      });
    } catch {}
    setCaptured(null);
  };

  const zoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const zoomOut = () => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN));

  // Pinch-to-zoom handlers
  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { initialDist: getTouchDist(e.touches), initialZoom: zoom };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dist = getTouchDist(e.touches);
      const scale = dist / pinchRef.current.initialDist;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchRef.current.initialZoom * scale));
      setZoom(Math.round(newZoom * 10) / 10);
    }
  };

  const onTouchEnd = () => { pinchRef.current = null; };

  if (!hasCamera) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg-canvas">
      <div className="w-24 h-24 rounded-full bg-brand-glow flex items-center justify-center animate-glow-pulse">
        <CameraIcon size={36} className="text-brand-secondary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">No Camera Access</h2>
      <p className="text-sm text-text-muted text-center max-w-xs">Allow camera permission to capture moments. Check your browser settings.</p>
      <button onClick={() => startCamera(facingMode)} className="glass-strong rounded-full px-6 py-2.5 text-sm text-brand-primary font-medium">Try Again</button>
    </div>
  );

  return (
    <div className="relative h-full w-full bg-black overflow-hidden"
         onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {captured ? (
        <div className="relative h-full animate-slide-up">
          <img src={captured} className="h-full w-full object-contain" alt="captured" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-24 pb-8 safe-bottom">
            <div className="flex items-center justify-center gap-4">
              <button onClick={discard} className="glass-strong rounded-full p-3 text-white hover:bg-white/20 transition-all"><X size={22} /></button>
              <button onClick={save} className="glass-strong rounded-full px-5 py-3 text-white text-sm font-medium hover:bg-white/20 transition-all">
                Download
              </button>
              <button onClick={postToStory} className="bg-brand-primary rounded-full px-5 py-3 text-white text-sm font-medium hover:brightness-110 transition-all">
                Post to Story
              </button>
              <button onClick={openSend} className="glass-strong rounded-full px-5 py-3 text-white text-sm font-medium hover:bg-white/20 transition-all">
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted
            className="absolute inset-0 h-full w-full object-contain transition-transform duration-100"
            style={{
              transform: `scaleX(${facingMode === 'user' ? -1 : 1}) scale(${zoom})`,
              transformOrigin: 'center center',
              filter: FILTERS[filterIdx].css,
            }} />
          <canvas ref={canvasRef} className="hidden" />

          {/* Flash overlay — high z-index, brief white burst */}
          <div className="absolute inset-0 z-50 pointer-events-none"
            style={{ opacity: flashActive ? 1 : 0, background: 'white' }} />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 p-5 pt-6 safe-top flex items-center justify-between">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`rounded-full p-2 transition-all ${showFilters ? 'text-brand-primary bg-brand-glow' : 'text-white/80 hover:text-white'}`}>
              <Wand size={20} />
            </button>
            <span className="text-white/80 text-xs font-medium tracking-wider uppercase drop-shadow">Lens</span>
            <button onClick={flip} className="glass rounded-full p-2.5 text-white hover:bg-white/20 transition-all">
              <FlipHorizontal size={20} />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
            <button onClick={zoomIn} className="glass rounded-full p-2.5 text-white/80 hover:text-white hover:bg-white/20 transition-all">
              <ZoomIn size={20} />
            </button>
            <span className="text-white/70 text-xs font-mono bg-black/30 px-2 py-0.5 rounded-full">{zoom.toFixed(1)}x</span>
            <button onClick={zoomOut} className="glass rounded-full p-2.5 text-white/80 hover:text-white hover:bg-white/20 transition-all">
              <ZoomOut size={20} />
            </button>
          </div>

          {/* Filter bar — slides under top bar */}
          {showFilters && (
            <div className="absolute top-16 left-0 right-0 z-20 animate-fade-in px-4">
              <div className="flex gap-2 overflow-x-auto py-2 max-w-full scrollbar-none mask-linear-fade">
                {FILTERS.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setFilterIdx(i)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                    i === filterIdx
                      ? 'bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.25)]'
                      : 'glass text-white/60 hover:text-white/90'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          )}

      {/* Send to conversation modal */}
      {showSend && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col justify-end animate-fade-in" onClick={() => setShowSend(false)}>
          <div className="glass-strong rounded-t-3xl p-5 max-h-[60%] overflow-y-auto safe-bottom" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-sm mb-3">Send to conversation</h3>
            {convs.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-8">No conversations yet. Start chatting!</p>
            ) : (
              <div className="space-y-1">
                {convs.map((c: any) => (
                  <button key={c.id} onClick={() => sendToConv(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                    disabled={sending}>
                    <div className="w-9 h-9 rounded-full bg-brand-glow flex items-center justify-center text-white text-xs font-bold">
                      {(c.characterName || c.title || '?')[0]}
                    </div>
                    <span className="text-white text-sm">{c.characterName || c.title || 'Chat'}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowSend(false)} className="w-full mt-3 py-3 text-text-muted text-sm text-center">Cancel</button>
          </div>
        </div>
      )}
          <div className="absolute bottom-0 left-0 right-0 z-10 pb-10 safe-bottom">
            <div className="relative flex items-center justify-between px-8 h-[88px]">
              {/* Left: gallery */}
              <div className="glass rounded-full p-3 text-white/80">
                {photos.length > 0
                  ? <span className="w-8 h-8 rounded-lg bg-white/20 border border-white/20 block" />
                  : <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10" />}
              </div>

              {/* Center: capture — absolutely centered */}
              <button onClick={capture}
                className="absolute left-1/2 -translate-x-1/2 w-[72px] h-[72px] rounded-full border-[3px] border-white shadow-[0_0_24px_rgba(255,255,255,0.15)] bg-transparent hover:scale-95 active:scale-90 transition-all" />

              {/* Right: flash */}
              <div className="flex items-center gap-3">
                <button onClick={() => setFlash(!flash)}
                  className={`glass rounded-full p-3 transition-all ${flash ? 'text-amber-400 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.3)]' : 'text-white/70'}`}>
                  <Zap size={20} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
