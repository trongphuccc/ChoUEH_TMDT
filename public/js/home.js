// Homepage: mount the scroll engine, then wire the finder, the latest grid and the "school day" timetable.
ScrollCraft.mount(document.body);

// Navbar search stays hidden until the finder's own search box scrolls out of view: one search box on screen at a time.
(function navSearch() {
  const own = document.querySelector('[data-home-search]');
  if (!own) { document.body.classList.add('nav-search-on'); return; }
  new IntersectionObserver(([e]) => {
    document.body.classList.toggle('nav-search-on', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(own);
})();

// Campus chips filter and the sort buttons reorder the "Mới đăng gần đây" grid in place.
(function latestGrid() {
  const list = document.querySelector('[data-latest]');
  if (!list) return;
  const items = [...list.children];
  const note = document.querySelector('[data-latest-note]');
  const empty = document.querySelector('[data-latest-empty]');
  const chips = [...document.querySelectorAll('[data-campus]')].filter((el) => el.tagName === 'BUTTON');
  const sorts = [...document.querySelectorAll('[data-sort]')];
  const tablet = matchMedia('(min-width: 861px) and (max-width: 1100px)');
  let campus = '';
  let sort = 'new';

  const render = () => {
    const order = {
      new: (a, b) => a.dataset.order - b.dataset.order,
      asc: (a, b) => a.dataset.price - b.dataset.price,
      desc: (a, b) => b.dataset.price - a.dataset.price
    }[sort];
    const limit = tablet.matches ? 6 : 8;
    const matches = items.filter((li) => !campus || li.dataset.campus.split('|').includes(campus)).sort(order);
    items.forEach((li) => { li.hidden = true; });
    matches.forEach((li, i) => { li.hidden = i >= limit; list.appendChild(li); });
    empty.hidden = matches.length > 0;
    note.textContent = campus
      ? `${matches.length} món mới hẹn ở ${campus}.`
      : 'Món mới nhất ở cả ba cơ sở.';
  };

  const press = (group, active) => group.forEach((b) => b.setAttribute('aria-pressed', String(b === active)));
  chips.forEach((b) => b.addEventListener('click', () => { campus = b.dataset.campus; press(chips, b); render(); }));
  sorts.forEach((b) => b.addEventListener('click', () => { sort = b.dataset.sort; press(sorts, b); render(); }));
  tablet.addEventListener('change', render);
  render();
})();

// Scroll moves a hand down the rail beside the timetable; each slot lights up as the hand reaches it,
// and the clock shows the slot being viewed. Clicking a slot scrolls straight to it.
(function dayClock() {
  const act = document.querySelector('[data-day]');
  if (!act) return;
  const box = act.querySelector('[data-day-rows]');
  const hand = act.querySelector('[data-day-hand]');
  const fill = act.querySelector('[data-day-fill]');
  const timeEl = act.querySelector('[data-day-time]');
  const nowEl = act.querySelector('[data-day-now]');
  const rows = [...act.querySelectorAll('.day__row')];
  const anchorOf = (r) => r.offsetTop + r.offsetHeight * 0.35;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rows.forEach((r) => r.classList.add('is-on'));
    act.classList.add('is-static');
    timeEl.textContent = '07:00 → 17:00';
    nowEl.textContent = 'Cả ngày học';
    return;
  }

  // Inverse of the mapping in frame(): the scroll position where row r becomes the active slot.
  rows.forEach((r) => r.querySelector('[data-day-go]').addEventListener('click', () => {
    const t = Math.min((anchorOf(r) + 2) / box.clientHeight, 1);
    const p = t * 0.84 + 0.06;
    const top = act.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + p * (act.offsetHeight - innerHeight), behavior: 'smooth' });
  }));

  let lastY = -1;
  const frame = () => {
    const p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
    // Hold briefly at both ends so the first and last states can be read.
    const t = Math.min(Math.max((p - 0.06) / 0.84, 0), 1);
    const h = box.clientHeight;
    const y = Math.round(t * h);
    if (y !== lastY) {
      lastY = y;
      hand.style.transform = `translate3d(0, ${y}px, 0)`;
      fill.style.transform = `scaleY(${h ? y / h : 0})`;
      let current = null;
      rows.forEach((r) => {
        const on = y >= anchorOf(r);
        r.classList.toggle('is-on', on);
        if (on) current = r;
      });
      if (y >= h - 1) { timeEl.textContent = '17:00'; nowEl.textContent = 'Tan học'; }
      else if (current) { timeEl.textContent = current.dataset.clock; nowEl.textContent = current.dataset.slot; }
      else { timeEl.textContent = '07:00'; nowEl.textContent = 'Đầu giờ sáng'; }
    }
    if (visible) requestAnimationFrame(frame);
  };

  let visible = false;
  new IntersectionObserver(([entry]) => {
    const was = visible;
    visible = entry.isIntersecting;
    if (visible && !was) { lastY = -1; requestAnimationFrame(frame); }
  }).observe(act);
})();
