/* Phoenix Rise Wellness PWA - app.js */
(function () {
  'use strict';

  const VIBRATE_DURATION = 10;
  const STORAGE_KEY = 'phoenix_rise_state';

  const defaultState = {
    user: { name: 'Phoenix', phoenixPoints: 0, startDate: new Date().toISOString() },
    meals: [],
    supplements: [],
    addictions: {},
    goals: [],
    journal: []
  };

  function vibrate() {
    try {
      if (navigator?.vibrate) navigator.vibrate(VIBRATE_DURATION);
    } catch (err) {
      console.log('[vibrate] not supported', err);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultState };
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        user: { ...defaultState.user, ...(parsed?.user ?? {}) },
        meals: Array.isArray(parsed?.meals) ? parsed.meals : [],
        supplements: Array.isArray(parsed?.supplements) ? parsed.supplements : [],
        addictions: typeof parsed?.addictions === 'object' && parsed?.addictions !== null ? parsed.addictions : {},
        goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
        journal: Array.isArray(parsed?.journal) ? parsed.journal : [],
      };
    } catch (e) {
      console.error('[loadState] parse error', e);
      return { ...defaultState };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[saveState] error', e);
    }
  }

  let state = loadState();

  function nowISO() { return new Date().toISOString(); }
  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function showToast(message) {
    try {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '24px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.minWidth = '200px';
      toast.style.maxWidth = '90vw';
      toast.style.background = 'rgba(33,33,33,0.95)';
      toast.style.color = '#fff';
      toast.style.padding = '14px 16px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
      toast.style.textAlign = 'center';
      toast.style.fontSize = '15px';
      toast.style.border = '1px solid rgba(255,255,255,0.08)';
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.transition = 'opacity 300ms ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 320);
      }, 1800);
    } catch (e) {
      console.log('[toast]', message);
    }
  }

  function addPhoenixPoints(amount) {
    state.user.phoenixPoints = Math.max(0, (state.user.phoenixPoints ?? 0) + amount);
    saveState(state);
    renderHeader();
  }

  function promptNumber(label) {
    const raw = prompt(label);
    if (raw === null) return null;
    const num = Number(raw);
    if (Number.isNaN(num)) {
      showToast('Please enter a valid number');
      return null;
    }
    return num;
  }

  function addMeal() {
    vibrate();
    const name = prompt('Meal name?');
    if (!name) return;
    const calories = promptNumber('Calories?');
    if (calories === null) return;
    const entry = { name, calories, date: nowISO() };
    state.meals.push(entry);
    addPhoenixPoints(5);
    saveState(state);
    showToast('Meal added +5 points');
    renderAll();
  }

  function addSupplement() {
    vibrate();
    const name = prompt('Supplement name?');
    if (!name) return;
    const entry = { name, date: nowISO() };
    state.supplements.push(entry);
    addPhoenixPoints(2);
    saveState(state);
    showToast('Supplement added +2 points');
    renderAll();
  }

  function ensureAddiction(name) {
    if (!state.addictions[name]) {
      state.addictions[name] = { currentStreak: 0, bestStreak: 0, lastDate: null };
    }
    return state.addictions[name];
  }

  function trackAddiction() {
    vibrate();
    const available = Object.keys(state.addictions);
    let name = available.length ? prompt(`Track which addiction/habit? Existing: ${available.join(', ')}\nOr type a new one:`) : prompt('Name of addiction/habit to track?');
    if (!name) return;
    name = name.trim();
    const add = ensureAddiction(name);

    const lastKey = add.lastDate ? todayKey(new Date(add.lastDate)) : null;
    const tKey = todayKey();
    if (lastKey === tKey) {
      showToast('Already tracked today');
      return;
    }
    add.currentStreak = (lastKey && ((new Date(add.lastDate)).getTime() > 0)) && (daysBetween(add.lastDate, nowISO()) <= 2)
      ? (add.currentStreak + 1)
      : (lastKey === null ? 1 : 1);
    add.bestStreak = Math.max(add.bestStreak, add.currentStreak);
    add.lastDate = nowISO();
    addPhoenixPoints(10);
    saveState(state);
    showToast(`${name} tracked +10 points`);
    renderAll();
  }

  function daysBetween(aISO, bISO) {
    const a = new Date(aISO); const b = new Date(bISO);
    const ms = Math.abs(b.setHours(0,0,0,0) - a.setHours(0,0,0,0));
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  }

  function addGoal() {
    vibrate();
    const name = prompt('Goal name?');
    if (!name) return;
    const progress = promptNumber('Initial progress (0-100)?');
    if (progress === null) return;
    const targetDate = prompt('Target date (YYYY-MM-DD)?') || '';
    state.goals.push({ name, progress: Math.max(0, Math.min(100, progress)), targetDate });
    addPhoenixPoints(15);
    saveState(state);
    showToast('Goal added +15 points');
    renderAll();
  }

  function calculateRebirthScore() {
    const tKey = todayKey();

    const mealsToday = state.meals.filter(m => todayKey(new Date(m.date)) === tKey).length;
    const mealsScore = Math.min(1, mealsToday / 3);

    const suppToday = state.supplements.filter(s => todayKey(new Date(s.date)) === tKey).length;
    const suppScore = Math.min(1, suppToday >= 1 ? 1 : 0);

    const names = Object.keys(state.addictions);
    let streakScore = 0;
    if (names.length) {
      const ratios = names.map(n => {
        const a = state.addictions[n];
        const denom = Math.max(1, a.bestStreak || 1);
        return Math.min(1, (a.currentStreak || 0) / denom);
      });
      streakScore = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    }

    let goalsScore = 0;
    if (state.goals.length) {
      const ratios = state.goals.map(g => Math.min(1, Math.max(0, Number(g.progress) || 0) / 100));
      goalsScore = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    }

    const total = (mealsScore + suppScore + streakScore + goalsScore) / 4;
    return Math.round(total * 100);
  }

  function navigate(sectionId) {
    vibrate();
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(el => { el.style.display = el.getAttribute('data-section') === sectionId ? 'block' : 'none'; });
    const navs = document.querySelectorAll('[data-nav]');
    navs.forEach(el => {
      if (el.getAttribute('data-nav') === sectionId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  function bindClicks() {
    const map = [
      ['addMealBtn', addMeal],
      ['addSupplementBtn', addSupplement],
      ['trackAddictionBtn', trackAddiction],
      ['addGoalBtn', addGoal],
    ];
    map.forEach(([id, fn]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    });

    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav')));
    });

    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      let deferredPrompt = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'inline-flex';
      });
      installBtn.addEventListener('click', async () => {
        vibrate();
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          showToast(choice.outcome === 'accepted' ? 'Installing…' : 'Install canceled');
          deferredPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  }

  function renderHeader() {
    const pointsEl = document.getElementById('phoenixPoints');
    if (pointsEl) pointsEl.textContent = String(state.user.phoenixPoints ?? 0);

    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = state.user.name ?? 'Phoenix';

    const scoreEl = document.getElementById('rebirthScore');
    if (scoreEl) scoreEl.textContent = `${calculateRebirthScore()}%`;
  }

  function renderLists() {
    const mealsEl = document.getElementById('mealsList');
    if (mealsEl) {
      mealsEl.innerHTML = '';
      state.meals.slice(-10).reverse().forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.name} • ${m.calories} kcal`;
        mealsEl.appendChild(li);
      });
    }

    const suppEl = document.getElementById('supplementsList');
    if (suppEl) {
      suppEl.innerHTML = '';
      state.supplements.slice(-10).reverse().forEach(s => {
        const li = document.createElement('li');
        li.textContent = s.name;
        suppEl.appendChild(li);
      });
    }

    const addEl = document.getElementById('addictionsList');
    if (addEl) {
      addEl.innerHTML = '';
      Object.keys(state.addictions).forEach(name => {
        const a = state.addictions[name];
        const li = document.createElement('li');
        li.textContent = `${name} • Streak ${a.currentStreak} (Best ${a.bestStreak})`;
        addEl.appendChild(li);
      });
    }

    const goalsEl = document.getElementById('goalsList');
    if (goalsEl) {
      goalsEl.innerHTML = '';
      state.goals.slice(-10).reverse().forEach(g => {
        const li = document.createElement('li');
        li.textContent = `${g.name} • ${g.progress}% by ${g.targetDate || '—'}`;
        goalsEl.appendChild(li);
      });
    }
  }

  function renderAll() {
    renderHeader();
    renderLists();
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(() => {
          console.log('[SW] registered');
        }).catch(err => console.error('[SW] register failed', err));
      });
    }
  }

  window.PhoenixApp = {
    addMeal,
    addSupplement,
    trackAddiction,
    addGoal,
    calculateRebirthScore,
    showToast,
    navigate,
    get state() { return state; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Phoenix] init');
    bindClicks();
    renderAll();
    registerSW();
    navigate((document.querySelector('[data-section].default')?.getAttribute('data-section')) || 'dashboard');
  });
})();
