import { LoaderCircle } from 'lucide-react';
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={28} />
      <span>Bringing your context together…</span>
    </div>
  );
}
