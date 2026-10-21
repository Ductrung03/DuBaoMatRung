import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ClipLoader } from 'react-spinners';

const pending = new Set();
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => pending.size > 0;
const notify = () => listeners.forEach(listener => listener());

// One centered indicator even when multiple consumers share the same request.
// Viewport/tile requests deliberately do not register here.
export function useScreenLoading(active) {
  const key = useRef(Symbol('screen-loading'));
  useEffect(() => {
    if (!active) return;
    const id = key.current;
    pending.add(id); notify();
    return () => { pending.delete(id); notify(); };
  }, [active]);
}

export default function ScreenLoading() {
  const active = useSyncExternalStore(subscribe, snapshot, () => false);
  return active ? createPortal(<div className="vfis-screen-loading fixed inset-0 z-[100001] flex items-center justify-center bg-black/40" role="status" aria-label="Đang tải" aria-live="polite">
    <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-center"><ClipLoader color="#027e02" size={50}/></div>
  </div>, document.body) : null;
}
