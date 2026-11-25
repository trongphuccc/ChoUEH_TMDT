// Homepage: mount the scroll engine, then drive the "school day clock".
// Scroll moves a hand down the timetable; each delivery slot lights up as the hand reaches it,
// and the clock reads the time of day at the hand's position.
ScrollCraft.mount(document.body);

(function dayClock() {
  const act = document.querySelector('[data-day]');
  if (!act) return;
  const box = act.querySelector('[data-day-rows]');
  const hand = act.querySelector('[data-day-hand]');
  const timeEl = act.querySelector('[data-day-time]');
  const nowEl = act.querySelector('[data-day-now]');
  const rows = [...act.querySelectorAll('.day__row')];
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rows.forEach((r) => r.classList.add('is-on'));
    act.classList.add('is-static');
    timeEl.textContent = '07:00 → 17:00';
    nowEl.textContent = 'Cả ngày học';
    return;
  }

  let anchors = [];
  const measure = () => {
    const h = box.clientHeight;
    anchors = [{ y: 0, min: 7 * 60, label: 'Đầu giờ sáng' }];
    rows.forEach((r) => anchors.push({ y: r.offsetTop + r.offsetHeight * 0.35, min: toMin(r.dataset.clock), label: r.dataset.slot, row: r }));
    anchors.push({ y: h, min: 17 * 60, label: 'Tan học' });
  };

  let lastY = -1;
  const frame = () => {
    const p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
    // Hold briefly at both ends so the first and last states can be read.
    const t = Math.min(Math.max((p - 0.06) / 0.84, 0), 1);
    const y = Math.round(t * box.clientHeight);
    if (y !== lastY) {
      lastY = y;
      hand.style.transform = `translate3d(0, ${y}px, 0)`;
      let i = 0;
      while (i < anchors.length - 2 && y >= anchors[i + 1].y) i++;
      const a = anchors[i];
      const b = anchors[i + 1];
      const k = Math.min(Math.max((y - a.y) / Math.max(b.y - a.y, 1), 0), 1);
      timeEl.textContent = fmt(Math.round((a.min + (b.min - a.min) * k) / 5) * 5);
      nowEl.textContent = y >= anchors[anchors.length - 1].y - 1 ? 'Tan học' : a.label;
      rows.forEach((r) => r.classList.toggle('is-on', y >= r.offsetTop + r.offsetHeight * 0.35));
    }
    if (visible) requestAnimationFrame(frame);
  };

  let visible = false;
  new IntersectionObserver(([entry]) => {
    const was = visible;
    visible = entry.isIntersecting;
    if (visible && !was) { measure(); requestAnimationFrame(frame); }
  }).observe(act);
  addEventListener('resize', measure);
})();
