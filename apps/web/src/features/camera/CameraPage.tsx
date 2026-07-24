import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Camera as CameraIcon, FlipHorizontal, Zap, Sparkles, X, Check } from 'lucide-react';
import type { RootState } from '@/app/store';
import { addPhoto, toggleCameraMode, useAppDispatch } from '@/app/store';

export default function CameraPage() {
  const dispatch = useAppDispatch();
  const mode = useSelector((s: RootState) => s.camera.mode);
  const photos = useSelector((s: RootState) => s.camera.photos);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 720 }, height: { ideal: 1280 } },
      });
      if (videoRef.current) { videoRef.current.srcObject = s; setStream(s); }
      setHasCamera(true);
    } catch {
      setHasCamera(false);
    }
  }, [mode]);

  useEffect(() => { startCamera(); return () => { stream?.getTracks().forEach(t => t.stop()); }; }, []);

  const flip = () => {
    stream?.getTracks().forEach(t => t.stop());
    dispatch(toggleCameraMode());
    setTimeout(startCamera, 200);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (ctx) {
      if (flash) { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(v, 0, 0);
    }
    const url = c.toDataURL('image/jpeg', 0.92);
    setCaptured(url);
    dispatch(addPhoto(url));
    setFlash(false);
  };

  const discard = () => setCaptured(null);
  const save = () => {
    if (captured) {
      const a = document.createElement('a'); a.href = captured; a.download = 'itchats-photo.jpg'; a.click();
      setCaptured(null);
    }
  };

  if (!hasCamera) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg-canvas">
      <div className="w-24 h-24 rounded-full bg-brand-glow flex items-center justify-center animate-glow-pulse">
        <CameraIcon size={36} className="text-brand-secondary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">No Camera Access</h2>
      <p className="text-sm text-text-muted text-center max-w-xs">Allow camera permission to capture moments. Check your browser settings.</p>
      <button onClick={() => startCamera()} className="glass-strong rounded-full px-6 py-2.5 text-sm text-brand-primary font-medium">Try Again</button>
    </div>
  );

  return (
    <div className="relative h-full bg-black overflow-hidden">
      {captured ? (
        <div className="relative h-full animate-slide-up">
          <img src={captured} className="h-full w-full object-cover" alt="captured" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-6 safe-bottom">
            <button onClick={discard} className="glass-strong rounded-full p-5 text-white hover:bg-white/20 transition-all"><X size={26} /></button>
            <button onClick={save} className="rounded-full bg-white p-5 text-black shadow-lg shadow-white/20 hover:scale-105 transition-all"><Check size={26} /></button>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className={`absolute inset-0 transition-opacity duration-150 ${flash ? 'opacity-100 bg-white' : 'opacity-0'} pointer-events-none`} />
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 safe-top flex items-center justify-between">
            <Sparkles size={20} className="text-white/70" />
            <span className="text-white/70 text-xs font-medium tracking-wider uppercase">Lens</span>
            <button onClick={flip} className="glass rounded-full p-2.5 text-white hover:bg-white/20 transition-all">
              <FlipHorizontal size={20} />
            </button>
          </div>
          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 pb-8 safe-bottom">
            <div className="flex items-center justify-center gap-8">
              <button onClick={() => {}} className="glass rounded-full p-3 text-white/80">
                {photos.length > 0 ? <span className="w-8 h-8 rounded-lg bg-white/20 border border-white/20 block" /> : <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10" />}
              </button>
              <button
                onClick={capture}
                className="w-[72px] h-[72px] rounded-full border-[3px] border-white shadow-[0_0_24px_rgba(255,255,255,0.15)] bg-transparent hover:scale-95 active:scale-90 transition-all"
              />
              <button onClick={() => setFlash(!flash)} className={`glass rounded-full p-3 transition-all ${flash ? 'text-amber-400 bg-amber-400/10' : 'text-white/70'}`}>
                <Zap size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
