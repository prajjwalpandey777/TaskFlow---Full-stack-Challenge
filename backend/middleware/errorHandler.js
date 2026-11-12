// Centralized error handling
class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const notFound = (req, res) => res.status(404).json({ success: false, error: 'Route not found' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Request body too large' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    success: false,
    error: status === 500 ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {})
  });
};
module.exports = { HttpError, notFound, errorHandler };
