// SQLite connection + automatic schema creation
const path = require('path');
const Database = require('better-sqlite3');

// Vercel's filesystem is read-only except /tmp (ephemeral). Locally the DB lives next to this file.
const ON_VERCEL = !!process.env.VERCEL;
const db = new Database(ON_VERCEL ? '/tmp/taskflow.db' : path.join(__dirname, 'taskflow.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    category TEXT,
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// On Vercel the DB is recreated on cold starts, so seed a few sample tasks for the demo
if (ON_VERCEL && db.prepare('SELECT COUNT(*) n FROM tasks').get().n === 0) {
  const ins = db.prepare('INSERT INTO tasks (title, description, priority, category, due_date, completed) VALUES (?,?,?,?,?,?)');
  ins.run('Finish API documentation', 'Document every endpoint in the README', 'High', 'Club', null, 0);
  ins.run('Record demo video', 'Show create, edit, filter and theme toggle', 'Medium', 'Work', null, 0);
  ins.run('Push project to GitHub', 'Add screenshots and setup steps', 'Low', 'Personal', null, 1);
}

module.exports = db;
