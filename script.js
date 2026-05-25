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

// ── Database Demo (Slide 9) — shared data model ──────────

const DB_EVENTS = [
  { id: 0, name: 'Sunday Service', day: 25, month: 5, category: 'Worship',   catClass: 'db-tag-purple', chipClass: 'chip-green',  status: 'Done' },
  { id: 1, name: 'Youth Night',    day: 28, month: 5, category: 'Youth',     catClass: 'db-tag-blue',   chipClass: 'chip-orange', status: 'In Progress' },
  { id: 2, name: 'Prayer Meeting', day: 31, month: 5, category: 'Prayer',    catClass: 'db-tag-teal',   chipClass: 'chip-blue',   status: 'Upcoming' },
  { id: 3, name: 'Staff Day',      day: 1,  month: 6, category: 'HR',        catClass: 'db-tag-brown',  chipClass: 'chip-brown',  status: 'Upcoming' },
  { id: 4, name: 'Community BBQ',  day: 8,  month: 6, category: 'Community', catClass: 'db-tag-green2', chipClass: 'chip-teal',   status: 'Upcoming' },
];

const DB_STATUSES = ['Done', 'In Progress', 'Upcoming'];

const CAL_CELLS = [
  {d:19,m:5},{d:20,m:5},{d:21,m:5},{d:22,m:5},{d:23,m:5},{d:24,m:5},{d:25,m:5},
  {d:26,m:5},{d:27,m:5},{d:28,m:5},{d:29,m:5},{d:30,m:5},{d:31,m:5},{d:1,m:6},
  {d:2,m:6},{d:3,m:6},{d:4,m:6},{d:5,m:6},{d:6,m:6},{d:7,m:6},{d:8,m:6},
];

function dbFmtDate(day, month) {
  return day + (month === 5 ? ' May' : ' Jun');
}

function dbBadgeClass(status) {
  return status === 'Done' ? 'badge-green' : status === 'In Progress' ? 'badge-orange' : 'badge-grey';
}

let dbContainer = null;

function dbRenderAll() {
  if (!dbContainer) return;
  dbRenderTable();
  dbRenderCalendar();
  dbRenderBoard();
}

function dbRenderTable() {
  const tbody = dbContainer.querySelector('#db-table-body');
  if (!tbody) return;

  tbody.innerHTML = DB_EVENTS.map(ev => `
    <tr>
      <td class="db-td-name">${ev.name}</td>
      <td><span class="db-date-cell" data-ev-id="${ev.id}">${dbFmtDate(ev.day, ev.month)}</span></td>
      <td><span class="db-tag ${ev.catClass}">${ev.category}</span></td>
      <td><span class="db-status-cell badge ${dbBadgeClass(ev.status)}" data-ev-id="${ev.id}">${ev.status}</span></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.db-status-cell').forEach(el => {
    el.addEventListener('click', () => {
      const ev = DB_EVENTS[+el.dataset.evId];
      ev.status = DB_STATUSES[(DB_STATUSES.indexOf(ev.status) + 1) % DB_STATUSES.length];
      dbRenderAll();
    });
  });

  tbody.querySelectorAll('.db-date-cell').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      dbShowDatePicker(el, +el.dataset.evId);
    });
  });
}

function dbRenderCalendar() {
  const grid = dbContainer.querySelector('#db-cal-grid');
  if (!grid) return;

  grid.querySelectorAll('.db-cal-day').forEach(el => el.remove());

  CAL_CELLS.forEach(cell => {
    const div = document.createElement('div');
    div.className = 'db-cal-day';
    div.dataset.day = cell.d;
    div.dataset.month = cell.m;

    const eventsHere = DB_EVENTS.filter(ev => ev.day === cell.d && ev.month === cell.m);

    if (eventsHere.length) {
      div.classList.add('has-event');
      const num = document.createElement('span');
      num.className = 'db-cal-num';
      num.textContent = cell.d;
      div.appendChild(num);

      eventsHere.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = `db-event-chip ${ev.chipClass}`;
        chip.textContent = ev.name.length > 13 ? ev.name.slice(0, 12) + '…' : ev.name;
        chip.draggable = true;
        chip.dataset.evId = ev.id;

        chip.addEventListener('dragstart', e => {
          e.dataTransfer.setData('db-ev-id', ev.id);
          e.dataTransfer.effectAllowed = 'move';
          requestAnimationFrame(() => chip.classList.add('is-dragging'));
        });
        chip.addEventListener('dragend', () => chip.classList.remove('is-dragging'));
        div.appendChild(chip);
      });
    } else {
      div.textContent = cell.d;
    }

    div.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      div.classList.add('db-drop-target');
    });
    div.addEventListener('dragleave', e => {
      if (!div.contains(e.relatedTarget)) div.classList.remove('db-drop-target');
    });
    div.addEventListener('drop', e => {
      e.preventDefault();
      div.classList.remove('db-drop-target');
      const id = +e.dataTransfer.getData('db-ev-id');
      if (!isNaN(id)) {
        DB_EVENTS[id].day = cell.d;
        DB_EVENTS[id].month = cell.m;
        dbRenderAll();
      }
    });

    grid.appendChild(div);
  });
}

function dbRenderBoard() {
  const board = dbContainer.querySelector('.db-board');
  if (!board) return;

  board.innerHTML = DB_STATUSES.map(status => {
    const color = status === 'Done' ? '#1A6E1E' : status === 'In Progress' ? '#E65100' : 'var(--text-muted)';
    const icon  = status === 'Done' ? '✅' : status === 'In Progress' ? '⏳' : '📅';
    const cards = DB_EVENTS.filter(ev => ev.status === status).map(ev => `
      <div class="db-board-card" draggable="true" data-ev-id="${ev.id}">
        <strong>${ev.name}</strong>
        <span>${dbFmtDate(ev.day, ev.month)} · ${ev.category}</span>
      </div>`).join('');
    return `<div class="db-board-col" data-status="${status}">
      <div class="db-board-header" style="color:${color}">${icon} ${status.toUpperCase()}</div>
      ${cards}
    </div>`;
  }).join('');

  board.querySelectorAll('.db-board-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('db-ev-id', card.dataset.evId);
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => card.classList.add('is-dragging'));
    });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
  });

  board.querySelectorAll('.db-board-col').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('db-drop-target');
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('db-drop-target');
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('db-drop-target');
      const id = +e.dataTransfer.getData('db-ev-id');
      if (!isNaN(id)) {
        DB_EVENTS[id].status = col.dataset.status;
        dbRenderAll();
      }
    });
  });
}

// Date picker
function dbShowDatePicker(anchor, evId) {
  dbCloseDatePicker();
  const ev = DB_EVENTS[evId];
  const picker = document.createElement('div');
  picker.className = 'db-date-picker';
  picker.id = 'db-date-picker';

  [
    { label: 'May', month: 5, days: [19,20,21,22,23,24,25,26,27,28,29,30,31] },
    { label: 'June', month: 6, days: [1,2,3,4,5,6,7,8] },
  ].forEach(({ label, month, days }) => {
    const col = document.createElement('div');
    col.className = 'db-picker-month';
    col.innerHTML = `<div class="db-picker-label">${label}</div>`;
    days.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'db-picker-day' + (ev.day === d && ev.month === month ? ' active' : '');
      btn.textContent = d;
      btn.addEventListener('click', () => {
        ev.day = d;
        ev.month = month;
        dbCloseDatePicker();
        dbRenderAll();
      });
      col.appendChild(btn);
    });
    picker.appendChild(col);
  });

  const demo = dbContainer.querySelector('.db-demo');
  demo.style.position = 'relative';
  const ar = anchor.getBoundingClientRect();
  const dr = demo.getBoundingClientRect();
  picker.style.top  = (ar.bottom - dr.top + 4) + 'px';
  picker.style.left = Math.min(ar.left - dr.left, dr.width - 175) + 'px';
  demo.appendChild(picker);

  setTimeout(() => {
    document.addEventListener('click', dbCloseDatePicker, { once: true });
  }, 0);
}

function dbCloseDatePicker() {
  document.getElementById('db-date-picker')?.remove();
}

// Tab switching + initial render
function wireDbTabs() {
  dbContainer = document.getElementById('slide-8');
  if (!dbContainer) return;

  const tabs  = dbContainer.querySelectorAll('.db-tab');
  const panes = dbContainer.querySelectorAll('.db-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach(p => {
        p.classList.toggle('active', p.dataset.dbView === tab.dataset.dbView);
      });
    });
  });

  dbRenderAll();
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
