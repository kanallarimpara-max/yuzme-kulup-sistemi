/** İki parmağın ortasındaki belge noktasını ekranda sabit tutar. */
export function enablePdfZoom(viewport: HTMLElement, pages: HTMLElement) {
  let scale = 1;
  const point = (x: number, y: number) => {
    const rect = viewport.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  };
  const anchorAt = (p: { x: number; y: number }) => ({
    x: (viewport.scrollLeft + p.x) / scale,
    y: (viewport.scrollTop + p.y) / scale,
  });
  const zoom = (value: number, p: ReturnType<typeof point>, anchor: ReturnType<typeof anchorAt>) => {
    scale = Math.min(5, Math.max(1, value));
    pages.style.width = `${scale * 100}%`;
    viewport.scrollLeft = anchor.x * scale - p.x;
    viewport.scrollTop = anchor.y * scale - p.y;
  };
  const fingers = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return {
      center: point((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2),
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    };
  };
  let pinch: { scale: number; distance: number; anchor: ReturnType<typeof anchorAt> } | null = null;
  const begin = (event: TouchEvent) => {
    pinch = null;
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const { center, distance } = fingers(event.touches);
    if (distance > 0) pinch = { scale, distance, anchor: anchorAt(center) };
  };
  const move = (event: TouchEvent) => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const { center, distance } = fingers(event.touches);
    zoom(pinch.scale * distance / pinch.distance, center, pinch.anchor);
  };
  // Dokunmatik yüzeyler sıkıştırma hareketini Ctrl + tekerlek olarak da iletir.
  const wheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const p = point(event.clientX, event.clientY);
    zoom(scale * Math.exp(-event.deltaY * 0.01), p, anchorAt(p));
  };
  viewport.addEventListener('touchstart', begin, { passive: false });
  viewport.addEventListener('touchmove', move, { passive: false });
  viewport.addEventListener('touchend', begin, { passive: false });
  viewport.addEventListener('touchcancel', begin, { passive: false });
  viewport.addEventListener('wheel', wheel, { passive: false });
  return () => {
    viewport.removeEventListener('touchstart', begin);
    viewport.removeEventListener('touchmove', move);
    viewport.removeEventListener('touchend', begin);
    viewport.removeEventListener('touchcancel', begin);
    viewport.removeEventListener('wheel', wheel);
  };
}
