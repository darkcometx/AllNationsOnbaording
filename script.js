/* ====================================================
   ALL NATIONS CHURCH — NOTION ONBOARDING
   script.js — Presentation Logic
   ==================================================== */

function toggleListItem(el) {
  el.classList.toggle('done');
  const check = el.querySelector('.li-check');
  if (check) check.classList.toggle('done');
}

// ── State ──────────────────────────────────────────────
let currentSlide  = 0;
let isAnimating   = false;
let touchStartX   = 0;
let touchStartY   = 0;
const TOTAL       = 17;
let stepInterval  = null; // stored so we can clear it when leaving slide 14

// Detect touch-only devices. Use three signals so Samsung S Pen devices,
// Android tablets, and any browser that mis-reports the media query are caught.
const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  || ('ontouchstart' in window)
  || navigator.maxTouchPoints > 0;

// ── Boot ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (isMobile) {
    // Hide all slides via inline style BEFORE first paint so there's no flicker.
    // Inline styles override CSS without needing !important.
    document.querySelectorAll('.slide').forEach(s => { s.style.display = 'none'; });
    document.body.classList.add('is-mobile');
  }
  goTo(0);
  wireNavigation();
  wireKeyboard();
  wireTouch();
  wireModals();
  wireViewTabs();
  wireBlockDemo();
  wireDragBlocks();
  wireBoardDrag();
  wireAgendaCards();
  // startSearchDemo() is intentionally NOT called here — it runs in onSlideEnter(10)
  // when the user actually navigates to that slide, preventing a background timer at startup.
  wireStepAnimation();
  wireDbTabs();
});

// ── Core: go to a slide ─────────────────────────────────
function goTo(index) {
  if (!isMobile && isAnimating) return;
  if (index < 0 || index >= TOTAL) return;

  const slides = document.querySelectorAll('.slide');
  const from   = slides[currentSlide];
  const to     = slides[index];

  slides.forEach(s => s.classList.remove('slide-exit', 'active'));

  if (isMobile) {
    // Hide all slides
    slides.forEach(s => {
      s.style.display       = 'none';
      s.style.opacity       = '0';
      s.style.pointerEvents = 'none';
    });

    // Show target slide — set every visibility property inline so CSS
    // cascade and media queries cannot override any of them
    to.style.display       = 'flex';
    to.style.opacity       = '1';
    to.style.transform     = 'none';
    to.style.pointerEvents = 'all';
    to.style.zIndex        = '2';

    to.classList.add('active');
    currentSlide = index;
    syncUI();
    onSlideEnter(index);
  } else {
    // Desktop: CSS opacity transition
    if (from && currentSlide !== index) from.classList.add('slide-exit');
    isAnimating = true;
    void to.offsetWidth;
    to.classList.add('active');
    currentSlide = index;
    syncUI();
    setTimeout(() => {
      isAnimating = false;
      slides.forEach(s => { if (!s.classList.contains('active')) s.classList.remove('slide-exit'); });
      onSlideEnter(index);
    }, 550);
  }
}

function next() { if (currentSlide < TOTAL - 1) goTo(currentSlide + 1); }
function prev() { if (currentSlide > 0)         goTo(currentSlide - 1); }

// ── UI Sync ─────────────────────────────────────────────
function syncUI() {
  // Counter
  const cur = document.getElementById('currentNum');
  if (cur) cur.textContent = currentSlide + 1;

  // Progress bar
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${((currentSlide + 1) / TOTAL) * 100}%`;

  // Dots
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });

  // Nav buttons
  const pb = document.getElementById('prevBtn');
  const nb = document.getElementById('nextBtn');
  if (pb) pb.disabled = currentSlide === 0;
  if (nb) nb.disabled = currentSlide === TOTAL - 1;
}

// ── Per-slide triggers ──────────────────────────────────
function onSlideEnter(index) {
  if (index === 10) startSearchDemo(); // Slide 11 (0-indexed = 10)

  // Clear step timeline interval when not on slide 15 (index 14)
  // Without this it keeps firing in the background, wasting CPU on mobile
  if (index !== 14 && stepInterval !== null) {
    clearInterval(stepInterval);
    stepInterval = null;
  }

  // Safari autoplay fix: manually play videos in the active slide,
  // pause videos in all other slides
  document.querySelectorAll('.slide').forEach((slide, i) => {
    slide.querySelectorAll('video').forEach(vid => {
      if (i === index) {
        vid.play().catch(() => {}); // catch silences any policy errors
      } else {
        vid.pause();
      }
    });
  });
}

// ── Navigation wiring ───────────────────────────────────
function wireNavigation() {
  document.getElementById('prevBtn')?.addEventListener('click', prev);
  document.getElementById('nextBtn')?.addEventListener('click', next);

  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  // CTA "Get Started" on slide 1
  document.getElementById('getStarted')?.addEventListener('click', () => goTo(1));

  // Agenda cards navigate to relevant slides
  document.querySelectorAll('.agenda-card[data-slide]').forEach(card => {
    card.addEventListener('click', () => {
      const s = parseInt(card.dataset.slide);
      if (!isNaN(s)) goTo(s);
    });
  });
}

// ── Keyboard ────────────────────────────────────────────
function wireKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (isModalOpen()) { if (e.key === 'Escape') closeModal(); return; }

    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp':
        e.preventDefault(); prev(); break;
      case 'Escape': closeModal(); break;
      case 'Home':  e.preventDefault(); goTo(0); break;
      case 'End':   e.preventDefault(); goTo(TOTAL - 1); break;
    }
  });
}

// ── Touch / Swipe ────────────────────────────────────────
function wireTouch() {
  const wrap = document.querySelector('.slides-wrap');
  if (!wrap) return;

  wrap.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });
}

// ── Modal system ─────────────────────────────────────────
function wireModals() {
  // Open triggers
  document.querySelectorAll('[data-open-modal]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openModal(el.dataset.openModal);
    });
  });

  // Close on overlay click or close button
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal());
  });
}

function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.add('open');
}

function closeModal() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
}

function isModalOpen() {
  return !!document.querySelector('.modal-overlay.open');
}

// Expose for inline usage
window.openModal = openModal;
window.closeModal = closeModal;

// ── Database Tabs (Slide 9) ──────────────────────────────
function wireDbTabs() {
  const container = document.getElementById('slide-8');
  if (!container) return;
  const tabs  = container.querySelectorAll('.db-tab');
  const panes = container.querySelectorAll('.db-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach(p => {
        p.classList.toggle('active', p.dataset.dbView === tab.dataset.dbView);
      });
    });
  });
}

// ── View Tabs (Slide 10) ─────────────────────────────────
function wireViewTabs() {
  const tabs  = document.querySelectorAll('.view-tab');
  const panes = document.querySelectorAll('.view-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach(p => {
        p.classList.toggle('active', p.dataset.view === tab.dataset.view);
      });
    });
  });
}

// ── Block Demo (Slide 7) ──────────────────────────────────
function wireBlockDemo() {
  document.querySelectorAll('.block-type').forEach(bt => {
    bt.addEventListener('click', () => {
      const type = bt.dataset.type;
      // Flash the matching lego block
      const lb = document.querySelector(`.lego-block[data-type="${type}"]`);
      if (lb) {
        lb.style.transform = 'scale(1.06) translateX(4px)';
        lb.style.boxShadow = '0 4px 14px rgba(203,89,40,0.25)';
        setTimeout(() => { lb.style.transform = ''; lb.style.boxShadow = ''; }, 700);
      }
      // Highlight block type
      document.querySelectorAll('.block-type').forEach(b => b.classList.remove('highlighted'));
      bt.classList.add('highlighted');
      setTimeout(() => bt.classList.remove('highlighted'), 700);
    });
  });
}

// ── Drag-to-reorder Lego Blocks (Slide 7) ────────────────
function wireDragBlocks() {
  const container = document.getElementById('legoBlocks');
  if (!container) return;

  // HTML5 drag API doesn't work on touch — show a note instead of silent failure
  const isTouchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchOnly) {
    const note = container.nextElementSibling; // .lego-note
    if (note) note.innerHTML = '📱 <strong>Tap any block type</strong> on the left to highlight it here';
    return;
  }

  let dragSrc = null;

  function getBlocks() {
    return [...container.querySelectorAll('.lego-block')];
  }

  function clearDropClasses() {
    getBlocks().forEach(b => b.classList.remove('drop-above', 'drop-below'));
  }

  function getDropPosition(target, clientY) {
    const rect = target.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2 ? 'above' : 'below';
  }

  container.addEventListener('dragstart', e => {
    const block = e.target.closest('.lego-block');
    if (!block) return;
    dragSrc = block;
    // Small delay so the ghost image renders before we dim it
    requestAnimationFrame(() => block.classList.add('is-dragging'));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.dataset.type);
    container.classList.add('drag-active');
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.lego-block');
    if (!target || target === dragSrc) { clearDropClasses(); return; }
    clearDropClasses();
    const pos = getDropPosition(target, e.clientY);
    target.classList.add(pos === 'above' ? 'drop-above' : 'drop-below');
  });

  container.addEventListener('dragleave', e => {
    if (!container.contains(e.relatedTarget)) clearDropClasses();
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    clearDropClasses();
    const target = e.target.closest('.lego-block');
    if (!target || target === dragSrc) return;

    const pos = getDropPosition(target, e.clientY);
    if (pos === 'above') {
      container.insertBefore(dragSrc, target);
    } else {
      container.insertBefore(dragSrc, target.nextSibling);
    }

    // Brief "settled" flash on the moved block
    dragSrc.style.transition = 'box-shadow 0.3s ease';
    dragSrc.style.boxShadow = '0 0 0 2px var(--accent)';
    setTimeout(() => { if (dragSrc) dragSrc.style.boxShadow = ''; }, 400);
  });

  container.addEventListener('dragend', () => {
    if (dragSrc) { dragSrc.classList.remove('is-dragging'); dragSrc = null; }
    container.classList.remove('drag-active');
    clearDropClasses();
  });
}

// ── Board Drag (Slide 10) ────────────────────────────────
function wireBoardDrag() {
  const cols = document.querySelectorAll('.board-col');
  if (!cols.length) return;

  let dragSrc = null;

  document.querySelectorAll('.board-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item;
      requestAnimationFrame(() => item.classList.add('is-dragging'));
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      if (dragSrc) dragSrc.classList.remove('is-dragging');
      dragSrc = null;
      document.querySelectorAll('.board-col').forEach(c => c.classList.remove('drag-over'));
    });
  });

  cols.forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.board-col').forEach(c => c.classList.remove('drag-over'));
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (!dragSrc || col.contains(dragSrc)) return;

      col.appendChild(dragSrc);

      // Apply or remove done styling based on column
      if (col.dataset.col === 'done') {
        dragSrc.classList.add('board-item--done');
      } else {
        dragSrc.classList.remove('board-item--done');
      }
    });
  });
}

// ── Agenda Cards (Slide 2) ───────────────────────────────
function wireAgendaCards() {
  // Already handled in wireNavigation via [data-slide]
}

// ── Animated Search Demo (Slide 11) ─────────────────────
let searchTimeout = null;

function startSearchDemo() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const terms = ['Sunday service', 'volunteer rota', 'budget 2026', 'events plan', 'staff handbook'];
  const allResults = document.querySelectorAll('.sr-item');

  let term = 0, char = 0, deleting = false;

  clearTimeout(searchTimeout);

  function type() {
    const t = terms[term];
    if (!deleting) {
      input.value = t.slice(0, ++char);
      if (char === t.length) {
        deleting = true;
        // Show results when query is complete
        allResults.forEach((r, i) => {
          setTimeout(() => r.style.opacity = '1', i * 80);
        });
        searchTimeout = setTimeout(type, 1800);
        return;
      }
    } else {
      input.value = t.slice(0, --char);
      if (char === 0) {
        deleting = false;
        term = (term + 1) % terms.length;
        allResults.forEach(r => r.style.opacity = '0');
      }
    }
    searchTimeout = setTimeout(type, deleting ? 50 : 95);
  }

  // Hide results initially
  allResults.forEach(r => { r.style.opacity = '0'; r.style.transition = 'opacity 0.3s ease'; });
  type();
}

// ── Step Timeline Animation (Slide 14) ──────────────────
function wireStepAnimation() {
  const items = [...document.querySelectorAll('.step-timeline .st-item')];
  if (!items.length) return;

  let current = 0;

  function activate(index) {
    items.forEach((item, i) => {
      item.classList.toggle('now', i === index);
    });
  }

  // Ensure step 1 starts active
  activate(0);

  // Store reference so we can clear it when navigating away
  if (stepInterval) clearInterval(stepInterval);
  stepInterval = setInterval(() => {
    current = (current + 1) % items.length;
    activate(current);
  }, 2800); // 2.8s per step — gives 0.9s transition time to breathe
}

// ── Expose global navigation ─────────────────────────────
window.goTo   = goTo;
window.next   = next;
window.prev   = prev;
