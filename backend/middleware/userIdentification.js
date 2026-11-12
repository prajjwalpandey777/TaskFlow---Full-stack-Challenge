const { HttpError } = require('./errorHandler');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = (req, res, next) => {
  const userId = req.get('X-User-ID');
  if (!userId || !UUID.test(userId)) return next(new HttpError(400, 'A valid X-User-ID UUID header is required'));
  req.userId = userId.toLowerCase();
  next();
};
