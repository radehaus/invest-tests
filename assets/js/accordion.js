/* ═══════════════════════════════════════════════════════════════════════
   Three prototypes of the same teaser accordion.

     ?v=scroll    scroll position picks the open teaser
     ?v=hover     the pointer picks it
     ?v=preview   the pointer shows a summary, a click opens the teaser

   All three write the same two custom properties per row and share one
   spring, so what differs between them is only what drives the target —
   never how the movement itself is produced.

     --open  0 → 1   how far the full teaser is out
     --peek  0 → 1   how far the one-line summary is out (variant 3 only)

   Neighbours always share the distance, so `open(i) + open(i+1)` is 1
   throughout a hand-over: one teaser's worth of height at any moment,
   and the layout never jumps.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
  const variant = document.documentElement.dataset.variant || 'scroll';
  const root  = document.querySelector('.acc');
  const track = document.querySelector('.acc__track');
  const list  = document.querySelector('.acc__list');
  const items = [...document.querySelectorAll('.acc__item')];
  if (!root || items.length < 2) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('acc-static');
    return;
  }

  const last = items.length - 1;
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  /* ── One spring, reused ───────────────────────────────────────────────
     Critically damped: it settles quickly and never wobbles past the
     target. Stiffness and mass are what the three variants tune.      */
  function Spring(k, mass) {
    return {
      k, mass, d: 2 * Math.sqrt(k * mass),
      value: 0, target: 0, vel: 0,
      step(dt) {
        this.vel += ((-this.k * (this.value - this.target) - this.d * this.vel) / this.mass) * dt;
        this.value += this.vel * dt;
      },
      get resting() {
        return Math.abs(this.value - this.target) < 5e-4 && Math.abs(this.vel) < 5e-4;
      },
      rest() { this.value = this.target; this.vel = 0; }
    };
  }

  /* Feel per variant. The scroll one is heavy on purpose; the pointer
     ones have to answer immediately or they feel broken.              */
  const FEEL = {
    scroll:  { pos: [32, 1.35],  amt: [32, 1.35],  drag: 34, norm: 5.5 },
    hover:   { pos: [210, 0.7],  amt: [210, 0.7],  drag: 14, norm: 9   },
    preview: { pos: [230, 0.65], amt: [260, 0.6],  drag: 12, norm: 10  }
  }[variant];

  const pos  = Spring(...FEEL.pos);   // which row, 0…last
  const amt  = Spring(...FEEL.amt);   // how far the block is open at all
  const open = Spring(...FEEL.amt);   // variant 3: peek → full teaser

  let raf = null, prev = 0;

  function paint() {
    for (let i = 0; i < items.length; i++) {
      const near = clamp01(1 - Math.abs(pos.value - i));
      const o = variant === 'preview' ? amt.value * near * open.value
                                      : amt.value * near;
      items[i].style.setProperty('--open', o.toFixed(4));
      if (variant === 'preview') {
        /* The summary retracts as the full teaser comes out, so the two
           never claim height at the same time. */
        items[i].style.setProperty('--peek',
          (amt.value * near * (1 - open.value)).toFixed(4));
      }
    }
    const n = Math.max(-1, Math.min(1, pos.vel / FEEL.norm));
    list.style.setProperty('--vel', (n * FEEL.drag).toFixed(2) + 'px');
    list.style.setProperty('--speed', Math.abs(n).toFixed(3));
    list.style.setProperty('--amt', amt.value.toFixed(4));
  }

  /* The summary row has to be one fixed height for the open/peek maths to
     hold, but a guessed height clips the longer texts. So measure the
     tallest one and let that be the height. */
  function sizePeek() {
    if (variant !== 'preview') return;
    let tallest = 0;
    for (const el of items) {
      const p = el.querySelector('.acc__peek');
      if (!p) continue;
      p.style.height = 'auto';
      tallest = Math.max(tallest, p.scrollHeight);
      p.style.height = '';
    }
    if (tallest) list.style.setProperty('--peek-h', (tallest + 22) + 'px');
  }
  sizePeek();
  addEventListener('resize', sizePeek);

  let onFrame = () => {};                     // variant hook, set below

  function tick(now) {
    const dt = Math.min(0.032, (now - prev) / 1000) || 0.016;
    prev = now;

    amt.step(dt);
    if (variant === 'preview') open.step(dt);
    /* While the block is shut, jumping to the row being pointed at beats
       sweeping through every teaser on the way there. */
    if (variant !== 'scroll' && amt.value < 0.12) pos.rest();
    else pos.step(dt);

    paint();
    onFrame();

    const still = pos.resting && amt.resting && (variant !== 'preview' || open.resting);
    if (!still) raf = requestAnimationFrame(tick);
    else {
      pos.rest(); amt.rest(); open.rest();
      raf = null; paint();
      list.classList.remove('is-moving');
    }
  }

  function wake() {
    if (raf === null) {
      list.classList.add('is-moving');
      prev = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  /* ═════ 1 · Scroll ═══════════════════════════════════════════════════
     Scroll does not drive the animation, it only names the target row.
     The spring does the moving, which is why it has weight instead of
     being welded to the pointer.                                      */
  if (variant === 'scroll') {
    const HYSTERESIS = 0.55;
    amt.target = amt.value = 1;

    function readScroll() {
      const r = track.getBoundingClientRect();
      const travel = r.height - innerHeight;
      if (travel <= 0) return;
      const raw = clamp01(-r.top / travel) * last;
      while (raw > pos.target + HYSTERESIS && pos.target < last) pos.target++;
      while (raw < pos.target - HYSTERESIS && pos.target > 0)    pos.target--;
    }
    addEventListener('scroll', () => { readScroll(); wake(); }, { passive: true });
    addEventListener('resize', () => { readScroll(); wake(); });
    readScroll();

    items.forEach((el, i) => el.querySelector('.acc__title').addEventListener('click', () => {
      const r = track.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + (i / last) * (r.height - innerHeight), behavior: 'smooth' });
    }));
  }

  /* ═════ 2 & 3 · Pointer ══════════════════════════════════════════════ */
  else {
    const LEAVE = 110;                        // ms of grace before collapsing
    let leaveTimer = null, pinned = false;
    let lastX = -1, lastY = -1, pendX = null, pendY = null;

    const rowAt = (x, y) => {
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        if (y >= r.top && y <= r.bottom && x >= r.left && x <= r.right) return i;
      }
      return -1;
    };

    function point(i) {
      clearTimeout(leaveTimer);
      pos.target = i;
      amt.target = 1;
      if (variant === 'preview' && !pinned) open.target = 0;
      wake();
    }
    function collapse() {
      leaveTimer = setTimeout(() => {
        amt.target = 0;
        if (variant === 'preview') { open.target = 0; pinned = false; }
        wake();
      }, LEAVE);
    }

    /* Reading rects invalidates layout and the springs are writing
       styles, so the test happens once a frame rather than interleaving
       reads and writes on every pointer event. */
    function hitTest() {
      if (pendX === null) return;
      const i = rowAt(pendX, pendY);
      pendX = pendY = null;
      if (i >= 0 && !pinned) point(i);
    }
    onFrame = hitTest;

    /* Real pointer travel only. An opening panel shifts the rows below
       it, which under a still cursor arrives as mouseover on a different
       row — that is the chatter every hover accordion has. Layout moving
       beneath a stationary pointer emits no mousemove, so binding to
       mousemove alone removes the problem at the source. */
    root.addEventListener('mousemove', e => {
      if (e.clientX === lastX && e.clientY === lastY) return;
      lastX = pendX = e.clientX;
      lastY = pendY = e.clientY;
      if (raf === null) hitTest();
    });
    root.addEventListener('mouseleave', collapse);

    items.forEach((el, i) => {
      const title = el.querySelector('.acc__title');
      const peek  = el.querySelector('.acc__peek');

      const activate = () => {
        if (variant === 'preview') {
          /* Click opens the full teaser and pins it, so it stays put
             while you read it and move the pointer around. */
          if (pinned && Math.round(pos.target) === i && open.target === 1) {
            open.target = 0; pinned = false;
          } else {
            pinned = true; pos.target = i; amt.target = 1; open.target = 1;
          }
        } else {
          if (amt.target === 1 && pos.target === i) amt.target = 0;
          else { pos.target = i; amt.target = 1; }
        }
        wake();
      };

      title.addEventListener('click', activate);
      if (peek) peek.addEventListener('click', activate);
      title.setAttribute('tabindex', '0');
      title.setAttribute('role', 'button');
      title.addEventListener('focus', () => { if (!pinned) point(i); });
      title.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        if (e.key === 'Escape') { pinned = false; amt.target = 0; open.target = 0; wake(); }
      });
    });

    addEventListener('keydown', e => {
      if (e.key === 'Escape') { pinned = false; amt.target = 0; open.target = 0; wake(); }
    });
  }

  paint();
})();
