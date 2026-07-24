/**
 * Jeeliz Filter Adapter — preserves legacy AR face filters
 * while providing a modern API for the new Vite + React 19 app.
 *
 * Plan §8.2: "Keep Jeeliz behind adapter until replacement reaches parity."
 */

export interface FilterDefinition {
  id: string;
  name: string;
  icon: string;
  category: 'face' | 'environment' | 'fun';
  engine: 'jeeliz' | 'mediapipe' | 'canvas';
  premium: boolean;
  config: Record<string, unknown>;
}

const LEGACY_FILTERS: FilterDefinition[] = [
  { id: 'dog', name: 'Dog Face', icon: '🐶', category: 'face', engine: 'jeeliz', premium: false, config: { path: '/filters/src/dog.js' } },
  { id: 'bees', name: 'Bees', icon: '🐝', category: 'environment', engine: 'jeeliz', premium: false, config: { path: '/filters/src/bees.js' } },
  { id: 'halloween', name: 'Halloween', icon: '🎃', category: 'face', engine: 'jeeliz', premium: false, config: { path: '/filters/src/halloween.js' } },
  { id: 'deform', name: 'Deform', icon: '🌀', category: 'face', engine: 'jeeliz', premium: false, config: { path: '/filters/src/deform.js' } },
  { id: 'liberty', name: 'Statue of Liberty', icon: '🗽', category: 'face', engine: 'jeeliz', premium: true, config: { path: '/filters/src/liberty.js' } },
];

export function getFilters(premium: boolean = false): FilterDefinition[] {
  return LEGACY_FILTERS.filter(f => !f.premium || premium);
}

export function getFilterById(id: string): FilterDefinition | undefined {
  return LEGACY_FILTERS.find(f => f.id === id);
}

export async function loadFilterScript(filterId: string): Promise<void> {
  const filter = getFilterById(filterId);
  if (!filter || filter.engine !== 'jeeliz') return;

  const scriptPath = filter.config.path as string;
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[data-filter="${filterId}"]`)) { resolve(); return; }

    const script = document.createElement('script');
    script.src = scriptPath;
    script.dataset.filter = filterId;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load filter: ${filterId}`));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Jeeliz face tracking with a given video element and canvas.
 * This preserves the legacy API while wrapping it for the new app.
 */
export async function initializeJeelizFilter(
  videoEl: HTMLVideoElement,
  canvasEl: HTMLCanvasElement,
  filterId: string,
): Promise<{ start: () => void; stop: () => void }> {
  await loadFilterScript(filterId);

  // In production, this would call the actual Jeeliz API:
  // JEEFACEFILTERAPI.init({ canvas: canvasEl, video: videoEl, ... });
  // For now, provide a stub that draws video to canvas
  const ctx = canvasEl.getContext('2d')!;
  let animId = 0;

  const draw = () => {
    if (videoEl.readyState >= 2) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0);
    }
    animId = requestAnimationFrame(draw);
  };

  return {
    start: () => { draw(); },
    stop: () => { cancelAnimationFrame(animId); },
  };
}
