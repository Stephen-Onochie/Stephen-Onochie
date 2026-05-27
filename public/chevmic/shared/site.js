/* Shared site-wide JS */

// Generic lightbox: any [data-lightbox] image triggers it; group by [data-lightbox-group]
(function () {
  const backdrop = document.createElement('div');
  backdrop.className = 'lb-backdrop';
  backdrop.innerHTML = `
    <button class="lb-prev" aria-label="Previous">‹</button>
    <img alt="" />
    <button class="lb-next" aria-label="Next">›</button>
    <button class="lb-close" aria-label="Close">×</button>
    <div class="lb-caption"></div>
  `;
  let current = []; let idx = 0;

  function open(group, index) {
    current = group; idx = index;
    render();
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() { backdrop.classList.remove('open'); document.body.style.overflow = ''; }
  function render() {
    const item = current[idx];
    if (!item) return;
    backdrop.querySelector('img').src = item.src;
    backdrop.querySelector('img').alt = item.caption || '';
    backdrop.querySelector('.lb-caption').textContent = item.caption || '';
  }
  function prev() { idx = (idx - 1 + current.length) % current.length; render(); }
  function next() { idx = (idx + 1) % current.length; render(); }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(backdrop);
    backdrop.querySelector('.lb-close').addEventListener('click', close);
    backdrop.querySelector('.lb-prev').addEventListener('click', prev);
    backdrop.querySelector('.lb-next').addEventListener('click', next);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

    document.addEventListener('keydown', (e) => {
      if (!backdrop.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });

    // Build groups from [data-lightbox] elements
    const all = document.querySelectorAll('[data-lightbox]');
    const groups = {};
    all.forEach(el => {
      const g = el.getAttribute('data-lightbox-group') || 'default';
      groups[g] = groups[g] || [];
      groups[g].push({ el, src: el.getAttribute('data-full') || el.getAttribute('src') || el.querySelector('img')?.src,
        caption: el.getAttribute('data-caption') || '' });
    });
    Object.values(groups).forEach(items => {
      items.forEach((item, i) => {
        item.el.style.cursor = 'zoom-in';
        item.el.addEventListener('click', (e) => { e.preventDefault(); open(items, i); });
      });
    });
  });
})();

// Scroll reveal — adds .in when in viewport
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px' });
    els.forEach(el => io.observe(el));
  });
})();
