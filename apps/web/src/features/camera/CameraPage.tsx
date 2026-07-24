import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Camera as CameraIcon, FlipHorizontal, Image as ImageIcon, X, Check } from 'lucide-react';
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
    c.getContext('2d')?.drawImage(v, 0, 0);
    const url = c.toDataURL('image/jpeg', 0.9);
    setCaptured(url);
    dispatch(addPhoto(url));
  };

  const discard = () => setCaptured(null);
  const save = () => {
    if (captured) {
      const a = document.createElement('a'); a.href = captured; a.download = 'itchats-photo.jpg'; a.click();
      setCaptured(null);
    }
  };

  if (!hasCamera) return <div className="flex h-full items-center justify-center text-text-muted"><CameraIcon size={48} /><p className="ml-4">Camera unavailable</p></div>;

  return (
    <div className="relative h-full bg-black">
      {captured ? (
        <div className="relative h-full">
          <img src={captured} className="h-full w-full object-cover" alt="captured" />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
            <button onClick={discard} className="rounded-full bg-white/20 p-4 text-white"><X size={28} /></button>
            <button onClick={save} className="rounded-full bg-white p-4 text-black"><Check size={28} /></button>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute top-4 right-4 flex gap-3">
            <button onClick={flip} className="rounded-full bg-white/20 p-3 text-white"><FlipHorizontal size={22} /></button>
            {photos.length > 0 && (
              <div className="rounded-full bg-white/20 p-3 text-white relative"><ImageIcon size={22} /><span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{photos.length}</span></div>
            )}
          </div>
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button onClick={capture} className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/20 transition-colors" />
          </div>
        </>
      )}
    </div>
  );
}
