const crypto = require('node:crypto');
const storage = require('../services/taskStorage');
const { HttpError } = require('../middleware/errorHandler');

const PRIORITIES = ['High', 'Medium', 'Low'];
const toTask = (task) => ({ ...task });

function validate(body, partial = false) {
  const errors = [];
  const out = {};
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  if (!partial || b.title !== undefined) {
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    if (!title) errors.push('Title is required');
    else if (title.length > 120) errors.push('Title must be 120 characters or fewer');
    out.title = title;
  }
  if (b.description !== undefined || !partial) {
    const description = b.description === undefined ? '' : b.description;
    if (typeof description !== 'string') errors.push('Description must be text');
    else if (description.trim().length > 1000) errors.push('Description must be 1000 characters or fewer');
    else out.description = description.trim();
  }
  if (b.priority !== undefined || !partial) {
    const priority = b.priority === undefined ? 'Medium' : b.priority;
    if (!PRIORITIES.includes(priority)) errors.push('Priority must be High, Medium or Low');
    else out.priority = priority;
  }
  if (b.category !== undefined || !partial) {
    const category = b.category === undefined ? '' : b.category;
    if (typeof category !== 'string') errors.push('Category must be text');
    else if (category.trim().length > 40) errors.push('Category must be 40 characters or fewer');
    else out.category = category.trim() || 'General';
  }
  if (b.due_date !== undefined || !partial) {
    const date = b.due_date === undefined ? '' : b.due_date;
    if (date !== '' && date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) errors.push('Due date must be YYYY-MM-DD');
    else out.due_date = date || null;
  }
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

function parseId(req) {
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new HttpError(400, 'Task id must be a UUID');
  return id;
}
async function findOr404(id, userId) {
  const task = await storage.findById(id, userId);
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

exports.getTasks = async (req, res) => {
  const { search, status, priority, sort } = req.query;
  if (status && !['all', 'pending', 'completed'].includes(status)) throw new HttpError(400, 'status must be all, pending or completed');
  if (priority && priority !== 'all' && !PRIORITIES.includes(priority)) throw new HttpError(400, 'priority must be High, Medium or Low');
  const orders = { newest: (a,b) => b.created_at.localeCompare(a.created_at), oldest: (a,b) => a.created_at.localeCompare(b.created_at), due: (a,b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'), priority: (a,b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) };
  if (sort && !orders[sort]) throw new HttpError(400, 'sort must be newest, oldest, due or priority');
  let rows = await storage.list(req.userId);
  if (status === 'completed') rows = rows.filter((t) => t.completed);
  if (status === 'pending') rows = rows.filter((t) => !t.completed);
  if (priority && priority !== 'all') rows = rows.filter((t) => t.priority === priority);
  if (search) { const q = String(search).toLocaleLowerCase(); rows = rows.filter((t) => [t.title,t.description,t.category].some((v) => v.toLocaleLowerCase().includes(q))); }
  rows.sort(orders[sort || 'newest']);
  res.json({ success: true, count: rows.length, data: rows.map(toTask) });
};
exports.getTask = async (req, res) => res.json({ success: true, data: toTask(await findOr404(parseId(req), req.userId)) });
exports.createTask = async (req, res) => {
  const now = new Date().toISOString();
  const task = { id: crypto.randomUUID(), user_id: req.userId, ...validate(req.body), completed: false, created_at: now, updated_at: now };
  await storage.create(task);
  res.status(201).json({ success: true, data: task });
};
exports.updateTask = async (req, res) => {
  const id = parseId(req);
  const current = await findOr404(id, req.userId);
  const updated = { ...current, ...validate(req.body, true), updated_at: new Date().toISOString() };
  if (!await storage.update(updated)) throw new HttpError(404, 'Task not found');
  res.json({ success: true, data: updated });
};
const setCompleted = (completed) => async (req, res) => {
  const id = parseId(req);
  const current = await findOr404(id, req.userId);
  const updated = { ...current, completed, updated_at: new Date().toISOString() };
  if (!await storage.update(updated)) throw new HttpError(404, 'Task not found');
  res.json({ success: true, data: updated });
};
exports.completeTask = setCompleted(true);
exports.incompleteTask = setCompleted(false);
exports.deleteTask = async (req, res) => {
  await findOr404(parseId(req), req.userId);
  if (!await storage.remove(req.params.id, req.userId)) throw new HttpError(404, 'Task not found');
  res.json({ success: true, message: 'Task deleted' });
};
exports.getStats = async (req, res) => {
  const rows = await storage.list(req.userId);
  const completed = rows.filter((t) => t.completed).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = rows.filter((t) => !t.completed && t.due_date && t.due_date < today).length;
  res.json({ success: true, data: { total: rows.length, completed, pending: rows.length - completed, overdue, percentage: rows.length ? Math.round(completed / rows.length * 100) : 0 } });
};
