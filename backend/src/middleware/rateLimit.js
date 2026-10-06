import rateLimit from 'express-rate-limit';

const handler = (message) => (_req, res) => res.status(429).json({ success: false, message });

export const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, handler: handler('Too many requests. Please slow down.') });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, handler: handler('Too many attempts. Please try again in a few minutes.') });
