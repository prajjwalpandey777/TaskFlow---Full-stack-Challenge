const { Pool } = require('pg');
const { HttpError } = require('../middleware/errorHandler');

let pool;
let schemaReady;

function getPool() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new HttpError(500, 'Database is not configured. Set POSTGRES_URL in the server environment.');
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
    pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error', error));
  }
  return pool;
}

async function initialize() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        title VARCHAR(120) NOT NULL,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        priority VARCHAR(10) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
        category VARCHAR(40) NOT NULL DEFAULT 'General',
        due_date DATE,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS tasks_user_created_idx ON tasks (user_id, created_at DESC);
    `).catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

async function query(text, values) {
  await initialize();
  return getPool().query(text, values);
}

exports.initialize = initialize;
exports.list = async (userId) => {
  const { rows } = await query('SELECT id, user_id, title, description, priority, category, due_date, completed, created_at, updated_at FROM tasks WHERE user_id = $1', [userId]);
  return rows;
};
exports.findById = async (id, userId) => {
  const { rows } = await query('SELECT id, user_id, title, description, priority, category, due_date, completed, created_at, updated_at FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0] || null;
};
exports.create = async (task) => {
  const { rows } = await query(
    'INSERT INTO tasks (id, user_id, title, description, priority, category, due_date, completed, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, user_id, title, description, priority, category, due_date, completed, created_at, updated_at',
    [task.id, task.user_id, task.title, task.description, task.priority, task.category, task.due_date, task.completed, task.created_at, task.updated_at]
  );
  return rows[0];
};
exports.update = async (task) => {
  const { rows } = await query(
    'UPDATE tasks SET title=$3, description=$4, priority=$5, category=$6, due_date=$7, completed=$8, updated_at=$9 WHERE id=$1 AND user_id=$2 RETURNING id, user_id, title, description, priority, category, due_date, completed, created_at, updated_at',
    [task.id, task.user_id, task.title, task.description, task.priority, task.category, task.due_date, task.completed, task.updated_at]
  );
  return rows[0] || null;
};
exports.remove = async (id, userId) => {
  const { rowCount } = await query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [id, userId]);
  return rowCount > 0;
};
