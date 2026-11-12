const path = require('path');
const express = require('express');
require('./database/db'); // creates DB + tables on startup
const taskRoutes = require('./routes/taskRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use((req, res, next) => { // security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'");
  next();
});
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', notFound);

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(errorHandler);

// Local: start a server. Vercel: the app is exported and run as a serverless function.
if (require.main === module) {
  app.listen(PORT, () => console.log(`TASKFLOW running at http://localhost:${PORT}`));
}
module.exports = app;
