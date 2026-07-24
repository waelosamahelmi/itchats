import { Map as MapIcon } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <MapIcon size={48} className="text-text-muted" />
      <p className="text-text-secondary text-center text-sm">Nearby AI characters will appear here</p>
      <p className="text-text-muted text-xs">Location-based discovery coming soon</p>
    </div>
  );
}
