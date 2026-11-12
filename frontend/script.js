/* =====================================================
   TASKFLOW – frontend logic (single file)
   Sections: state · helpers · API · rendering · actions · events · init
   ===================================================== */

/* ---------- STATE ---------- */
const state = { view: 'dashboard', status: 'all', priority: 'all', sort: 'newest', search: '', tasks: [], editingId: null, deleteId: null };
const $ = (id) => document.getElementById(id);

/* ---------- HELPERS ---------- */
// Safe rendering: every user value goes through textContent (no innerHTML) to prevent XSS
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function icon(name) { const i = document.createElement('i'); i.setAttribute('data-lucide', name); return i; }
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDate = (s) => new Date(s.length === 10 ? s + 'T00:00:00' : s.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const isOverdue = (t) => !t.completed && t.due_date && t.due_date < todayStr();
const refreshIcons = () => window.lucide && lucide.createIcons();
const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

function toast(msg, type = 'success') {
  const t = el('div', 'toast ' + type);
  t.append(icon(type === 'error' ? 'alert-circle' : 'check-circle-2'), el('span', '', msg));
  $('toasts').append(t); refreshIcons();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ---------- API (Fetch) ---------- */
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = body && body.details ? body.details.join('. ') : '';
    throw new Error(detail || (body && body.error) || `Request failed (${res.status})`);
  }
  return body;
}
const apiGetTasks = () => {
  const p = new URLSearchParams({ status: state.status, priority: state.priority, sort: state.sort });
  if (state.search) p.set('search', state.search);
  return api('/tasks?' + p);
};
const apiGetStats = () => api('/stats');
const apiCreate = (d) => api('/tasks', { method: 'POST', body: JSON.stringify(d) });
const apiUpdate = (id, d) => api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(d) });
const apiToggle = (t) => api(`/tasks/${t.id}/${t.completed ? 'incomplete' : 'complete'}`, { method: 'PATCH' });
const apiDelete = (id) => api(`/tasks/${id}`, { method: 'DELETE' });

/* ---------- RENDERING ---------- */
function renderStats(s) {
  $('statTotal').textContent = s.total;
  $('statCompleted').textContent = s.completed;
  $('statPending').textContent = s.pending;
  $('statPercent').textContent = s.percentage + '%';
  $('progressBar').style.width = s.percentage + '%';
}

function chip(text, cls, ic) { const c = el('span', 'chip ' + (cls || '')); if (ic) c.append(icon(ic)); c.append(document.createTextNode(text)); return c; }

function taskCard(t) {
  const card = el('article', 'card task' + (t.completed ? ' done' : '') + (isOverdue(t) ? ' overdue' : ''));
  const top = el('div', 'task-top');
  const check = el('button', 'check'); check.setAttribute('aria-label', t.completed ? 'Mark as pending' : 'Mark as complete');
  check.append(icon('check')); check.onclick = () => toggleTask(t);
  top.append(check, el('h3', 'task-title', t.title));
  card.append(top);
  if (t.description) card.append(el('p', 'task-desc', t.description));

  const chips = el('div', 'chips');
  chips.append(chip(t.priority, t.priority, 'flag'), chip(t.category || 'General', '', 'tag'));
  if (t.due_date) chips.append(isOverdue(t) ? chip('Overdue · ' + fmtDate(t.due_date), 'late', 'alert-triangle') : chip('Due ' + fmtDate(t.due_date), '', 'calendar'));
  chips.append(t.completed ? chip('Completed', 'status-done', 'check-circle-2') : chip('Pending', '', 'clock'));
  card.append(chips);

  const foot = el('div', 'task-foot');
  foot.append(el('span', 'created', 'Created ' + fmtDate(t.created_at)));
  const actions = el('div', 'actions');
  const mk = (cls, ic, label, fn) => { const b = el('button', 'act ' + cls); b.setAttribute('aria-label', label); b.title = label; b.append(icon(ic)); b.onclick = fn; return b; };
  actions.append(
    mk('ok', t.completed ? 'rotate-ccw' : 'check', t.completed ? 'Mark incomplete' : 'Mark complete', () => toggleTask(t)),
    mk('', 'pencil', 'Edit task', () => openModal(t)),
    mk('del', 'trash-2', 'Delete task', () => askDelete(t))
  );
  foot.append(actions); card.append(foot);
  return card;
}

function renderTasks() {
  const list = $('taskList');
  list.replaceChildren(...state.tasks.map(taskCard));
  $('empty').hidden = state.tasks.length > 0;
  refreshIcons();
}

/* ---------- DATA LOADING ---------- */
async function load(showLoader = true) {
  if (showLoader) { $('loader').classList.add('show'); $('taskList').replaceChildren(); $('empty').hidden = true; }
  try {
    const [tasks, stats] = await Promise.all([apiGetTasks(), apiGetStats()]);
    state.tasks = tasks.data; renderStats(stats.data); renderTasks();
  } catch (e) { toast(e.message, 'error'); }
  finally { $('loader').classList.remove('show'); }
}
async function loadStats() { try { renderStats((await apiGetStats()).data); } catch (e) { toast(e.message, 'error'); } }

/* ---------- ACTIONS ---------- */
async function toggleTask(t) {
  try { await apiToggle(t); toast(t.completed ? 'Task marked pending' : 'Task completed'); await load(false); }
  catch (e) { toast(e.message, 'error'); }
}
function askDelete(t) {
  state.deleteId = t.id; $('confirmText').textContent = `“${t.title}” will be permanently removed.`; $('confirmModal').hidden = false; $('confirmNo').focus();
}
async function confirmDelete() {
  const id = state.deleteId; $('confirmModal').hidden = true;
  try { await apiDelete(id); toast('Task deleted'); await load(false); }
  catch (e) { toast(e.message, 'error'); }
}

/* ---------- MODAL / FORM ---------- */
function openModal(task) {
  state.editingId = task ? task.id : null;
  $('modalTitle').textContent = task ? 'Edit task' : 'New task';
  $('fTitle').value = task ? task.title : '';
  $('fDesc').value = task ? task.description || '' : '';
  $('fPriority').value = task ? task.priority : 'Medium';
  $('fCategory').value = task ? task.category || '' : '';
  $('fDue').value = task ? task.due_date || '' : '';
  $('eTitle').textContent = ''; $('eDue').textContent = '';
  $('taskModal').hidden = false; $('fTitle').focus();
}
const closeModal = () => { $('taskModal').hidden = true; };

function validateForm() {
  let ok = true;
  const title = $('fTitle').value.trim();
  $('eTitle').textContent = !title ? 'Enter a task title.' : '';
  if (!title) ok = false;
  const due = $('fDue').value;
  $('eDue').textContent = due && isNaN(Date.parse(due)) ? 'Enter a valid date.' : '';
  if (due && isNaN(Date.parse(due))) ok = false;
  return ok;
}

async function submitForm(e) {
  e.preventDefault();
  if (!validateForm()) return;
  const data = { title: $('fTitle').value.trim(), description: $('fDesc').value.trim(), priority: $('fPriority').value, category: $('fCategory').value.trim(), due_date: $('fDue').value };
  const btn = $('saveBtn'); btn.disabled = true;
  try {
    if (state.editingId) { await apiUpdate(state.editingId, data); toast('Task updated'); }
    else { await apiCreate(data); toast('Task created'); }
    closeModal(); await load(false);
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

/* ---------- NAVIGATION / FILTERS ---------- */
const titles = { dashboard: 'Dashboard', all: 'All Tasks', pending: 'Pending Tasks', completed: 'Completed Tasks', High: 'High Priority', Medium: 'Medium Priority', Low: 'Low Priority' };
function setView(view) {
  state.view = view;
  state.status = view === 'pending' || view === 'completed' ? view : 'all';
  state.priority = ['High', 'Medium', 'Low'].includes(view) ? view : 'all';
  document.querySelectorAll('.nav-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  syncFilterUI(); $('viewTitle').textContent = titles[view]; closeSidebar(); load();
}
function syncFilterUI() {
  document.querySelectorAll('#statusSeg button').forEach((b) => b.classList.toggle('active', b.dataset.status === state.status));
  $('priorityFilter').value = state.priority;
}
const openSidebar = () => { $('sidebar').classList.add('open'); $('overlay').classList.add('show'); };
function closeSidebar() { $('sidebar').classList.remove('open'); $('overlay').classList.remove('show'); }

/* ---------- THEME (localStorage only for theme preference) ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  $('themeLabel').textContent = t === 'dark' ? 'Light theme' : 'Dark theme';
}
function initTheme() {
  let t = 'dark'; try { t = localStorage.getItem('taskflow-theme') || 'dark'; } catch { /* ignore */ }
  applyTheme(t);
}
function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(t); try { localStorage.setItem('taskflow-theme', t); } catch { /* ignore */ }
}

/* ---------- EVENTS ---------- */
function bindEvents() {
  document.querySelectorAll('.nav-item[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  document.querySelectorAll('#statusSeg button').forEach((b) => b.addEventListener('click', () => { state.status = b.dataset.status; syncFilterUI(); load(); }));
  $('priorityFilter').addEventListener('change', (e) => { state.priority = e.target.value; load(); });
  $('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; load(); });
  $('searchInput').addEventListener('input', debounce((e) => { state.search = e.target.value.trim(); load(false); }, 250));
  $('addBtn').addEventListener('click', () => openModal());
  $('emptyAdd').addEventListener('click', () => openModal());
  $('taskForm').addEventListener('submit', submitForm);
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  $('confirmNo').addEventListener('click', () => { $('confirmModal').hidden = true; });
  $('confirmYes').addEventListener('click', confirmDelete);
  $('themeToggle').addEventListener('click', toggleTheme);
  $('menuBtn').addEventListener('click', openSidebar);
  $('overlay').addEventListener('click', closeSidebar);
  [$('taskModal'), $('confirmModal')].forEach((m) => m.addEventListener('mousedown', (e) => { if (e.target === m) m.hidden = true; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('confirmModal').hidden = true; closeSidebar(); } });
}

/* ---------- INIT ---------- */
function init() {
  initTheme();
  const h = new Date().getHours();
  $('welcomeText').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ready to focus?';
  $('todayDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  bindEvents(); refreshIcons(); load();
}
document.addEventListener('DOMContentLoaded', init);
