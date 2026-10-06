import React, { useEffect, useRef } from 'react';

// ── Signature Pad ─────────────────────────────────────────────
const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  if ('touches' in e) {
    return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
  }
  return { x: ((e as MouseEvent).clientX - rect.left) * scaleX, y: ((e as MouseEvent).clientY - rect.top) * scaleY };
};

export function SignaturePad({ onSign, cleared }: { onSign: (dataUrl: string) => void; cleared: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  }, [cleared]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const start = (e: MouseEvent | TouchEvent) => {
      if (!('touches' in e)) {
        e.preventDefault();
      }
      drawing.current = true;
      lastPos.current = getPos(e, canvas);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!('touches' in e)) {
        e.preventDefault();
      }
      if (!drawing.current || !lastPos.current) return;
      const pos = getPos(e, canvas);
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      lastPos.current = pos; hasDrawn.current = true;
    };
    const end = () => { drawing.current = false; lastPos.current = null; if (hasDrawn.current) onSign(canvas.toDataURL('image/png')); };

    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: true }); canvas.addEventListener('touchmove', move, { passive: true }); canvas.addEventListener('touchend', end);
    return () => {
      canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', move); canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start, { passive: true } as any); canvas.removeEventListener('touchmove', move, { passive: true } as any); canvas.removeEventListener('touchend', end);
    };
  }, [onSign]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={canvasRef} width={600} height={160}
        style={{ width: '100%', height: '160px', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#fafafa', cursor: 'crosshair', touchAction: 'none', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, whiteSpace: 'nowrap' }}>Sign here with your finger or mouse</span>
      </div>
    </div>
  );
}
