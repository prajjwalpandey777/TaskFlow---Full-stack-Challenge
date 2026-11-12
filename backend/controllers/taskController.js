const db = require('../database/db');
const { HttpError } = require('../middleware/errorHandler');

const PRIORITIES = ['High', 'Medium', 'Low'];
const toTask = (r) => r && { ...r, completed: !!r.completed };

// ---- validation ----
function validate(body, partial = false) {
  const errors = [];
  const out = {};
  const b = body || {};
  if (!partial || b.title !== undefined) {
    const t = typeof b.title === 'string' ? b.title.trim() : '';
    if (!t) errors.push('Title is required');
    else if (t.length > 120) errors.push('Title must be 120 characters or fewer');
    out.title = t;
  }
  if (b.description !== undefined || !partial) {
    const d = typeof b.description === 'string' ? b.description.trim() : '';
    if (d.length > 1000) errors.push('Description must be 1000 characters or fewer');
    out.description = d;
  }
  if (b.priority !== undefined || !partial) {
    const p = b.priority === undefined ? 'Medium' : b.priority;
    if (!PRIORITIES.includes(p)) errors.push('Priority must be High, Medium or Low');
    out.priority = p;
  }
  if (b.category !== undefined || !partial) {
    const c = typeof b.category === 'string' ? b.category.trim() : '';
    if (c.length > 40) errors.push('Category must be 40 characters or fewer');
    out.category = c || 'General';
  }
  if (b.due_date !== undefined || !partial) {
    const d = b.due_date || '';
    if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(Date.parse(d)))) errors.push('Due date must be YYYY-MM-DD');
    out.due_date = d || null;
  }
  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Task id must be a positive integer');
  return id;
}
function findOr404(id) {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) throw new HttpError(404, `Task ${id} not found`);
  return row;
}

// ---- handlers ----
exports.getTasks = (req, res) => {
  const { search, status, priority, sort } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push("(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')");
    const s = `%${String(search).replace(/[\\%_]/g, '\\$&')}%`;
    params.push(s, s, s);
  }
  if (status === 'completed') where.push('completed = 1');
  else if (status === 'pending') where.push('completed = 0');
  else if (status && status !== 'all') throw new HttpError(400, 'status must be all, pending or completed');
  if (priority && priority !== 'all') {
    if (!PRIORITIES.includes(priority)) throw new HttpError(400, 'priority must be High, Medium or Low');
    where.push('priority = ?'); params.push(priority);
  }
  const orders = {
    newest: 'created_at DESC, id DESC',
    oldest: 'created_at ASC, id ASC',
    due: '(due_date IS NULL), due_date ASC, id DESC',
    priority: "CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, id DESC"
  };
  if (sort && !orders[sort]) throw new HttpError(400, 'sort must be newest, oldest, due or priority');
  const sql = `SELECT * FROM tasks ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orders[sort || 'newest']}`;
  const rows = db.prepare(sql).all(...params).map(toTask);
  res.json({ success: true, count: rows.length, data: rows });
};

exports.getTask = (req, res) => {
  res.json({ success: true, data: toTask(findOr404(parseId(req))) });
};

exports.createTask = (req, res) => {
  const t = validate(req.body);
  const info = db.prepare(
    'INSERT INTO tasks (title, description, priority, category, due_date) VALUES (?, ?, ?, ?, ?)'
  ).run(t.title, t.description, t.priority, t.category, t.due_date);
  res.status(201).json({ success: true, data: toTask(findOr404(info.lastInsertRowid)) });
};

exports.updateTask = (req, res) => {
  const id = parseId(req);
  const cur = findOr404(id);
  const t = { ...cur, ...validate(req.body, true) };
  db.prepare(
    'UPDATE tasks SET title=?, description=?, priority=?, category=?, due_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(t.title, t.description, t.priority, t.category, t.due_date, id);
  res.json({ success: true, data: toTask(findOr404(id)) });
};

const setCompleted = (value) => (req, res) => {
  const id = parseId(req);
  findOr404(id);
  db.prepare('UPDATE tasks SET completed=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(value, id);
  res.json({ success: true, data: toTask(findOr404(id)) });
};
exports.completeTask = setCompleted(1);
exports.incompleteTask = setCompleted(0);

exports.deleteTask = (req, res) => {
  const id = parseId(req);
  findOr404(id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.json({ success: true, message: 'Task deleted' });
};

exports.getStats = (req, res) => {
  const r = db.prepare('SELECT COUNT(*) total, COALESCE(SUM(completed),0) completed FROM tasks').get();
  const today = new Date().toISOString().slice(0, 10);
  const overdue = db.prepare('SELECT COUNT(*) n FROM tasks WHERE completed=0 AND due_date IS NOT NULL AND due_date < ?').get(today).n;
  const pending = r.total - r.completed;
  res.json({
    success: true,
    data: { total: r.total, completed: r.completed, pending, overdue, percentage: r.total ? Math.round((r.completed / r.total) * 100) : 0 }
  });
};
