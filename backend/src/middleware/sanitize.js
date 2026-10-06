// Strips MongoDB operator keys ($ne, $gt, a.b) from user input to block NoSQL injection.
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = clean(value[key]);
    }
  }
  return value;
}

export function sanitizeInput(req, _res, next) {
  clean(req.body); clean(req.query); clean(req.params);
  next();
}
