const fs = require('node:fs/promises');
const path = require('node:path');
const { HttpError } = require('../middleware/errorHandler');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'tasks.json');
let queue = Promise.resolve();

async function ensureFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try { await fs.access(dataFile); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try { await fs.writeFile(dataFile, '{\n  "tasks": []\n}\n', { flag: 'wx' }); }
    catch (writeError) { if (writeError.code !== 'EEXIST') throw writeError; }
  }
}
exports.initialize = ensureFile;
async function readData() {
  await ensureFile();
  let parsed;
  try { parsed = JSON.parse(await fs.readFile(dataFile, 'utf8')); }
  catch (error) {
    if (error instanceof SyntaxError) throw new HttpError(500, 'Task storage JSON is invalid; file was left untouched for recovery');
    throw error;
  }
  const priorities = ['High', 'Medium', 'Low'];
  const validUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const validDate = (value) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
  const validTimestamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
  const validTask = (t) => t && validUuid(t.id) && validUuid(t.user_id) && typeof t.title === 'string' && typeof t.description === 'string' && priorities.includes(t.priority) && typeof t.category === 'string' && validDate(t.due_date) && typeof t.completed === 'boolean' && validTimestamp(t.created_at) && validTimestamp(t.updated_at);
  if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.some((t) => !validTask(t))) {
    throw new HttpError(500, 'Task storage has an invalid structure; file was left untouched for recovery');
  }
  return parsed;
}
function serialize(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
async function writeData(data) {
  const temp = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
  try { await fs.rename(temp, dataFile); }
  catch (error) { await fs.rm(temp, { force: true }); throw error; }
}

exports.list = (userId) => serialize(async () => (await readData()).tasks.filter((t) => t.user_id === userId));
exports.findById = (id, userId) => serialize(async () => (await readData()).tasks.find((t) => t.id === id && t.user_id === userId) || null);
exports.create = (task) => serialize(async () => { const data = await readData(); data.tasks.push(task); await writeData(data); return task; });
exports.update = (task) => serialize(async () => { const data = await readData(); const i = data.tasks.findIndex((t) => t.id === task.id && t.user_id === task.user_id); if (i < 0) return null; data.tasks[i] = task; await writeData(data); return task; });
exports.remove = (id, userId) => serialize(async () => { const data = await readData(); const i = data.tasks.findIndex((t) => t.id === id && t.user_id === userId); if (i < 0) return false; data.tasks.splice(i, 1); await writeData(data); return true; });
